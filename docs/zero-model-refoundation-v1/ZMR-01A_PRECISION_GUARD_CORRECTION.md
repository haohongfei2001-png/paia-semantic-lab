# ZMR-01A pre-capability precision guard correction

本修复发生于任何新语义数据、候选、AS或最终TEST创建之前，只使用虚构ID/计数的工程反例；不是semantic tuning，不触及CIG-v1历史scorer或结果。ZMR-EVAL升级为1.0.1，144类、95%precision、70%coverage/macro和所有资源预算保持。

## 发现与反例

旧新包草案用C/A计算precision，其中A只统计恰好一个预测的行。构造144个虚构ID，每ID4行：3行正确单输出，1行输出全部144ID。旧helper得到条件precision1、single coverage0.75、macro0.75，因而single point门为true，尽管有20592个unsupported标签。它的certification_allowed始终false，且没有真实capability数据，因此没有发生错误能力认证；但该分母不可用于未来资格评估。

## 修复

B为所有非DEFER行数，single assigned precision改为C/B。反例现在是432/576=0.75，明确失败；C/A只保留为strict_single_precision诊断。完整未来scorer另加全部正式计分层的global label micro precision>=95%，防止错误多输出通过跨层分母操作逃罚。派生invariance变体不重复计入总体标签分母。

新增第17项纯计数单元捕获这个混合反例。本地Node22.16.0，17/17通过；CI只运行显式允许的两个新工程文件。首次16项PASS记录仍保留，不伪装它们已经覆盖这个漏洞。合并身份、exact-head/main检查写在修复PR receipt。

## 结论边界

ZMR-01A仍IN_PROGRESS；完整control/multi/context/global precision、分组不确定性和独立数据资格尚待实现。helper仍永远certification_allowed=false。没有任何新语义Router、神经模型/embedding/LLM/API调用、真实archive访问或未来TEST内容。旧TEST没有被重读、重跑或用于寻找本反例。
