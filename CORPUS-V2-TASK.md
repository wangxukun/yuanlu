# CORPUS-V2-TASK — 语料工厂 v2：本地 4090 炼制 + 云端消费 · 任务清单（定稿）

> 生成日期：2026-11-06 ｜ 基线：`yuanlu` @ cdda4007 + 2026-11-05 语义检索质量重做（工作区待提交）；生产三库实测见 §〇
> 来源：Gemini「本地语料炼金工厂」提案 + 第二轮评审（保留/改/砍）+ 对照现役管线逐条裁决（本文档即最终方案）
> 姊妹清单：`yuanlu-weapp/COMPANION-DESIGN.md`（P1 语料质量并入本清单；其 P0-1「?id= 退役」仍独立先行，勿捆绑）

---

## 〇、现状基线（2026-11-05 生产实测，全部只读审计）

| 维度              | 实测值                                                                                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 语料源            | 已发布 2,714 集；带双语词级字幕 2,173 集（80.1%）；**已入库仅 1,445 集，728 集欠账**（全部为 2026-10-28 首建日前发布，字幕抽样 5/5 可拉）                                                     |
| corpus_clips      | **82,025 条**（57 条/集）；时长 avg 6.2s / max 30s；wpm avg 155；**`isJunkClip` 门禁回放不过关 14,637 条（17.8%）**                                                                           |
| micro_scenes      | **16,369 段**（11 段/集）；3–6 句 / 15–40s（avg 33.5s）；deepDiveJson 挂载 1.7%（源头 deep-dive 全库仅 45 集）；**situationTag 被误用为节目名/CEFR 标签**（Top：C1/词汇故事/两分钟英语/VOA…） |
| OSS yuanlu/clips/ | 185 对象 / 13.3MB（懒切片）；中位 42.6KB / max 312.2KB（>280KB 的 9 个均为 ~40s 场景）；**DB↔OSS 对账零缺失零孤儿**                                                                          |
| 现役参数          | 网关：`[start−0.25s, end+0.35s]` + 150ms fade + 64kbps/24kHz/mono mp3 + ≤45s 硬闸 + 1h 签名；对象名 `yuanlu/clips/{clipid                                                                     | sceneid}.mp3`（cuid，零信息泄漏）；建库：幂等同步（保 clipid → OSS 零孤儿），scenes deleteMany+createMany（**sceneid 重灌必变**） |
| 基础设施          | RDS **PG 18.2，pgvector 0.8.1 可用未装**（一条 `CREATE EXTENSION` 即启）；工作站 i9-13900K（24C）+ RTX 4090，WSL 已有 vllm / qwen3-asr / whisperx 环境；服务器 ffmpeg 已装                    |
| 检索现状          | semantic-search = DeepSeek 扩词（30min 缓存）+ 关键词召回 + `isJunkClip` 门禁 + `rankSemanticClips` 相关性打分（2026-11-05 上线，待提交）；dict 例句 = SQL contains + JS 词边界复检；无向量   |

---

## 一、拍板口径：两轮评审合并终审

### 1.1 裁决总表

| #   | 提案（Gemini→二评修正后）                                 | 终审                            | 要点                                                                                                                                                                     |
| --- | --------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 本地 4090 做 LLM 标注（worthy/highlights/cloze/scenario） | ✅ **采纳**                     | 全案最高价值；难度不归 LLM（见 #8）；scenario_tag 收敛为 ≤30 受控枚举                                                                                                    |
| 2   | BGE-M3 + pgvector 语义检索                                | ✅ **采纳（双路）**             | `en_text`（clips）+ `zh_scene`（scenes）两列向量；检索=三路融合（向量+扩词关键词+rankSemanticClips），向量不替代倒排                                                     |
| 3   | Loudnorm 响度归一 I=-16:TP=-1.5:LRA=11                    | ✅ **采纳（改实现）**           | 短切片单遍 dynamic 会抖：**每集源音频先测 integrated loudness，切片按源响度静态补增益**；工厂与懒切片网关参数同源                                                        |
| 4   | 全量预切片上 OSS                                          | ✅ **采纳**                     | 根治首播 1–3s；~10 万对象 ≈ 5GB ≈ ¥1–2/月；网关保留兜底                                                                                                                  |
| 5   | 管线顺序：文本筛 → 再 FFmpeg → 再 embedding               | ✅ **采纳**                     | 预切片时代的省算力主干（对 Gemini 三/四步顺序的重排）                                                                                                                    |
| 6   | raw/cut/pad 审计字段 + 重叠裁剪 + Silero 打标             | ✅ **采纳**                     | `qcFlags[]`（bleed/silence/too_short/too_long/overlap_fix）；pad 默认值**不拍板**——先跑现 padding（−250/+350ms）的 bleed 率实测，再 A/B 定稿（二评 −150/+250 仅备选）    |
| 7   | 禁止工作站直连生产库；jsonl+manifest+受控 upsert          | ✅ **采纳（中间道）**           | 工作站**零生产凭据**：本地只产 jsonl；`06_upsert` 在服务器跑（SSH 执行现成 tsx 幂等框架）                                                                                |
| 8   | LLM 不打 difficulty 1–5                                   | ✅ **采纳**                     | 确定性特征（wpm 现有 + 稀有词占比 + 句长）出分，对齐现有 cefrLevel 消费面；LLM 只产 worthyScore/highlights/cloze/scenario                                                |
| 9   | 评测门槛先行（P/R、Recall@10、边界人听）                  | ✅ **采纳（改口径）**           | 「双人标注」不现实 → 单标 500 + 间隔一周复标 100 算自一致性 κ≥0.75；50 条中文 query 金标准先测当前关键词召回基线再定线（目标 Recall@10≥0.7）                             |
| 10  | 编码 AAC 48–64kbps / 44.1kHz                              | ❌ **拒绝**                     | 保持 mp3/24kHz/mono/64k：185 已缓存对象 + weapp 协议 + InnerAudioContext 兼容面全不动                                                                                    |
| 11  | WhisperX 全量重对齐                                       | ❌ **拒绝**                     | wordsJson 词级毫秒时间戳已在库；仅两子集可用：541 集无字幕源首转（M6 可选）、qcFlags 筛出的坏边界重对齐                                                                  |
| 12  | ContextClip/VocabInClip 平行表、EpisodeClipMap、refCode   | ❌ **拒绝（物理脱敏过度设计）** | corpus_clips 增量加列即可；episodeid 是幂等键/by-clip/专享门禁的承重墙，「不暴露」用 API select 契约解决（现役已如此）；倒排落为新表 `clip_vocab` 挂 corpus_clips.clipid |
| 13  | 新建 ContextScene 表、/scenes/ 独立前缀                   | ❌ **拒绝**                     | micro_scenes 就是那张表（加 embeddingZh 列）；cuid 命名已不可溯源                                                                                                        |
| 14  | Scene 2–4 句                                              | ❌ **拒绝**                     | 保持 3–6 句/15–40s（精研室 30s 体验的产品调优值，groupScenes 含缝合/断组逻辑勿动）                                                                                       |
| 15  | 5+1 stage 拆分 + run_id 断点续跑                          | ✅ **采纳（改语言栈）**         | **TS 管两头、Python 管中间**（见 1.2-③）                                                                                                                                 |

### 1.2 五条铁律（全程不变量）

1. **网页版零扰动**：一切 schema 改动 additive（可空列/新表），既有路由响应冻结；先 `prisma migrate deploy` 再灌数。
2. **weapp 合规门禁**：消费端新功能零「AI/智能/播客」字样，过 `test-compliance-redlines`（154 文件）与 45 套测试；文案口径「难度分级/挖空练习/场景标签」而非「AI 出题」。
3. **单一切片出口**：`/api/clips/{id}/audio` 是唯一音频通道，协议 `{url, duration, clipOffset}` 不变（clipOffset=cutStart）；整集直链只进 ffmpeg 参数。
4. **TS 两头、Python 中间**：`clip-core.ts` 纯函数（40+ 断言，与小程序端 `intensive-core.js` 同口径同阈值）**禁止 Python 重写**；jsonl 为语言边界：TS=01 摄取/02 切分/06 回写，Python=03 标注/04 切音/05 嵌入。
5. **先评测后上线**：每个质量类改动（worthiness/边界/场景切分/检索）先在评测集上过门槛（§五），金标准进库版本化（沿用 scene-pipeline eval 纪律，`.local/scene-benchmark` 可复用）。

---

## 二、Schema 增量定稿（M1 一次 migration 落齐）

```prisma
// ── corpus_clips 加列（全部可空/带默认，additive）──
cutStart        Float?     // 切片窗口起点（秒，含 pad）；null=回落现动态计算（computeSliceWindow）
cutEnd          Float?     // 切片窗口终点（秒，含 pad + overlap 裁剪后）
padBeforeMs     Int?       // 审计：本行实际 padding
padAfterMs      Int?
qcFlags         String[] @default([])  // bleed|silence|too_short|too_long|overlap_fix
contentHash     String?  @db.VarChar(40)  // sha256(enText + cut 边界 + codec 参数)[:16]——对象名指纹 + 幂等
pipelineVersion String?  @db.VarChar(20)  // 如 corpus-wx-v1
worthyScore     Float?    // LLM 可追溯分（0–1，非 boolean）
modelId         String?  @db.VarChar(40)  // 标注模型可追溯（qwen2.5-14b-awq@2026-11-xx）
highlights      Json?     // {v:1, items:[{surface,lemma,charStart,charEnd,zh,pos}]}（charStart/End=enText 字符偏移）
clozeData       Json?     // {v:1, slots:[{charStart,charEnd,answer,distractors[]}]}
embedding       Unsupported("vector(1024)")?  // en_text 路（BGE-M3 dense）
// 现有 startTime/endTime=raw、wpm（复用，勿加 wps）、enText/wordsJson/phonemeTags 不动

// ── micro_scenes 加列/改键 ──
sceneKey        String   @unique @db.VarChar(80)  // 稳定键 = episodeid + ":" + 首句 subtitleId（治 sceneid 重灌漂移）
embeddingZh     Unsupported("vector(1024)")?      // zh_text + scenarioDesc 路
scenarioTag     →       // M2 起由 LLM 受控枚举（≤30 个）重写；过渡期保留现值不删
// 聚合写入口从 deleteMany+createMany 改为按 sceneKey upsert（deepDive 映射与场景 OSS 音频随之稳定）

// ── 新表 ──
model clip_vocab {
  id          String   @id @default(cuid())
  clipid      String
  clip        corpus_clips @relation(fields: [clipid], references: [clipid], onDelete: Cascade)
  lemma       String   @db.VarChar(64)   // 原型/词组（take a toll）
  surfaceForm String   @db.VarChar(64)   // 句中形态（overwhelmed）
  charStart   Int
  charEnd     Int
  contextZh   String?  @db.VarChar(255)  // 本句语境释义
  @@index([lemma])
}
```

**对象名指纹规则（关键，M1 必须与列同批上线）**：`objectKey = yuanlu/clips/{clipid}-{contentHash8}.mp3`（cuid 保稳定 + hash8 使切片参数变更自动失效旧对象）。现役「clipid 不变→对象永远命中」的假设在改 pad/loudnorm 那刻即失效，此规则不能后补。场景对象名同步改用 `{sceneKey}-{contentHash8}.mp3`。**网关读序：cut 字段优先 → 回落 startTime/endTime 动态计算**（旧行为不变，旧对象仍命中）。

**pgvector migration（raw SQL）**：`CREATE EXTENSION IF NOT EXISTS vector;` + 两表加 `vector(1024)` 列 + HNSW cosine 索引（`vector_cosine_ops`，m=16, ef_construction=64）；Prisma 侧 `Unsupported` 声明，读写走 `$queryRaw/$executeRaw` 专用 repo（`core/corpus/clip-embedding.repo.ts`）。规模：~12 万句 × 1024 × 4B ≈ 500MB + 索引，RDS 实例需评估磁盘余量（M1 前查 `pg_database_size`）。

---

## 三、流水线定稿（5+1 stage · 与现有文件的映射）

```
01_ingest_word_json     TS   复用 build-corpus-index.ts 的 fetchBilingualSubtitles（现签拉 OSS 词级 JSON）
02_segment_clips_scenes TS   复用 clip-core 纯函数（buildClipsFromSuballes/groupScenes 参数不动）
                             → run_id/clips.jsonl（含 raw 边界/词级时间戳/wpm/qcFlags 初筛）
03_llm_annotate         Py   vLLM(Qwen2.5-14B-AWQ) 滑窗(上下文5句)批量：worthyScore/highlights/
                             cloze/scenario_tag(受控枚举)+scenario_desc → annotated.jsonl
04_ffmpeg_export        Py   24 核并发：现网关参数 + 源级 loudnorm 静态增益 + next_raw_start−30ms
                             overlap 裁剪 + Silero 边界校验打 qcFlags → {clipid}-{hash8}.mp3 本地暂存
05_embed_and_pack       Py   BGE-M3 双路（clips: en_text；scenes: zh_text+scenarioDesc）
                             → embedded.jsonl + vocab.jsonl + manifest(行数/哈希/参数/pipelineVersion)
06_upsert               TS   服务器执行（工作站零生产凭据）：migrate deploy 已先行 → 幂等 upsert
                             （clips 按 clipid/(episodeid,subtitleId)；scenes 按 sceneKey）+ OSS 分片
                             直传（oss2 带 STS 临时凭据或服务器中转）+ manifest 对账
```

每个 stage 读写同一 `run_id` 目录（jsonl），失败断点续跑；任何 stage 可单独重跑（prompt 迭代只重跑 03 起）。

---

## 四、阶段任务（按依赖序，M0 为 P0）

### M0 · 补欠账 + 入库质量门禁（P0，先跑，无新依赖）

- [ ] T0.1 `isJunkClip` 折进 `buildClipsFromSubtitles` 过滤参数（minWords 5 / 时长 3–40s / wpm 90–240 / 功能词在场；`build-corpus-index.ts` 传参），保持纯函数可测
- [ ] T0.2 无参全量 `npx tsx scripts/build-corpus-index.ts`（补 728 集 + 清 17.8% 低质存量；幂等同步保 166 个已缓存切片对象零作废）
- [ ] T0.3 重灌后复跑 `scripts/tmp-clips-audit.ts` 对账（预期：覆盖 2,173 集、~11–12 万句、junk 回放 ≈0、OSS 零新孤儿）
- [ ] T0.4 顺带清理：重灌产生的旧 scene 音频孤儿（现仅 19 个对象，人工核对删除）
- **验收**：切片 ≥11 万 / 场景 ≥2.2 万；`isJunkClip` 回放不过关 <1%；feed/semantic 抽样 50 条人工相关率 ≥60%（现基线 <40%）

### M1 · Schema/对象名指纹/pgvector（additive migration，网页版零感知）

- [ ] T1.1 Prisma schema 按 §二加列 + `clip_vocab` 新表 + 手写 additive migration（含 raw SQL：extension + vector 列 + HNSW）
- [ ] T1.2 `computeSliceWindow` 支持 contentHash 指纹对象名 + cut 字段读序（`clip-audio.service`/`clips/[id]/audio` 同步）；旧行为回归（null cut → 动态计算 → 旧对象名 `yuanlu/clips/{clipid}.mp3` 命中不变）
- [ ] T1.3 `micro_scenes` 聚合改按 sceneKey upsert（`build-corpus-index.ts` 写入口），存量一次性回填 sceneKey
- [ ] T1.4 `core/corpus/clip-embedding.repo.ts`（$queryRaw 读写向量 + 三路检索 SQL 骨架）
- [ ] T1.5 RDS 磁盘余量核查 + migration 部署（先部署后灌数的守恒约束）
- **验收**：`test-corpus.mjs` 全绿（新增 cut/hash 读序断言）；生产部署后网页版全路由冒烟零变化；旧 185 对象全部仍可命中

### M2 · 评测集建设 + 本地 LLM 标注流水线

- [ ] T2.1 **评测集先行**（铁律 5）：①50 条中文场景 query 金标准（含已实测的 电话预约/机场值机/面试自我介绍/安慰朋友 4 条坏例）人工标注期望命中，先跑当前关键词召回记基线；②500 句 worthiness 标注集（正负各半）+ 间隔一周复标 100 句（κ≥0.75 才可用）；③200 句边界人听集（现 padding −250/+350 vs 备选 −150/+250 的吞音/截尾率）
- [ ] T2.2 stage 01/02 改造：TS 产出 clips.jsonl（复用现函数 + qcFlags 初筛 too_short/too_long/wpm 异常）
- [ ] T2.3 stage 03 Python：vLLM 部署（WSL 现成环境，Qwen2.5-14B-Instruct-AWQ）+ 滑窗 prompt + JSON schema 校验 + 受控枚举 scenario（≤30 个，词表进库 `core/corpus/scenario-taxonomy.ts` 双端同源）+ 失败行重试隔离
- [ ] T2.4 stage 05 半程：BGE-M3 双路嵌入（M0 后 ~12 万句 + ~2.4 万场景，<1 GPU 时）
- [ ] T2.5 全量标注一轮（~12 万句 ÷ 滑窗 ≈ 2.4 万窗，14B-AWQ 吞吐估 10–20 GPU 时，隔夜跑）
- **验收**：worthy 在标注集 P≥0.85（宁缺勿滥，R 记录后调）；边界 pad 定稿（人听吞音/截尾率 <2%）；03 stage 幂等重跑（同 run_id 结果逐字节一致，temperature=0）

### M3 · 检索三路融合切换（服务端，可灰度）

- [ ] T3.1 semantic-search 加向量路（zh_scene 近邻 → 场景内 clips 展开；en_text 近邻）与现关键词路并行，`rankSemanticClips` 统一打分融合（向量分 + 词块/共现/中文命中证据分）
- [ ] T3.2 dict 例句切换 `clip_vocab` 精确倒排（lemma → 原声例句），替换 SQL contains + JS 复检
- [ ] T3.3 feed 金句 / daily-prescription / studio 召回挂 `worthyScore` 门禁（≥阈值才出库）
- [ ] T3.4 灰度开关（env FLAG：vector_on），可一键回落纯关键词
- **验收**：50 条金标准 Recall@10 ≥0.7（对比 M0 前基线）；P95 延迟 ≤现值 +150ms（HNSW 毫秒级，LLM 扩词缓存命中路径不变）

### M4 · 全量预切片 + loudnorm（本地 24 核）

- [ ] T4.1 stage 04 Python：源级 loudness 测量（每集一遍 integrated）→ 切片静态增益 + 现网关编码参数 + overlap 裁剪 + Silero 打 qcFlags（bleed/silence）
- [ ] T4.2 全量产出（worthy 通过集，估 8–10 万对象 / ~5GB / 数小时 24 核并发；下载源 ~45GB 走本地带宽）
- [ ] T4.3 懒切片网关同步 loudnorm 参数（两处同源；`buildFfmpegArgs` 加 per-source gain 注入点）——网关从此仅兜底未预切片对象
- [ ] T4.4 stage 06 服务器端 upsert（manifest 对账 + clip_vocab/highlights/embedding 回填 + OSS 上传）
- **验收**：抽样 200 对象响度极差 ≤3LU（现混源随机播放忽大忽小问题消除）；首播延迟全部 <300ms（OSS 直链命中）；DB↔OSS 对账零孤儿（tmp-clips-audit 复跑）

### M5 · 小程序消费端升级（weapp，过合规门禁）

- [ ] T5.1 特训页场景胶囊换受控枚举 scenario_tag（替换现剧集 tag 误用；词表与后端 taxonomy 同源）
- [ ] T5.2 精研室/训练室「挖空练习」消费 clozeData（charStart/End 直接切槽位；文案「挖空练习」非「AI 出题」）
- [ ] T5.3 卡片难度徽章对齐确定性难度（cefrLevel+子档），零 LLM 字样
- [ ] T5.4 词典例句/搜索结果卡片展示 scenario_desc（「当你想委婉拒绝时…」语境引导）
- [ ] T5.5 全量过 `test-compliance-redlines` + 45 套测试 + 新增消费端断言
- **验收**：npm test 全绿；真机走查新增交互零红线字样

### M6 · 可选增强（按需排期）

- [ ] T6.1 WhisperX 补 541 集无字幕源（首转 + 对齐，~700h 音频 ≈ 1–3 GPU 天，产出入库走同 pipeline）
- [ ] T6.2 坏边界重对齐子集（qcFlags bleed/overlap 命中集，WhisperX 对齐仅修边界不重转写）
- [ ] T6.3 增量水位：`episode.publishAt` watermark 或 build_jobs 表，新集发布自动进入 run 队列
- [ ] T6.4 场景标签策展后台（admin 手工纠偏 scenario_tag + worthy 误杀白名单）

---

## 五、质检与回归门槛（上线门槛，全部量化）

| 项         | 样本                          | 门槛                                                     |
| ---------- | ----------------------------- | -------------------------------------------------------- |
| 切片边界   | 200 句人工听                  | pad 定稿后吞音/截尾率 <2%；bleed（闯入下句人声）<1%      |
| worthiness | 500 句标注 + 100 句复标       | 自一致性 κ≥0.75；模型 P≥0.85（R 记录基线后调）           |
| 场景切分   | `.local/scene-benchmark` 回归 | 与现 groupScenes 基线 diff 审阅，禁止无评测改参数        |
| 语义检索   | 50 条中文 query 金标准        | Recall@10 ≥0.7（M0 前先测关键词基线入档）                |
| 响度       | 200 对象抽测                  | 极差 ≤3LU                                                |
| 对账       | tmp-clips-audit 全量          | DB↔OSS 双向零缺失零孤儿                                 |
| 合规       | weapp 门禁                    | test-compliance-redlines（154 文件）+ npm test 45 套全绿 |

## 六、成本与工时估算

| 项               | 估算                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------ |
| LLM 标注全量一轮 | 14B-AWQ @4090 ≈ 10–20 GPU 时（隔夜）；迭代重跑仅 03 起                               |
| BGE-M3 嵌入      | ~14 万条（句+场景）< 1 GPU 时                                                        |
| 预切片           | 数小时（24 核并发；源下载 ~45GB 为瓶颈）                                             |
| OSS 增量         | ~5GB ≈ ¥1–2/月；RDS 向量+索引 ≈ 0.6–1GB（M1 前核磁盘）                               |
| API 对照         | 同等标注走 DeepSeek API 一次性 ~¥100–300——本地优势在**迭代自由与零速率限制**，非省钱 |

## 七、风险与回滚

| 风险                                  | 缓解                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| LLM 标注质量漂移（prompt 迭代十几轮） | worthyScore+modelId+pipelineVersion 全行可追溯；评测集门槛拦截；jsonl 断点重跑 |
| 向量检索劣化                          | 灰度 FLAG 一键回落纯关键词；三路融合保留现 rank 打分                           |
| 对象名指纹切换致缓存失配              | cut=null 旧行走原动态计算+原对象名（命中不变）；新行才用 hash8 对象名          |
| RDS 磁盘/连接压力                     | M1 前核余量；06_upsert 批量节流（单批 ≤500 行）                                |
| sceneKey 回填错误                     | 一次性回填脚本先 dry 输出 diff 人工审；sceneid 保留不动（旧引用零破坏）        |
| 工作站安全                            | 生产凭据零落本地；OSS 上传走服务器中转或 STS 临时凭据                          |

## 八、部署顺序（每阶段独立可发布）

M0（纯重灌，零部署）→ M1（migration 先行，网页版零感知）→ M2（本地流水线 + 评测集，不触生产）→ M3（服务端灰度 FLAG）→ M4（预切片 + 网关参数同步部署）→ M5（weapp 发版，过门禁）→ M6 按需。
