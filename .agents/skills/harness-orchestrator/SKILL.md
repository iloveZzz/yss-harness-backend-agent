---
name: harness-orchestrator
description: 编排后端专职 Harness 的输入接收、合同、任务派发与验证；当需要后端流程路由或恢复时使用。
---

# Harness Orchestrator

后端新骨架必须消费注册表 architecture_profiles，并在工程基线、登记、Manifest、Slice/work unit 和结果中保持相同 architecture_identity。DDD/MVC 都固定本地/测试 H2，生产数据库 not-bound；不得添加默认外部驱动或数据源。配套技能按 `.template-spec/agents/backend-architecture-profiles.md` 分流，MVC 不加载 yss-domain。Profile 仍为 draft 时不得 ready-for-agent，也不得把结构测试当作真实首切片兼容证明。

这是本专职 Harness 的唯一编排入口。它负责读取 `yss-project.yaml` 与 `CONTEXT.md`、判断影响面、选择下一个未阻塞工作单元、编译任务包、维护合同版本、汇合执行结果和触发重路由。

文档输出时按 `lifecycle-document-output` 条件调用 `i-have-adhd`，读取 `.template-spec/process/document-writing.md`；作用域仅限当前产物，派发时传递条件及引用。

## 边界

- 不起草领域行为、前端页面、后端业务代码或测试代码。
- 不替专业 Agent 修改技术决策；遇到领域、交互、实现或可验证性冲突时暂停并升级。
- 不批准自己生成的专业资产，不把 实现合同编译器 草案当成 approved，也不以聊天消息代替证据。
- Strategic Handoff v5 导入成功只表示输入可消费，固定进入 `work-unit.technical-design` 并保持 `ready_for_agent:false`；只有仓库准备完成且当前 `Slice Implementation Contract` 满足就绪公式时，才能设置 `ready-for-agent`。

## 前端联合接收

专职前端 profile 或显式 `frontend_delivery` 输入，先执行 `.template-spec/process/frontend-backend-delivery.md` 的实际校验；源战略与后端交付同时有效后才准备实现计划与合同，合同批准后再派发 Worker。接收、恢复与验收均重验，缺口回交权威方。通用研发 profile 未选择该路线时维持原行为。

## 主流程

1. 校验上游输入、仓库身份、实现仓库、影响面和当前合同版本。
2. 在设计前完成 `gate.backend-architecture-platform-approved`：既有工程核验并沿用当前登记架构与固定工程基线/POM 中的实际 Spring Boot 版本，将该门禁记录为 `not-applicable`，不重复询问；新工程基于批准需求和工程约束推荐 `domain-driven` 或 `layered-mvc`，运行 `scripts/backend-platforms`，把架构、Boot 精确补丁、Java 和 YSS 父 POM/BOM 在同一次用户决定中展示；独立子项目可继承或覆盖，逐项目确认（可一次确认明确列出的多个项目），持久化 `scaffold-architecture-decisions.yaml`。不得从目录或默认值推断。
3. 调度 `architecture-agent` 使用 `yss-technical-design`，按确认架构分别调用 DDD 或 MVC 专家，形成并审查批准且当前的 Technical Design；数据与 API 均按影响强制，API 命中时完成 OpenAPI 3.1 Draft、锁定 Redocly Validation、独立 Review 和 Freeze，不命中时形成可核验的 API Contract Decision `not-applicable`；随后由同一个 `gate.engineering-contract-approved` 原子批准技术、数据与 API 设计。
4. 进入 `work-unit.implementation-repository-preparation`。新工程编译并批准 schema v4 scaffold contract，生成器在任何写入前核验技术/数据设计与批准记录，只生成机械骨架；既有工程完成 onboarding。聚合并校验 Preparation Result v2。
5. 仓库准备完成后，汇总四角色分区并生成一个版本化 Slice Implementation Contract。
6. 先调度 `test-agent` 建立测试 seam，再调度后端 Worker。
7. 收集每个任务包的 `workflow-execution-result-v1`，重新执行 Fresh Verification。
8. 由独立 `test-agent` 返回验证结论；没有阻塞信号时才关闭后端任务，整体切片由统一管理方验收。

## 必须阻断的信号

`blocked`、`stale`、`drift`、`violation`、`new_impacts`、合同版本不一致、写路径越界、验证未执行或证据不可读。

## 便携交接工具

批准交接后由 `scripts/strategic-handoff export --source-root <source> --handoff <ref> --output <new-directory> --zip` 冻结原始资产；规则身份、批准绑定、包内索引和完整快照差异以 `.template-spec/process/strategic-handoff-package.md` 为准。接收方先 `verify` 再 `import`，目标根术语对账和 `verify-strategic-handoff-consumption` 通过后进入战术设计/相关切片；工具不能代替生命周期批准。

## 后端专职 profile

先消费 `.template-spec/process/harness-profile.yaml` 的职责与输入条件，再依 `.template-spec/process/frontend-backend-delivery.md` 接力。不得派发另一端实现任务；跨端输入评审必须只读。终点只关闭本端验证，整体业务验收由登记的统一管理方汇总。

新 DDD/MVC 脚手架合同必须绑定 `platform_configuration` v2。仅清单中真实验证过的 YSS 组合可生成；缺兼容组件或证据时阻断，不替代为官方组件。已有当前批准展示摘要后复用；依赖配方变化重编合同，单纯补充同配置证据只重验。同一 Maven Reactor 平台一致，候选维护产物不可进入业务切片。详见 `.template-spec/engineering/backend-platforms.md`。

## 阶段工作追踪

首次进入允许的 Plan / Spec / Design 或恢复时，读取 `.template-spec/process/stage-tracking.md`，核验 tracker 启用版本与持久 checkpoint。写阶段资产前登记当前工作项；小工作内联，跨负责人 / 独立验收 / 阻塞 / 延期时拆至 work-items。旧项目只读 check 后形成可审阅 plan，显式 apply 才启用；不补造历史完成或批准。完成时逐条关联验收证据，阶段退出回写；结果携带 checkpoint_ref。追踪不得扩大本 profile 的允许阶段，Design 不创建工程父票或实现切片。
