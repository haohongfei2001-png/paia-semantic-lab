# Evaluation / calibration / independent TEST protocol

版本 `ZMR-EVAL-1.0.1`：在任何新语义数据/候选/TEST创建前修正多输出precision分母漏洞，见ZMR-01A_PRECISION_GUARD_CORRECTION.md。旧 CIG-03 的 scorer、结果、144 Topic 和70%门槛不修改。下面是新 package 的前瞻协议；没有在本轮创建未来TEST。所有比例存储为[0,1]，显示百分数必须乘100，原始 numerator/denominator 同时保存。

## 1. 固定度量与反作弊定义

对固定144类单标签集合S：N为全部合格单标签行数，A为输出恰好一个Topic的行数，B为输出任意非空Topic集合的行数，C为恰好输出正确单一Topic的行数。多输出在单标签行上算不正确，并计unsupported extra，不得以其中命中一个当正确。Coverage必须同时报告any-assignment coverage和single-assignment coverage；资格使用single-assignment coverage，错误多输出不增加可用覆盖。

- single assigned precision = C/B；B=0为null/FAIL，不是100%。所有非DEFER行均进入分母，包括错误多输出。C/A仅作为strict-single条件诊断，不能代替资格precision。
- single coverage = A/N；any-assignment coverage = B/N；single exact recall = C/N；全DEFER的coverage/recall为0。
- full144 macro recall = (1/144) sum_t(correct_single_t / gold_single_t)。任一Topic无gold是DATA_INSUFFICIENT；不得删除该Topic或只平均有预测的类。实现应报告其零贡献和不足，不能通过缺类获得分数。
- unsupported assignment rate：所有输出标签中不属于该行允许gold集合的数量/所有输出标签；另报“至少一个错误标签”的行比例。全体正式计分的single/control/multi/context-required行还必须满足global label micro precision>=0.95；controls的gold为空，所有输出均不支持。context-invariance派生变体不重复计入这个总体标签分母。
- insufficient-evidence false assignment = 有任意标签输出的control行数 / 全部control行数；此处任何Topic都错。
- multi：严格exact-set accuracy/recall、micro set precision/recall、每Topic recall、漏标签与额外标签分别计数。只有DEFER或单一top1不能满足multi能力门。
- context：required pairs中的正确完整输出比例、删除必要context后变化、置换context的安全性；current已足够的invariance/conflict pairs必须完整native输出不变，harm=0。不能只比较错误数或删掉不利字段。确定性输出不应包含时钟/随机测量值。

Canonical point gates：single assigned precision>=0.95；single coverage>=0.70；full144 macro recall>=0.70；controls false assignment<=0.02；context invariance harm=0；deterministic repeats零差异。新package额外要求zh/en/mixed的full144 macro recall各>=0.70（配额不足则未就绪）、context-required exact recall>=0.70、multi exact-set>=0.70、multi set precision>=0.95以及global label micro precision>=0.95。不能用全部语言的均值掩盖中文失败，不能用多标签猜测移出precision分母。

辅助指标：unconditional exact accuracy、risk-coverage曲线/AURC、候选recall@k（非用户输出）、对数损失/分箱校准误差、名称回声/无名称、未见writer/source/mechanism、长度与语言、DEFER reason分布、paired context deltas、每Topic recall分布。辅助分数不能替代fixed gates。

## 2. 置信度不是“分数大”

TRAIN拟合特征与统计，ordinary TUNE做结构选择；结构稳定后CAL仅拟合预登记低维score/margin/evidence/conflict阈值。优先全局/按语言共享，Topic专属阈值必须有独立足量CAL并经收缩和复杂度审查；不得在几十个样本上任意拟合144个阈值。每个calibration artifact记录source、候选hash、样本量、拟合方法和浮点/量化版本。

实现至少比较一条安全可解释的全局阈值曲线；选点约束是precision与unsafe assignment，而不是追求coverage单目标。可研究isotonic/分箱/标量logistic等非神经校准，但需足量独立CAL和可编译小表，不能把校准器变成新大型模型。Conformal或其它abstention方法的分布假设必须披露，不主张在作者/来源分布变化下自动保证风险。

## 3. 可靠性要求与不确定性

point gates不被降低。AS/final晋级还要有预登记95%区间：assigned precision下界>=0.95、control误分配上界<=0.02、coverage与full144 macro recall下界>=0.70。有限数据造成区间不够严格时为INCONCLUSIVE，不是修阈值/补易题或降低floor的理由。

保留Wilson/binomial区间作计数诊断；主要重采样单位是独立scenario/lineage，按作者/来源分块，Topic分层。预先固定seed、至少2000次重采样、缺失Topic的处理、paired候选比较方法；correlated翻译/contrast variants作为一个block。报告作者/来源的leave-one-cohort-out敏感性与有效block数量。作者只有少数时，bootstrap不能创造更多独立作者，结论只覆盖实际采样范围，不能宣称全体真实用户保证。

全零错误或全正确样本的经验bootstrap可能退化为零宽区间，不能据此宣称风险上界0或precision下界1。实现必须在评估前锁定非退化保守有限样本界、有效独立单位与依赖假设；普通行级二项界不是作者/来源依赖下的自动保证。方法尚不充分时uncertainty为INCONCLUSIVE，不后验选择最有利区间。

多配置selection预登记至多6候选/12稳定配置，使用同时区间或Bonferroni校正的比较阈值，不能择优后报告未经调整的显著性。最终至多3次major-generation尝试，overall certification的alpha支出在首包前登记（默认每次0.05/3）；不能持续增加尝试数直到偶然过关。该更严格可靠性要求属于新package，不追溯改变旧CIG verdict。

Scorer中须有反作弊单元：全DEFER、猜全部144类、正确单输出与大量错误多输出混合、只覆盖一个Topic、删空类分母、百分数/比例混淆、全部context忽略、multi只报top1、少数高precision样本、NaN/Infinity、非法Topic、duplicate label、无context样本。工程测试通过只说明公式/检查可用，不能证明未来区间实现或数据已就绪。

## 4. 便宜的pre-blind gates

| 层 | 访问与成本 | 能支持什么 |
|---|---|---|
| Inner loop | 只变更相关syntax/unit/property、manifest、几十个公开机制控制；不碰sealed数据 | 普通工程正确性与已知回归 |
| TRAIN group CV | writer/source/scenario/template分组；feature fitting在每个训练fold内 | 检查明显作者/模板过拟合；不是外部泛化 |
| ordinary/challenge DEV | 有限工程修复、校准、机制消融；公开后EXPOSED | 开发方向与能力下界诊断；不能当独立TEST |
| stable candidate gate | 输入闭包冻结、全144公开DEV、资源计数；按evaluation_key一次 | 排除不完整/无法部署的候选 |
| sealed AS batch | 每代fresh、独立、最多一次批量，anchor与候选配对 | 选择下一代/最终freeze候选；不是最终TEST |
| final TEST | freeze后独立创作、独立gold、一次消费 | 有限范围的独立最终capability结论 |

AS只能返回预登记headline、区间、与anchor paired delta及样本量足够的语言/机制粗分组（每bucket>=30独立scenario）；不返回输入、逐题预测、逐Topic小样本排名、可回推个案的错误码。分类families的粗错误交集/失败边界只能由curator预登记汇总，用于发展代比较，不能事后索取细项。被用于选择后，该AS已经consumed for selection，下一代必须换cohort。

## 5. 最终TEST协议（本轮仅设计）

先冻结唯一候选：repo commit、runtime依赖闭包、Catalog、TRAIN、calibration、compiled index、scorer、固定gates、输入/资源profile、构建环境与字节hash。候选通过资源预资格后，才向隔离curator发出只含公开产品/Catalog/标注指南/quota的创作授权。curator不得收到candidate、TRAIN/DEV原文、词表或错误信息；candidate writer不接收TEST内容。所有最终题目在候选freeze之后fresh创建，不用预先写好的备用包冒充。

最低分配见DATA_PROTOCOL：2880单标签覆盖全部144类、各语言配额，另有controls/context/multi层。作者至少3个独立cohorts；gold由至少两位非作者、非candidate的reviewer独立标注，第三位仲裁。保留自然公共许可来源与独立创作的比例/局限，不以单agent自审冒充多人gold。

TEST存放于writer不可访问的curator storage，不进入本repo公开分支/Actions artifacts。runner只给candidate产品输入字段；禁止网络、文件、时间/ID/split侧信道，不能依据测试样本ID走特殊分支。原子消费claim先于首次packet读取；所有输出由固定scorer一次汇总。重复确定性检查是同一次冻结运行的预登记部分，不是第二次调参机会。

首次接触后，即使运行崩溃也视为consumed execution failure；记录缺失结果，不自动重跑。零接触、未claim且可证明的syntax/trigger失败可自动工程修复，保留原run而非点re-run。任何candidate/scorer/data改变都产生新身份，不能偷偷替换冻包。

唯一公开产物：整包identity、时间/许可/独立性attestations、配置/代码/hash、allocation、消费ledger、固定aggregate及其hash、资源receipt和科学verdict。未来普通CI只验证允许的结果hash/元数据，不重建或读取TEST原始内容。

## 6. 总体结论边界

PASS只对本次固定Catalog、产品输入协议、数据采样和设备profile成立。没有真实PAIA archive授权，本轮不能估计真实用户的Topic先验、表达频率或上线效果。FAIL也是有效证据；invalid independence或不足量不能记成算法失败来加速ceiling结论。

TEST后不能继续围绕它优化；任何后继major architecture须用新的development evidence boundary、fresh AS和新的final packet。具体上限及停止条件见SATURATION_STOP_RULES。
