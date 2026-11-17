---
name: corpus-annotate
description: 给语料切片标 worthyScore/scenarioTag，为微场景重建标题导读标签，落库、补向量并用评测集验收。
---

# 语料批处理标注

脚本位于 [scripts/corpus](../../../scripts/corpus)，产物 .local/annotate/<run>/。新入库后或模型/prompt 迭代时使用；本文区分实际程序行为与人工质量标准。

## 准备

- 核对数据库目标、字幕与 run；annotate 脚本会读数据库，不是纯离线零凭据程序。生产写入使用受控环境，不因运行标注取得额外生产变更授权。
- 既有任务默认 Qwen2.5-14B-Instruct-AWQ，served name qwen25-14b-awq；保留本任务模型选择，不自行换 R1 推理模型。先读 /v1/models 核实正在运行的服务，勿停用户服务或另起一份抢显存。
- .env 使用 VLLM_BASE / VLLM_MODEL（默认 http://127.0.0.1:8000/v1 与 qwen25-14b-awq）；追加变量前确认换行，不打印 API key。
- 确需起服务时在已有 vllm 环境用 `vllm serve /home/xk/models/Qwen2.5-14B-Instruct-AWQ --served-model-name qwen25-14b-awq --port 8000 --max-model-len 8192 --gpu-memory-utilization 0.92`，参数按空闲资源核对，等待就绪。

## 流程

```powershell
npx tsx scripts/corpus/annotate-clips.ts --run=run1 --limit=200
Get-Content .local/annotate/run1/clips.jsonl -TotalCount 20
# 冒烟合格再全量：
npx tsx scripts/corpus/annotate-clips.ts --run=run1
npx tsx scripts/corpus/annotate-scenes.ts --run=run1
npx tsx scripts/corpus/upsert-annotations.ts --run=run1 --dry
npx tsx scripts/corpus/upsert-annotations.ts --run=run1
npx tsx scripts/corpus/embed-scenes.ts --limit=50
# 向量冒烟后去掉 limit；补查英文向量欠账：
npx tsx scripts/corpus/embed-scenes.ts
npx tsx scripts/corpus/embed-corpus.ts
```

冒烟核对旁白低分/自然口语高分、scenario-taxonomy 枚举合法、JSON 可解析；不合格停批量，展示样例定位。模型/prompt/pipelineVersion 或输入内容变化时开新 run；沿用旧 run 只会跳过已完成的 clipid/sceneKey，不会发现文本变化。

## 实际落库与断点语义

- 切片滑窗 6、stride 5、4 组并发，失败重试一次并隔离；重叠窗口可能在 JSONL 重复出现 clipid，upsert 会去重。沿用 run 追加缺失记录，不代表重新推理“逐字节幂等”。
- annotate-clips temperature=0；annotate-scenes 当前 temperature=0.2，不能承诺新一轮输出确定性。续跑是读取已完成键而非重新生成一致结果。
- clips 输出 worthyScore/scenarioTag，落库只写 worthyScore/pipelineVersion/modelId（模型取行内或环境配置）；scenarioTag 保留在 JSONL，当前无切片标签列写入。
- scenes 按 sceneKey 更新 title/summaryZh/situationTag，不更换 sceneid。prompt 要求 title≤18 字、summary 30–60 字；代码校验并非严格同一长度范围，人工抽查不可省。
- embed-scenes/embeddingZh 与 embed-corpus/embedding 只补 NULL。身份/文字修订后，已有向量不会自动失效；需安排对应记录重算，不能直接声称覆盖正确。

## 验收

人工金标准 .local/eval/worthiness-500.csv；工具 [scripts/eval/grade-worthiness.ts](../../../scripts/eval/grade-worthiness.ts)。P≥0.85、复标κ≥0.75，记录 R 与缺考；运行时门禁当前 0.4、考卷可比较不同阈值，勿混为单一阈值。失败窗率、场景身份语义、受控标签、动态文案、两路向量水位与检索抽查单独验收。

身份导读必须描述可学习场景，不能用第一句转写冒充；生成内容查红线词。质量未过不放开上线门禁。总量/耗时随数据和环境变化，不沿用旧“过夜已跑完”作为本次结果。
