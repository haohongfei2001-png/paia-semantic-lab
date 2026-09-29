# 消费级资源预算与测量

## 判断：本轮全部保留，不擅自放宽

既有1MiB/2MiB/32MiB/20ms/100ms作为研究约束继续适用。CIG closure只有index 76,827bytes、router+index 86,105bytes的观察，不能证明memory/latency/browser已经过关，也不能证明更强架构一定能满足预算。没有新实测和产品收益对照，不存在足够证据放宽这些数字。

| 硬约束 | 计量闭包 |
|---|---|
| neural assets=0 bytes；semantic network=0 | runtime、lazy-loaded依赖、worker、fallback、词表/索引来源全部审计 |
| index<=1,048,576 bytes | 全部词表、postings、字典、统计权重、FST、原型、校准表、需要分发的semantic metadata；不能藏到另一个包 |
| router+index<=2,097,152 bytes | 生产发布的全部非平台运行依赖与index的未压缩字节；另报gzip但不以压缩比规避预算 |
| incremental memory<=33,554,432 bytes | 相同空白worker/app baseline的差值；初始、warm、峰值、长序列后保留量；包括typed arrays/string/object和解析临时副本 |
| warm full-catalog p95<=20ms | 输入normalization、所有当前/title/recent特征、144类scoring、resolver/calibration、输出序列化的端到端调用 |
| cold init<=100ms | 已在本地的发布资产首次载入/解析、表构建、worker初始化至可分类；另报首次完整请求耗时，不以延后工作伪装fast init |

实例性的容量核算，不是性能实测：144×20,000个float32密集系数约11.0MiB，单这一项已经超过index预算。因此应比较稀疏postings、定点权重、共享词表和有限feature budget。量化/剪枝后的能力必须重新验证，不能假设压缩无损；剪特征可以，删Topic不可以。

## 测量计划

在任何最终TEST前完成browser资源预资格。每个稳定候选先做静态byte计数和确定性build，早淘汰超预算方案；再做端到端Node与浏览器profiling。CI托管Ubuntu的耗时只属于工程观测，不得当消费级设备认证。

每份资源receipt固定：硬件/内存/OS、电源/节流状态、browser/JS engine/Unicode实现、bundle/index hash、构建参数、输入profile、计时方法、baseline、样本数、warmup、重复session、GC方式、结果区间。参考设备应覆盖实际PAIA支持范围的较低配置与典型配置；登记时尚未确认可用真实设备，故状态必须NOT_QUALIFIED。4倍CPU节流可作诊断，不能替代真实低配测量。

研究测量profile前瞻使用current长度128/512/2048/8192 Unicode scalar values，title至256，recent分别0/4/8条、每条至1024；中文/英文/混合、引用/code长段、重复字符、combining marks和长标点链分别测量。这是研究压力范围，不是擅自设定生产截断策略；实际支持上限需与产品输入规范锁定。超支持范围返回可诊断DEFER，不悄悄截掉决定gold的内容。

每个profile至少1000次warm调用、50次独立cold初始化、3个独立measurement sessions；保持144类全量候选和实际context处理。计时含normalization且不得只测缓存命中；强制GC只用于memory baseline，不夹在每次latency测量中。报告p50/p95/p99/max与分profile结果，不能用短输入平均值掩盖长输入超限。保留10000次调用后的内存稳定性和异常输入超时检查。正式支持profile逐项通过才合格。

浏览器/Node输出parity包括topic集合、state、确定性confidence/解释字段；浮点系数排序固定，输出Topic按稳定ID序列，tie policy确定。Unicode版本导致分词差异时用冻结的可解释fallback或回到更简单code-point特征，不要求普通用户安装组件。

## 可维护性与Catalog更新

必须提供一条无网络的确定性重建命令；锁定源、排序、locale、数值精度、依赖版本与seed；两次构建字节相同。记录handwritten core LOC、规则/每Topic例外数、feature/posting数、index增量、重建时长、Catalog单个边界变更的影响扇出与更新步骤。4000核心行/200手写规则/64pairwise resolvers是触发审查的软线，非鼓励把代码压行；生成表单独计量。

Catalog版本变更需新的index与映射、影响测试、全144回归与必要的新证据边界；没有匹配版本则DEFER。不能让局部Catalog改动要求手改几十个特殊case。研究artifact与正式Topic定义分开，用户确认的assignment/exclusion不能由统计权重覆盖。

## 放宽建议的门

只有在同一独立开发协议下展示预算内Pareto frontier、每额外MiB/ms的实际能力收益、目标设备失败证据、维护/更新成本和更简单候选的替代结果，才能向owner提出具体预算调整建议。尚未做这样的实验，所以本轮结论是RETAIN_ALL_LIMITS。达到预算边界本身不证明纯算法理论极限，见SATURATION_STOP_RULES。
