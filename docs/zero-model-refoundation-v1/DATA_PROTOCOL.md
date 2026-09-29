# TRAIN / DEV 数据协议（最高优先级）

版本 `ZMR-DATA-1.0`。最终 TEST 内容不在本轮创建。本协议中的数量是前瞻最低准入设计，不是已经存在的数据。当前是否就绪只看 canonical STATUS。

## 1. 标注目标先于作者写题和算法

依据固定 Catalog 的 inclusion/exclusion/boundary 和当前输入的实际交流意图/主题焦点标注，不依据候选词表、形式名称是否出现或“看起来应该能命中”。Label 空间始终是全部 144 个固定 ID。请求前缀不是意图存在的充分或必要条件；有意义的陈述/残句也可能可路由。引用、过去事件或假设不能一律 DEFER：判断它们是否是当前待处理目标、必要对象或仅背景。formal Topic 边界不能由 annotator 为改善得分自行改写。

每行记录 `expected_state`（ASSIGNED/DEFER）、所需 Topic 集合、禁止/排除 Topic、可判定性、证据跨度与来源字段。明确多意图用集合标注；不确定究竟是哪一种意图不能把候选 Topic 的并集当正确多标签，应按预登记歧义规则 DEFER。两位 reviewer 独立给 gold，分歧先于预测仲裁。确实不可判定的内容进入 ambiguity/control 层，不是被删除；争议比例、修订理由、来源拒收数量均披露。不能将算法答错改名为“题目模糊”。

Guideline 在 intake 前固定，至少阐明 GOAL/MEANS/BACKGROUND、对象主题 vs 操作形式、否定/修正/引用、multi-intent vs uncertainty、current/title/recent 证据优先级。Catalog 本身边界若仍不可识别，记录 `LABEL_IDENTIFIABILITY` 并停在数据资格；只有正式边界变更需要 owner 选择，不能静默拆并 Topic。

## 2. 隔离单位不是行

分割的原子单位是 lineage component：同一作者/写作运行、原始 source/session/thread、scenario family、paraphrase family、template family、translation family、contrast/counterfactual family 的关联闭包。任何成员不能跨 TRAIN、ordinary DEV、challenge DEV、AS 或 final TEST。全部语言翻译、正负最小对、同句不同 context 变体也归同一 component。

完整 144 类在每个正式评价集合出现；“某意图在两份集合都出现”是必须的，不是泄漏。禁止的是同源具体内容/模板骨架跨集合，而不是跨集合共享标签或公共 Catalog 词汇。

至少：TRAIN 3 个独立 author/source cohorts，ordinary DEV 2 个、challenge DEV 2 个、AS 3 个；不同集合的 writers 不复用。使用公开语料时 cohort 表示有证据的 source/session lineage，而不是给同一站点随机加编号。formal Catalog 是共享公开先验，单列，不算需要互斥的 raw source cohort。单人编写的大量随机改词行只能算机制训练，不能满足独立 DEV/AS 数据资格。

Candidate writer 不负责 AS/final 的创作或 gold。所有 sealed writer 只看 Catalog、产品输入接口、label guidelines、quota/mechanism cards，不看候选、TRAIN/DEV 原文、错误分析或算法提示词。换 agent 名称但共享上下文不算隔离。

## 3. 表达机制矩阵

每个 Topic 的 TRAIN 至少 24 个独立 base scenarios，覆盖至少 8 类机制；不能由 24 次同义替换充数。以下维度交叉而非全笛卡尔积穷举：

| 维度 | 必须覆盖/对照 |
|---|---|
| 表达形式 | 直接请求、口语、短句、残句、约束优先、间接需求、问题/困难描述、结果优先、比较/权衡、纠正、引用/假设/过去事件、continuation |
| 因素组合 | action、object、goal、qualifier 独立变化；至少两种 action、三种 object 场景、三种 qualifier；留出未见组合 |
| 语言 | 中文、英文、混合语；不是先写英文再把全部集合翻译 |
| 词面/意图 | 同意图低词面重叠；不同意图高词面重叠；显式名称、无正式名称、拼写/分词变体 |
| 邻界 | 同域与跨域 near-neighbor；positive+hard negative；共享 object 但 goal 不同；共享 goal 但对象/限定不同 |
| 语用 | 否定的作用域、修正覆盖、引用属于谁、假设是否当前请求、过去事实是否当前讨论对象 |
| 上下文 | 合法 continuation、无指代信息、过期/无关 context、标题误导、前文与当前冲突、话题切换 |
| 多意图/模糊 | 可分解并存目标、竞争解释、缺少关键对象、无需归档主题的控制项 |

至少两个机制 family 对每个 Topic 在 TRAIN 中完全留出、在 ordinary/challenge DEV 中新出现；其它机制也留出 action-object-qualifier 组合。轮换留出以免某个语言或 Topic 天生只落在困难集。宏观“直接/间接”机制类别可以跨集合；具体模板骨架、scenario 与 writer 不可以。正式名称回声比例在评价集 <=10%；不把其余样本改写成刻意避开一切自然关键词。

## 4. 数据层与最低规模

以下是完整数据资格门；可以分 coherent batches 采集，但未完成 144 类时只能报告 intake 进度，不跑缩小标签空间的能力测试。

| 层 | 每 Topic 单标签 base cases | 语言最低分配（zh/en/mixed） | 用途/可见性 |
|---|---:|---|---|
| TRAIN | 24（共 3456） | 12/8/4 | 可拟合的源；统计量只由此及内部 group folds 产生 |
| ordinary DEV | 12（共 1728） | 6/4/2 | TUNE 与 CAL 按 component 拆开；不是独立资格 TEST |
| challenge DEV | 12（共 1728） | 6/4/2 | 独立交付的机制/边界压力；公开后标记 EXPOSED |
| 每代 sealed AS | 8（共 1152） | 4/2/2 | 候选批量比较一次；writer 不见逐题内容 |
| 未来 final TEST | 20（共 2880） | 10/6/4 | freeze 后新创作；额外可靠性门，不沿用 CIG 旧题 |

每份 ordinary/challenge/AS 另需 >=300 insufficient-evidence/ambiguity controls、>=144 context-required pairs、>=144 context-invariance/conflict pairs、>=144 multi-intent cases；控制项语言至少各 20%。Final 另需 >=300 controls、>=300 context pairs（required 与 invariance 各至少 150）、>=288 multi-intent cases。一个 pair 的 base/variant 不计成两份独立 scenario。数量不足为 DATA_INSUFFICIENT，绝不能用重复模板补分母。

TRAIN 也需覆盖相同安全类别，每类至少 144 个独立 scenarios。ordinary TUNE/CAL 的最低安全数量分别保证分层校准有效；不足时只能用全局/语言收缩阈值，不允许 144 个小样本专属阈值。数据最低数不是统计独立性的替代物。

## 5. Topic 边界图与 hard negatives

在看候选错误之前，由正式 Catalog 描述登记每个 Topic 至少两个同域邻居、一个跨域邻居；保留有依据的其它冲突，初始每 Topic 最多六条边以限制维护成本。方向性与边界依据单独记录。每条边至少有正向、反向及歧义情形；同一对的改写/否定/角色互换留在一个 split。

Boundary gold 不以“出现否定词就 DEFER”或“有科技词就科技 Topic”构造。只要是当前明确请求，background/means 与 goal 可来自不同 Topic；必须允许在当前输入多个跨度共同构成证据，避免仅 trailing goal 的信息损失。挑战集同时包含 lexical-overlap traps 和自然无提示表达，不让所有难例都长成同一种陷阱模板。

## 6. Provenance、去重与独立性验收

每行至少有 row_id、split、generation_id、catalog version/hash、writer_id/cohort、source_id/family、许可、scenario/template/paraphrase/translation/contrast family、语言、机制标签、输入 bundle、gold/reviewer 身份和冻结时间。Runtime 只接收输入 bundle，不接收这些 metadata/gold。

独立验证：原文 exact hash、NFC/NFKC 导出形式 hash、输入+title+recent 的 bundle hash、char n-gram/词 n-gram near-duplicate screening，以及抽样人工 template/role skeleton 审查。阈值在 TRAIN 内自检后固定；字符串相似是复核标记而非自动证明相同语义。公共 Topic 名称和必然共享的功能词单列，避免误删所有自然说法。不能基于候选得分决定拒收某条数据。

相同 current 配不同 context 的合法对照不能简单按 current-only hash 删除；它们应归同一 scenario component，整组不跨 split。新 TEST 去重由 curator 做，writer 只收汇总；不得为了去重读 consumed TEST。既有 fingerprint 不存在时披露限制，不伪造零重叠证据。

验收需 100% lineage 字段完整、0 跨 split component、0 未解释 exact/normalized duplication、所有近重复标记已独立复核、全部 Topic/语言/机制 quota 达标、gold 冻结早于候选评估。报告 reviewer exact-set agreement 及按层分歧；默认 raw agreement >=90%，低于此值先修标注指南/来源，不评判算法。这个质量门在任何预测前应用；不能看到答案后排除争议样本。

## 7. 训练、开发、校准与选择分离

Vocabulary、IDF、稀疏词权重、likelihood ratios、特征剪枝和角色词典只能拟合 TRAIN。内部超参用 TRAIN group folds；ordinary TUNE 允许工程选择但已暴露。CAL 在结构和特征冻结后，仅拟合预登记的低维 confidence/margin/abstention 参数，生成独立 parameter artifact；其 provenance 明示来自 DEV-CAL，不冒充 TRAIN-only。

challenge 一旦被开发者看过，即永久带 EXPOSED 标签。修复 challenge 可以保留回归价值，但新能力主张必须转移到新来源/作者的 sealed AS。AS 一代只提交一次冻结候选批次，不返回逐 Topic 小样本榜单、逐题错因或素材。阈值扫描、词表选择、IDF 计算不能接触 AS。

## 8. 协议实施顺序与失败处理

先实现 metadata schema、lineage conflict detector、quota auditor、scorer 数学单元、权限 allowlist，再进行新数据 intake。初期工程单元可使用虚构 ID、纯计数和无语义字符串；它们不构成 TRAIN/DEV、更不是最终 TEST。

来源/作者不足时继续采集或切换事先允许的公共来源，不给旧数据换 split 名称、不回退 same-writer 自测、不问 owner 做临时 gold。需要新付费/访问权限时按 EXECUTION_PROTOCOL 处理；没有独立数据只能报告未具备评价条件，不能宣告能力上限。

Catalog 更新须产生新 catalog identity、版本化 label map、邻界复核和 rebuild，旧 score 与新 catalog 不直接比较。未经 owner 授权不能改变正式 Topic 定义；本 package 不对 custom Topics 声称已认证能力，也不能静默删除或重写用户确认的 Topic/排除项。
