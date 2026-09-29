# Capability ladder

这是 evidence-gated 研究路线，不是代码任务清单。`研究阶段可继续`、`候选被晋级`、`产品可认证`是三种不同结论。任何候选的 capability promotion 始终需要 EVALUATION_PROTOCOL 的完整144类、70% floor及安全门。早期基线未过 floor 可被淘汰，并以失败证据开始下一已登记假设；不能将此写成能力通过。

## 共同规则

预算 R0：产品硬预算见 RESOURCE_BUDGET，任何候选无豁免。开发一代最多6架构/12稳定配置、每候选2次语义修复、一次 sealed AS batch。工程轻测试不产生 capability 证据；重门只在输入闭包、代码、参数稳定后运行一次。准入数据始终来自 DATA_PROTOCOL；不存在的数据、缺少独立性或空分母为 INCONCLUSIVE/BLOCKED，不补假数据。普通工程修复自动进行；证据事故、权限/隐私/付费/产品约束按 EXECUTION_PROTOCOL 处理。

## ZMR-00 — Refoundation registration

- Hypothesis：现有 aggregate 足以否定 v1 的迁移能力，但不足以锁定单一新架构。
- Scope：读取已允许 authority/closure；审计已知/推断/未知；建立本 package 与 CI 证据隔离，不改任何历史结果或 Router。
- TRAIN / ordinary DEV / adversarial-paraphrase-boundary DEV / AS：均不创建、不评估；只使用公开审计源。
- Metrics：必需文档齐备、唯一 status、144 Topic 与全部硬预算保持、历史 closure/status blob 未变、禁止内容读取数0。
- Budget：R0不修改；文档/元数据轻检查，不跑任何 semantic benchmark。
- Promotion gate：exact-head/main 的新 package 检查与 remote reread；文档在 main 后才启动01A。
- Failure classification：AUTHORITY_CONFLICT、PROVENANCE_MISSING、EVIDENCE_EXPOSURE、ENGINEERING。
- Repair allowance：工程/文档矛盾自动修；不得补读 TEST；暴露则隔离并记录。
- Stop rule：新权限/产品约束冲突才请求 owner；未建立 main authority 不大量编码。
- Next evidence：登记 main commit + unchanged CIG closure receipt。

## ZMR-01A — 测量与数据防线的最小工程

- Hypothesis：先让测试制度能拒绝泄漏、空分母、缩小标签集，才能可信比较算法。
- Scope：manifest/lineage/quota 元数据校验、输入读取 allowlist、固定 scorer 的数学单元、预算和状态分离；不实现语义 Router。
- TRAIN：0；ordinary DEV：0；adversarial/paraphrase/boundary DEV：0；AS：0。只允许虚构 ID 和纯计数的工程单元，不能称为语义数据。
- Metrics：跨 split writer/source/scenario/template 冲突被拒绝；144 universe pin；全DEFER、猜全部标签、单位错误、空样本、越预算、context-ignore 的门测试；确定性序列化。
- Budget：R0不变；零新增运行时模型/语义 API；unit suite 目标<60秒是工程目标而非产品耗时测量。
- Promotion gate：正反工程单元通过、allowlist 无 legacy 读取、exact-head/main receipt；复杂统计/隔离 runner 未实现的部分明确列未完成。
- Failure classification：SCORER_BUG、SPLIT_LEAKAGE_GUARD_BUG、BUDGET_GUARD_BUG、ENGINEERING。
- Repair allowance：普通工程自动修并保留失败；此阶段无“语义修复次数”。
- Stop rule：不得把 smoke PASS 当 DATA_READY；不得为演示通过伪造独立作者。
- Next evidence：工程结果和 capability=UNTESTED；随后01B完整数据准入。

## ZMR-01B — 独立开发数据资格

- Hypothesis：按 lineage/作者/机制隔离且双审的开发证据能显著降低 same-writer 自测偏差。
- Scope：先固定144 Topic标注指南、邻界图和分配，再分批 intake、双审、去重；登记sealed AS curator接口。没有最终TEST。
- TRAIN：24/Topic及安全数据；ordinary DEV：12/Topic及TUNE/CAL分离；adversarial/paraphrase/boundary DEV：12/Topic、未见机制和因子组合；AS：每代8/Topic，隔离存储，仅metadata向writer公开。
- Metrics：DATA_PROTOCOL全quota、0未解释跨split关联、reviewer agreement>=90%（预测前）、所有争议仲裁、语言/机制/来源分层完整。
- Budget：仅既有公开/获准来源；不购买数据、不取真实archive；写作/审核工时与数据量登记，owner临时gold请求0。
- Promotion gate：数据资格独立签收；编译输入闭包只包含TRAIN/Catalog；evaluation访问记录建立。
- Failure classification：DATA_INSUFFICIENT、GOLD_AMBIGUITY、LINEAGE_CONFLICT、SOURCE_LICENSE、INDEPENDENCE_NOT_PROVISIONED。
- Repair allowance：预测前最多两轮准入修订；冻结后发现错误保留原版、作新版本，不能据候选错误删题。来源可在已允许清单自动更换。
- Stop rule：不足则继续安全intake或记录数据未就绪，不以同作者模板补齐，不宣告算法 ceiling。
- Next evidence：四层manifest、quality report、source/author隔离证明；没有内容access的sealed cohort receipt。

## ZMR-02 — 小而透明的基线前沿

- Hypothesis：char/word累积稀疏证据比固定词面合取更能覆盖独立表达，同时能在预算内实现。
- Scope：A0和A1；full144 flat scoring；统一非破坏性normalization；不强加GOAL剪裁，不扩展ontology。
- TRAIN：01B冻结TRAIN及内部group folds；ordinary DEV：TUNE选小网格，CAL只校准；challenge：char/word、名称回声、未见表达、角色交换和词面overlap；AS：只在稳定批次提交，不为每个ngram配置消耗。
- Metrics：所有headline gates、每语言macro、non-name子集、候选recall@k诊断、risk-coverage curve、index/依赖字节、消融和新source/writer转移。
- Budget：R0；最多4个基线配置计入本代12配置上限；不是4份独立架构证据。
- Promotion gate：安全/资源通过且完整能力门通过才晋级候选；否则保留完整144类失败前沿，作为A2/A3可检验的anchor，不能声称A1可用。
- Failure classification：NORMALIZATION、LEXICAL_OOV、ROLE_ALIASING、SCORE_MISORDER、CALIBRATION、RESOURCE。
- Repair allowance：每候选2次针对新公开DEV的机制级修复；不得使用AS逐题信息。
- Stop rule：预算超限或修复不产生隔离收益即淘汰；不能无限加词表。
- Next evidence：冻结anchor、同数据消融、资源计数和公开失败分类，支持是否进入其它统计族的研究判断。

## ZMR-03 — 编译统计与判别边界

- Hypothesis：负证据、likelihood ratios或稀疏线性权重可以改善共享词面的误分配，而非只提高TRAIN分数。
- Scope：A2/A3；全144类别；受限feature budget；global/语言校准，不启用大规模per-Topic阈值。
- TRAIN：同一冻结TRAIN，grouped拟合/特征剪枝；ordinary DEV：既定TUNE/CAL；challenge：同词不同意图、同意图不同词、语言迁移和hard negatives；AS：与anchor/其它候选一次批量比较。
- Metrics：coverage与macro在>=95% precision下的paired delta、控制误分配、每writer/source稳定性、量化/稀疏化损失、校准误差与风险覆盖。
- Budget：R0；新增不超过4稳定配置，计入每代总上限；密集系数不享有额外内存/包体预算。
- Promotion gate：完整能力门；新增复杂度需>=2pp预登记最小重要增益或明确的安全改善，且隔离区间不支持明显退步。否则只保留更简单anchor。
- Failure classification：STATISTICAL_OVERFIT、CLASS_IMBALANCE、BOUNDARY_AMBIGUITY、CALIBRATION、SPARSIFICATION_LOSS。
- Repair allowance：每候选2次；相同假设用新seed换名不重置额度。
- Stop rule：只改善公开DEV不改善AS则退回/淘汰；不能在AS上再扫超参。
- Next evidence：同feature下A1/A2/A3对照、来源分离效果与复杂度账单；支持组合机制是否必要。

## ZMR-04 — 结构、邻界与hybrid的必要性

- Hypothesis：某些错误需要scope/角色/边界信息，而不是更大的词表；这种增益能在自然独立表达中保留。
- Scope：A4/A5/A6有限竞争；多跨度action/object/goal/qualifier、否定/修正/引用；至多3阶段hybrid；hierarchy须有144类回退。
- TRAIN：新一代预登记TRAIN或固定旧TRAIN（显式记录）；ordinary DEV：新机制工程与CAL；challenge：自然paraphrase、角色互换、pairwise边界三向、间接表达及省略；AS：新的cohort，不重用上一代selection。
- Metrics：机制消融、oracle role/candidate recall仅诊断、自然无模板子集的实际end-to-end能力、安全、parser拒判贡献、维护成本。
- Budget：R0；每代最多6候选/12配置，核心手写规则200、pairwise resolvers64、核心手写代码4000行是软复杂度审查线，不是放宽产品硬预算。
- Promotion gate：完整能力门，新增阶段具有隔离增益；仅受控最小对成功不晋级。
- Failure classification：PARSER_COVERAGE_CLIFF、GOAL_OBJECT_LOSS、PAIRWISE_EXCEPTION_GROWTH、DOMAIN_CASCADE、HYBRID_NO_GAIN。
- Repair allowance：每候选2次，自动淘汰无收益组件/候选；本质不同候选可继续，不需owner选参数。
- Stop rule：增益只来自共享模板或新增规则不改善AS，则移除；到代数/复杂度边界执行SATURATION审查。
- Next evidence：跨家族paired结果、消融、复杂度-能力前沿，为上下文/多意图整合提供可冻结基础。

## ZMR-05 — 非空洞context/multilabel与产品失败安全

- Hypothesis：有限上下文能在需要时提高能力，并且不会改变已由current确定的正确结果；多意图可明确分解而非top-k猜测。
- Scope：current/title/recent来源分离、temporal/continuation、修正优先、集合输出、calibration、损坏index/超长输入安全。
- TRAIN：含context和multi-intent的冻结源；ordinary DEV：固定TUNE/CAL；challenge：context删除/置换/冲突、title诱导、话题切换、引用过去事件、多目标/歧义；AS：新cohort或本代唯一尚未消费的批次。
- Metrics：context-required exact recall>=70%、无context对照、invariance完整输出harm=0；multi exact-set recall>=70%、set precision>=95%；controls<=2%；headline与每语言门不退步。
- Budget：R0，全部context处理计入延迟/内存；明确输入边界作为研究测量profile，不能静默变成生产截断策略。
- Promotion gate：上述非空洞门与完整能力/资源门均通过；忽略context和只输出单标签的对照必须失败。
- Failure classification：CONTEXT_IGNORED、CONTEXT_OVERRIDE、STALE_CONTINUATION、MULTI_OMISSION、UNSUPPORTED_EXTRA_LABEL、RUNTIME_FAIL_UNSAFE。
- Repair allowance：每候选2次新公开DEV修复；CAL仅做预登记参数拟合。
- Stop rule：覆盖提升开始破坏安全、资源不达标或对照同样通过，先修制度/淘汰候选，不能放宽门槛。
- Next evidence：end-to-end paired/context/multi报告、确定性和资源预资格结果。

## ZMR-06 — Pre-blind generation与freeze

- Hypothesis：有限访问的隔离开发代可在昂贵最终TEST前筛除作者/来源过拟合与不适合部署的候选。
- Scope：按代注册、同包anchor比较、grouped区间、全预算浏览器预资格；封存代码、数据闭包、校准、scorer、资源profile与可重复build。
- TRAIN/ordinary DEV/challenge：只使用本代已登记资料；AS：fresh独立一次batch；最终TEST：不存在/不读取。
- Metrics：EVALUATION_PROTOCOL完整point gates和可靠性要求、每语言/机制/作者结果、成对delta、所有资源/浏览器parity、可维护性。
- Budget：R0；AS至多一次/代；重门按evaluation_key去重；最多6代。
- Promotion gate：AS所有资格门通过、资源测量可信、freeze可重建、独立curator接入已具备；final仍需未来明确执行权限。
- Failure classification：GENERALIZATION_GAP、UNCERTAINTY_TOO_WIDE、RESOURCE_UNQUALIFIED、INDEPENDENCE_FAILURE、SATURATION_CANDIDATE。
- Repair allowance：AS后不修同包；以公开开发证据和新假设进入下一代，旧AS永久selection-consumed。
- Stop rule：到SATURATION_STOP_RULES的证据平台期或有限探索上限；不足以证明ceiling时输出未充分探索的停止状态。
- Next evidence：冻结候选、authority、curator接口、数据hash和预消费ledger准备；没有TEST文本。

## ZMR-07 / ZMR-08 — 未来最终独立TEST与收口

- Hypothesis：已过pre-blind和资源门的单一候选能迁移到freeze后独立创作的新表达；若失败，仍是有效科学结果。
- Scope：本轮仅协议。未来由隔离curator和双reviewer创造fresh packet，隔离runner一次评估，再做只读receipt核验。08汇总能力/资源结论，不部署PAIA。
- TRAIN/ordinary DEV/challenge/AS：全部冻结，只供身份验证，不再拟合；TEST：EVALUATION_PROTOCOL的fresh全144设计。
- Metrics：全部固定floor、可靠性、context、多意图、determinism与resource门；科学FAIL不能由基础设施PASS覆盖。
- Budget：R0；最多3个本质不同major generations的最终TEST槽位；每包一次claim。
- Promotion gate：所有证据/资源通过才标记有限范围的研究资格；真实用户分布未经采样，不能称已验证个人archive效果。
- Failure classification：CAPABILITY_FAIL、INVALID_EVIDENCE、PRE_CONSUMPTION_ENGINEERING、CONSUMED_EXECUTION_FAILURE、RESOURCE_FAIL。
- Repair allowance：消费后0次语义修复/重跑；pre-consumption零接触证明成立才可工程修；旧FAIL保留。
- Stop rule：同代TEST失败立即收口；不能自动重开v1或启用模型。下一major generation必须有独立开发证据与新边界，否则停止。
- Next evidence：一次性aggregate/哈希/ledger、明确qualified/FAIL/INCONCLUSIVE或有充分依据的ceiling报告，任何生产或模型方向另需owner授权。
