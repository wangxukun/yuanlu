---
name: corpus-ingest
description: 新剧集/字幕入库流水线（yuanlu 仓）：新播客剧集与双语字幕上传后，把新语料切成 corpus_clips 切片与 micro_scenes 场景（幂等、junk 门禁、sceneKey 稳定）的增量入库流程，含零切片诊断、验收、新切片英文向量补灌（embed-corpus 增量灌 embedding）。Use whenever 用户提到 新剧集上传、新字幕、新语料入库、补欠账、增量建库、新切片/新场景产生、only-new、build-corpus-index、新切片灌向量/embedding 补灌——入库完成后引导衔接 corpus-annotate skill 做标注。
---

# 新语料增量入库（切片 + 场景生成）

新剧集发布并上传双语字幕 JSON 后，用 `scripts/build-corpus-index.ts --only-new` 把欠账集切成切片/场景入库。幂等安全：已入库集跳过、clipid/sceneKey 稳定、音频懒切片无需任何动作。

## 流程

### ① 探测（dry，秒级）

```bash
npx tsx scripts/build-corpus-index.ts --only-new --dry
```

输出「增量模式：候选 N 集 → 待入库欠账 M 集」。M=0 → 无新语料，结束。

### ② 预览结果并识别异常

dry 逐集打印 `字幕 X 句 → 切片 Y / 微剧场 Z`。两种情况要停来看：

**a. `切片 0` 且集名像 A1/A2 初级课** → 大概率是 junk 门禁清零（minWords 5 / 时长 3s / wpm 90-240 按 B1+ 调校，A1 超短对话如 "Do you have any paper?" 约 0.9s 全被滤）。先用临时脚本核字幕格式（词级时间戳/中文是否齐全）区分「格式坏」vs「门禁清零」：格式坏 → 报用户修字幕源；门禁清零 → **已知产品决策题（低级别门槛），不擅改参数**（铁律：禁止无评测改门禁），记档跳过。注意：零切片集下次增量仍会被重扫（无行=永远算欠账）——幂等无害，分钟级可忽略。

**b. 切片数远低于 `字幕句数 × 0.8`** → 正常（门禁本就滤碎句）；低于一半 → 抽查该集字幕词级时间戳格式。

### ③ 实跑入库（分钟级）

```bash
npx tsx scripts/build-corpus-index.ts --only-new
```

每集打印 `同步：新增 N / 更新 U / 删除 D / 保留 clipid R`——增量场景下应全部是「新增」；出现大量「更新/删除」说明字幕被修正过（正常，幂等对账）。

### ④ 验收三查

```bash
# 计数对齐（切片/场景总量增长符合 dry 预告）
npx tsx scripts/tmp-clips-audit.ts   # 或轻量 count 对账
```

1. **计数**：切片/场景增量 ≈ dry 预告；
2. **门禁回放**：抽查新入库行 `isJunkClip` 应 0 违例（建库侧已折进门禁）；
3. **词级时间戳**：新行 `wordsJson` 缺失应为 0。

### ⑤ 切片英文向量补灌（必做，否则新切片在向量检索里隐身）

入库后新切片 `embedding IS NULL`——`VECTOR_SEARCH_ON=1` 的向量车道看不见它们，只能靠关键词路召回。文字已齐（enText），**无需等标注，入库完立即跑**：

```bash
npx tsx scripts/corpus/embed-corpus.ts
# embedding IS NULL 天然增量（断点续跑）；分钟级；SiliconFlow BGE-M3 ~¥0.04/千句
# 场景中文向量路不在此步——须等身份重建（见⑥），否则灌的是转写碎片
```

验收：`SELECT COUNT(*) FROM corpus_clips WHERE embedding IS NULL` 应回 0（或等于本次跳过的失败行）。

### ⑥ 衔接标注（必做，否则新切片无分数无身份、新场景无身份证）

入库只是「文字+时间戳」进库；新切片还需 worthyScore/场景标签、新场景还需身份重建 → **调 corpus-annotate skill**（`npx tsx scripts/corpus/annotate-clips.ts --run=<沿用既有 run 目录>` 断点增量：已标跳过、只标新句；随后 annotate-scenes → upsert → embed-scenes，`embeddingZh IS NULL` 天然只灌新场景）。

> 依赖时机口诀：**英文向量跟着文字走（⑤，入库即灌）；中文向量跟着身份走（⑥，标注后才灌）**。查询侧 embedding（用户意图→向量）是路由内运行时代码（`core/corpus/query-embed.core.ts`），随部署自动生效，不属于批处理范畴。

## 全量 vs 增量

| 场景                                        | 命令             | 耗时                                               |
| ------------------------------------------- | ---------------- | -------------------------------------------------- |
| 日常新集入库                                | `--only-new`     | 分钟级                                             |
| 字幕批量修正后重灌 / 门禁参数变更后全量重灌 | 无参全量         | ~90 分钟（已入库集幂等零变化，逐行 update 是瓶颈） |
| 单集排障                                    | `--episode=<id>` | 秒级                                               |

## 已知坑

- 全量重跑对已入库集**安全但慢**——日常一律 `--only-new`
- 场景写入口是 **sceneKey upsert**（M1 后）：重灌不换 sceneid，已缓存场景音频零作废
- 音频无需预切片：物理切片懒生成（首播 FFmpeg + OSS 永久缓存）
- A1/A2 超短句集被门禁清零是**已知产品决策题**，勿为「有结果」擅自放宽 minWords/minDuration（须评测集过门槛后改）
- Prisma Json 列过滤用 `Prisma.DbNull`；字幕 JSON 拉取须现签（私有桶 403）
