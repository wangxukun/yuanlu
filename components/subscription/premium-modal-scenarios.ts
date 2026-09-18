import type { LucideIcon } from "lucide-react";
import {
  BookMarked,
  BookOpen,
  Crown,
  Download,
  Headphones,
  History,
  Layers,
  Mic,
  Route,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { AFDIAN_PLANS } from "@/lib/afdian-plans";

/**
 * PremiumModal 场景化文案单一数据源（P2-1，报告 F1 / 4.3）。
 *
 * 按 openPremiumModal(source) 的触发场景渲染：场景标题 + 2-3 项权益 +
 * 起步价锚点 + 个性化变量（{var} 占位符，由调用方经 openPremiumModal 第二参传入；
 * 占位符缺值时回退到 *Fallback 文案，绝不展示空洞占位符）。
 *
 * 文案中的配额数字与 lib/quota.ts 常量保持一致（50/5/30/20），
 * 价格锚点从 lib/afdian-plans.ts 计算（与 Webhook 白名单同一数据源）。
 * 新增 source 只需在此追加条目，conversion_events.source 为 varchar 零迁移。
 */

export type PremiumModalVars = Record<string, string | number>;

export interface PremiumModalBenefit {
  icon: LucideIcon;
  text: string;
}

export interface PremiumModalScenario {
  /** 弹窗头部图标（缺省皇冠） */
  icon: LucideIcon;
  /** 场景标题，支持 {var} 占位符 */
  title: string;
  /** 标题占位符缺值时的回退标题 */
  titleFallback?: string;
  /** 场景正文，支持 {var} 占位符 */
  description: string;
  /** 正文占位符缺值时的回退正文 */
  descriptionFallback?: string;
  /** 2-3 项与场景最相关的权益 */
  benefits: PremiumModalBenefit[];
  /** 起步价锚点（¥5/7天起 / ¥0.46/天） */
  priceAnchor: string;
  /** 主按钮文案 */
  cta: string;
}

const weekly = AFDIAN_PLANS.find((p) => p.key === "WEEKLY")!;
const yearly = AFDIAN_PLANS.find((p) => p.key === "YEARLY")!;

const WEEKLY_ANCHOR = `¥${weekly.price}/${weekly.days}天起`;
const YEARLY_ANCHOR = `低至 ¥${(yearly.price / yearly.days).toFixed(2)}/天`;

const SCENARIOS: Record<string, PremiumModalScenario> = {
  /* ---- 生词 / 词典（现有配额墙） ---- */
  vocabulary_total: {
    icon: BookMarked,
    title: "生词本已经攒满了",
    description:
      "50 个生词位已经用完。删除旧词可以腾出空间——或升级 PRO，收藏不再设限。",
    benefits: [
      { icon: BookMarked, text: "生词无限收藏" },
      { icon: BookOpen, text: "词典无限查询" },
      { icon: Target, text: "发音弱项追踪" },
    ],
    priceAnchor: `${WEEKLY_ANCHOR} · ${YEARLY_ANCHOR}`,
    cta: "解锁无限收藏",
  },
  vocabulary_daily: {
    icon: BookMarked,
    title: "今日免费收藏次数已用完",
    description:
      "免费用户每天可收藏 5 个生词，明天额度自动刷新。升级 PRO 立即解除每日上限。",
    benefits: [
      { icon: BookMarked, text: "收藏不限量、不限天" },
      { icon: BookOpen, text: "词典无限查询" },
    ],
    priceAnchor: WEEKLY_ANCHOR,
    cta: "解锁无限收藏",
  },
  dictionary_quota: {
    icon: BookOpen,
    title: "今日免费词典查询已用完",
    description:
      "免费用户每天可查 30 次。查词是精读的刚需——PRO 会员词典查询不限量。",
    benefits: [
      { icon: BookOpen, text: "词典无限查询" },
      { icon: BookMarked, text: "生词无限收藏" },
      { icon: Mic, text: "无限语音评测" },
    ],
    priceAnchor: WEEKLY_ANCHOR,
    cta: "解锁无限查询",
  },

  /* ---- 语音评测（历史场景：原学新月池已随全局日池统一废止，
     服务端不再触发，保留仅为旧漏斗数据可读） ---- */
  speech_quota: {
    icon: Mic,
    title: "本月免费评测已用完",
    description:
      "免费用户每月 20 次语音评测。PRO 无限评测，把每个弱音磨到满分。",
    benefits: [
      { icon: Mic, text: "无限语音评测" },
      { icon: Target, text: "发音弱项本与诊断" },
      { icon: Headphones, text: "完整句子跟读练习" },
    ],
    priceAnchor: `${WEEKLY_ANCHOR} · ${YEARLY_ANCHOR}`,
    cta: "无限练到满意",
  },

  /* ---- 复习闭环新剧本（报告 4.3，P3-a/b/c 触发时启用） ---- */
  sentence_quota: {
    icon: BookMarked,
    title: "这句先帮你记下了",
    description:
      "你已攒下 30 句值得反复听的表达。PRO：无限收藏 · 标签导出 · 暂存句子全部入库。",
    benefits: [
      { icon: BookMarked, text: "句子无限收藏" },
      { icon: Layers, text: "标签整理与组卷" },
      { icon: Sparkles, text: "暂存书签自动入库" },
    ],
    priceAnchor: `PRO ${WEEKLY_ANCHOR}`,
    cta: `无限收藏 · ${WEEKLY_ANCHOR}`,
  },
  review_eval_quota: {
    icon: Mic,
    title: "今日免费跟读评测已用完",
    description:
      "你今天平均 {avgScore} 分，连续学习 {streak} 天。无限评测，把每个弱音磨到满分——PRO ¥0.46/天起。",
    descriptionFallback:
      "今天的免费跟读评测圆满用完，明日额度自动就位。无限评测，把每个弱音磨到满分——PRO ¥0.46/天起。",
    benefits: [
      { icon: Mic, text: "跟读评测不限次" },
      { icon: Sparkles, text: "AI 逐句评分" },
      { icon: Target, text: "历史成绩对比" },
    ],
    priceAnchor: `PRO ${YEARLY_ANCHOR}`,
    cta: "无限练到满意",
  },
  pronunciation_locked: {
    icon: Target,
    title: "你已发现 {totalErrors} 个发音弱点",
    titleFallback: "你的发音弱点已经就位",
    description:
      "每天免费攻克 3 个。{worstPhoneme} 是当前最需攻克的音。PRO：全量弱项 + 无限闯关 + 音素专项。",
    descriptionFallback:
      "每天免费攻克 3 个发音弱点。PRO：全量弱项 + 无限闯关 + 音素专项。",
    benefits: [
      { icon: Target, text: "全量弱项列表" },
      { icon: Mic, text: "无限闯关练习" },
      { icon: Sparkles, text: "音素专项报告" },
    ],
    priceAnchor: `解锁全量弱项 · ${YEARLY_ANCHOR}`,
    cta: "解锁全量弱项",
  },
  sentence_review_advanced: {
    icon: Layers,
    title: "高级复习模式是 PRO 专属",
    description:
      "基础刷句永久免费。标签组卷、SRS 智能调度与连续翻卡成就，帮你把句库真正盘活。",
    benefits: [
      { icon: Layers, text: "标签组卷刷句" },
      { icon: Sparkles, text: "SRS 智能调度" },
      { icon: Download, text: "CSV / Anki 导出" },
    ],
    priceAnchor: `PRO ${YEARLY_ANCHOR}`,
    cta: "解锁高级复习",
  },
  sentence_export: {
    icon: Download,
    title: "句子本导出是 PRO 专属",
    description:
      "把攒下的好句子带去任何地方——CSV 表格备份，或一键导入 Anki 开始间隔重复。",
    benefits: [
      { icon: Download, text: "CSV 全字段导出" },
      { icon: BookOpen, text: "Anki 卡组一键导入" },
      { icon: Layers, text: "标签整理与组卷" },
    ],
    priceAnchor: `PRO ${WEEKLY_ANCHOR}`,
    cta: "解锁导出",
  },
  diagnostic_report: {
    icon: Target,
    title: "你的发音数据已经就位",
    description:
      "免费层可见五维雷达与薄弱音素概览。PRO：薄弱音素 Top10 逐个击破方案 + 逐月进步曲线，把弱音一个一个磨掉。",
    benefits: [
      { icon: Target, text: "薄弱音素 Top10 + 专项建议" },
      { icon: Sparkles, text: "逐月进步趋势月报" },
      { icon: Mic, text: "针对弱音的闯关练习" },
    ],
    priceAnchor: `PRO ${YEARLY_ANCHOR}`,
    cta: "解锁完整诊断",
  },
  stats_report: {
    icon: Sparkles,
    title: "学习报表是 PRO 会员专属",
    description:
      "免费层可见近 7 天学习简报。PRO：月/季/年趋势报表 + 全年学习热力图 + 智能学习建议，看清每一步积累。",
    benefits: [
      { icon: Sparkles, text: "月/季/年趋势报表" },
      { icon: BookOpen, text: "全年学习热力图" },
      { icon: Target, text: "智能学习建议" },
    ],
    priceAnchor: `PRO ${YEARLY_ANCHOR}`,
    cta: "解锁学习报表",
  },
  history_playback: {
    icon: History,
    title: "你的跟读历史已经就位",
    description:
      "免费层可查看最近 5 条评测记录。PRO：全量历史 + 录音回放 + 词级评测细节 + 前后对比，听见自己一天天的进步。",
    descriptionFallback:
      "免费层可查看最近 5 条评测记录。PRO：全量跟读历史 + 录音回放 + 前后对比分析，听见自己的进步。",
    benefits: [
      { icon: History, text: "全量跟读历史" },
      { icon: Headphones, text: "录音随时回放" },
      { icon: TrendingUp, text: "进步曲线与前后对比" },
    ],
    priceAnchor: `PRO ${YEARLY_ANCHOR}`,
    cta: "解锁历史回放",
  },
  path_quota: {
    icon: Route,
    title: "第一条学习路径已经就位",
    description:
      "免费用户可创建 1 条学习路径——编辑、排序、添加剧集全部免费。PRO：无限路径，把每个学习目标都单独排一条。",
    benefits: [
      { icon: Route, text: "无限学习路径" },
      { icon: Sparkles, text: "AI 智能生成路径" },
      { icon: Target, text: "按目标分线推进" },
    ],
    priceAnchor: `PRO ${YEARLY_ANCHOR}`,
    cta: "解锁无限路径",
  },
  path_ai_generate: {
    icon: Sparkles,
    title: "让 AI 帮你排一条学习路径",
    description:
      "告诉 AI 你的学习目标，它从剧集库中挑出最相关的一串，按先易后难排好顺序。PRO 专属：无限次智能生成。",
    benefits: [
      { icon: Sparkles, text: "AI 按主题挑选剧集" },
      { icon: TrendingUp, text: "先易后难自动排序" },
      { icon: Route, text: "无限学习路径" },
    ],
    priceAnchor: `PRO ${WEEKLY_ANCHOR}`,
    cta: "解锁 AI 生成",
  },

  /* ---- 剧集侧权益（下载 / 练习 / 试用 / 专享） ---- */
  episode_audio_download: {
    icon: Download,
    title: "音频与文稿下载是会员专属",
    description: "把整集播客装进口袋，离线精听不受网络限制。",
    benefits: [
      { icon: Download, text: "音频无限下载" },
      { icon: BookOpen, text: "文稿 PDF 下载" },
      { icon: Headphones, text: "离线精听" },
    ],
    priceAnchor: `${WEEKLY_ANCHOR} · ${YEARLY_ANCHOR}`,
    cta: "解锁下载",
  },
  episode_practice: {
    icon: Headphones,
    title: "剧集练习是会员专属",
    description: "逐句精听、跟读与练习完整开放给 PRO 会员。",
    benefits: [
      { icon: Headphones, text: "完整句子跟读" },
      { icon: Mic, text: "无限语音评测" },
      { icon: Download, text: "音频文稿下载" },
    ],
    priceAnchor: `${WEEKLY_ANCHOR} · ${YEARLY_ANCHOR}`,
    cta: "解锁练习",
  },
  trial_unlock: {
    icon: Sparkles,
    title: "免费试用段落已用完",
    description: "想继续？PRO 解锁全集逐句精听与跟读练习。",
    benefits: [
      { icon: Headphones, text: "全集逐句精听" },
      { icon: Mic, text: "无限跟读评测" },
      { icon: Download, text: "音频文稿下载" },
    ],
    priceAnchor: `继续精听 · ${WEEKLY_ANCHOR}`,
    cta: "继续精听",
  },
  trial_complete: {
    icon: Sparkles,
    title: "恭喜完成免费试用",
    description: "你已经体验了 PRO 级的精听练习。升级后全集解锁、无限继续。",
    benefits: [
      { icon: Headphones, text: "全集逐句精听" },
      { icon: Mic, text: "无限跟读评测" },
      { icon: Download, text: "音频文稿下载" },
    ],
    priceAnchor: `${WEEKLY_ANCHOR} · ${YEARLY_ANCHOR}`,
    cta: "继续精听",
  },
  exclusive_play: {
    icon: Crown,
    title: "这是会员专享剧集",
    description: "专享剧集向 PRO 会员开放。已有会员？登录后即可直接播放。",
    benefits: [
      { icon: Headphones, text: "专享剧集畅听" },
      { icon: Download, text: "音频文稿下载" },
      { icon: Mic, text: "无限跟读评测" },
    ],
    priceAnchor: `${WEEKLY_ANCHOR} · ${YEARLY_ANCHOR}`,
    cta: "解锁专享剧集",
  },
};

/** 未知 source / 未传 source 时的通用兜底（保持 F1 修复前的原有文案） */
export const DEFAULT_SCENARIO: PremiumModalScenario = {
  icon: Crown,
  title: "这里是会员专享内容",
  description:
    "为了支持网站长期高质量运转，此内容仅向赞助会员开放。如果您喜欢这里的内容，欢迎加入我们的会员社区，享受专属权益。",
  benefits: [
    { icon: Mic, text: "无限语音评测" },
    { icon: BookOpen, text: "词典与生词不限量" },
    { icon: Download, text: "音频与文稿下载" },
  ],
  priceAnchor: `${WEEKLY_ANCHOR} · ${YEARLY_ANCHOR}`,
  cta: "去看看赞助方案",
};

/**
 * 用变量填充 {var} 占位符；任一占位符缺值则返回 null（调用方回退到 *Fallback）。
 */
function fillTemplate(
  template: string,
  vars: PremiumModalVars | null | undefined,
): string | null {
  if (!template.includes("{")) return template;
  if (!vars) return null;
  let complete = true;
  const filled = template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = vars[key];
    if (value === undefined) {
      complete = false;
      return "";
    }
    return String(value);
  });
  return complete ? filled : null;
}

export interface ResolvedPremiumScenario extends PremiumModalScenario {
  /** 命中了哪个 source（埋点排障用），兜底场景为 null */
  source: string | null;
}

/** 按 source 解析弹窗文案：未知 source 走 DEFAULT_SCENARIO，占位符缺值走 fallback */
export function getPremiumScenario(
  source?: string | null,
  vars?: PremiumModalVars | null,
): ResolvedPremiumScenario {
  if (!source || !SCENARIOS[source]) {
    return { ...DEFAULT_SCENARIO, source: null };
  }
  const scenario = SCENARIOS[source];

  const title = fillTemplate(scenario.title, vars);
  const description = fillTemplate(scenario.description, vars);
  return {
    ...scenario,
    source,
    title: title ?? scenario.titleFallback ?? scenario.title,
    description:
      description ?? scenario.descriptionFallback ?? scenario.description,
  };
}

/**
 * [P2-6] 社会认同营销钩子（报告 F8 / 5.3 营销层）——单一数据源。
 * PremiumModal 底部与订阅页条带共用；数据来自 statsService.getSocialProofStats
 * （SSR 直连）或 /api/stats/social-proof（客户端），禁止硬编码数字。
 * 会员数低于门槛或数据缺失时返回空串（前端不渲染，宁缺毋假——
 * "已有 0 位学习者"的反效果比不展示更糟）。
 */
export interface SocialProofStats {
  memberCount: number;
  totalLearningHours: number;
}

/** 社会认同展示的最低会员数门槛（低于此值不渲染） */
export const SOCIAL_PROOF_MIN_MEMBERS = 5;

export function renderSocialProof(stats: SocialProofStats | null): string {
  if (!stats || stats.memberCount < SOCIAL_PROOF_MIN_MEMBERS) return "";

  const hoursPart =
    stats.totalLearningHours > 0
      ? ` · 累计陪伴学习 ${
          stats.totalLearningHours >= 10000
            ? `${(stats.totalLearningHours / 10000).toFixed(1)} 万小时`
            : `${stats.totalLearningHours} 小时`
        }`
      : "";

  return `已有 ${stats.memberCount} 位学习者加入 PRO${hoursPart}`;
}
