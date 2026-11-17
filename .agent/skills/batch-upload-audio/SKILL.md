---
name: batch-upload-audio
description: 将指定目录的 MP3 和 JSON 元数据归集、转码 M4A，并关联上传到指定播客的已有剧集。
---

# 批量音频上传

实现：[scripts/batch-upload-audio.ts](../../../scripts/batch-upload-audio.ts)。从 yuanlu 根目录运行，使用当前数据库/OSS 配置；此脚本会写库、上传并删除旧 MP3，对应用户的上传授权范围执行。

1. 从上下文取得源目录和 podcastId；缺少时再询问。核对目录内同名 MP3/JSON、JSON 的 title 与 publishDate（YYYY-MM-DD），确保 PATH 有 ffmpeg。
2. 执行：`npx tsx scripts/batch-upload-audio.ts "<dirPath>" "<podcastId>"`。
3. 汇报脚本的成功、跳过、错误与旧音频删除数；不要把单文件失败说成全量成功。

## 实际行为

- 递归扫描时跳过名为 mp3/json 的目录；复制到根目录 mp3/、json/ 归集，原文件保留。已有归集内容参与后续处理，同名文件会覆盖，来源不同的同名文件需先检查。
- 校验成对后，ffmpeg -y 转 AAC 128kbps M4A（+faststart），覆盖已有目标；转码失败会终止流程。
- 在 podcastId 下按标题仅保留英文字母后小写匹配，并严格比较 publishAt 的 UTC 日期与 publishDate。
- 每次上传生成 `yuanlu/podcastes/episodes/audio/<timestamp>_<random>.m4a`，不是覆盖固定 OSS key；随后尝试删除原 audioFileName 指向的 .mp3，再更新剧集音频字段。已有旧 .m4a 不会被该删除条件清理。
- 脚本没有 dry-run 或事务级回滚。记录错误与部分成功，重跑前核对归集目录和已更新记录。
