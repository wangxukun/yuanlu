/**
 * Script to batch upload JSON subtitles and associate them with episodes.
 *
 * Usage:
 * npx tsx scripts/upload-json-subtitles.ts <dirPath> <podcastId>
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { uploadFile, deleteObject } from "../lib/oss";

const prisma = new PrismaClient();

async function main() {
  console.log("开始批量上传 JSON 字幕...");

  const dirPath = process.argv[2];
  const podcastId = process.argv[3];

  if (!dirPath || !podcastId) {
    console.error(
      "用法: npx tsx scripts/upload-json-subtitles.ts <本地目录路径> <podcastId>",
    );
    process.exit(1);
  }

  const absoluteDirPath = path.resolve(dirPath);
  if (!fs.existsSync(absoluteDirPath)) {
    console.error(`未找到目录: ${absoluteDirPath}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(absoluteDirPath)
    .filter((f) => f.endsWith(".en-zh.word.json"));
  console.log(
    `在目录 ${absoluteDirPath} 中找到 ${files.length} 个 JSON 字幕文件。`,
  );

  if (files.length === 0) {
    console.log("没有符合格式的文件 (*.en-zh.word.json)。程序退出。");
    process.exit(0);
  }

  let uploadCount = 0;
  let skipCount = 0;
  let deleteOldCount = 0;
  let errorCount = 0;

  // 获取该播客下所有的单集以供后续匹配
  const episodes = await prisma.episode.findMany({
    where: {
      podcastid: podcastId,
    },
  });
  console.log(`在数据库中该播客下找到 ${episodes.length} 个单集。`);

  for (const file of files) {
    console.log(`\n============================================`);
    console.log(`正在处理文件: ${file}`);
    const match = file.match(/^(\d{6})[_-](.+)\.en-zh\.word\.json$/);
    if (!match) {
      console.warn(
        `[跳过] 文件名不符合格式 'YYMMDD_Title.en-zh.word.json': ${file}`,
      );
      skipCount++;
      continue;
    }

    const titleStr = match[2];
    const cleanLocalTitle = titleStr.replace(/[^a-zA-Z]/g, "").toLowerCase();

    try {
      // 匹配数据库中的单集
      const matchedEpisodes = episodes.filter((ep) => {
        const cleanDbTitle = ep.title.replace(/[^a-zA-Z]/g, "").toLowerCase();
        return cleanDbTitle === cleanLocalTitle;
      });

      if (matchedEpisodes.length === 0) {
        console.warn(
          `[跳过] 在播客 ${podcastId} 下未找到标题匹配 '${titleStr}' 的单集。`,
        );
        skipCount++;
        continue;
      }

      const episode = matchedEpisodes[0];
      if (matchedEpisodes.length > 1) {
        console.warn(
          `[警告] 找到多个标题匹配 '${titleStr}' 的单集，将使用第一个: ${episode.title} (${episode.episodeid})`,
        );
      }

      console.log(`匹配到单集: ${episode.title} (ID: ${episode.episodeid})`);

      // 检查是否已经存在 JSON 字幕
      if (
        episode.subtitleBilingualFileName &&
        episode.subtitleBilingualFileName.endsWith(".json")
      ) {
        console.log(
          `[跳过] 单集在 OSS 中已存在对应的 JSON 字幕: ${episode.subtitleBilingualFileName}`,
        );
        skipCount++;
        continue;
      }

      // 读取文件
      const filePath = path.join(absoluteDirPath, file);
      const fileBuffer = fs.readFileSync(filePath);

      // 生成 OSS 唯一文件名，根据项目中既有的规范
      // 例如：yuanlu/podcastes/episodes/subtitles/1786194786398_86eo7ua5tku.json
      const randomString = Math.random().toString(36).substring(2, 11);
      const uniqueFilename = `yuanlu/podcastes/episodes/subtitles/${Date.now()}_${randomString}.json`;

      console.log(`正在上传 ${file} 到 OSS: ${uniqueFilename} ...`);
      const uploadResult = await uploadFile(fileBuffer, uniqueFilename);
      console.log(`上传成功，OSS 地址: ${uploadResult.fileUrl}`);

      // 尝试删除旧版 SRT 字幕
      if (episode.subtitleEnFileName) {
        console.log(`正在删除旧版英文字幕 SRT: ${episode.subtitleEnFileName}`);
        await deleteObject(episode.subtitleEnFileName)
          .then(() => deleteOldCount++)
          .catch((e) =>
            console.error(`[错误] 删除 ${episode.subtitleEnFileName} 失败:`, e),
          );
      }
      if (episode.subtitleZhFileName) {
        console.log(`正在删除旧版中文字幕 SRT: ${episode.subtitleZhFileName}`);
        await deleteObject(episode.subtitleZhFileName)
          .then(() => deleteOldCount++)
          .catch((e) =>
            console.error(`[错误] 删除 ${episode.subtitleZhFileName} 失败:`, e),
          );
      }

      // 更新数据库
      console.log(`正在更新单集数据库记录 (ID: ${episode.episodeid})...`);
      await prisma.episode.update({
        where: { episodeid: episode.episodeid },
        data: {
          subtitleBilingualFileName: uploadResult.fileName,
          subtitleBilingualUrl: uploadResult.fileUrl,
          subtitleEnFileName: null,
          subtitleEnUrl: null,
          subtitleZhFileName: null,
          subtitleZhUrl: null,
        },
      });
      console.log(`文件 ${file} 处理完成！`);
      uploadCount++;
    } catch (error) {
      console.error(`[错误] 处理文件 ${file} 时发生异常:`, error);
      errorCount++;
    }
  }

  console.log(`\n============================================`);
  console.log("批量上传和更新流程执行完毕！");
  console.log(`【汇总信息】`);
  console.log(`- 成功上传: ${uploadCount} 份 JSON 字幕`);
  console.log(`- 跳过处理: ${skipCount} 个文件`);
  console.log(`- 发生异常: ${errorCount} 个文件`);
  console.log(`- 删除旧字幕: ${deleteOldCount} 份 SRT 文件`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
