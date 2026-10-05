import { Metadata } from "next";
import {
  Headphones,
  BookOpen,
  Sparkles,
  Mic,
  Trophy,
  Download,
} from "lucide-react";
import MiniProgramQr from "./MiniProgramQr";

// ---------------------------------------------------------------------------
// 公告内容配置区 —— 全站广播的落地页,文案与素材集中在这里维护。
// 后续新的产品公告:改这里的字段(或把本页复制为新路由)即可复用同一模式。
// 小程序码图片路径:public/static/images/miniprogram-code.png
// 获取方式:mp.weixin.qq.com → 设置 → 基本设置 → 小程序码及线下物料下载,
// 保存 PNG 后按上述路径放入,无需改代码(图片缺失时页面自动显示占位)。
// ---------------------------------------------------------------------------
const ANNOUNCEMENT = {
  badge: "产品公告",
  date: "2026 年 10 月",
  title: "远路播客微信小程序正式上线",
  lead: "把远路装进微信：通勤路上、茶余饭后，打开小程序就能继续你的播客英语学习。",
  paragraphs: [
    "远路播客微信小程序现已正式上线。从现在起，在微信里即可收听全集播客，并使用与网页版一致的学习功能——双语文稿、AI 精讲、语音评测、复习闯关、离线下载，一个都不少。",
    "小程序与网页版使用同一账号体系，学习进度、生词本与会员权益自动同步：在电脑上没听完的，打开小程序接着听。",
  ],
  qrImageSrc: "/static/images/miniprogram-code.png",
  qrAlt: "远路播客微信小程序码",
  miniProgramName: "远路播客",
};

const FEATURES = [
  {
    icon: Headphones,
    title: "随身收听",
    description: "全集播客在线播放，断点续播，退出再进接着听",
  },
  {
    icon: BookOpen,
    title: "双语文稿",
    description: "字幕文稿逐句同步，边听边读沉浸学习",
  },
  {
    icon: Sparkles,
    title: "AI 精讲",
    description: "长难句逐句拆解，深度理解每一期内容",
  },
  {
    icon: Mic,
    title: "语音评测",
    description: "单词与句子发音打分，逐词定位薄弱音节",
  },
  {
    icon: Trophy,
    title: "复习闯关",
    description: "生词本、发音弱项本与间隔复习，闯关巩固记忆",
  },
  {
    icon: Download,
    title: "离线下载",
    description: "音频与文稿离线可用，没有网络也照听不误",
  },
];

export const metadata: Metadata = {
  title: "远路播客微信小程序上线 | 远路",
  description:
    "远路播客微信小程序正式上线：在微信里听播客学英语，双语文稿、AI 精讲、语音评测、复习闯关，账号与会员权益互通。",
};

export default function MiniProgramLandingPage() {
  return (
    <div className="bg-ink-50 dark:bg-ink-950 min-h-screen text-ink-900 dark:text-ink-100 pb-24">
      <div className="container mx-auto px-4 py-12 max-w-4xl space-y-8">
        {/* 公告卡：标题 + 正文 + 小程序码 */}
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
            {/* 通知正文(与广播文案同源) */}
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
                    打开微信「扫一扫」，扫描左侧小程序码
                    <br />
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary-600/10 dark:bg-primary-400/10 text-primary-600 dark:text-primary-400 text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    或在微信中搜索小程序「{ANNOUNCEMENT.miniProgramName}」
                  </li>
                </ol>
                <p className="text-xs text-ink-400 dark:text-ink-500">
                  在微信内打开本页时，长按小程序码也可直接识别进入。
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
          网页版与小程序随时切换，学习数据一处不落。
        </p>
      </div>
    </div>
  );
}
