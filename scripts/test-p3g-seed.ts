/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * [P3-g] 跟读历史回放 E2E 造数脚本（一次性，测后用 --clean 清理）
 *
 * 造数：
 *  - 免费用户 p3g-free@test.local（USER，无订阅）
 *  - PRO 用户   p3g-pro@test.local（USER + 有效订阅 +30d）
 *  - 各 8 条 speech_recognition（同一有字幕剧集，日期递增），
 *    userAudioUrl 指向真实 OSS WAV 对象（回放 E2E 用），
 *    其中 3 条带 detailUrl 指向真实 OSS detail JSON（词级细节 E2E 用）
 *
 * 运行：npx tsx scripts/test-p3g-seed.ts [--clean]
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { uploadFile, deleteObject } from "../lib/oss";

const prisma = new PrismaClient();

const EPISODE_ID = "cmj8io2p10001dy7spta7pi3q"; // A Christmas Carol - Part 1（有字幕）
const TS = Date.now();
const PASSWORD = "Test1234!";
const FREE_EMAIL = `p3g-free@test.local`;
const PRO_EMAIL = `p3g-pro@test.local`;
const SENTENCES = [
  "Marley was dead, to begin with.",
  "There is no doubt whatever about that.",
  "The register of his burial was signed by the clergyman.",
  "Old Marley was as dead as a door-nail.",
  "Scrooge knew he was dead?",
  "Of course he did.",
  "How could it be otherwise?",
  "Scrooge and he were partners for I don't know how many years.",
];

/** 生成一个最小可播放 WAV（16bit 单声道 8kHz，0.3 秒 440Hz 正弦） */
function makeTinyWav(): Buffer {
  const sampleRate = 8000;
  const seconds = 0.3;
  const numSamples = sampleRate * seconds;
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i++) {
    const v = Math.round(
      Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 12000,
    );
    buf.writeInt16LE(v, 44 + i * 2);
  }
  return buf;
}

async function cleanup(ossKeys: string[]) {
  for (const email of [FREE_EMAIL, PRO_EMAIL]) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (u) {
      await prisma.conversion_events.deleteMany({
        where: { userid: u.userid },
      });
      await prisma.subscriptions.deleteMany({ where: { userid: u.userid } });
      await prisma.speech_recognition.deleteMany({
        where: { userid: u.userid },
      });
      await prisma.user_profile.deleteMany({ where: { userid: u.userid } });
      await prisma.user.delete({ where: { userid: u.userid } });
      console.log(`cleaned user ${email}`);
    }
  }
  for (const key of ossKeys) {
    try {
      await deleteObject(key);
      console.log(`cleaned oss ${key}`);
    } catch (e: any) {
      console.log(`oss skip ${key}: ${e.message}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--clean")) {
    await cleanup([
      `yuanlu/test/p3g-${TS}-audio.wav`,
      `yuanlu/test/p3g-${TS}-detail.json`,
      "yuanlu/test/p3g-audio-2s.wav",
    ]);
    return;
  }

  // 1. 上传真实 OSS 对象：WAV（回放）+ detail JSON（词级细节）
  const wav = makeTinyWav();
  const audioUpload = await uploadFile(wav, `yuanlu/test/p3g-${TS}-audio.wav`);
  const detailJson = JSON.stringify({
    words: SENTENCES.slice(0, 3).map((s, i) => ({
      word: s.split(" ")[i] || "word",
      pronunciation: 70 + i * 8,
      phonemes: [],
    })),
  });
  const detailUpload = await uploadFile(
    Buffer.from(detailJson, "utf-8"),
    `yuanlu/test/p3g-${TS}-detail.json`,
  );
  console.log("OSS audio:", audioUpload.fileUrl);
  console.log("OSS detail:", detailUpload.fileUrl);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const [email, premium] of [
    [FREE_EMAIL, false],
    [PRO_EMAIL, true],
  ] as const) {
    const userid = `test_p3g_${premium ? "pro" : "free"}_${TS}`;
    await prisma.user.create({
      data: {
        userid,
        email,
        password: passwordHash,
        role: "USER",
        user_profile: {
          create: { nickname: premium ? "P3G Pro" : "P3G Free" },
        },
        ...(premium && {
          subscriptions: {
            create: {
              subscriptionType: "PREMIUM",
              endDate: new Date(Date.now() + 30 * 86400_000),
            },
          },
        }),
      },
    });

    for (let i = 0; i < 8; i++) {
      await prisma.speech_recognition.create({
        data: {
          userid,
          episodeid: EPISODE_ID,
          targetText: SENTENCES[i],
          speechText: SENTENCES[i],
          accuracyScore: 55 + i * 5, // 55 → 90：进步曲线可见趋势
          overallScore: 55 + i * 5,
          targetStartTime: i * 5,
          subtitleId: i + 1,
          recognitionDate: new Date(Date.now() - (8 - i) * 86400_000),
          scenario: "learn",
          // 全部带真实音频 URL；前 3 条（最旧）带 detail JSON
          userAudioUrl: audioUpload.fileUrl,
          ...(i < 3 ? { detailUrl: detailUpload.fileUrl } : {}),
        },
      });
    }
    console.log(
      `seeded ${email} (${premium ? "PRO" : "FREE"}) userid=${userid} records=8`,
    );
  }
  console.log("\nEPISODE_ID=", EPISODE_ID);
  console.log("PASSWORD=", PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
