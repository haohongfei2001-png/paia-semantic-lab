# ZMR execution protocol — single writer / coherent batches

Authority：本 package 的 DEVELOPMENT_PLAN、EVIDENCE_BOUNDARY、canonical `status/ZERO_MODEL_REFOUNDATION_STATUS.json`，加当前 owner 明确授权；remote main 为唯一代码事实。旧 package 的关闭状态不随本 package 改变。此协议只覆盖 ZMR，显式取代历史“一条消息只能一轮”的限制，不给历史 CIG/CSL/LSR 重新执行权限。

## 1. 当前与后续授权

本轮先完成 ZMR-00 并在 main 验证，再开始 ZMR-01A 的最小非语义工程。ZMR-01B 以后的可连续 Work 在其被授权执行时遵循本协议：在已有访问/成本/隐私/产品约束内，自动完成 coherent batch、普通修复和候选淘汰，不逐项索取 owner 决策。本轮不创建或执行未来最终 blind TEST，不 arm 任何历史或新 TEST，不购买资源，不接触生产和真实 archive。

“自动继续”是当前有执行能力的工作会话内的规则，不是后台任务承诺。会话/工具执行中断时留下可恢复 checkpoint 和下一安全动作，不伪报还在后台运行。工具缺少真正隔离 curator 能力时标记 INDEPENDENCE_NOT_PROVISIONED，继续不依赖该能力的工程；不得用同会话 self-author 伪造独立性。

### Owner standing authorization — 2026-09-29

Owner 现授权 ZMR 在连续 unattended Work 回合中默认推进，不以普通代码、测试、CI、性能、数据数量/质量、fixture、统计实现、算法失败或 merge 问题请求决策。当前 writer 自行诊断、有限修复、淘汰候选、切换预登记的下一家族/有互补证据的 hybrid。CI 异步时做可独立工作；没有独立工作时回合可自然结束，下一次从 remote main 的唯一 STATUS 恢复。此授权不承诺会话结束后仍有后台进程。

**开发轨与资格轨分离。** Candidate writer 可自行创建与标注新的 TRAIN、ordinary DEV、challenge DEV、provisional Topic boundary，用于 zero-model Router 的持续开发、诊断、消融与资源优化。凡作者/来源/双审/隔离未满足 DATA_PROTOCOL 者一律记为 `NON_INDEPENDENT_DEVELOPMENT_EVIDENCE`，保留来源、lineage、暴露和版本，不计入 01B 的 independent quotas，不用作 sealed AS/final，不宣称 capability PASS 或 saturation ceiling。开发轨可在 01B 数据资格未通过时启动 ZMR-02，并沿 ZMR-03→04→05→06 的算法工作流前进；每一阶段的**资格晋级**仍须 CAPABILITY_LADDER、DATA_PROTOCOL 和 EVALUATION_PROTOCOL 的独立 full144、可靠性、资源、安全门。AS/最终 TEST 的内容、隔离和消费规则不变。开发用全 144 正式 Catalog 作为输出宇宙；某类缺少合格 gold 时报告缺口，不缩小分母或暗称覆盖。

每个稳定开发候选仍登记假设、固定 anchor、配置/repair 额度、closure、静态预算、允许数据与暴露，按“诊断→最多两次有解释的语义修复→有限再评估→淘汰或保留→下一家族”执行。非独立 DEV 不可替代 AS，不能用它证明 95%/70% capability floor；无独立 AS 时只冻结 qualification path，继续非依赖开发轨。不得通过反复重跑 unchanged evaluation key 或增加模板来伪造新一代。最终 TEST 不因本授权自动 arm。

真正 hard stop 仅限新外部账号/权限/隐私授权、付费、真实用户或 PAIA production 数据、修改产品硬约束、不可逆外部动作、或 canonical 明确需要 owner 选择的互斥产品方向。即使发生也只冻结依赖该决定的路径；其余已授权工作继续。144 Topic、70% coverage/macro floor、95% assigned precision、安全门、全部现有资源预算、0 neural/embedding/LLM/semantic API、local-first、旧 TEST 禁读/禁重跑均保持。此段取代本协议和 DEVELOPMENT_PLAN 中“01B 未独立合格就不得开始 Router 开发”的旧执行顺序，不改变资格门槛。

## 2. 每个 coherent batch

1. 重读 remote main、ZMR STATUS、当前 stage gate、相关改动文件；以明确路径/ref读取，禁止全仓库全文搜索、clone、历史 packet/生成器/逐题日志读取。
2. 确认只有一个 candidate writer。登记 batch_id、expected_base_sha、owned_paths、假设、数据/evidence身份、允许修改范围和测试层。并行可以做隔离只读审查/写作，不能两个 writer 同时改 Router、索引、参数或状态。
3. 在自己的分支形成连贯改动。一个批次通常是一项协议/数据基础设施改动或一个已登记候选，不将 ZMR 与旧 runtime/fixture 修改混为一批。
4. 内循环只做 changed-module syntax/unit/property、manifest、有限公开机制回归；不跑整个历史 benchmark，不调用模型，不访问 sealed AS/TEST。
5. stable candidate 才跑重门。登记 evaluation_key；先查询 ledger/既有结果，同 key 复用结果，仅做hash核验。失败不能改ID重跑同一题包。
6. 开 PR，核对完整 changed-path metadata 和 exact-head CI。仅绿色且 scope 正确才合并；不 force push main、不绕过 branch protection、不改 required checks 以掩盖失败。
7. 合并前再次读 main。若别人推进 main，自动检查 disjoint changes 并重新基于最新 main 整合/检查，不丢弃他人提交；同一 owned path 的不可兼容冲突需实际解决，不仅凭旧SHA继续。
8. 读最终 remote main/status；确认 applicable exact-main CI。receipt写到同一 PR 的 comment/body，不创建无限递归的 receipt-only PR。报告科学和工程状态、SHA、已完成/未完成项。

ZMR-00 使用 allowlist-only文档/元数据检查；ZMR-01A后仅在显式列出的新 package 文件上执行工程单元。旧 closure/status/Catalog 的不变性以 Git tree blob identity 检查，不读或重建旧 TEST。混入历史 runtime/fixture 的批次直接失败而非运行旧 evaluator。

## 3. 轻测试、重门与不重复测试

`evaluation_key = SHA256(canonical JSON of package/generation + candidate dependency closure + Catalog + compiler + TRAIN + calibration + evaluation cohort digest + scorer/protocol + resource profile + execution environment)`。

工程单元按变更需要可重复；能力重门相同key一次，不能把未变更head的重跑当新增证据。不同文档/receipt提交但候选/数据/参数闭包相同也不重新跑重门。exact-head与exact-main轻检查是集成检查，不算新的capability运行。为了确定性预登记的双构建/重复输出属于同一次gate内部，不是后验反复试分。

stable配置定义：依赖闭包可重建、语法/单元通过、TRAIN/DEV权限明确、参数及分母固定、资源静态计数合格、注册的假设和消融完整。没有这些条件不允许消耗AS。公开DEV使用情况记入exposure ledger；失败和撤销候选不能从账本消失。

2026-09-30 pre-freeze accounting guard：新 stable competition freeze 前先重建累计 generation/candidate/config/repair 分配，用 `competition_budget.mjs` 校验6代/6候选/12稳定配置/2修复/1AS及已消费key。`NOT_QUALIFIED` 或 retired 不是额度归零证据，public packet 的新后缀不构成新独立generation。当前部分历史 inventory 的稳定分配尚未完整核对，remaining allowance 为null；仅冻结依赖该核对的新稳定比较，继续数据intake、来源/lineage工程、构建和资源优化。普通账本缺口由writer自动补证，不因此向owner升级、不伪造预算PASS。见ZMR-06_DEVELOPMENT_COMPETITION_ACCOUNTING.md；本补充不改变任何产品或研究预算，不授权sealed内容。

## 4. 自动修复、淘汰与真正需要owner的情况

语法、打包、trigger、schema、脚本路径、依赖固定和普通集成失败：自动修，保留失败run，证明无sealed数据接触；不得将工程失败改写成科学PASS。语义修复：每候选最多两次、只针对允许的公开DEV机制；超限淘汰。更换预登记候选、简化组件、放弃无增益的family无需owner选参数。

达到重大fork才暂停所依赖路径并寻求owner：新增权限/连接、隐私或真实生产数据访问、付费/新成本承诺、不可逆外部动作、改变zero-model/local-first/144 Topic/70% floor/预算/正式Catalog、以及两条互斥产品方向确需owner选择。最终TEST从protocol进入执行也需要新明确权限。没有独立数据和curator只阻断资格路径；开发轨持续使用明确标记的非独立证据，不要求owner反复做语义标签。

证据泄漏或消费后崩溃不可当普通repair：立即封存该packet，按EVIDENCE_BOUNDARY记录INVALID_EVIDENCE或CONSUMED_EXECUTION_FAILURE；不复述泄漏内容，不回流TRAIN。其它未受影响工作可继续；需要新权限时才交owner。

## 5. 状态与gate的唯一口径

分别记录 engineering_status、data_qualification、capability_verdict、resource_verdict。COMPLETE不代表PASS；未测为UNTESTED，空分母/不充分独立性为INCONCLUSIVE。01A的纯计数测试即使全绿，也不是语义能力或DATA_READY。

每个批次的CI receipt包含head SHA、base SHA、适用jobs、run/attempt、main SHA和main jobs。状态文件中的merge-verification条件由这些receipt和GitHub exact-main check共同落实；避免为了在状态中嵌入自身最终hash而产生循环提交。

可以以CANDIDATE_REJECTED继续下一假设；不得以“代码写完”晋级能力。到SATURATION_STOP_RULES的充分平台期条件必须收口；证据不足耗尽研究预算则明确EXPLORATION_INCOMPLETE_RESOURCE_STOP，不给缺证据改名为ceiling。
