# ZMR execution protocol — single writer / coherent batches

Authority：本 package 的 DEVELOPMENT_PLAN、EVIDENCE_BOUNDARY、canonical `status/ZERO_MODEL_REFOUNDATION_STATUS.json`，加当前 owner 明确授权；remote main 为唯一代码事实。旧 package 的关闭状态不随本 package 改变。此协议只覆盖 ZMR，显式取代历史“一条消息只能一轮”的限制，不给历史 CIG/CSL/LSR 重新执行权限。

## 1. 当前与后续授权

本轮先完成 ZMR-00 并在 main 验证，再开始 ZMR-01A 的最小非语义工程。ZMR-01B 以后的可连续 Work 在其被授权执行时遵循本协议：在已有访问/成本/隐私/产品约束内，自动完成 coherent batch、普通修复和候选淘汰，不逐项索取 owner 决策。本轮不创建或执行未来最终 blind TEST，不 arm 任何历史或新 TEST，不购买资源，不接触生产和真实 archive。

“自动继续”是当前有执行能力的工作会话内的规则，不是后台任务承诺。会话/工具执行中断时留下可恢复 checkpoint 和下一安全动作，不伪报还在后台运行。工具缺少真正隔离 curator 能力时标记 INDEPENDENCE_NOT_PROVISIONED，继续不依赖该能力的工程；不得用同会话 self-author 伪造独立性。

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

## 4. 自动修复、淘汰与真正需要owner的情况

语法、打包、trigger、schema、脚本路径、依赖固定和普通集成失败：自动修，保留失败run，证明无sealed数据接触；不得将工程失败改写成科学PASS。语义修复：每候选最多两次、只针对允许的公开DEV机制；超限淘汰。更换预登记候选、简化组件、放弃无增益的family无需owner选参数。

达到重大fork才暂停寻求owner：新增权限/连接、隐私或真实生产数据访问、付费/新成本承诺、改变zero-model/local-first/144 Topic/70% floor/预算/正式Catalog、以及两条互斥产品方向确需owner选择。最终TEST从protocol进入执行也需要新明确权限。没有数据和没有独立curator是具体能力阻碍，应如实记录并继续可做的公开工程，不要求owner反复做语义标签。

证据泄漏或消费后崩溃不可当普通repair：立即封存该packet，按EVIDENCE_BOUNDARY记录INVALID_EVIDENCE或CONSUMED_EXECUTION_FAILURE；不复述泄漏内容，不回流TRAIN。其它未受影响工作可继续；需要新权限时才交owner。

## 5. 状态与gate的唯一口径

分别记录 engineering_status、data_qualification、capability_verdict、resource_verdict。COMPLETE不代表PASS；未测为UNTESTED，空分母/不充分独立性为INCONCLUSIVE。01A的纯计数测试即使全绿，也不是语义能力或DATA_READY。

每个批次的CI receipt包含head SHA、base SHA、适用jobs、run/attempt、main SHA和main jobs。状态文件中的merge-verification条件由这些receipt和GitHub exact-main check共同落实；避免为了在状态中嵌入自身最终hash而产生循环提交。

可以以CANDIDATE_REJECTED继续下一假设；不得以“代码写完”晋级能力。到SATURATION_STOP_RULES的充分平台期条件必须收口；证据不足耗尽研究预算则明确EXPLORATION_INCOMPLETE_RESOURCE_STOP，不给缺证据改名为ceiling。
