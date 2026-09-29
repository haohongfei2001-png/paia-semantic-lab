# Zero-model saturation / stop rules

“纯算法极限”必须是可证伪的操作性结论，不能是无穷补规则，也不能在数据不足时先宣布失败。目标域、144类、产品预算和安全门固定；证据来自新的独立development generations，绝不倒查consumed TEST。

## 1. 有限探索账本

默认最多6个独立development generations；每代最多6个架构候选、12个稳定配置、每候选2次语义修复、一次sealed AS批量。最早第3个合格generation后可审查saturation。至多3个真正不同major generations使用最终TEST，所有失败保留；小改动、换随机seed、换阈值不配新TEST。扩大这个研究预算需要明确的新增假设/价值论证，不能以“差一点过线”为由续命。

每代登记独立writer/source/scenario/template cohort、各家族hypothesis、冻结anchor、修复次数、资源和访问账本。不能把同一DEV反复重采样叫新一代。相同embedding-free技术的参数变体不算新的本质算法族。

## 2. 最小重要提升与可比较性

主要最小重要提升MIE预设为full144 macro recall和single coverage均增加2个百分点，同时precision>=95%、unsafe controls<=2%、context harm=0且预算不超。若主张安全改善而非覆盖改善，必须预登记单独安全目标且覆盖/macro不退步，不得事后改目标。

不同generation的数据不同，不能直接把两次headline分数相减来判断平台。每代在同一fresh AS上运行冻结incumbent/anchor与全部候选，使用相同lineage blocks的paired delta及预登记同时95%区间。跨代报告相对固定anchor与incumbent的变化，保留语言/机制/来源差异和不确定性。区间太宽不能解释为“没有提升”。

## 3. 充分性条件：全部必须满足

S1：至少3个合格独立development generations，全部144Topic/三语言/机制/边界/context/multi/控制层配额与独立审查通过，未用同writer模板伪装独立。

S2：至少3种本质不同假设族被公平探索，必须包括累积稀疏统计、具有不同学习/判别假设的统计边界，以及结构/有限状态/对比组合路线；至少一个受限hybrid检验互补性。每族都有相同数据/资源约束下可运行的非草率实现、有效消融和允许的修复。实现尚未完成或数据错误不是“家族已耗尽”。

S3：最近连续3个合格generation，最佳预算内挑战者对incumbent的paired同时95%区间上界均低于MIE，且没有任何关键语言、context/multi或安全层存在可靠的>=MIE未采用改善。即证据能够排除有意义增益，而非只看到p>0.05。

S4：不同家族在预登记的粗机制失败层呈现相近能力边界；由隔离AS curator计算可汇总的错误重叠/层级指标（每bucket>=30独立scenario），再用新公开challenge作机制对照。不能要求逐题或逐Topic小样本信息，更不能用最终/旧TEST细节证明这一条件。相同headline但错误互补时必须检验预算内hybrid，不能过早称平台。

S5：资源-能力与复杂度-能力前沿已实测：额外coverage/recall开始可靠损害precision/unsafe assignment，或进一步扩张超出固定资源；新增规则/词表只改善TRAIN/已暴露DEV而不改善fresh AS。对简单方案、删组件方案和压缩方案已有对照，不只是主观觉得系统复杂。

S6：没有未解释的label identifiability、source不足、CI/scorer单位错误或独立性缺陷；有效样本/区间足以支持S3。实际设备资源证据有缺口时，不能声称已证明资源边界。

## 4. 允许的停止结论

当S1–S6全部成立，生成不可省略的结论：

`ZERO_MODEL_CAPABILITY_CEILING_ESTABLISHED`

报告必须列出限定scope、Catalog/hash、探索的算法族与被排除方案、所有代/候选/修复账本、paired区间、错误边界、coverage-precision/资源Pareto frontier、最佳预算内candidate和它是否达到70%floor、反例/未知点、什么新证据可以推翻结论。这个结论不是“任何纯算法永远做不到”的数学证明；它是当前产品预算与系统性探索证据支持的工程能力上限。即使best candidate已超过floor，也可能已达到当前有证据的平台。

其它终态必须区分：

- `CAPABILITY_QUALIFIED_WITHIN_SCOPE`：独立TEST和资源门通过，研究可交付；不能因此宣告已达到ceiling。
- `EXPLORATION_INCOMPLETE_RESOURCE_STOP`：6代/研究资源耗尽，但S1–S6不足；诚实停止，不把缺证据改成ceiling。
- `DATA_OR_INDEPENDENCE_INSUFFICIENT`：没有合格外部分割或有效gold，不能推断算法上限。
- `CANDIDATE_REJECTED`：单一候选/家族的当前实现失败，自动按已登记计划换候选；不是整个项目失败。
- `INVALID_EVIDENCE`：泄漏/冻结违规/scorer失效；封存、说明影响，不能当capability FAIL计入平台代数。

达到停止条件后，不无限添加规则，也不自动启用模型。轻量模型可能的收益没有在本轮测试，不能凭想象做成本优势结论；只能形成后续模型路线评估建议，进入模型、remote API、付费或生产访问均须新的owner授权。真正互斥的产品/architecture fork交由owner决定，其余普通候选淘汰由protocol处理。

## 5. 推翻ceiling结论的合格反证

新许可的数据来源/更可靠标注显著扩展了先前未覆盖的表达机制；本质不同且可在相同预算部署的算法；或在fresh独立development cohorts上对冻结incumbent有>=MIE的可靠安全增益，均可支持登记新的package。不能用旧TEST过拟合、新名字、更多同源模板或偷偷提高预算来声称推翻。
