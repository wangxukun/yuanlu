---
name: corpus-ingest
description: 新剧集或双语字幕上传后增量构建 corpus_clips/micro_scenes、诊断零切片、验收并补灌英文向量；随后衔接标注。
---

# 新语料入库

从 yuanlu 根目录运行；实现 [scripts/build-corpus-index.ts](../../../scripts/build-corpus-index.ts) 与 [core/corpus/clip-core.ts](../../../core/corpus/clip-core.ts)。命令使用当前 .env/进程环境中的数据库与 OSS 配置，先确认目标环境。

## 增量流程

```powershell
npx tsx scripts/build-corpus-index.ts --only-new --dry
npx tsx scripts/build-corpus-index.ts --only-new
npx tsx scripts/corpus/embed-corpus.ts
```

先查看 dry 的待处理集及逐集字幕/切片/场景数，再实跑。dry 仍读取字幕与数据库，只是不落库。--only-new 按 corpus_clips 是否存在该剧集的行筛选；已发布但缺字幕/零切片集仍可能反复被选中，“待入库 N”不等于可成功新增 N。

验收新切片/场景数量、wordsJson、同源 isJunkClip 回放、英文 embedding 空值覆盖；音频无需另预切，网关懒生成。无新数据也核对是否有上次未补完的向量/标注。

## 异常与重建

- 零切片先检查词级时间戳/译文格式与门禁。A1/A2 超短句可能被 minWords/minDuration/wpm 滤掉；不得为有结果无评测放宽门槛。
- 字幕修正不能用 --only-new 更新已存在集；用 `--episode=<id> --dry` 预览，再指定单集实跑。无参是全量，不是增量。
- 切片按稳定键同步保 clipid；场景按 sceneKey upsert 保 sceneid。重建也会更新/删除陈旧行，不能称为“只新增、无删除”。cut/contentHash 与词级时轴的维护见 clip-core.ts。
- 私有桶字幕现签；Prisma JSON 空值按实际语义区分 Prisma.DbNull，不用普通 null 假定同义。

## 向量与标注依赖

英文向量跟文字走，可入库后即跑 embed-corpus；中文场景向量跟身份走，先按 [corpus-annotate](../corpus-annotate/SKILL.md) 完成标注与身份落库，再 embed-scenes。

两份 embed 脚本只扫描 NULL 向量，已有英文/标题/导读改变不会自动重算向量；修订输入时安排对应行重算，不能宣称重跑即更新全部向量。相同 run 的标注也按 clipid/sceneKey 跳过已完成项，文本变化应核对是否需要新 run。

水位是实时数据库状态，不写固定总量/耗时/价格。模型、门禁与评测要求见 [语料索引](../../../语料工厂任务清单.md)。
