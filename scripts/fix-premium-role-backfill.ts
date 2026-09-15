/**
 * [P0-1] 存量 PREMIUM 用户数据修复脚本
 *
 * 背景：历史上爱发电 Webhook 激活时永久写死 role="PREMIUM"，且旧版降级逻辑
 * 会删除过期订阅记录，导致存在"role=PREMIUM 但无有效订阅"的存量账号——
 * 在 isPremiumUser 去 role 短路之前，这些账号等于终身会员。
 *
 * 修复后模型：role 只是展示缓存（由 auth.ts 会话同步从订阅状态派生回写），
 * 会员资格执行口径 = 有效订阅（endDate > now）。本脚本将存量数据对齐到该模型。
 *
 * 用法（tsx 运行，默认 dry-run 只出报告，不写库）：
 *   npx tsx scripts/fix-premium-role-backfill.ts                     # 报告模式
 *   npx tsx scripts/fix-premium-role-backfill.ts --apply-downgrade   # A 类降级为 USER
 *   npx tsx scripts/fix-premium-role-backfill.ts --apply-downgrade --include-no-record
 *                                                                     # A+B 类都降级
 *   npx tsx scripts/fix-premium-role-backfill.ts --grant-days=30 --apply
 *                                                                     # B 类补录 30 天订阅（保留会员）
 *
 * 分类口径（与 guard.ts 的 hasActivePremiumSubscription 完全一致：endDate > now 才算有效）：
 *   A 类 · 订阅已过期：存在 PREMIUM 订阅记录但最新一条 endDate <= now（或为 null）
 *         —— 付费事实成立但已到期 → 降级 role 为 USER
 *   B 类 · 无订阅记录：role 被打标但没有任何 PREMIUM 订阅流水（历史手动赠送 /
 *         旧版降级逻辑删记录所致）→ 默认仅报告，由人工决定 --grant-days 补录或降级
 *   C 类 · 订阅仍有效：缓存正确 → 不动
 *
 * 安全约束：
 *   - 永远不删除/修改任何 subscriptions 记录（账目历史是事实数据）；
 *   - B 类不附带 --grant-days 且未显式 --include-no-record 时，任何 apply 都不会碰它；
 *   - 所有写操作逐用户独立事务，失败即中止并列出未处理名单。
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface CliOptions {
  report: boolean;
  applyDowngrade: boolean;
  includeNoRecord: boolean;
  grantDays: number | null;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    report: true,
    applyDowngrade: false,
    includeNoRecord: false,
    grantDays: null,
  };
  for (const arg of argv) {
    if (arg === "--apply-downgrade") {
      opts.applyDowngrade = true;
    } else if (arg === "--include-no-record") {
      opts.includeNoRecord = true;
    } else if (arg.startsWith("--grant-days=")) {
      const n = parseInt(arg.slice("--grant-days=".length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`无效的 --grant-days 值: ${arg}（需为正整数）`);
      }
      opts.grantDays = n;
    } else {
      throw new Error(`未知参数: ${arg}`);
    }
  }
  if (
    (opts.applyDowngrade || opts.grantDays !== null) &&
    opts.grantDays !== null &&
    opts.applyDowngrade
  ) {
    throw new Error(
      "--grant-days 与 --apply-downgrade 互斥：B 类只能选择补录或降级其一",
    );
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const now = new Date();
  const dryRun = !opts.applyDowngrade && opts.grantDays === null;

  const mode = dryRun
    ? "报告模式（dry-run，不写库）"
    : opts.applyDowngrade
      ? `降级模式${opts.includeNoRecord ? "（含 B 类无记录用户）" : "（仅 A 类过期用户）"}`
      : `补录模式（B 类补录 ${opts.grantDays} 天订阅）`;
  console.log(`\n[P0-1 存量修复] ${mode}\n`);

  const premiumUsers = await prisma.user.findMany({
    where: { role: "PREMIUM" },
    select: {
      userid: true,
      email: true,
      subscriptions: {
        where: { subscriptionType: "PREMIUM" },
        orderBy: { endDate: "desc" },
        take: 1,
        select: { subscriptionid: true, endDate: true },
      },
    },
    orderBy: { updateAt: "asc" },
  });

  const expired: typeof premiumUsers = []; // A 类
  const noRecord: typeof premiumUsers = []; // B 类
  const active: typeof premiumUsers = []; // C 类

  for (const u of premiumUsers) {
    const latest = u.subscriptions[0];
    if (!latest) {
      noRecord.push(u);
    } else if (latest.endDate && latest.endDate.getTime() > now.getTime()) {
      active.push(u);
    } else {
      expired.push(u); // endDate <= now 或为 null（与 gt 判定同口径：null 不算有效）
    }
  }

  const fmt = (d: Date | null) =>
    d ? d.toISOString().slice(0, 10) : "NULL(异常)";
  const list = (users: typeof premiumUsers, limit = 20) => {
    for (const u of users.slice(0, limit)) {
      console.log(
        `    ${u.userid}  ${u.email.padEnd(34)} 最新订阅endDate: ${fmt(u.subscriptions[0]?.endDate ?? null)}`,
      );
    }
    if (users.length > limit)
      console.log(`    ... 其余 ${users.length - limit} 人省略`);
  };

  console.log(`role=PREMIUM 总数: ${premiumUsers.length}`);
  console.log(`  C 类 · 订阅仍有效（不动）: ${active.length}`);
  list(active);
  console.log(`  A 类 · 订阅已过期（降级候选）: ${expired.length}`);
  list(expired);
  console.log(`  B 类 · 无订阅记录（需人工决策）: ${noRecord.length}`);
  list(noRecord);

  if (dryRun) {
    console.log(
      "\ndry-run 结束。确认无误后执行：\n" +
        "  A 类降级:          npx tsx scripts/fix-premium-role-backfill.ts --apply-downgrade\n" +
        "  B 类补录 N 天:     npx tsx scripts/fix-premium-role-backfill.ts --grant-days=N\n" +
        "  B 类一并降级:      npx tsx scripts/fix-premium-role-backfill.ts --apply-downgrade --include-no-record\n",
    );
    return;
  }

  const failed: Array<{ userid: string; reason: string }> = [];

  if (opts.applyDowngrade) {
    const targets = opts.includeNoRecord ? [...expired, ...noRecord] : expired;
    console.log(
      `\n开始降级 ${targets.length} 位用户（仅回写 role=USER，不动订阅记录）...`,
    );
    let done = 0;
    for (const u of targets) {
      try {
        await prisma.$transaction(async (tx) => {
          // 条件更新防竞态：仅当 role 仍为 PREMIUM 时降级，
          // 避免与并发的会话同步回写/admin 操作互相覆盖
          const res = await tx.user.updateMany({
            where: { userid: u.userid, role: "PREMIUM" },
            data: { role: "USER" },
          });
          if (res.count === 0) throw new Error("role 已非 PREMIUM，跳过");
        });
        done++;
      } catch (e) {
        failed.push({
          userid: u.userid,
          reason: e instanceof Error ? e.message : String(e),
        });
      }
    }
    console.log(`降级完成: ${done}/${targets.length}`);
  }

  if (opts.grantDays !== null) {
    console.log(
      `\n开始为 B 类 ${noRecord.length} 位用户补录 ${opts.grantDays} 天订阅...`,
    );
    const endDate = new Date(
      now.getTime() + opts.grantDays * 24 * 60 * 60 * 1000,
    );
    let done = 0;
    for (const u of noRecord) {
      try {
        await prisma.$transaction(async (tx) => {
          const existing = await tx.subscriptions.findFirst({
            where: { userid: u.userid, subscriptionType: "PREMIUM" },
            select: { subscriptionid: true },
          });
          if (existing) throw new Error("已存在订阅记录，非 B 类，跳过");
          await tx.subscriptions.create({
            data: {
              userid: u.userid,
              subscriptionType: "PREMIUM",
              startDate: now,
              endDate,
            },
          });
          // role 缓存保持 PREMIUM，与补录后的订阅事实一致
        });
        done++;
      } catch (e) {
        failed.push({
          userid: u.userid,
          reason: e instanceof Error ? e.message : String(e),
        });
      }
    }
    console.log(
      `补录完成: ${done}/${noRecord.length}（到期: ${endDate.toISOString()}）`,
    );
  }

  if (failed.length) {
    console.log("\n以下用户处理失败，请人工核查：");
    for (const f of failed) console.log(`    ${f.userid}  ${f.reason}`);
    process.exitCode = 1;
  } else {
    console.log("\n全部处理成功。");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
