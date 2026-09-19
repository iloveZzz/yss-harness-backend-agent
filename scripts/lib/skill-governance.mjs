import { validateHarnessSkillScope } from './harness-skill-scope.mjs';
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSkillRegistry } from "./skill-registry.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function fail(message) {
  throw new TypeError(message);
}

export function validateSkillGovernance({ read = (relative) => readFileSync(path.join(ROOT, relative), "utf8"), exists = (relative) => existsSync(path.join(ROOT, relative)) } = {}) {
  const cursorRules = read(".cursorrules");
  for (const marker of ["docs/process/harness-profile.yaml", "docs/agents/yss-skill-registry.yaml", "harness-orchestrator", ".cursor/skills"]) {
    if (!cursorRules.includes(marker)) fail(`Cursor 薄入口缺少路由标记: ${marker}`);
  }
  for (const stalePath of [".agents/skills/page-module-development/", ".agents/skills/api-integration/", ".agents/skills/use-table-height/", ".agents/skills/use-tree-height/"]) {
    if (cursorRules.includes(stalePath)) fail(`Cursor 入口不得指向 alias 物理路径: ${stalePath}`);
  }

  validateHarnessSkillScope(ROOT);
  const registry = loadSkillRegistry();
  const canonicalIds = new Set(registry.skills.map((skill) => skill.id));
  const aliases = new Map(registry.skills.flatMap((skill) => skill.aliases.map((alias) => [alias, skill.id])));
  const legacy = new Set();
  for (const alias of legacy) {
    if (exists(`.agents/skills/${alias}`)) fail(`legacy alias 不得存在独立 canonical 目录: ${alias}`);
    if (!aliases.has(alias)) fail(`legacy alias 未登记: ${alias}`);
  }
  if (exists(".agents/skills/high-fidelity-html-prototype") || aliases.has("high-fidelity-html-prototype")) {
    fail("high-fidelity-html-prototype 已退役，不得保留物理目录或运行时 alias");
  }
  for (const retired of ["yss-product-lifecycle", "yss-stage-decision"]) {
    if (exists(`.agents/skills/${retired}`) || aliases.has(retired) || canonicalIds.has(retired)) {
      fail(`${retired} 已退役，不得保留物理目录、注册表条目或运行时 alias`);
    }
  }
  for (const skill of registry.skills) {
    if (!canonicalIds.has(skill.id)) fail(`注册表 canonical skill 无效: ${skill.id}`);
    if (skill.maturity === "deprecated") {
      if (!skill.replacement_skill || typeof skill.replacement_skill !== "string") fail(`deprecated 技能缺少 replacement_skill: ${skill.id}`);
      if (!skill.deprecation || typeof skill.deprecation !== "object") fail(`deprecated 技能缺少 deprecation: ${skill.id}`);
      if (skill.deprecation.new_use !== "forbidden") fail(`deprecated 技能必须禁止新用法: ${skill.id}`);
      if (!["migration-only", "remove-ready"].includes(skill.deprecation.cleanup_status)) fail(`deprecated 技能 cleanup_status 无效: ${skill.id}`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(skill.deprecation.remove_after ?? "")) fail(`deprecated 技能 remove_after 无效: ${skill.id}`);
    }
  }
  return { checked: true, legacy_aliases: legacy.size };
}
