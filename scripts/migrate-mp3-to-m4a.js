/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
/**
 * scripts/migrate-mp3-to-m4a.js — 一次性数据迁移：SRT 播客批次 mp3 音频转码 m4a
 *
 * 背景（2026-09-24 排查）：真机微信媒体解码器对旧批次 mono 44.1kHz mp3 播放失败
 * （errCode 10003 文件/解码错误类；模拟器与服务端一切正常），而新批次
 * AAC LC / 48kHz / 立体声 m4a 全部可播。本脚本把存量 mp3 对齐到可播档案：
 *
 *   OSS 下载 mp3 → ffmpeg 转码（aac 128k / 48000Hz / 立体声）→ 上传同名 .m4a
 *   → 更新 episode.audioFileName / audioUrl（旧 mp3 对象保留，可回滚）
 *
 * 幂等与续跑：
 *   - 起始即过滤已是 .m4a 的行；
 *   - 每集完成即追加写入 done 文件，重启后跳过；
 *   - 上传前 HEAD 探测目标对象，已存在则只补 DB 更新。
 *
 * 用法：
 *   node scripts/migrate-mp3-to-m4a.js <rows.txt> [--limit=N] [--conc=N] [--dry]
 *   rows.txt 每行：episodeid|audioFileName|audioUrl|status
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");

const TMP_DIR = path.join(os.tmpdir(), "yuanlu-m4a-migrate");
const FFMPEG = '"D:\\Program Files\\ffmpeg-6.1-full_build\\bin\\ffmpeg.exe"';

function loadEnv() {
  const env = {};
  fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const m = line.match(/^([A-Z_]+)="?(.*?)"?$/);
      if (m) env[m[1]] = m[2];
    });
  return env;
}

function shQuote(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}

function psql(sql) {
  const env = loadEnv();
  const cmd = `PGPASSWORD=${shQuote(env.PGPASSWORD_WXKZD || process.env.PGPASSWORD)} psql -h ${shQuote("pgm-2zei51mce7xj6oqwfo.pg.rds.aliyuncs.com")} -U postgres -d yuanlu -v ON_ERROR_STOP=1 -c ${shQuote(sql)}`;
  return new Promise((resolve, reject) => {
    execFile("bash", ["-c", cmd], { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout);
    });
  });
}

function runFfmpeg(inPath, outPath) {
  return new Promise((resolve, reject) => {
    execFile(
      "bash",
      [
        "-c",
        `${FFMPEG} -y -v error -i ${shQuote(inPath)} -vn -map 0:a:0 -c:a aac -b:a 128k -ar 48000 -ac 2 ${shQuote(outPath)}`,
      ],
      { timeout: 600000, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve();
      },
    );
  });
}

async function main() {
  const args = process.argv.slice(2);
  const rowsFile = args[0];
  const limit =
    parseInt((args.find((a) => a.startsWith("--limit=")) || "").slice(8), 10) ||
    Infinity;
  const conc =
    parseInt((args.find((a) => a.startsWith("--conc=")) || "").slice(7), 10) ||
    3;
  const dry = args.includes("--dry");

  const env = loadEnv();
  const OSS = require("ali-oss");
  const client = new OSS({
    region: env.OSS_REGION,
    accessKeyId: env.OSS_ACCESS_KEY_ID,
    accessKeySecret: env.OSS_ACCESS_KEY_SECRET,
    bucket: env.OSS_BUCKET,
    secure: true,
  });

  const rows = fs
    .readFileSync(rowsFile, "utf8")
    .split("\n")
    .map((l) => l.replace(/\r/g, ""))
    .filter(Boolean)
    .map((l) => {
      const [episodeid, audioFileName, audioUrl, status] = l.split("|");
      return { episodeid, audioFileName, audioUrl, status };
    })
    .filter((r) => r.audioFileName && r.audioFileName.endsWith(".mp3"));

  const doneFile = rowsFile + ".done";
  const done = new Set(
    fs.existsSync(doneFile)
      ? fs.readFileSync(doneFile, "utf8").split("\n").filter(Boolean)
      : [],
  );
  const logStream = fs.createWriteStream(rowsFile + ".log", { flags: "a" });
  const log = (msg) => {
    const line = `[${new Date().toISOString()}] ${msg}`;
    logStream.write(line + "\n");
    console.log(line);
  };

  fs.mkdirSync(TMP_DIR, { recursive: true });
  const work = rows.filter((r) => !done.has(r.episodeid)).slice(0, limit);
  log(
    `total=${rows.length} done=${done.size} todo=${work.length} conc=${conc} dry=${dry}`,
  );

  let okCount = 0;
  let failCount = 0;
  let idx = 0;

  async function worker() {
    while (true) {
      const i = idx++;
      if (i >= work.length) return;
      const r = work[i];
      const newKey = r.audioFileName.replace(/\.mp3$/, ".m4a");
      const newUrl = r.audioUrl.replace(/\.mp3$/, ".m4a");
      const tag = `#${i + 1}/${work.length} ${r.episodeid}`;
      try {
        if (dry) {
          log(`${tag} DRY ${newKey}`);
          continue;
        }
        // 目标已存在（上次跑到上传后、DB 前中断）→ 只补 DB
        let exists = false;
        try {
          await client.head(newKey);
          exists = true;
        } catch {
          /* not exist */
        }
        if (!exists) {
          const inPath = path.join(TMP_DIR, `${r.episodeid}.mp3`);
          const outPath = path.join(TMP_DIR, `${r.episodeid}.m4a`);
          const res = await client.get(r.audioFileName);
          fs.writeFileSync(inPath, res.content);
          await runFfmpeg(inPath, outPath);
          if (!fs.existsSync(outPath) || fs.statSync(outPath).size < 1024) {
            throw new Error("ffmpeg produced empty output");
          }
          await client.put(newKey, fs.createReadStream(outPath), {
            mime: "audio/mp4",
          });
          fs.unlinkSync(inPath);
          fs.unlinkSync(outPath);
        }
        await psql(
          `UPDATE episode SET "audioFileName" = '${newKey}', "audioUrl" = '${newUrl}' WHERE episodeid = '${r.episodeid}';`,
        );
        fs.appendFileSync(doneFile, r.episodeid + "\n");
        done.add(r.episodeid);
        okCount++;
        log(
          `${tag} OK ${exists ? "(obj已存在,补DB)" : ""} -> ${path.basename(newKey)}`,
        );
      } catch (e) {
        failCount++;
        log(`${tag} FAIL ${String(e && e.message).slice(0, 200)}`);
      }
    }
  }

  await Promise.all(Array.from({ length: conc }, () => worker()));
  log(`FINISHED ok=${okCount} fail=${failCount}`);
  logStream.end();
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
