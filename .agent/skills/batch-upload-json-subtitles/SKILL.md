---
name: batch-upload-json-subtitles
description: 批量上传指定本地目录下的 JSON 字幕文件，并将其关联至数据库中的对应单集（Episode），同时自动清理 OSS 上对应的旧版 SRT 字幕文件。
---

# 批量上传 JSON 字幕 (Batch Upload JSON Subtitles)

此 Skill 用于帮助开发者或管理员将指定本地目录下的 `*.en-zh.word.json` 字幕文件批量上传至 OSS，自动关联至数据库的播客单集中，并清理过期的中英文 SRT 文件。

## 使用前提

1. 你需要获取用户提供的**本地包含 JSON 字幕的目录路径** (dirPath)。
2. 你需要获取目标播客的 **podcastId**。

## 执行步骤

1. **确认参数**
   如果你在上下文中没有找到 `dirPath` 和 `podcastId`，请主动询问用户提供这两个参数。
2. **运行自动化脚本**
   使用 `run_command` 工具，在终端中执行以下命令（注意将 `<本地目录路径>` 和 `<podcastId>` 替换为实际参数）：

   ```bash
   npx tsx scripts/upload-json-subtitles.ts "<本地目录路径>" "<podcastId>"
   ```

3. **结果确认与汇报**
   - 观察命令行的输出。
   - 脚本具备容错机制：未能匹配到的单集或者由于异常导致的个别上传失败不会中断整个流程。
   - 成功完成后，向用户汇报已成功上传并更新的文件数量，以及遇到的任何警告或跳过的文件。

## 底层逻辑说明（供参考）

- **文件匹配逻辑**：通过文件名（如 `20250110_Title.en-zh.word.json`）提取日期和标题，然后在数据库中查找指定播客下标题匹配（模糊匹配）的单集。
- **OSS 存储路径约定**：上传路径为 `podcastes/episodes/subtitles/{时间戳}_{随机字符串}.json`。
- **数据库更新**：成功上传后，将会把 OSS URL 和文件名更新至该单集的 `subtitleBilingualUrl` 与 `subtitleBilingualFileName` 字段，并将原本旧版中英字幕 SRT 字段（`subtitleEnUrl`, `subtitleZhUrl` 等）置空 (`null`)。
