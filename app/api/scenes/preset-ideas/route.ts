import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * [STUDIO] GET /api/scenes/preset-ideas — 动态灵感预设（自由定制页）。
 *
 * 从语料库实况生成 6 条「最有可能搜到好结果」的意图描述（≤8 字）。
 *
 * 选料口径：取场景标签覆盖面最广的 18 个 scenarioTag 组成候选池，**每次请求
 * 随机洗牌取 6 个**（各选一个代表场景，提炼其意图为一句话描述），确保：
 *   - 语料库里确实有这个场景的丰富内容（不是编造的）
 *   - 6 条覆盖 6 个不同场景（多样性）
 *   - 每条 ≤8 个中文字（小程序 UI 约束）
 *   - 难度从语料库实况取多数档（非固定）
 *   - 刷新按钮每次换一组（[BUG 2026-11-11] 原实现确定性取前 6，
 *     前端刷新拉到的永远是同一组——改为池内随机才可刷新）
 *
 * 200 { success, data: { ideas: [{icon, text, tag, level}] } }
 * 失败 → 返回静态兜底 6 条（B 版预设的精简版）。
 */
const FALLBACK_IDEAS = [
  { icon: "☕", text: "咖啡厅闲聊", tag: "daily_smalltalk", level: "B1" },
  { icon: "💼", text: "面试优缺点", tag: "interview", level: "B2" },
  { icon: "🤝", text: "职场沟通", tag: "workplace", level: "B2" },
  { icon: "✈️", text: "旅行出行", tag: "travel", level: "B1" },
  { icon: "🏥", text: "看医生", tag: "health", level: "A2" },
  { icon: "💬", text: "日常寒暄", tag: "daily_smalltalk", level: "A2" },
];

/** 场景 → 灵感意图模板（tag → 短句 + 图标） */
const TAG_TEMPLATES: Record<string, { icon: string; text: string }> = {
  daily_smalltalk: { icon: "💬", text: "日常寒暄闲聊" },
  dining: { icon: "☕", text: "餐厅点单用餐" },
  shopping: { icon: "🛒", text: "购物砍价退换" },
  travel: { icon: "✈️", text: "旅行问路出行" },
  lodging: { icon: "🏨", text: "酒店入住退房" },
  health: { icon: "🏥", text: "看病买药沟通" },
  workplace: { icon: "💼", text: "职场日常沟通" },
  interview: { icon: "🎯", text: "面试自我介绍" },
  meeting: { icon: "📋", text: "会议发言讨论" },
  phone_call: { icon: "📞", text: "电话预约沟通" },
  complaints: { icon: "😤", text: "客服投诉交涉" },
  learning: { icon: "📚", text: "英语学习方法" },
  pronunciation: { icon: "🗣️", text: "发音语流纠正" },
  emotions: { icon: "❤️", text: "情感表达安慰" },
  social: { icon: "🤝", text: "社交破冰邀约" },
  family: { icon: "👨‍👩‍👧", text: "家庭日常对话" },
  hobbies: { icon: "🎨", text: "兴趣爱好分享" },
  fitness: { icon: "💪", text: "健身运动指导" },
  money: { icon: "💰", text: "理财消费话题" },
  tech: { icon: "📱", text: "科技产品讨论" },
  news: { icon: "📰", text: "新闻时事讨论" },
  culture: { icon: "🎭", text: "文化艺术交流" },
  entertainment: { icon: "🎬", text: "影视娱乐闲聊" },
  music: { icon: "🎵", text: "音乐话题讨论" },
  sports: { icon: "⚽", text: "体育赛事讨论" },
  science: { icon: "🔬", text: "科学自然探索" },
  environment: { icon: "🌍", text: "环境气候讨论" },
  history: { icon: "📜", text: "历史故事讲述" },
  psychology: { icon: "🧠", text: "心理成长分析" },
  city_life: { icon: "🏙️", text: "城市生活体验" },
};

export async function GET() {
  try {
    // ① 按标签统计场景覆盖面，取覆盖面最广的 18 个标签组成候选池
    //    （覆盖面门槛保证「搜到好结果」，池宽保证刷新可换组）
    const tagCounts = await prisma.micro_scenes.groupBy({
      by: ["situationTag"],
      where: { situationTag: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { situationTag: "desc" } },
      take: 18,
    });

    // ①' Fisher-Yates 洗牌候选池——每次请求随机取 6（刷新换组）
    for (let i = tagCounts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tagCounts[i], tagCounts[j]] = [tagCounts[j], tagCounts[i]];
    }

    // ② 取 6 个不同标签的代表场景 + 主流难度
    const picked: Array<{
      icon: string;
      text: string;
      tag: string;
      level: string;
    }> = [];
    const usedTags = new Set<string>();

    for (const tc of tagCounts) {
      if (picked.length >= 6) break;
      const tag = tc.situationTag as string;
      if (usedTags.has(tag)) continue;

      const tpl = TAG_TEMPLATES[tag];
      if (!tpl) continue;

      // 该标签下最高分场景的难度作为推荐难度
      const best = await prisma.micro_scenes.findFirst({
        where: { situationTag: tag, duration: { gte: 15, lte: 40 } },
        select: { cefrLevel: true },
        orderBy: { createdAt: "desc" },
      });

      picked.push({
        icon: tpl.icon,
        text: tpl.text,
        tag,
        level: best?.cefrLevel || "B1",
      });
      usedTags.add(tag);
    }

    // 兜底：语料覆盖不足时用静态 6 条填满
    while (picked.length < 6) {
      const fb = FALLBACK_IDEAS[picked.length];
      if (!fb || usedTags.has(fb.tag)) break;
      picked.push(fb);
      usedTags.add(fb.tag);
    }

    return NextResponse.json({
      success: true,
      data: {
        ideas: picked.slice(0, 6),
        source: "corpus",
      },
    });
  } catch (error) {
    console.error("[GET /api/scenes/preset-ideas]", error);
    return NextResponse.json({
      success: true,
      data: { ideas: FALLBACK_IDEAS, source: "fallback" },
    });
  }
}
