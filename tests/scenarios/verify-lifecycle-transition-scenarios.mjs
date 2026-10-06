#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildDecisionFixture } from "../../scripts/fixtures/user-decision/build-fixture.mjs";
import { lifecycleTransitionContract, validateImplementationEntry, validateNextRoute, validateSliceContractReadiness } from "../../scripts/lib/lifecycle-transition.mjs";

const temp = mkdtempSync(path.join(os.tmpdir(), "backend-lifecycle-api-"));
process.on("exit", () => rmSync(temp, { recursive: true, force: true }));
const digest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const write = (ref, value) => {
  const file = path.join(temp, ref);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
  return { ref, file, digest: digest(readFileSync(file)) };
};
const apiAssessment = write("api-impact.json", { api: false, project_id: "backend" });
const apiEvidence = write("api-evidence.md", "无 API 影响证据。\n");
const apiValue = { schema_version: 1, kind: "api-contract-decision", decision_id: "api-contract.backend", decision_version: "v1", status: "approved", current_version: true, impact: "not-applicable", assessment_ref: apiAssessment.ref, assessment_digest: apiAssessment.digest, evidence_refs: [apiEvidence.ref], reason: "后端接入不新增或修改 API" };
const apiDecision = write("api-contract-decision.json", apiValue);
const technicalDesign = write("technical-design.json", { schema_version: 2, technical_design_id: "technical-design.backend", version: "v1", status: "approved" });
const dataValue = { schema_version: 1, kind: "data-architecture-decision", decision_id: "data-architecture.backend", decision_version: "v1", status: "approved", current_version: true, impact: "not-applicable" };
const dataDecision = write("data-architecture-decision.json", dataValue);
// Synthetic authority is selected from current consumer inputs before the record exists.
const engineeringScope = ["backend"];
const engineeringDrafter = "synthetic-backend-drafter";
const engineeringBasis = [technicalDesign, dataDecision, apiDecision, apiAssessment, apiEvidence].map(({ ref, digest }) => ({ ref, digest: digest.replace(/^sha256:/, "") }));
const engineeringPackageValue = {
  schema_version: 1,
  kind: "engineering-contract-package",
  project_id: "backend",
  gate_id: "gate.engineering-contract-approved",
  approval_scope: engineeringScope,
  drafter_principal_ref: engineeringDrafter,
  basis: engineeringBasis,
  technical_design: { ref: technicalDesign.ref, version: "v1", digest: technicalDesign.digest },
  data_architecture_decision: { ref: dataDecision.ref, version: "v1", digest: dataDecision.digest, impact: "not-applicable" },
  api_contract_decision: { ref: apiDecision.ref, version: "v1", digest: apiDecision.digest, impact: "not-applicable" },
};
const engineeringPackage = write("engineering-contract-package.json", engineeringPackageValue);
const engineeringContext = { subject_ref: engineeringPackage.file, subject_digest: engineeringPackage.digest, approval_scope: engineeringScope, drafter_principal_ref: engineeringDrafter, basis: engineeringBasis };
const engineeringDecision = buildDecisionFixture(path.join(temp, "engineering-decision"), { boundary: "gate.engineering-contract-approved", scope: ["backend"], subjectRef: engineeringPackage.file });
const engineeringApprovalValue = {
  schema_version: 1,
  gate_id: "gate.engineering-contract-approved",
  decision: "approved",
  actor_kind: "digital-human",
  role_id: "role.test-agent",
  runtime_id: "runtime.generic",
  principal_ref: "synthetic-test-reviewer",
  subject_ref: engineeringPackage.file,
  subject_digest: engineeringPackage.digest,
  approval_scope: engineeringScope,
  basis: engineeringBasis,
  drafter_role_id: "role.architecture-agent",
  drafter_principal_ref: engineeringDrafter,
  user_decision_ref: engineeringDecision.ref,
  artifact_bindings: [{ id: "technical-design.backend", version: "v1", digest: technicalDesign.digest }, { id: dataValue.decision_id, version: "v1", digest: dataDecision.digest }, { id: apiValue.decision_id, version: "v1", digest: apiDecision.digest }],
  evidence_refs: [apiEvidence.ref],
};
write("engineering-contract-approval.json", engineeringApprovalValue);
const readable = new Set(["handoff-receipt.json", "context-reconciliation.json", "technical-design.json", "data-architecture-decision.json", "engineering-contract-approval.json", "repository-preparation.json", "backend-onboarding.json", apiDecision.ref]);
const options = { root: temp, exists: (ref) => readable.has(ref) || existsSync(path.resolve(temp, ref)) };
const designState = {
  strategic_handoff_consumption: { result: "inputs-verified", ready_for_agent: false, ref: "handoff-receipt.json" },
  context_reconciliation: { status: "reconciled", ref: "context-reconciliation.json" },
  technical_design: { status: "approved", current_version: true, ref: technicalDesign.ref, version: "v1", digest: technicalDesign.digest, approval_context: structuredClone(engineeringContext) },
  data_architecture_decision: { status: "approved", current_version: true, impact: "not-applicable", ref: dataDecision.ref, version: "v1", digest: dataDecision.digest },
  api_contract_decision: { status: "approved", current_version: true, impact: "not-applicable", ref: apiDecision.ref, version: "v1", digest: apiDecision.digest },
  engineering_contract_approval_ref: "engineering-contract-approval.json",
};
const repositoryState = {
  ...designState,
  implementation_repository_preparation: {
    schema_version: 2,
    kind: "implementation-repository-preparation-result",
    result: "completed",
    current_version: true,
    evidence_refs: ["repository-preparation.json"],
    projects: [
      { project_id: "backend", delivery_role: "backend", status: "existing-and-onboarded", repository_ref: "git://backend", project_root: "/workspace/backend", repository_scope: "external-repository", architecture_family: "layered-mvc", design_prerequisites: { technical_design: designState.technical_design, data_architecture_decision: designState.data_architecture_decision, api_contract_decision: designState.api_contract_decision, engineering_contract_approval_ref: designState.engineering_contract_approval_ref }, onboarding_result: { status: "completed", ref: "backend-onboarding.json" } },
      { project_id: "frontend", delivery_role: "frontend", status: "not-applicable", reason: "backend-only profile" },
    ],
  },
};

const flags = [
  "upstream_inputs_current_and_approved",
  "tactical_design_current_or_not_applicable_recorded",
  "api_freeze_or_no_api_impact_recorded",
  "data_architecture_or_no_data_impact_recorded",
  "ui_inputs_or_no_ui_impact_recorded",
  "implementation_repositories_and_commands_registered",
  "implementation_repository_preparation_completed",
  "allowed_write_paths_registered",
  "test_seams_and_acceptance_executable",
  "task_packages_share_contract_version"
];
const validContract = {
  status: "approved",
  current_version: true,
  readiness: Object.fromEntries(flags.map((flag) => [flag, true])),
  architecture: {},
  frontend: {},
  backend: {},
  testing: {},
  evidence_refs: [".template-spec/process/lifecycle-registry.yaml"]
};

assert.equal(validateNextRoute("work-unit.harness-entry", "work-unit.technical-design").result, "allowed");
assert.equal(validateNextRoute("work-unit.harness-entry", "work-unit.slice-contract").result, "blocked");
assert.equal(validateNextRoute("work-unit.technical-design", "work-unit.implementation-repository-preparation", designState, options).result, "allowed");
const missingApiDesignState = structuredClone(designState);
delete missingApiDesignState.api_contract_decision;
assert.equal(validateNextRoute("work-unit.technical-design", "work-unit.implementation-repository-preparation", missingApiDesignState, options).result, "blocked");
assert.equal(validateNextRoute("work-unit.technical-design", "work-unit.implementation-repository-preparation", {}, options).result, "blocked");
assert.equal(validateNextRoute("work-unit.implementation-repository-preparation", "work-unit.slice-contract", repositoryState, options).result, "allowed");
assert.equal(validateNextRoute("work-unit.implementation-repository-preparation", "work-unit.slice-contract", designState, options).result, "blocked");
const legacyManifest = write("legacy-manifest-v3.json", { schema_version: 3, completion_level: "empty-scaffold-verified" });
const legacyOwnership = write("legacy-ownership.json", { ownership_state: "unchanged-mechanical-scaffold", extra_files: [] });
const legacyRecovery = write("legacy-recovery-approval.json", { status: "approved", api_reconciled: true });
const legacyState = structuredClone(repositoryState);
legacyState.implementation_repository_preparation.projects[0] = { project_id: "backend", delivery_role: "backend", status: "initialized-and-verified", repository_ref: "git://backend", project_root: "/workspace/backend", repository_scope: "external-repository", architecture_family: "layered-mvc", design_prerequisites: repositoryState.implementation_repository_preparation.projects[0].design_prerequisites, scaffold_contract: { schema_version: 3, status: "approved", persisted: true, current_version: true }, scaffold_manifest_ref: legacyManifest.ref, scaffold_verification: { status: "passed", ref: "repository-preparation.json" }, legacy_reconciliation: { status: "approved", ownership_state: "unchanged-mechanical-scaffold", premature_implementation: false, manifest_ref: legacyManifest.ref, manifest_digest: legacyManifest.digest, ownership_check_ref: legacyOwnership.ref, recovery_approval_ref: legacyRecovery.ref } };
assert.equal(validateNextRoute("work-unit.implementation-repository-preparation", "work-unit.slice-contract", legacyState, options).result, "allowed");
const legacyMissingApi = structuredClone(legacyState);
delete legacyMissingApi.implementation_repository_preparation.projects[0].design_prerequisites.api_contract_decision;
assert.equal(validateNextRoute("work-unit.implementation-repository-preparation", "work-unit.slice-contract", legacyMissingApi, options).result, "blocked");
const legacyPremature = structuredClone(legacyState);
legacyPremature.implementation_repository_preparation.projects[0].legacy_reconciliation.premature_implementation = true;
assert.equal(validateNextRoute("work-unit.implementation-repository-preparation", "work-unit.slice-contract", legacyPremature, options).result, "blocked");
assert.equal(validateNextRoute("work-unit.slice-contract", "work-unit.slice-implementation").result, "allowed");
assert.equal(validateNextRoute("work-unit.slice-implementation", "work-unit.verification").result, "allowed");
assert.equal(validateNextRoute("work-unit.slice-implementation", "work-unit.verification").blocking_signals.length, 0);
assert.equal(validateNextRoute("work-unit.technical-design", "work-unit.slice-implementation").result, "blocked");
assert.equal(validateSliceContractReadiness(validContract).result, "allowed");
assert.equal(validateImplementationEntry({ ...repositoryState, slice_contract: validContract, predecessor_work_unit: "work-unit.slice-contract", ready_for_agent: true }, options).result, "allowed");

const assertEngineeringBlocked = (label, currentDesign = designState, currentRepository = repositoryState) => {
  assert.equal(validateNextRoute("work-unit.technical-design", "work-unit.implementation-repository-preparation", currentDesign, options).result, "blocked", `${label}: design transition`);
  assert.equal(validateNextRoute("work-unit.implementation-repository-preparation", "work-unit.slice-contract", currentRepository, options).result, "blocked", `${label}: repository transition`);
  assert.equal(validateImplementationEntry({ ...currentRepository, slice_contract: validContract, predecessor_work_unit: "work-unit.slice-contract", ready_for_agent: true }, options).result, "blocked", `${label}: implementation entry`);
};
let currentApprovalCounterexamples = 0;
for (const [label, mutate] of [
  ["missing-current-context", (context, binding) => { delete binding.approval_context; }],
  ["changed-current-subject", (context) => { context.subject_ref = technicalDesign.file; }],
  ["changed-current-subject-digest", (context) => { context.subject_digest = `sha256:${"0".repeat(64)}`; }],
  ["changed-current-scope", (context) => { context.approval_scope = ["another-backend"]; }],
  ["changed-current-basis", (context) => { context.basis[0].digest = "0".repeat(64); }],
  ["changed-current-author", (context) => { context.drafter_principal_ref = "another-drafter"; }],
]) {
  const candidateDesign = structuredClone(designState);
  mutate(candidateDesign.technical_design.approval_context, candidateDesign.technical_design);
  const candidateRepository = structuredClone(repositoryState);
  candidateRepository.implementation_repository_preparation.projects[0].design_prerequisites.technical_design = structuredClone(candidateDesign.technical_design);
  assertEngineeringBlocked(label, candidateDesign, candidateRepository);
  currentApprovalCounterexamples += 1;
}
for (const [label, mutate] of [
  ["missing-record-subject-digest", (record) => { delete record.subject_digest; }],
  ["changed-record-subject-digest", (record) => { record.subject_digest = `sha256:${"0".repeat(64)}`; }],
  ["changed-record-subject", (record) => { record.subject_ref = technicalDesign.file; }],
  ["changed-record-scope", (record) => { record.approval_scope = ["another-backend"]; }],
  ["missing-record-author", (record) => { delete record.drafter_principal_ref; }],
  ["changed-record-author", (record) => { record.drafter_principal_ref = "another-drafter"; }],
  ["self-signed-record", (record) => { record.principal_ref = engineeringDrafter; }],
  ["changed-record-basis", (record) => { record.basis[0].digest = "0".repeat(64); }],
  ["missing-technical-basis-coverage", (record) => { record.basis = record.basis.filter((asset) => asset.ref !== technicalDesign.ref); }],
]) {
  const candidate = structuredClone(engineeringApprovalValue);
  mutate(candidate);
  try {
    write("engineering-contract-approval.json", candidate);
    assertEngineeringBlocked(label);
    currentApprovalCounterexamples += 1;
  } finally {
    write("engineering-contract-approval.json", engineeringApprovalValue);
  }
}
for (const [label, mutate] of [
  ["missing-package-gate", (value) => { delete value.gate_id; }],
  ["changed-package-scope", (value) => { value.approval_scope = ["another-backend"]; }],
  ["missing-package-basis", (value) => { delete value.basis; }],
  ["changed-package-author", (value) => { value.drafter_principal_ref = "another-drafter"; }],
]) {
  const candidate = structuredClone(engineeringPackageValue);
  mutate(candidate);
  try {
    write(engineeringPackage.ref, candidate);
    assertEngineeringBlocked(label);
    currentApprovalCounterexamples += 1;
  } finally {
    write(engineeringPackage.ref, engineeringPackageValue);
  }
}
assert.equal(validateNextRoute("work-unit.technical-design", "work-unit.implementation-repository-preparation", designState, options).result, "allowed", "restored current fixture");
assert.equal(validateNextRoute("work-unit.implementation-repository-preparation", "work-unit.slice-contract", legacyState, options).result, "allowed", "restored legacy current fixture");
process.stdout.write(`工程批准当前绑定拒绝场景 ${currentApprovalCounterexamples}/${currentApprovalCounterexamples} 通过（每项覆盖三种消费入口）\n`);

for (const mutate of [
  (value) => { value.status = "draft"; },
  (value) => { value.current_version = false; },
  (value) => { value.readiness.test_seams_and_acceptance_executable = false; },
  (value) => { value.architecture = undefined; },
  (value) => { value.readiness.blockers = ["contract-version-mismatch"]; },
  (value) => { value.predecessor_work_unit = "work-unit.technical-design"; }
]) {
  const candidate = structuredClone(validContract);
  mutate(candidate);
  const result = candidate.predecessor_work_unit
    ? validateImplementationEntry({ ...repositoryState, slice_contract: candidate, predecessor_work_unit: candidate.predecessor_work_unit, ready_for_agent: true }, options)
    : validateSliceContractReadiness(candidate);
  assert.equal(result.result, "blocked");
}

assert.deepEqual(lifecycleTransitionContract.next_routes["work-unit.technical-design"], ["work-unit.implementation-repository-preparation"]);
assert.deepEqual(lifecycleTransitionContract.next_routes["work-unit.slice-contract"], ["work-unit.slice-implementation"]);
process.stdout.write("harness-agent 生命周期转换压力场景验证通过\n");
