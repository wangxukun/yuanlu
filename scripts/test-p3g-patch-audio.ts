/* 一次性：把 P3-g 造数记录的 userAudioUrl 指向 2 秒版 WAV（测后连同清理） */
import { PrismaClient } from "@prisma/client";

import { uploadFile } from "../lib/oss";

const prisma = new PrismaClient();

function makeWav(seconds: number): Buffer {
  const sampleRate = 8000;
  const numSamples = sampleRate * seconds;
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i++) {
    buf.writeInt16LE(
      Math.round(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 12000),
      44 + i * 2,
    );
  }
  return buf;
}

async function main() {
  const up = await uploadFile(makeWav(2), "yuanlu/test/p3g-audio-2s.wav");
  const r = await prisma.speech_recognition.updateMany({
    where: { userid: { startsWith: "test_p3g_" } },
    data: { userAudioUrl: up.fileUrl },
  });
  console.log("updated", r.count, "records →", up.fileUrl);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
