# Architecture candidates：先比较，不预选“语义感”

以下是待验证的假设，不是已经测得的 PAIA 性能排名。所有候选使用同一 144 Topic Catalog、同一合格分割、同一 scorer 和预算。稀疏向量的坐标是可读字词/模式，不是 embedding model。任何训练出的结构只允许是可解释、可确定性重建、有限且预算内的非神经参数。

## 共同输入层与独立消融

保留 original input，不修改 archive；只生成临时导出视图。比较 NFC 与受控 NFKC、case folding、空白/全角、Chinese-aware 字符边界、混合脚本与 code/URL/引用片段标记。保留否定词、标点作用域和跨度映射，不做破坏性全局 stop-word 删除或盲目繁简折叠。中文优先有无需分词词典的 code-point n-gram 对照；可比较小型固定 trie 分词，但词典也计入 1 MiB。Unicode/ICU/分词配置必须记录并作跨浏览器 parity；不能假设不同环境的 Intl.Segmenter 输出自动相同。[R1][R2]

常规候选特征预算：中文 char 1–4、英文 word 1–2 与 char 3–5 是待比较的小网格，不是全部同时上线的默认。feature pruning、document frequency、停用特征和缩放只由 TRAIN/group folds 决定。导出统计需显示来源和权重；OOV、无特征、schema/catalog mismatch 都可安全 DEFER，但不能用忽略困难输入维持高 precision。

## 家族比较

| ID / 家族 | 假设与实现范围 | 潜在收益 | 主要风险与资源代价 | 关键证伪/消融 |
|---|---|---|---|---|
| A0 controls | all-DEFER、formal-name-only；只作下界/反作弊对照 | 揭示空 precision/context safety | 没有泛化主张，不计入已探索充分性 | 所有能力门必须能拒绝全 DEFER；无名称子集单列 |
| A1 sparse retrieval | TRAIN 原型/类聚合上的 TF-IDF cosine 与 BM25，char/word 双通道，144 类全评分 | 可累计弱词面证据，不要求命中固定 action+object 合取 | bag features 不理解角色；prototype 长度/类别频次偏差；词表/postings 包体 | char vs word、Catalog-only vs TRAIN、TF-IDF vs BM25；未见机制及高词面重叠挑战 [R3][R4] |
| A2 compiled likelihood | multinomial/complement NB、平滑 log-likelihood ratio、class-discriminative positive/negative lexicon | 明确可解释正负贡献，低成本统计编译 | 条件独立假设、常用词累加过置信、class imbalance；不能把原始 NB posterior 当可靠置信度 | 无负证据 vs 有负证据；class-balanced；词频 vs 二值特征；OOV 与概率校准 [R5] |
| A3 sparse discriminative | 非神经 one-vs-rest linear / max-entropy / hinge；TRAIN group folds 拟合，输出稀疏 int16/float32 系数 | 联合权重可能解决重叠和竞争，不需要词面唯一性 | 稠密 144×V 系数易超预算；可解释性/数值稳定；少量数据过拟合 | 与 A2 相同特征；稀疏化/量化前后对照；leave-writer/source/mechanism-out |
| A4 contrastive boundaries | 正负 lexical evidence、正式邻界谓词、有限 pairwise resolver、可解释 decision list | 专门判别近邻而不是堆 synonym | 手工例外爆炸、Topic 改动级联、规则只修 DEV | 每个 resolver 要独立正/反/模糊三向证据；去掉每条规则组再测；全局回退保留144类 |
| A5 finite-state composition | bounded FST/grammar/pattern；action/object/goal/qualifier、否定/修正/引用作用域；多个候选跨度而非单一剪裁 | 捕获 bag 同构但角色不同的输入 | coverage cliff、语言维护负担、解析错误级联、regex 回溯 | parser oracle 只作诊断；full-input fallback vs hard span deletion；自然无模板 DEV，不能只用最小对 |
| A6 bounded hybrid | 至多3个 scoring/resolve 阶段；稀疏召回 + 可选结构/边界重排 + calibrated DEFER；共享词表 | 兼顾累计词面证据与结构性纠错 | 多组件成本/置信度叠加/难维护；局部增益不可转移 | 每一阶段增量消融、同预算比较、删除复杂阶段的廉价对照；无独立收益则移除 |

A1 的 BM25/TF-IDF 是同一大类的候选，不算两种本质不同算法族；A2/A3 即使都是稀疏，也须证明目标函数/决策边界差异而非仅参数重命名。A6 若只将 A1 加阈值也不算新的本质家族。

## 可附着模块，但没有默认豁免

**Hierarchy：** 比较 domain→Topic 与 flat144。不能由 domain top1 永久屏蔽其它 Topic；采用可恢复的多 domain 候选或直接 flat fallback。测候选召回上界、跨域 hard negatives、domain 错误传播；层级本身不算性能优化的证明，144 类本来很小。

**Pairwise confusion：** 初始图来自 Catalog 而非 consumed TEST。开发期可依据新公开 DEV 登记新增边，但必须有新 challenge/AS 支持，最多64个手写 resolvers 的软维护审查线。多标签并存不能被错误地当成二选一混淆。

**Context/temporal：** title/source/recent user context 与 current 分开评分，来源和跨度可追踪。时间只使用传入、版本化的相对次序/间隔，不能读本机时钟引入不确定性。context 只在当前明确 continuation/省略需要时补证，不以流行 Topic、最近输出或标题独立造成强路由；明确当前修正优先。context-current 冲突需安全处理，不能循环强化 router 自己的旧预测。来源名不是 gold 代理，必须作 source ablation 与 unseen-source 测试。

**Confidence/DEFER：** 比较 calibrated top-score、margin、证据覆盖、冲突强度、缺失关键证据标志；全局或语言共享/收缩阈值优先，拒绝每 Topic 小样本任意阈值。多标签为每个明确目标独立证据支持；不可用多个 top-k 猜测代替正确多意图。概率保证在分布迁移下不能凭一个公式获得。[R6]

**Finite statistics：** 可编译 IDF、计数、似然比、sparse weights、trie/FST、calibration lookup。不得存整份训练集作为无法预算/审计的无限检索系统；少量原型或 case memory 必须作为独立候选，计入来源、包体与更新成本，不冒充 embedding。

## 淘汰规则与比较顺序

先在同一 DATA_PROTOCOL 下做 A0/A1，再引入 A2/A3，与 A4/A5 的独立机制证据比较，最后仅组合确有互补增益的部分。这个顺序是成本排序，不是预设胜者。可以在某族失败后自动进入下一族，不需要 owner 在所有普通参数之间做选择。

每个稳定候选登记：family_id、hypothesis、与 anchor 的本质区别、feature/index/parameter digests、训练来源、runtime 依赖闭包、可解释证据格式、最多两次 repair、消融清单、总字节和 latency 测量范围。没有新的隔离增益的新增组件被删除；只有开发分数提升而 AS 不变的规则不进入晋级版本。

任何候选必须能在 index/catalog 错配、坏输入、无证据、超支持输入范围时返回可诊断 DEFER；不能调用在线兜底模型。阈值以下失败只证明该候选不够，不证明整个家族理论上不行。最终维护性比较按功能代码、规则、参数、索引、重建步骤、Catalog 修改扇出和实测资源一起审查。

[R1]–[R6] 见 RESEARCH_REFERENCES.md；没有外部论文直接证明本仓库的能力分数。
