# CIG-v1 bounded audit：已知、推断与未知

审计边界：main `c98e65cfcddac138fad4d7368849638ff5478543`，只读当前 canonical 文档、公开 development 文档、freeze 前实现，以及公开 aggregate closure。未读取 CIG-03 TEST 输入、gold、逐题预测、rationale、逐题日志或 TEST 生成内容。没有重跑任何 consumed TEST。

## 可核查的观察

| 观察 | 来源与限定 |
|---|---|
| DEV：279/288 assigned 且全部正确，coverage/macro recall 96.875% | CIG-02G_DEV_REVIEW_AND_FREEZE；same-writer、vocabulary-overlap、英文短直接请求占主导 |
| TEST：1/288 assigned 且正确，287 DEFER，coverage/full144 macro recall 0.347222% | CIG-03_CLOSURE；固定 144 Topic，每 Topic 两条单标签 |
| TEST controls 0/36 误分配；context harm 0/72；468 native inputs 重复无差异 | 同一 closure；不是上下文理解已通过的证据 |
| CIG-03 一次性消费，科学 FAIL；CIG-04 未开始 | 当前 COMPOSITIONAL_INTENT_GRAPH_STATUS 与 closure |
| index 76,827 bytes；router+index 86,105 bytes | identity/size observation；无合格浏览器/内存/延迟测量 |
| 独立作者未接触候选/TRAIN/DEV；但只有一个隔离 agent 且自行 adjudicate | closure 披露的独立性局限；不能描述成双人独立 gold |

DEV 与 TEST 相差约 96.5278 个百分点。两个集合不是同一批配对输入；差值不能自动分解成某个代码模块的因果贡献。1/1 的 precision 不支持广泛能力或稳定 95% 精度结论。平衡 144 类不意味着一个可 abstain 的 Router 应当具有随机猜测分布；这里观察到的是几乎完全拒判，不应拿 1/144 猜测率作错误机制解释。

## 归因矩阵

| 问题 | 已有证据 | 可保留的假设 | 不能从现有证据知道的事 |
|---|---|---|---|
| 数据分布 | 作者和表达来源独立；DEV 偏英文直接请求，词汇重叠明确披露 | 作者/表达机制转移使 eligibility 大幅下降 | TEST 的语言、长度、句式分布，或真实用户分布中的错误率；本轮不读 TEST 来补齐 |
| Topic 边界 | DEV 报告有 2 次 competing typed frames；正式 144 类未改 | 稀疏正例难覆盖邻界；类共享词面使唯一性规则脆弱 | TEST 的具体混淆对、哪些 Topic 最难、ontology 是否需要变更 |
| GOAL/MEANS/BACKGROUND | DEV 9 misses 中 4 次 goal extraction 后证据不足；实现先取一个 goal span | 过早丢弃 object/action 所在跨度会损害召回；硬 request 前缀可拒绝合法表达 | TEST 中多少 DEFER 属于 parser；不能把所有 287 次归因于 parser |
| lexical grounding | frame_grounder 要求 OBJECT 且 ACTION/OUTCOME、至少一个跨 Topic 唯一 atom，最后恰好一个合格 frame；compiler 添加 TRAIN 的英文 ACTION/OBJECT atoms | 共享作者词汇可能满足硬合取，独立措辞则无法累计弱证据；字词统计是值得比较的替代 | TEST 的 OOV 比例、命中哪个 atom、具体缺哪些词；不得按 TEST 补词 |
| DEFER policy | 多处请求/引用/guard/竞争检查先拒判；TEST 287 DEFER | 保守 policy 可能放大词面或解析缺口；要在 fresh DEV 分离“没召回候选”和“有候选但阈值拒绝” | 仅降低阈值是否可保持 precision；TEST 汇总没有反事实阈值曲线 |
| template / 同构 | DEV 与 TRAIN action/object atoms 同源作者；review 明确不把 DEV 当 blind capability；compiler 只读 allowlisted TRAIN，不读 DEV/TEST | author/style leakage 和选择偏差是强风险；随机拆行不足以消除 | 没有证明 compiler 偷读 DEV；没有证据证明 TEST 题目泄漏或被修改；机械模板零重叠不证明语义/作者独立充分 |
| context | authored_topic_router 只向 grounder 传 current，忽略 title/recent | context-harm=0 在此可由忽略上下文解释；需要 non-vacuous context-use 门 | TEST 中能否借上下文正确路由、实际 continuation recall |
| 测量/执行 | closure 记录基础设施 PASS 与科学 FAIL 分离、一次 scorer、固定 hash | 最先建立 evaluator 的单位/分母/全 DEFER adversary 验证有价值 | 没有依据把 0.347222% 归咎于 scorer bug；不得重打分消除 FAIL |

结论：该候选未把开发分布上的能力迁移到独立创作表达；可定位多个结构性风险，但无法仅用 aggregate 确认各类根因的占比。闭集 Topic 限定了输出空间，并未限定表达空间；因此既不能认为字面匹配自然充分，也不能由这一代失败推断所有非神经方案失败。

## 新 evidence boundary 中如何检验，而不是倒查 TEST

在新 TRAIN/DEV 上注册：无 request-prefix 限制的 candidate recall；全输入 vs 单 goal span；char/word sparse vs exact atoms；positive-only vs positive+negative；有无唯一 atom 要求；current-only vs current+真实 continuation；全局阈值 vs 分语言收缩校准。每项只在新允许的开发数据做消融，使用固定 anchor 与 paired metrics。共享词面但改 intent、相同 intent 换表达机制、角色互换和信息删除分别测量。新 DEV 的错误可以修，CIG-03 的输入和逐题信息永久不进入本 package。

## 审计源固定身份

以下路径均相对 repo，读取版本均为登记基线；Git blob SHA 不是内容 SHA256，二者不混用。

| 源 | Git blob SHA |
|---|---|
| status/COMPOSITIONAL_INTENT_GRAPH_STATUS.yaml | 2eada9313f99d23811f11e735267aa927b9bfba4 |
| docs/compositional-intent-graph-v1/DEVELOPMENT_PLAN.md | 1bff2be0ca6c25f6b334afb78b1d4d53463c7193 |
| docs/compositional-intent-graph-v1/CIG-03_CLOSURE.md | 73dabf258d6b78fd4932b2ca0d3366ffdd026fe1 |
| docs/compositional-intent-graph-v1/CIG-02G_DEV_REVIEW_AND_FREEZE.md | e805a6bdb0ab289779d06f2523777d883c6a301d |
| runtime/compositional_intent_graph_v1/authored_topic_router.mjs | 9c390c08f44a66c5d4f97fe900113bbd2210693a |
| runtime/compositional_intent_graph_v1/frame_grounder.mjs | 80a915d167b721d766501a3d83c0039a753c47ff |
| scripts/cig02g_compile.mjs | 160f544b22bc80572634a4f8e1582e16c21a3fe4 |
| catalog/system_topic_catalog_v0.2.yaml（元数据身份；本次未全文审读每个 Topic） | 6bcdd2af66879d7ac098cf237b5586c3c9818aad |

既有全仓库 CI 会调用 CSL fixture builders 和读取 consumed fixture 做校验；新 package 采用 allowlist-only 检查，纯 ZMR 批次不执行该历史路径。这个调整是证据隔离，不是删除或改写历史结果。新 package 不能声称已重审全部历史 development/source inventory，也不需要为本次架构设计重做已收口实验。
