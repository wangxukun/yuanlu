import { Metadata } from "next";
import {
  Clapperboard,
  Target,
  Users,
  Mic,
  Headphones,
  GraduationCap,
} from "lucide-react";
import MiniProgramQr from "./MiniProgramQr";

// ---------------------------------------------------------------------------
// 公告内容配置区 —— 全站广播的落地页,文案与素材集中在这里维护。
// [恢复上线 2026-11-23] 小程序暂停服务后改版回归。文案口径(用户定稿):
// 不提暂停服务原因,不用「整改」字眼;明确说明移除项(整集收听/下载/连播/
// 节目目录频道)并由网页版承接;现有功能与相对旧版的优势正向表述。
// 小程序码图片:public/static/images/miniprogram-code.png。
// ---------------------------------------------------------------------------
const ANNOUNCEMENT = {
  badge: "产品公告",
  date: "2026 年 11 月 23 日",
  title: "远路播客微信小程序恢复上线",
  lead: "小程序回来了——从「播客播放器」,变身随身英语学习工具。",
  paragraphs: [
    "从今天起,远路播客微信小程序恢复上线。这次回归我们对小程序做了一次从头到尾的改版:告别「播客播放器」的旧形态,围绕英语学习重新组织每一个功能。",
    "这次改版移除了整集播客的在线收听与离线下载、后台连播,以及节目目录、频道列表等电台式功能。完整的整集收听与下载体验仍在网页版——两端使用同一账号,学习记录、生词本与会员权益自动同步。",
    "改版后的小程序以切片式学习为核心:原声微流轻划即刷,数秒一条的原声切片配逐句双语字幕与词级高亮,点词即查;工坊每天奉上今日挑战,跟读录音、发音逐词打分,还可以和学友玩跟读接力;复习页用生词本、句子本与间隔复习巩固记忆。",
    "与旧版相比,新的小程序更像一位随身教练,而非一台播放器:不用再挑节目、等下载,打开就是精选切片;从听到说再到复习,一个闭环在小程序内完成;今日挑战、连胜与日榜,让每天开口变成习惯。整集收听,交给网页版。",
  ],
  qrImageSrc: "/static/images/miniprogram-code.png",
  qrAlt: "远路播客微信小程序码",
  miniProgramName: "远路播客",
};

const FEATURES = [
  {
    icon: Clapperboard,
    title: "原声微流",
    description: "轻划刷原声学习切片,双语字幕逐句同步,词级高亮,点词即查",
  },
  {
    icon: Target,
    title: "今日挑战",
    description: "每天一组精选句,跟读打分完成打卡,连续开口保持连胜",
  },
  {
    icon: Users,
    title: "跟读接力",
    description: "同一句接龙开口,和学友互相带动,坚持不再是一个人的事",
  },
  {
    icon: Mic,
    title: "发音评测",
    description: "单词与句子跟读录音,逐词定位薄弱音节,针对性改进",
  },
  {
    icon: Headphones,
    title: "盲听特训",
    description: "不看文本盲听辨义,专练耳朵,逐步摆脱对字幕的依赖",
  },
  {
    icon: GraduationCap,
    title: "复习巩固",
    description: "生词本、句子本与间隔复习,闪卡闯关,学过的真正留下",
  },
];

export const metadata: Metadata = {
  title: "远路播客微信小程序恢复上线 | 远路",
  description:
    "远路播客微信小程序改版后恢复上线:原声微流、跟读评测、复习巩固,账号与会员权益互通,整集收听请在网页版。",
};

export default function MiniProgramLandingPage() {
  return (
    <div className="bg-ink-50 dark:bg-ink-950 min-h-screen text-ink-900 dark:text-ink-100 pb-24">
      <div className="container mx-auto px-4 py-12 max-w-4xl space-y-8">
        {/* 公告卡:标题 + 正文 + 小程序码 */}
        <section className="bg-white dark:bg-ink-800 border border-ink-100 dark:border-ink-700 rounded-3xl overflow-hidden">
          <div className="px-8 py-10 text-center border-b border-ink-50 dark:border-ink-700/50">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary-600/10 dark:bg-primary-400/10 text-primary-600 dark:text-primary-400">
              {ANNOUNCEMENT.badge} · {ANNOUNCEMENT.date}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink-900 dark:text-ink-100 mt-4 mb-3">
              {ANNOUNCEMENT.title}
            </h1>
            <p className="text-sm sm:text-base text-ink-500 dark:text-ink-400 leading-relaxed max-w-xl mx-auto">
              {ANNOUNCEMENT.lead}
            </p>
          </div>

          <div className="p-8 space-y-8">
            {/* 通知正文 */}
            <div className="space-y-3 text-sm sm:text-base text-ink-700 dark:text-ink-300 leading-relaxed">
              {ANNOUNCEMENT.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 12)}>{paragraph}</p>
              ))}
            </div>

            {/* 小程序码 + 找到我们的方式 */}
            <div className="flex flex-col sm:flex-row items-center gap-8 pt-6 border-t border-ink-50 dark:border-ink-700/50">
              <MiniProgramQr
                src={ANNOUNCEMENT.qrImageSrc}
                alt={ANNOUNCEMENT.qrAlt}
              />
              <div className="flex-1 space-y-4 text-left">
                <h2 className="text-base font-bold text-ink-900 dark:text-ink-100">
                  在微信里找到我们
                </h2>
                <ol className="space-y-3 text-sm text-ink-600 dark:text-ink-400">
                  <li className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary-600/10 dark:bg-primary-400/10 text-primary-600 dark:text-primary-400 text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    打开微信「扫一扫」,扫描左侧小程序码
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary-600/10 dark:bg-primary-400/10 text-primary-600 dark:text-primary-400 text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    或在微信中搜索小程序「{ANNOUNCEMENT.miniProgramName}」
                  </li>
                </ol>
                <p className="text-xs text-ink-400 dark:text-ink-500">
                  在微信内打开本页时,长按小程序码也可直接识别进入。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 功能亮点 */}
        <section className="space-y-5">
          <h2 className="text-xl font-bold text-ink-900 dark:text-ink-100 text-center">
            小程序里能做什么
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-white dark:bg-ink-800 border border-ink-100 dark:border-ink-700 rounded-2xl p-6"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-600/10 dark:bg-primary-400/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-sm font-bold text-ink-900 dark:text-ink-100 mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-xs text-ink-500 dark:text-ink-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <p className="text-center text-xs text-ink-400 dark:text-ink-500">
          整集收听与下载请使用网页版,网页版与小程序随时切换,学习数据一处不落。
        </p>
      </div>
    </div>
  );
}
