---
name: corpus-annotate
description: 语料批处理标注流水线（yuanlu 仓）：给新增切片打 worthyScore/场景标签、给微场景补办身份（标题/导读/scenarioTag）、落库、灌向量、考卷验收的完整过夜批流程。Use whenever 用户提到 新切片标注、场景身份重建、worthyScore 标注、语料标注、给场景补身份证、过夜标注批、新语料入库后处理——包括 build-corpus-index 补新集之后、或提到 4090/vLLM/Qwen 标注、T2.3。
---

# 语料批处理标注流水线

对 corpus_clips（worthyScore + scenarioTag）与 micro_scenes（title/summaryZh/situationTag 身份重建）跑本地 4090 Qwen 批标注，再落库、灌场景向量、考卷验收。管线脚本都在 `scripts/corpus/`，产物在 `.local/annotate/<run>/`。

## 什么时候跑

- `build-corpus-index` 补了新集（新增切片/场景没分数没身份）
- 场景搜索/推荐需要 worthyScore 门禁数据
- 上一次考卷（P≥0.85）没过、prompt 迭代后重标

## 阶段 0 · 准备

1. WSL 起推理服务（独立窗口，全程别关；日志出现 `Uvicorn running` 才算就绪）：

```bash
conda activate vllm
vllm serve /home/xk/models/Qwen2.5-14B-Instruct-AWQ \
  --served-model-name qwen25-14b-awq --port 8000 \
  --max-model-len 8192 --gpu-memory-utilization 0.92
```

2. Windows 连通性自检：`curl -s http://127.0.0.1:8000/v1/models | head -c 200` 返回含 `qwen25-14b-awq`。
3. `yuanlu/.env` 确认两行（**先确认文件末行有换行符再追加**——历史上 FLAG 粘进 API key 的坑）：

```
VLLM_BASE=http://127.0.0.1:8000/v1
VLLM_MODEL=qwen25-14b-awq
```

**模型选型纪律：只用 Qwen2.5-14B-Instruct-AWQ，不要换 DeepSeek-R1-Distill-32B**——本任务是打分/贴标签/按模板写三件套（判断题非推理题），R1 蒸馏系先吐长 `<think>` 再作答：JSON 模式打架、吞吐塌 3-10 倍、temperature=0 幂等重跑失效。质量疑虑用考卷验收兜底，不过再升 Qwen 更大 Instruct 档。

## 阶段 1 · 冒烟（必做，5 分钟）

```bash
npx tsx scripts/corpus/annotate-clips.ts --run=run1 --limit=200
head -20 .local/annotate/run1/clips.jsonl
```

过关三眼：旁白句（_Now let's hear..._）`w` 0.0-0.3；自然口语句 `w` 0.7-1.0；`s` 全是 `core/corpus/scenario-taxonomy.ts` 30 枚举之一。不过关 → 停，把样例给用户看，别放全量。

## 阶段 2 · 切片全量（约 10-20 GPU 时）

```bash
npx tsx scripts/corpus/annotate-clips.ts --run=run1
```

- 滑窗 6 句/stride 5；JSON 校验 + 重试 1 次 + 窗口隔离（失败率 <5% 属正常）
- **断点续跑**：中断后重跑同命令自动跳过已标句。**增量标注沿用同一 run 目录**（已标跳过、只标新句）；仅当 prompt/模型/pipelineVersion 变更时才开新 run 目录

## 阶段 3 · 场景身份重建（约 2-4 小时，接续跑）

```bash
npx tsx scripts/corpus/annotate-scenes.ts --run=run1
```

抽查 `scenes.jsonl`：`title` 是场景化标题（如「机场值机行李超重交涉」）非第一句转写；`summaryZh` 30-60 字；红线词（AI/人工智能/播客）判废重试。

## 阶段 4 · 收数链（顺序执行，勿跳）

```bash
# 1) 落库（可 --dry 先看统计）：worthyScore/pipelineVersion→clips；title/summaryZh/situationTag→scenes（按 sceneKey）
npx tsx scripts/corpus/upsert-annotations.ts --run=run1
# 2) 场景 zh 向量（title+导读+句译文 → SiliconFlow BGE-M3；embeddingZh IS NULL 天然增量）
npx tsx scripts/corpus/embed-scenes.ts --limit=50   # 冒烟后去 limit 全量
```

3. **考卷验收**：用 `.local/eval/worthiness-500.csv`（人工正本）给模型分数判 P（worthy≥0.5 预测「值得学」），门槛 **P≥0.85**；不过 → 迭代 prompt 重开 run，不许带病上线。
4. 收尾：T3.3 worthyScore 门禁生效检查（feed/match 召回挂 `worthyScore >= 阈值`）+ 场景搜索抽查 + 通知用户 DevTools 验收。

## 验收门槛汇总

| 项              | 门槛                                       |
| --------------- | ------------------------------------------ |
| 冒烟 jsonl      | 旁白低分/口语高分/枚举零编造               |
| 窗口失败率      | <5%（隔离不污染）                          |
| worthiness 考卷 | P≥0.85（宁缺勿滥）                         |
| 幂等重跑        | 同 run 同句逐字节一致（temperature=0）     |
| 场景身份        | 标题场景化/导读 30-60 字/枚举合法/零红线词 |

## 已知坑

- `.env` 追加前确认末行有换行符（FLAG 粘 key 教训）
- WSL 服务窗口与 Git Bash 跑批窗口要同时活着；屏幕可锁窗口不可关
- vLLM 首次加载权重 1-2 分钟，别抢跑
- Prisma Json 列过滤用 `Prisma.DbNull` 不是 `null`
