/**
 * Script to batch transcode MP3 to M4A and upload to OSS, associating them with episodes.
 *
 * Usage:
 * npx tsx scripts/batch-upload-audio.ts <dirPath> <podcastId>
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { uploadFile, deleteObject } from "../lib/oss";

const prisma = new PrismaClient();

// Helper to recursively find files
function findFilesRecursively(
  dir: string,
  extension: string,
  fileList: string[] = [],
): string[] {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      // Avoid looping into our own created directories if they already exist
      if (file === "mp3" || file === "json") continue;
      findFilesRecursively(filePath, extension, fileList);
    } else if (file.endsWith(extension)) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

async function main() {
  console.log("开始批量音频转码与 OSS 同步上传流程...");

  const dirPath = process.argv[2];
  const podcastId = process.argv[3];

  if (!dirPath || !podcastId) {
    console.error(
      "用法: npx tsx scripts/batch-upload-audio.ts <本地目录路径> <podcastId>",
    );
    process.exit(1);
  }

  const absoluteDirPath = path.resolve(dirPath);
  if (!fs.existsSync(absoluteDirPath)) {
    console.error(`未找到目录: ${absoluteDirPath}`);
    process.exit(1);
  }

  // 1. 归集文件
  const outMp3Dir = path.join(absoluteDirPath, "mp3");
  const outJsonDir = path.join(absoluteDirPath, "json");

  if (!fs.existsSync(outMp3Dir)) fs.mkdirSync(outMp3Dir, { recursive: true });
  if (!fs.existsSync(outJsonDir)) fs.mkdirSync(outJsonDir, { recursive: true });

  const allMp3Files = findFilesRecursively(absoluteDirPath, ".mp3");
  const allJsonFiles = findFilesRecursively(absoluteDirPath, ".json");

  console.log(
    `检索到 ${allMp3Files.length} 个 MP3 文件 和 ${allJsonFiles.length} 个 JSON 文件。`,
  );

  // 拷贝文件至归集目录 (忽略已经在归集目录内的)
  allMp3Files.forEach((filePath) => {
    if (!filePath.startsWith(outMp3Dir)) {
      fs.copyFileSync(filePath, path.join(outMp3Dir, path.basename(filePath)));
    }
  });

  allJsonFiles.forEach((filePath) => {
    if (!filePath.startsWith(outJsonDir)) {
      fs.copyFileSync(filePath, path.join(outJsonDir, path.basename(filePath)));
    }
  });

  // 2. 校验文件匹配性
  const mp3Names = fs
    .readdirSync(outMp3Dir)
    .filter((f) => f.endsWith(".mp3"))
    .map((f) => path.basename(f, ".mp3"));
  const jsonNames = fs
    .readdirSync(outJsonDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.basename(f, ".json"));

  console.log(`\n--- 匹配性校验 ---`);
  console.log(`mp3目录文件数: ${mp3Names.length}`);
  console.log(`json目录文件数: ${jsonNames.length}`);

  const mp3Set = new Set(mp3Names);
  const jsonSet = new Set(jsonNames);

  const missingJson = mp3Names.filter((name) => !jsonSet.has(name));
  const missingMp3 = jsonNames.filter((name) => !mp3Set.has(name));

  if (missingJson.length > 0 || missingMp3.length > 0) {
    console.error(`[错误] 文件匹配性校验失败！`);
    if (missingJson.length > 0) {
      console.error(
        `以下 MP3 文件缺少对应的 JSON 文件 (${missingJson.length}个):`,
      );
      missingJson.forEach((name) => console.error(`  - ${name}.mp3`));
    }
    if (missingMp3.length > 0) {
      console.error(
        `以下 JSON 文件缺少对应的 MP3 文件 (${missingMp3.length}个):`,
      );
      missingMp3.forEach((name) => console.error(`  - ${name}.json`));
    }
    process.exit(1);
  }

  console.log(`校验通过，所有文件完全匹配。`);

  // 3. 批量转码
  console.log(`\n--- 批量转码 (MP3 -> M4A) ---`);
  for (const name of mp3Names) {
    const mp3Path = path.join(outMp3Dir, `${name}.mp3`);
    const m4aPath = path.join(outMp3Dir, `${name}.m4a`);
    console.log(`正在转码: ${name}.mp3`);
    try {
      // -y to overwrite if m4a already exists
      // -vn to ignore video streams (album art) which causes issues in m4a conversion
      execSync(
        `ffmpeg -y -i "${mp3Path}" -vn -c:a aac -b:a 128k -movflags +faststart "${m4aPath}"`,
        { stdio: "pipe" },
      );
    } catch (err: unknown) {
      console.error(`[错误] 转码失败: ${name}.mp3`);
      const e = err as Error & { stderr?: Buffer };
      if (e && e.stderr) {
        console.error(e.stderr.toString());
      } else {
        console.error(e);
      }
      process.exit(1);
    }
  }
  console.log(`所有文件转码完成。`);

  // 4. 剧集匹配与 OSS 上传更新
  console.log(`\n--- 匹配剧集并上传至 OSS ---`);
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

  for (const name of jsonNames) {
    console.log(`\n============================================`);
    console.log(`正在处理: ${name}`);
    try {
      const jsonPath = path.join(outJsonDir, `${name}.json`);
      const jsonContent = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

      const title = jsonContent.title;
      const publishDateStr = jsonContent.publishDate; // e.g. "2025-05-30"

      if (!title || !publishDateStr) {
        console.warn(`[跳过] JSON 缺少 title 或 publishDate 字段`);
        skipCount++;
        continue;
      }

      const cleanLocalTitle = title.replace(/[^a-zA-Z]/g, "").toLowerCase();

      // 在内存中匹配剧集 (同时校验 publishDate 和 去除非字母字符后的 title)
      const targetEpisode = episodes.find((ep) => {
        if (!ep.publishAt) return false;
        const dbDateStr = ep.publishAt.toISOString().split("T")[0];
        if (dbDateStr !== publishDateStr) return false;

        const cleanDbTitle = ep.title.replace(/[^a-zA-Z]/g, "").toLowerCase();
        return cleanDbTitle === cleanLocalTitle;
      });

      if (!targetEpisode) {
        console.warn(
          `[跳过] 未在数据库找到匹配的剧集 (title: ${title}, publishDate: ${publishDateStr})`,
        );
        skipCount++;
        continue;
      }

      console.log(
        `匹配到剧集: ${targetEpisode.title} (ID: ${targetEpisode.episodeid})`,
      );

      // 上传新文件
      const m4aPath = path.join(outMp3Dir, `${name}.m4a`);
      const fileBuffer = fs.readFileSync(m4aPath);

      // 生成 OSS 唯一文件名
      const randomString = Math.random().toString(36).substring(2, 11);
      const uniqueFilename = `yuanlu/podcastes/episodes/audio/${Date.now()}_${randomString}.m4a`;

      console.log(`正在上传 ${name}.m4a 到 OSS: ${uniqueFilename} ...`);
      const uploadResult = await uploadFile(fileBuffer, uniqueFilename);
      console.log(`上传成功，OSS 地址: ${uploadResult.fileUrl}`);

      // 检查并删除旧版 MP3
      if (
        targetEpisode.audioFileName &&
        targetEpisode.audioFileName.endsWith(".mp3")
      ) {
        console.log(`正在删除旧版 MP3 文件: ${targetEpisode.audioFileName}`);
        await deleteObject(targetEpisode.audioFileName)
          .then(() => deleteOldCount++)
          .catch((e) =>
            console.error(
              `[错误] 删除 ${targetEpisode.audioFileName} 失败:`,
              e,
            ),
          );
      }

      // 更新数据库
      console.log(`正在更新数据库剧集音频链接...`);
      await prisma.episode.update({
        where: { episodeid: targetEpisode.episodeid },
        data: {
          audioUrl: uploadResult.fileUrl,
          audioFileName: uploadResult.fileName,
        },
      });
      console.log(`文件 ${name} 处理完成！`);
      uploadCount++;
    } catch (err: unknown) {
      console.error(`[错误] 处理文件 ${name} 时发生异常:`, err);
      errorCount++;
    }
  }

  console.log(`\n============================================`);
  console.log(`批量音频转码与上传流程执行完毕！`);
  console.log(`【汇总信息】`);
  console.log(`- 成功上传: ${uploadCount} 份 M4A 音频`);
  console.log(`- 跳过处理: ${skipCount} 个文件`);
  console.log(`- 发生异常: ${errorCount} 个文件`);
  console.log(`- 删除旧音频: ${deleteOldCount} 份 MP3 文件`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
