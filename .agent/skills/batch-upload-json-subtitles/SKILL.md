---
name: batch-upload-json-subtitles
description: 把指定目录中的词级双语 JSON 字幕关联上传到目标播客的已有剧集，清理旧 SRT 引用。
---

# 批量词级字幕上传

实现：[scripts/upload-json-subtitles.ts](../../../scripts/upload-json-subtitles.ts)。从 yuanlu 根目录运行，使用当前数据库/OSS 配置；脚本会写库并删除旧 SRT，按用户的上传授权执行。

取得源目录和 podcastId；缺少时再询问。命令：

```powershell
npx tsx scripts/upload-json-subtitles.ts "<dirPath>" "<podcastId>"
```

## 匹配与更新（以代码为准）

- 只读指定目录第一层的 `*.en-zh.word.json`；文件名必须为 **6 位 YYMMDD** + 下划线或连字符 + 标题，如 `250110_Title.en-zh.word.json`。不是旧说明中的 8 位日期。
- 匹配只用 podcastId + 标题（去非英文字母、小写），**日期虽在文件名中却不参与数据库匹配**。重名时警告并使用第一条，执行前核对重名风险。
- 目标已有 subtitleBilingualFileName 以 .json 结尾则跳过，不会覆盖修订版 JSON；替换已有 JSON 是另一个操作，不能靠重跑此脚本完成。
- 新对象为 `yuanlu/podcastes/episodes/subtitles/<timestamp>_<random>.json`；成功后更新 subtitleBilingualUrl/FileName，尝试删除旧中/英文 SRT，并将对应字段置 null。
- 文件失败隔离继续；汇报上传/跳过/异常/删除数。没有 dry-run 或自动事务回滚，不宣称异常后所有状态恢复。

字幕上传后如需入库切片/场景，再按 [.agents/skills/corpus-ingest/SKILL.md](../../../.agents/skills/corpus-ingest/SKILL.md) 操作；原脚本本身不会构建语料索引。
