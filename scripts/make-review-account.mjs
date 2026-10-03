/**
 * scripts/make-review-account.mjs — 创建/刷新小程序提审专用测试账号
 *
 * 写入目标 = .env DATABASE_URL 指向的库（当前即生产 RDS，小程序线上版本登录的就是它）。
 * 账号能力：邮箱+密码登录（bcrypt 哈希与 mobile/token 路由同口径）+ PREMIUM 长期订阅
 * （isPremiumUser = ADMIN 或有效订阅，endDate > now 即会员；文稿 PDF/离线缓存/AI 精讲全开）。
 * 幂等：重复执行只刷新密码/emailVerified/续期订阅，不动其他用户任何数据。
 *
 * 密码不落库于本文件（防凭据进 git 历史），须显式传入：
 *   node scripts/make-review-account.mjs <密码>
 *   或 REVIEW_PASSWORD=<密码> node scripts/make-review-account.mjs
 * 邮箱可用 REVIEW_EMAIL 覆盖（缺省 mp-review@wxkzd.com）。
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const EMAIL = process.env.REVIEW_EMAIL || "mp-review@wxkzd.com";
const PASSWORD = process.argv[2] || process.env.REVIEW_PASSWORD;
const NICKNAME = "远路学友";
/** 会员到期：10 年后（审核账号要长期可用） */
const END_YEARS = 10;

if (!PASSWORD) {
  console.error(
    "缺少密码：用法 node scripts/make-review-account.mjs <密码>（或环境变量 REVIEW_PASSWORD）",
  );
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash(PASSWORD, 10);
  const now = new Date();

  // 1) User：upsert by email
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    create: {
      email: EMAIL,
      password: hashed,
      emailVerified: now,
      role: "USER",
      isLoginAllowed: true,
      isCommentAllowed: true,
    },
    update: {
      password: hashed,
      emailVerified: now,
      isLoginAllowed: true,
      isCommentAllowed: true,
    },
  });

  // 2) user_profile：upsert by userid（昵称供评论区展示，无自定义头像走默认头像）
  await prisma.user_profile.upsert({
    where: { userid: user.userid },
    create: { userid: user.userid, nickname: NICKNAME },
    update: { nickname: NICKNAME },
  });

  // 3) 订阅：已有未过期的 PREMIUM 就续期到 N 年后，否则新建一条
  const far = new Date(
    now.getFullYear() + END_YEARS,
    now.getMonth(),
    now.getDate(),
  );
  const active = await prisma.subscriptions.findFirst({
    where: {
      userid: user.userid,
      subscriptionType: "PREMIUM",
      endDate: { gt: now },
    },
    orderBy: { endDate: "desc" },
  });
  if (active) {
    await prisma.subscriptions.update({
      where: { subscriptionid: active.subscriptionid },
      data: { endDate: far },
    });
  } else {
    await prisma.subscriptions.create({
      data: {
        userid: user.userid,
        subscriptionType: "PREMIUM",
        startDate: now,
        endDate: far,
      },
    });
  }

  console.log("✅ 审核测试账号已就绪（生产库）");
  console.log(`   邮箱：${EMAIL}`);
  console.log(`   密码：${PASSWORD}`);
  console.log(`   昵称：${NICKNAME}`);
  console.log(`   会员：PREMIUM 至 ${far.toLocaleDateString("zh-CN")}`);
  console.log(`   userid：${user.userid}`);
}

main()
  .catch((e) => {
    console.error("创建失败：", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
