# Evidence boundary

Boundary ID：`ZMR-EB-001`。本 package 与 CIG、CSL、LSR 的旧证据边界断开，不能通过改名复制旧 TEST。对源的授权按用途区分；能读取一个文档不等于能把它用于训练。

## 权限矩阵

| 资料 | 本轮读取 | 新参数/词表拟合 | 资格认证 |
|---|---|---|---|
| formal Catalog（固定 144 ID/边界） | 允许 | 可作为公开先验，版本固定 | 决定标签宇宙，不是样本证据 |
| CIG canonical STATUS / DEVELOPMENT_PLAN / closure aggregates | 允许 | 只用于问题级假设，不用于词面/Topic 定向修复 | 仅保留历史 FAIL |
| freeze 前 generic source 与已公开 DEV review | 允许 bounded audit | 不导入旧 TRAIN/DEV/index/frame 作为新数据；不把旧得分当新泛化 | 不允许 |
| 新登记 TRAIN | 在准入后允许 | 允许编译；统计/特征选择仅在 TRAIN 或其内部 group folds 拟合 | 不允许 |
| 新 ordinary DEV TUNE | 在数据资格通过后允许 | 可调结构/超参；每次访问记账 | 不允许 |
| 新 ordinary DEV CAL | 在结构稳定后允许 | 只允许预登记低维阈值/校准；不能据其逐题内容补词或规则 | 不允许 |
| challenge DEV | 首次交付独立；公开后允许开发修复 | 允许但标记 EXPOSED；不再冒充 blind | 机制压力证据，不单独资格认证 |
| architecture-selection DEV（AS） | candidate writer 不看内容/gold/逐题结果 | 不允许拟合；一次批量配置排名，有限 aggregate feedback | pre-blind development，不是最终 TEST |
| 未来 final TEST | 本轮不创建、不读取、不执行 | 永久不允许 | 未来仅隔离 runner 一次性评估 |
| 已消费 CIG-03 / CSL / LSR TEST；旧私有 80/13/35；真实 archive | 禁止输入、gold、逐题结果、逐题日志、生成器内容和相关代理信息 | 禁止 | 禁止 |

CIG-03 允许的 closure 是 `docs/compositional-intent-graph-v1/CIG-03_CLOSURE.md`；其数值和 result digest 足够本轮使用。本轮不需要下载任何 TEST packet、workflow artifact ZIP 或无范围日志，也不需要打开对应 curator 分支/PR diff。目录/tree/ref/hash 的纯元数据枚举不赋予 blob 读取权限。

## 主动防泄漏，不只依赖自觉

Manager 不 clone/解压全仓库，不用全仓库全文检索去找根因，不读取历史 TEST 生成器，不取不知道内容类型的 artifact bundle。源读取采用完整路径 + 已知 ref allowlist；拒绝 symlink、路径穿越、URL 路径和未登记文件。新 CI 通过 Contents API 只获取所需文档、Catalog、状态和本 package 工程文件；不 checkout fixtures、旧 evaluator 或真实数据。

旧 CI 对其他历史工作的验证不被偷偷删除。纯 ZMR 批次必须由 changed-path metadata 判定并绕开 legacy fixture builders；包含 ZMR 与历史 runtime/fixture 的混合批次直接失败，不允许为了让 CI 变绿读取旧盲题。更改 CI 路径属于 lab 工程，不涉及 PAIA production。

未来编译器的输入闭包必须列出 Catalog、TRAIN 文件及 calibration parameter artifact 的哈希；DEV 原始行和 sealed packet 不在 compiler 文件系统中。IDF/vocabulary/normalizer tuning 的 fitted statistics 不能从 AS/TEST 甚至其未标注全文计算。候选 runtime 在 evaluator 中禁网、禁文件读取、无 gold/样本 ID，只有产品输入字段；evaluation 输入元数据、标签、split、writer、source 和 rationale 不能进入 runtime。

## 隔离角色

Candidate writer、TRAIN authors、ordinary DEV authors、challenge authors、AS curator、final curator、gold reviewers、runner/operator 的身份及可见资料分别登记。称呼不同但共享同一会话、模板库、作者提示、上下文或候选错误记录的 agent 不算独立作者。只有 metadata/signed provenance 不能证明语义独立，须保留真实隔离运行/访问 attestations。未来 final gold 至少两位非 candidate、非题目作者的独立 reviewer；冲突由第三位解决。不能把单一 agent 的 self-adjudication 描述成第二人金标准。

独立写作从公开 formal Catalog 与产品标注指南开始，不给 writer 展示算法命中词、候选排名、训练原文、failure clusters 或 consumed TEST。隔离 cohort 可以使用经批准的独立人工流程或真正分离的工作环境；本轮没有调用新 semantic API，也没有创建或声称拥有独立 curator 数据。

## 防止“公开仓库里的 blind”

新的 sealed AS/final packet 不放进 candidate writer 可读的 main、分支、PR、Actions logs、artifact 或 Library。base64、压缩、改名不是隔离。优先使用 curator 控制且 writer 无读取权限的存储和 runner；若现有工具无法提供隔离，则记录 `INDEPENDENCE_NOT_PROVISIONED`，继续不依赖该能力的公共工程，不伪造 blind 通过。只有需要新权限/连接/付费时才向 owner 请求相应权限，不要求 owner 临时逐题标注。

公开只放整包 hash、分配数量、时间、许可、作者隔离说明、freeze 身份、消费 ledger 和预登记 aggregate。不公开可字典反查的逐题裸 hash、样本 ID/长度列表、细粒度错误码或逐 Topic 小样本误差来指导后续调参。

## 消费、事故与迁移

Runner 在首次接触 packet 前原子 claim 唯一 `evaluation_key`，写入可持久检查的 ledger。重试只允许证明 candidate 从未接触 packet 的 pre-consumption 工程失败；一旦接触即保守视为 consumed，崩溃也不能默默重跑。缓存旧 aggregate/hash verification 不产生新预测。

TEST 消费后永远不能变成 DEV；失败不允许换 scorer、删 Topic、重标已有题目、换阈值或针对结果修复同一 candidate。下一 major generation 必须先注册新的假设、数据来源边界和 freeze，使用全新 packet。既有 aggregate 可支持“覆盖不足”等问题级结论，不支持 Topic/词面定向修复。

若意外暴露 sealed 内容，立即终止该 packet 的资格用途、记录谁看见了什么（不在公开记录复述内容），保留失败/消费事实；不能把它移入新 TRAIN 或重新称作 blind。证据事故是有效性失败，不是可修的 capability FAIL。

对旧 TEST 的重复检查仅可使用隔离方已经持有且有权使用的预存防重指纹；本轮及后续 candidate writer 不得重新打开旧内容来生成指纹。若没有这种元数据，诚实披露无法证明逐行完全无重叠，使用来源/作者/情境 lineage 隔离，不声称做过不存在的去重审计。
