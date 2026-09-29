# ZMR-01A initial engineering checkpoint

启动先决条件已满足：ZMR-00 PR89先合并为main `2e27c7e0f36b78e61df9c72659083c8162f0f323`，随后重读remote及STATUS，exact-main zmr-allowlist-validation与evidence-scope通过，才开始本文件记录的工程。登记不是CIG-v1重开。

## 实际完成

新增独立 `packages/zero_model_refoundation/contracts.mjs` 与显式单元测试文件。实现full144唯一ID检查、既有资源数值上限检查、路径白名单/regular-file元数据检查、7种lineage跨split冲突检查、确定性JSON/evaluation-key、保留144分母的单标签point metrics。可拒绝空precision假100%、缺Topic分母、全部DEFER假通过、猜全部标签，以及状态/标签不一致。

本地Node22.16.0实测16项工程单元全部通过，无外部依赖。只使用虚构ID/计数，没有语言输入、semantic TRAIN/DEV、sealed AS或未来TEST。工程运行时长不是Router latency；不得把这个测试计时写进20ms产品门。GitHub exact-head/main的相应unit结果记录在本次PR receipt，不创建递归receipt-only PR。

## 明确未完成

ZMR-01A整体仍IN_PROGRESS，不提前进入01B或实现Router。完整多标签/control/context评分、语言/机制/来源quota auditor、真实provenance/双reviewer验收、跨generation freshness、near-duplicate screening、grouped uncertainty和多重比较、持久原子消费ledger与实际curator/runner隔离、浏览器资源测量尚未实现或未提供。metadata检查不能证明作者独立；空数据始终未就绪。

`singlePointMetrics`永远返回`certification_allowed:false`。即使其三个single point门为true，也没有完整安全、多意图、上下文、不确定性或独立泛化资格。CI已验证Catalog/CIG status/closure的旧blob身份不变；没有读取旧TEST来检查重叠。

## 后续连续Work

继续同一阶段补齐上述安全测量组件，先纯计数/元数据单元，再做01B合格intake；任何真正语义实验都等待DATA_PROTOCOL要求的全144独立分割。普通工程失败自动修，不为算法参数询问owner，不在同一会话自造“独立”数据。未来最终TEST仍只有protocol、没有内容或执行权限。

统计实现须特别防止零错误样本bootstrap退化为零宽区间：经验bootstrap全零不代表真实风险上界为0。正式实现需预登记并验证有限样本非退化保守界与cluster/dependence处理，所用有效样本/独立性假设必须明确；若无法满足，则uncertainty为INCONCLUSIVE，不能将普通二项区间误当作者/来源依赖下的保证。不得据结果后选最有利区间。
