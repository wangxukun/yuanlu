---
name: batch-upload-audio
description: 播客音频转码与 OSS 批量同步更新工具。从指定目录归集音频和JSON元数据，校验后转码为M4A，并更新至对应播客的数据库及OSS。
---

# 播客音频转码与 OSS 批量同步更新工具 (Batch Upload Audio)

此 Skill 用于帮助开发者将大量 `.mp3` 和对应的 `.json` 元数据文件进行匹配校验，并自动将音频转码为 `.m4a` 格式，最后同步到指定的 OSS 存储与数据库剧集记录中。

## 使用前提

1. 获取用户提供的**源文件根目录路径** (`dirPath`)。
2. 获取目标播客的 **podcastId** (`podcastId`)。
3. 系统环境需已安装 `ffmpeg`，并在全局环境变量 (PATH) 中可用。

## 目录与文件要求

- 在 `dirPath` 及其所有子目录中，应该包含成对出现的 `.mp3` 与 `.json` 文件。
- JSON 文件中应包含 `title` 和 `publishDate` 字段（格式例：`2025-05-30`），用于匹配数据库中 `title` 和 `publishAt` 字段相同的单集。
- 每一对音频和 JSON 应当具有完全相同的主文件名，例如 `episode1.mp3` 对应 `episode1.json`。

## 执行步骤

1. **确认参数**
   如果你在上下文中没有找到 `dirPath` 和 `podcastId`，请主动询问用户提供这两个参数。
2. **运行自动化脚本**
   使用 `run_command` 工具，在终端中执行以下命令（注意将 `<dirPath>` 和 `<podcastId>` 替换为实际参数）：

   ```bash
   npx tsx scripts/batch-upload-audio.ts "<dirPath>" "<podcastId>"
   ```

3. **结果确认与汇报**
   - 脚本执行过程中，会分别在 `<dirPath>` 下新建 `mp3` 和 `json` 两个子目录，并将相关文件归集过去。
   - 脚本会自动校验文件匹配性，并在完全匹配的情况下使用 FFmpeg 转换为 `.m4a` 格式（如遇同名目标文件则会自动覆盖）。
   - 最后会将新音频上传至 OSS，删除旧版的 `.mp3` 格式，并更新数据库信息。
   - 运行结束后，向用户汇报汇总的统计信息。

## 底层逻辑说明（供参考）

- **DB与JSON匹配逻辑**：利用 JSON 的 `title` 和 `publishDate`，精确匹配数据库中 `podcastid` 一致且 `title`、`publishAt` 相同的 `episode` 记录。
- **文件替换机制**：无论 OSS 上是否已经存在 `m4a`，脚本都会上传新的 `m4a` 覆盖更新。同时会自动清理原有的 `mp3` 文件。
- **OSS 路径**：遵循现有的 OSS 目录规范，自动生成唯一文件名（如 `yuanlu/podcastes/episodes/audio/{时间戳}_{随机字符串}.m4a`）。
