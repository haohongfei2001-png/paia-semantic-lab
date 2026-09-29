# PAIA Semantic Lab — Long-Horizon Zero-Model Capability Refoundation

Package: `PAIA-ZERO-MODEL-CAPABILITY-REFOUNDATION-v1`（ZMR）；protocol `1.0.0`；登记日期：2026-09-29。

## 1. 权限、事实源与目的

登记基线为重新读取的 remote main `c98e65cfcddac138fad4d7368849638ff5478543`。GitHub remote main 始终优先于会话历史。当前 package 的唯一机器状态为 [`../../status/ZERO_MODEL_REFOUNDATION_STATUS.json`](../../status/ZERO_MODEL_REFOUNDATION_STATUS.json)；本目录 STATUS.md 只是入口，不维护第二份状态。

本 package 是 PAIA 独立研发实验室的新能力研究 authority，不是 CIG-v1 的修复轮，也不预先选定 CIG-v2、typed graph 或任何单一架构。CIG-v1 的 `PUBLIC_COMPLETE_FAIL`、CIG-03 一次性消费、CIG-04 BLOCKED 及 LSR/CSL 的失败均保持不变。历史 DEVELOPMENT_PLAN 中尚未开始 TEST 的表述是历史事实，不覆盖当前 closure/STATUS。证据审计见 [CIG_V1_AGGREGATE_AUDIT.md](CIG_V1_AGGREGATE_AUDIT.md)。

产品是 PAIA 内部近乎不可见的个人 Input Archive Router：`current input + session title + bounded recent user context -> one or more versioned known Topics OR DEFER`。不做开放世界概念发现、不做通用搜索、不创建新 Topic。研究及资格认证始终包含完整 144 个正式 Topic；不得删除困难 Topic、将来源稀疏性变成不可选 Topic 掩码、改变分母或降低 70% capability floor。

本轮 owner 授权建立长期 package，写入 main 后开始第一阶段最小工程；不授权创建、打开或执行未来最终 blind TEST，不授权生产集成。后续 Work 的公共工程连续规则见 EXECUTION_PROTOCOL。新的独立 TEST 执行权限、隔离 curator/runner 访问须在未来 execution authority 中明确登记；本次设计本身不是 TEST arm。

## 2. 不变产品约束

| 项目 | 上限/要求 |
|---|---|
| 生产 neural assets | 0 bytes |
| neural / embedding / LLM / remote semantic inference | 禁止 |
| 语义网络依赖 | 0 |
| generated semantic index | 1,048,576 bytes |
| router + 全部运行依赖 + index | 2,097,152 bytes |
| 增量内存 | 33,554,432 bytes |
| warm full-catalog p95 | 20 ms |
| cold initialization | 100 ms |
| 平台 | local-first、确定性、可重建、JS/browser |
| 禁区 | PAIA production runtime、schema、真实 archive、用户私有数据 |

这些数字不在本轮放宽。资源测量定义、尚未确定的设备范围和建议流程见 RESOURCE_BUDGET。研究工具可以使用公开 GitHub/文献；这不允许 Router 运行时调用网络，也不授权购买数据或算力。

本 package 中 zero-model 指无神经/embedding/LLM 推理依赖，并不排斥用户明确允许的有限统计编译：TRAIN 上的词频、IDF、似然比、稀疏线性权重、索引，以及独立 DEV 校准出的有限阈值。任何此类结构必须有来源、版本、字节预算、确定性重建方法；不得把外部预训练语义向量、模型输出缓存或大型语义知识库改名为“词表”。

## 3. 优先级与可检验目标

第一优先级是证据质量，其次是安全约束下的真实覆盖，最后才是复杂度增加。主要优化目标是：在 assigned precision >=95%、控制项误分配 <=2%、context harm=0、所有资源约束内，提高全 144 macro recall 与 coverage；两项最终均须 >=70%。新方案还必须证明中文、英文、混合语言、上下文依赖和多意图能力，不能靠全 DEFER 或忽略 context 获得安全通过。

不承诺纯算法一定能达到目标，也不把 v1 FAIL 当作纯算法总体不可行的证明。只有 SATURATION_STOP_RULES 的充分性与平台期条件都满足，才可输出 `ZERO_MODEL_CAPABILITY_CEILING_ESTABLISHED`。该结论限定于登记的产品、数据协议、已探索算法族和预算，不是所有可能算法的数学不可突破定理。

## 4. 长期阶段与进入规则

| 阶段 | 工作 | 进入下一阶段需要的证据 |
|---|---|---|
| ZMR-00 | 当前事实审计、协议登记、权限/CI 隔离 | canonical package 已在 main，旧 closure 未改变 |
| ZMR-01A | 元数据/分割/预算/度量基础设施最小实现 | 纯工程单元测试与 exact-head/main 检查；不构造语义 TEST |
| ZMR-01B | 新 TRAIN / ordinary DEV / challenge DEV 与隔离 selection intake | 全 144 数据资格、writer/source/模板隔离和独立 adjudication；没有数据不宣称就绪 |
| ZMR-02 | 可解释低成本基线：char/word sparse retrieval | 同一完整数据协议下的可重复前沿；不是只看训练分数 |
| ZMR-03 | 似然比、NB、稀疏线性、正负证据候选 | 相对固定 anchor 的隔离开发增益与安全界限 |
| ZMR-04 | 组合/边界/分层/多阶段 hybrid 淘汰赛 | 新机制相对 bag-only 的独立开发增益；消融必要性 |
| ZMR-05 | context、continuation、多意图、校准、资源整合 | 不可用忽略 context 或单标签退化替代的能力门 |
| ZMR-06 | 便宜但隔离的 pre-blind generations、资源预资格、freeze | 所有固定 floor、可靠性门、独立性和部署预算通过 |
| ZMR-07 | 未来 fresh independent final blind TEST | 另有执行权限且 freeze 后独立 curator 创作；本轮只设计 |
| ZMR-08 | 资格报告/停止结论/仅研究 handoff | 科学 verdict 与浏览器资源证据齐备；仍不集成生产 |

Owner 2026-09-29 standing authorization 将此表的“进入下一阶段”限定为**资格晋级**，另允许非独立 development track 在 ZMR-01B 未合格时持续实现和比较 ZMR-02–06。开发轨可以使用 writer-created/provisional TRAIN、DEV、challenge 与 Topic boundary，但必须标记 `NON_INDEPENDENT_DEVELOPMENT_EVIDENCE`，不能抵扣独立数据配额、声称 capability PASS 或形成 ceiling。见 EXECUTION_PROTOCOL 的最新授权段；产品全部硬约束和 AS/final 隔离不变。

完整逐阶段 hypothesis、数据、指标、预算、repair allowance、failure class 和 stop rule 见 CAPABILITY_LADDER。ZMR-02 至 ZMR-05 是可并行比较的机制工作流，但只有一个实现 writer；不因阶段编号而强制给前一架构补规则。能力未过关的候选可被淘汰，算法族可以更换；产品 promotion 不可跳门。

## 5. 研究规模约束

每个 development generation 预登记最多 6 个架构候选、合计最多 12 个稳定配置；同一候选最多两次有解释的开发修复。普通语法/打包错误不消耗语义修复次数，但必须保留失败记录。每代一次 sealed architecture-selection batch；小改动只走公开轻测试。最多 6 个 development generations、最多 3 个本质不同 major generations 的最终 TEST 槽位，不能为追分滚动添加槽位。最终 TEST 槽位只是协议预算，不是本轮执行授权。

至少比较三种本质不同的假设族；BM25 的三个参数设置不算三种架构。每次比较登记固定 anchor、数据、代号、计算预算与预期改进量，失败结果也入账。无需新权限的普通工程和候选淘汰自动继续；不通过反复问 owner 来转移数据设计责任。

## 6. 必交付证据与文件

EXECUTION_PROTOCOL 规定写入及连续工作；EVIDENCE_BOUNDARY 规定准入与禁读；DATA_PROTOCOL 规定数据设计；CAPABILITY_LADDER 规定晋级；ARCHITECTURE_CANDIDATES 规定候选及消融；EVALUATION_PROTOCOL 规定度量、pre-blind 和最终 TEST；RESOURCE_BUDGET 规定测量；SATURATION_STOP_RULES 规定停止；STATUS.md 指向唯一状态。

每个稳定批次只需要一个 manifest、一个结果记录和一个 PR receipt，不为每次 CI 产生递归 receipt-only PR。结果必须把 `engineering_status`、`data_qualification`、`capability_verdict`、`resource_verdict` 分开。工程 COMPLETE 不等于科学 PASS。所有新结果默认 `NOT_PRODUCTION_CERTIFIED`。
