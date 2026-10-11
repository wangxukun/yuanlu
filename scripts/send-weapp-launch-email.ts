/**
 * 微信小程序上线公告邮件 · 定向发送给不活跃的邮箱注册用户
 *
 * 用法（npx tsx 运行）：
 *   npx tsx scripts/send-weapp-launch-email.ts               # dry-run：仅统计并预览名单，不发送
 *   npx tsx scripts/send-weapp-launch-email.ts --to a@b.com  # 发单封预览到指定邮箱（默认站长邮箱）
 *   npx tsx scripts/send-weapp-launch-email.ts --send        # 全量发送（自动跳过已成功发送的）
 *   npx tsx scripts/send-weapp-launch-email.ts --send --limit 80 --interval 6
 *
 * 收件人口径（2026-10-10 定稿）：真实邮箱（排除 @placeholder.yuanlu.com 手机注册占位邮箱）
 *   + 非管理员 + 最后活动早于 2026-10-04 09:00（北京时间）或从未活跃（lastActiveAt 为 null）。
 * 防重发：scripts/.weapp-launch-email-state.json 记录已成功发送的收件人，重跑自动跳过（断点续传）。
 * 节流：逐封单收件人发送，默认间隔 5s + 0~2s 抖动（QQ 个人邮箱 SMTP 有日配额约 100 封，超量用 --limit 分批）。
 * 注意：lib/prisma 在模块加载时读取 env，必须先加载 .env 再动态 import（同 upload-channel-covers.ts）。
 */
import dnsPromises from "node:dns/promises";
import * as fs from "node:fs";
import * as path from "node:path";
import nodemailer from "nodemailer";

for (const line of fs
  .readFileSync(`${process.cwd()}/.env`, "utf-8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

// --- CLI 参数 ---
const args = process.argv.slice(2);
const argValue = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--")
    ? args[i + 1]
    : undefined;
};
const MODE = args.includes("--send")
  ? "send"
  : args.includes("--to")
    ? "preview"
    : "dry-run";
const TO = argValue("--to");
const LIMIT = (() => {
  const v = argValue("--limit");
  if (v === undefined) return undefined;
  const n = parseInt(v, 10);
  if (!Number.isFinite(n) || n <= 0) {
    console.error(`--limit 非法: ${v}`);
    process.exit(1);
  }
  return n;
})();
const INTERVAL_SEC = (() => {
  const v = argValue("--interval");
  if (v === undefined) return 5;
  const n = parseFloat(v);
  if (!Number.isFinite(n) || n < 0) {
    console.error(`--interval 非法: ${v}`);
    process.exit(1);
  }
  return n;
})();

// --- 常量 ---
const CUTOFF = new Date("2026-10-04T09:00:00+08:00");
const STATE_FILE = path.join(
  process.cwd(),
  "scripts",
  ".weapp-launch-email-state.json",
);
const SUBJECT = "远路播客微信小程序正式上线";
const APP_URL = "https://www.wxkzd.com/app";
const QR_URL = "https://www.wxkzd.com/static/images/miniprogram-code.png";
const FONT = `font-family: Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif;`;

// --- 邮件内容（文案与 app/(main)/app/page.tsx 的 ANNOUNCEMENT 同源） ---
const TEXT = `远路播客微信小程序正式上线

把远路装进微信：通勤路上、茶余饭后，打开小程序就能继续你的播客英语学习。

远路播客微信小程序现已正式上线。从现在起，在微信里即可收听全集播客，并使用与网页版一致的学习功能——双语文稿、AI 精讲、语音评测、复习闯关、离线下载，一个都不少。

小程序与网页版使用同一账号体系，学习进度、生词本与会员权益自动同步：在电脑上没听完的，打开小程序接着听。

在微信里找到我们：
1. 打开微信「扫一扫」，扫描公告页中的小程序码
2. 或在微信中搜索小程序「远路播客」

查看公告详情：${APP_URL}

网页版与小程序随时切换，学习数据一处不落。

© 2026 远路播客
您收到此邮件是因为您在远路播客注册了账号。如不想再收到产品通知，可直接回复本邮件告知。`;

const FEATURES: { title: string; description: string }[] = [
  {
    title: "随身收听",
    description: "全集播客在线播放，断点续播，退出再进接着听",
  },
  { title: "双语文稿", description: "字幕文稿逐句同步，边听边读沉浸学习" },
  { title: "AI 精讲", description: "长难句逐句拆解，深度理解每一期内容" },
  { title: "语音评测", description: "单词与句子发音打分，逐词定位薄弱音节" },
  {
    title: "复习闯关",
    description: "生词本、发音弱项本与间隔复习，闯关巩固记忆",
  },
  { title: "离线下载", description: "音频与文稿离线可用，没有网络也照听不误" },
];

const featureRows = FEATURES.reduce<{ title: string; description: string }[][]>(
  (rows, feature, i) => {
    if (i % 2 === 0) rows.push([feature]);
    else rows[rows.length - 1].push(feature);
    return rows;
  },
  [],
)
  .map(
    ([left, right]) => `
          <tr>
            <td style="width: 50%; vertical-align: top; padding: 10px 12px 10px 32px; ${FONT}">
              <p style="margin: 0 0 3px; font-size: 14px; font-weight: bold; color: #1F7A5C;">${left.title}</p>
              <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #857C68;">${left.description}</p>
            </td>
            <td style="width: 50%; vertical-align: top; padding: 10px 32px 10px 12px; ${FONT}">
              <p style="margin: 0 0 3px; font-size: 14px; font-weight: bold; color: #1F7A5C;">${right.title}</p>
              <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #857C68;">${right.description}</p>
            </td>
          </tr>`,
  )
  .join("");

const buildHtml = (): string => `<!DOCTYPE html>
<html lang="zh-CN">
  <body style="margin: 0; padding: 0; background-color: #FAF8F3;">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">把远路装进微信——远路播客微信小程序正式上线。</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FAF8F3;">
      <tr>
        <td align="center" style="padding: 32px 12px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 600px; max-width: 100%; background-color: #ffffff; border: 1px solid #F1EDE4; border-radius: 16px;">
            <tr>
              <td align="center" style="padding: 36px 32px 28px; border-bottom: 1px solid #F1EDE4;">
                <p style="margin: 0 0 14px;">
                  <span style="display: inline-block; padding: 4px 12px; border-radius: 999px; background-color: #EDF7F2; color: #1F7A5C; ${FONT}font-size: 12px; font-weight: bold;">产品公告 · 2026 年 10 月</span>
                </p>
                <h1 style="margin: 0 0 12px; ${FONT}font-size: 24px; line-height: 1.4; color: #221F18;">远路播客微信小程序正式上线</h1>
                <p style="margin: 0; ${FONT}font-size: 14px; line-height: 1.7; color: #857C68;">把远路装进微信：通勤路上、茶余饭后，打开小程序就能继续你的播客英语学习。</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 28px 32px 8px; ${FONT}font-size: 14px; line-height: 1.8; color: #4A4436;">
                <p style="margin: 0 0 14px;">远路播客微信小程序现已正式上线。从现在起，在微信里即可收听全集播客，并使用与网页版一致的学习功能——双语文稿、AI 精讲、语音评测、复习闯关、离线下载，一个都不少。</p>
                <p style="margin: 0;">小程序与网页版使用同一账号体系，学习进度、生词本与会员权益自动同步：在电脑上没听完的，打开小程序接着听。</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 32px 4px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top: 1px solid #F1EDE4;">
                  <tr>
                    <td width="180" align="center" style="vertical-align: middle; padding: 24px 20px 0 0;">
                      <img src="${QR_URL}" alt="远路播客微信小程序码" width="160" height="160" style="display: block; width: 160px; height: 160px; border: 1px solid #F1EDE4; border-radius: 12px;" />
                    </td>
                    <td style="vertical-align: middle; padding-top: 24px; ${FONT}">
                      <p style="margin: 0 0 12px; font-size: 15px; font-weight: bold; color: #221F18;">在微信里找到我们</p>
                      <p style="margin: 0 0 10px; font-size: 13px; line-height: 1.7; color: #655D4C;"><strong style="color: #1F7A5C;">1.</strong> 打开微信「扫一扫」，扫描左侧小程序码</p>
                      <p style="margin: 0 0 10px; font-size: 13px; line-height: 1.7; color: #655D4C;"><strong style="color: #1F7A5C;">2.</strong> 或在微信中搜索小程序「远路播客」</p>
                      <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #A79E8A;">在微信内打开公告页时，长按小程序码也可直接识别进入。</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 24px 32px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="background-color: #1F7A5C; border-radius: 10px;">
                      <a href="${APP_URL}" style="display: inline-block; padding: 13px 36px; ${FONT}font-size: 15px; font-weight: bold; color: #ffffff; text-decoration: none;">查看公告详情</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top: 1px solid #F1EDE4;">
                  <tr>
                    <td align="center" style="padding: 24px 32px 8px; ${FONT}font-size: 16px; font-weight: bold; color: #221F18;">小程序里能做什么</td>
                  </tr>${featureRows}
                  <tr>
                    <td colspan="2" align="center" style="padding: 16px 32px 28px; ${FONT}font-size: 12px; color: #A79E8A;">网页版与小程序随时切换，学习数据一处不落。</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <p style="margin: 20px 0 0; width: 600px; max-width: 100%; ${FONT}font-size: 11px; line-height: 1.7; color: #A79E8A; text-align: center;">
            © 2026 远路播客 · 保留所有权利<br />
            您收到此邮件是因为您在远路播客注册了账号。如不想再收到产品通知，可直接回复本邮件告知。
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

// --- 状态文件（防重发/断点续传，只记录发送成功者） ---
interface SentRecord {
  userid: string;
  email: string;
  sentAt: string;
}
const loadState = (): SentRecord[] => {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return [];
  }
};
const saveState = (records: SentRecord[]): void => {
  fs.writeFileSync(STATE_FILE, JSON.stringify(records, null, 2), "utf-8");
};

// --- SMTP（与 forgot-password.service.ts 等现有 4 处先例同一配置） ---
// 本机代理 fake-ip（198.18.0.0/15）会劫持系统 DNS 解析且 465 出站不通，
// 直查公共 DNS 拿真实 IP 连接（TLS SNI/证书校验仍按原域名），失败回退系统解析。
const resolveSmtpIp = async (host: string): Promise<string> => {
  try {
    const resolver = new dnsPromises.Resolver();
    resolver.setServers(["223.5.5.5", "119.29.29.29"]);
    const addresses = await resolver.resolve4(host);
    if (addresses.length > 0) return addresses[0];
  } catch (e) {
    console.warn(`公共 DNS 解析 ${host} 失败（${e}），回退系统解析`);
  }
  return host;
};
const buildTransporter = async () => {
  const host = process.env.SMTP_HOST ?? "smtp.qq.com";
  const ip = await resolveSmtpIp(host);
  if (ip !== host)
    console.log(`SMTP ${host} -> 直连 ${ip}（绕过本机代理 fake-ip）`);
  return nodemailer.createTransport({
    host: ip,
    port: 465,
    secure: true,
    tls: { servername: host },
    auth: {
      user: process.env.EMAIL_FROM_ADDRESS,
      pass: process.env.SMTP_PASS,
    },
  });
};
// .env 的 EMAIL_FROM 是 "${SMTP_USER} <${EMAIL_FROM_ADDRESS}>" 字面量，脚本手动解析不展开变量，需自行拼接
const FROM = `"${process.env.SMTP_USER ?? "远路播客"}" <${process.env.EMAIL_FROM_ADDRESS}>`;

const sendOne = async (
  transporter: nodemailer.Transporter,
  to: string,
): Promise<void> => {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: SUBJECT,
    text: TEXT,
    html: buildHtml(),
  });
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const prisma = (await import("@/lib/prisma")).default;

  const users = await prisma.user.findMany({
    where: {
      email: { not: { endsWith: "@placeholder.yuanlu.com" } },
      role: { not: "ADMIN" },
      OR: [{ lastActiveAt: { lt: CUTOFF } }, { lastActiveAt: null }],
    },
    select: {
      userid: true,
      email: true,
      lastActiveAt: true,
      phone: true,
      wxOpenId: true,
    },
    orderBy: { email: "asc" },
  });

  const neverActive = users.filter((u) => u.lastActiveAt === null).length;
  const wxBound = users.filter((u) => u.wxOpenId !== null).length;
  const phoneBound = users.filter((u) => u.phone !== null).length;
  const domainCount = new Map<string, number>();
  for (const u of users) {
    const domain = u.email.split("@")[1]?.toLowerCase() ?? "?";
    domainCount.set(domain, (domainCount.get(domain) ?? 0) + 1);
  }
  const topDomains = [...domainCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const state = loadState();
  const sentSet = new Set(state.map((r) => r.userid));
  const pending = users.filter((u) => !sentSet.has(u.userid));

  console.log("=== 微信小程序上线公告邮件 · 名单统计 ===");
  console.log(`收件人总数: ${users.length}`);
  console.log(`  - 从未活跃(lastActiveAt=null): ${neverActive}`);
  console.log(`  - 已绑定微信小程序(wxOpenId): ${wxBound}`);
  console.log(`  - 手机号注册后绑邮箱(phone非空): ${phoneBound}`);
  console.log(`已发送(状态文件): ${state.length}`);
  console.log(
    `本次待发送: ${pending.length}${LIMIT ? `（--limit ${LIMIT} 截断为 ${Math.min(pending.length, LIMIT)}）` : ""}`,
  );
  console.log("邮箱域名分布 top10:");
  for (const [domain, count] of topDomains)
    console.log(`  ${domain}: ${count}`);
  console.log(`待发送名单预览(前${Math.min(20, pending.length)}):`);
  for (const u of pending.slice(0, 20))
    console.log(
      `  [待发] ${u.email}  lastActiveAt=${u.lastActiveAt?.toISOString() ?? "null"}`,
    );
  if (state.length > 0) {
    console.log(`已发送名单预览(前${Math.min(20, state.length)}):`);
    for (const r of state.slice(0, 20))
      console.log(`  [已发] ${r.email}  sentAt=${r.sentAt}`);
  }

  try {
    if (MODE === "dry-run") {
      console.log(
        "\n[dry-run] 未发送任何邮件。下一步：--to <email> 发预览确认效果，--send 全量发送。",
      );
      return;
    }

    if (MODE === "preview") {
      const to = TO ?? process.env.EMAIL_FROM_ADDRESS;
      if (!to) {
        console.error("缺少预览收件地址（--to <email>）");
        process.exitCode = 1;
        return;
      }
      const transporter = await buildTransporter();
      console.log(`\n[preview] 发送预览邮件到 ${to} ...`);
      await sendOne(transporter, to);
      console.log("已发送预览邮件，请在收件箱确认文案与渲染效果。");
      return;
    }

    const batch = LIMIT ? pending.slice(0, LIMIT) : pending;
    if (batch.length === 0) {
      console.log("\n没有待发送的收件人（全部已发送或名单为空）。");
      return;
    }
    const transporter = await buildTransporter();
    console.log(
      `\n[send] 开始发送 ${batch.length} 封，间隔 ~${INTERVAL_SEC}s + 0~2s 抖动...`,
    );
    let ok = 0;
    let fail = 0;
    const failures: { email: string; error: string }[] = [];
    for (let i = 0; i < batch.length; i++) {
      const u = batch[i];
      try {
        await sendOne(transporter, u.email);
        state.push({
          userid: u.userid,
          email: u.email,
          sentAt: new Date().toISOString(),
        });
        saveState(state);
        ok++;
        console.log(`[${i + 1}/${batch.length}] OK ${u.email}`);
      } catch (e) {
        fail++;
        failures.push({ email: u.email, error: String(e) });
        console.error(`[${i + 1}/${batch.length}] FAIL ${u.email}: ${e}`);
      }
      if (i < batch.length - 1)
        await sleep(INTERVAL_SEC * 1000 + Math.random() * 2000);
    }
    console.log(
      `\n发送完成: 成功 ${ok} / 失败 ${fail} / 跳过(已发送) ${users.length - pending.length}`,
    );
    const remaining = pending.length - ok;
    if (remaining > 0)
      console.log(`剩余未发送: ${remaining} 封，下次运行 --send 自动续发。`);
    if (failures.length > 0) {
      console.log("失败明细:");
      for (const f of failures) console.log(`  ${f.email}: ${f.error}`);
      console.log("失败的可直接重跑 --send 重试（状态文件只记录成功）。");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
