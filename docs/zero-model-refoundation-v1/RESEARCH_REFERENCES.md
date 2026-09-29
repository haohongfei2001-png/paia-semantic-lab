# Algorithm and protocol references

检索日期2026-09-29。以下为公开原始标准、作者研究或官方实现文档；只用于算法设计依据，不是PAIA性能证据。引用不引入这些库作为生产依赖，不授权下载模型。文档的latest/stable版本会变化，未来实现须在manifest固定实际Unicode/库/构建版本。

- R1 — Unicode Consortium, Unicode Standard Annex #15, Unicode Normalization Forms. https://www.unicode.org/reports/tr15/ 。区分canonical/compatibility normalization；NFKC可能抹去有意义差异，原始Input必须保留。
- R2 — Unicode Consortium, Unicode Standard Annex #29, Unicode Text Segmentation. https://www.unicode.org/reports/tr29/ 。中文等文本的适当分词可能需要语言tailoring；必须测试分词/字符特征而不是假设空格就是词边界。
- R3 — scikit-learn official documentation, Text feature extraction. https://scikit-learn.org/stable/modules/feature_extraction.html 。词/字符n-gram、sparse counts/TF-IDF的实现参考；拟合词表/IDF属于训练步骤。
- R4 — Manning, Raghavan, Schütze, Introduction to Information Retrieval, Okapi BM25. https://nlp.stanford.edu/IR-book/html/htmledition/okapi-bm25-a-non-binary-model-1.html 。频率饱和/长度归一化的检索评分参考，不意味着检索分数天然是Topic置信度。
- R5 — scikit-learn official documentation, Naive Bayes. https://scikit-learn.org/stable/modules/naive_bayes.html 。multinomial/complement计数统计与条件独立假设；未校准输出不能直接当可靠概率。
- R6 — scikit-learn official documentation, Probability calibration. https://scikit-learn.org/stable/modules/calibration.html 。校准需与基础拟合数据分离；本package额外禁止CAL用于词表/结构定向修复。
- R7 — scikit-learn official documentation, Common pitfalls: data leakage. https://scikit-learn.org/stable/common_pitfalls.html 。预处理与特征选择也可能泄漏；ZMR按writer/source/lineage进一步隔离。
- R8 — Ran El-Yaniv and Yair Wiener (2010), On the Foundations of Noise-free Selective Classification, JMLR 11:1605–1641. https://jmlr.org/papers/v11/el-yaniv10a.html 。risk/coverage与reject option的理论背景；其假设不是本项目跨分布风险保证。

所有候选是否适用于中文/英文/混合144 Topic Router，必须由本package的新开发证据和未来独立TEST检验。不存在从上述资料直接推导70% PAIA能力的结论。
