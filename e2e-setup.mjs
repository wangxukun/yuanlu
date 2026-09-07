// E2E 准备：创建两个临时测试用户 + 签发移动端 token + 选取测试剧集 id。
// 数据策略：专用测试账号（email 固定），结束后由 cleanup.mjs 级联删除，净零残留。
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import { readFileSync, writeFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)="(.*)"$/) || line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !env[m[1]]) env[m[1]] = m[2];
}

const prisma = new PrismaClient();

const USER_A = "android-e2e-user-a";
const USER_B = "android-e2e-user-b";
const EMAIL_A = "android-e2e-a@test.local";
const EMAIL_B = "android-e2e-b@test.local";

async function upsertUser(userid, email, nickname) {
  await prisma.user.upsert({
    where: { userid },
    create: { userid, email, role: "USER", isLoginAllowed: true },
    update: { email, isLoginAllowed: true },
  });
  await prisma.user_profile.upsert({
    where: { userid },
    create: { userid, nickname },
    update: { nickname },
  });
}

async function signToken(user) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    userid: user.userid,
    email: user.email,
    phone: null,
    role: "USER",
    nickname: null,
    avatarFileName: null,
    iss: "yuanlu-mobile",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + 24 * 3600)
    .sign(new TextEncoder().encode(env.NEXTAUTH_SECRET));
}

async function main() {
  await upsertUser(USER_A, EMAIL_A, "安卓E2E甲");
  await upsertUser(USER_B, EMAIL_B, "安卓E2E乙");

  const episodes = await prisma.episode.findMany({
    where: { status: "published" },
    select: { episodeid: true, title: true },
    orderBy: { publishAt: "desc" },
    take: 2,
  });

  const out = {
    tokenA: await signToken({ userid: USER_A, email: EMAIL_A }),
    tokenB: await signToken({ userid: USER_B, email: EMAIL_B }),
    episode1: episodes[0]?.episodeid ?? null,
    episode2: episodes[1]?.episodeid ?? null,
    userA: USER_A,
    userB: USER_B,
  };
  writeFileSync("e2e-tokens.json", JSON.stringify(out, null, 2));
  console.log(
    "episodes picked:",
    episodes.map((e) => `${e.episodeid} (${e.title})`).join(" | "),
  );
  console.log("tokens written to e2e-tokens.json");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
