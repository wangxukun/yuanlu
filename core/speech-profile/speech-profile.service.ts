import prisma from "@/lib/prisma";
import { SpeechProfileDto, SpeechProfileRadarPoint } from "./dto";

/**
 * 发音能力画像服务（VOICE-EVALUATION 阶段四·任务3）
 *
 * 基于用户全部语音评测数据聚合出能力画像：
 * - 五维雷达（准确度/流利度/完整度/语速适配/综合）
 * - CEFR 等级推导（供首页自适应推荐使用）
 *
 * 所有映射均为启发式规则，阈值集中在常量区便于调参。
 */

/** 画像可信所需的最少评测次数（不足时不推导等级） */
const MIN_EVALS_FOR_LEVEL = 5;

/**
 * CEFR 等级推导阈值（综合分 = overall*0.6 + fluency*0.4）
 * 参考依据：overall 反映跟读质量，fluency 反映连贯性；
 * 两者加权后的分段与 CEFR 口语描述大体对应。
 */
const CEFR_THRESHOLDS: { min: number; level: string }[] = [
  { min: 88, level: "C1" },
  { min: 78, level: "B2" },
  { min: 66, level: "B1" },
  { min: 52, level: "A2" },
];

/** 推导等级 → 推荐剧集难度档（含相邻档，避免长尾难度推荐为空） */
export const CEFR_EPISODE_MAPPING: Record<string, string[]> = {
  A1: ["A1", "A2"],
  A2: ["A2", "B1"],
  B1: ["B1", "B2"],
  B2: ["B2", "C1"],
  C1: ["C1", "C2"],
};

/** 理想语速区间（词/分钟）：跟读场景下接近原声语速即视为适配 */
const IDEAL_SPEED_RANGE: [number, number] = [100, 150];

/**
 * 语速适配分（0-100）：区间内高分，偏离线性衰减。
 */
export function calcSpeedFitScore(speed: number): number {
  const [lo, hi] = IDEAL_SPEED_RANGE;
  if (speed >= lo && speed <= hi) {
    // 区间内：90-100，越居中越高
    const mid = (lo + hi) / 2;
    const deviation = Math.abs(speed - mid) / ((hi - lo) / 2);
    return Math.round(100 - deviation * 10);
  }
  const distance = speed < lo ? lo - speed : speed - hi;
  // 每偏离 1 词/分钟扣 0.8 分，下限 20
  return Math.max(20, Math.round(90 - distance * 0.8));
}

/** 由综合分+流利度推导 CEFR 等级 */
export function deriveCefrLevel(
  avgOverall: number,
  avgFluency: number,
): string {
  const composite = avgOverall * 0.6 + avgFluency * 0.4;
  for (const t of CEFR_THRESHOLDS) {
    if (composite >= t.min) return t.level;
  }
  return "A1";
}

export const speechProfileService = {
  /**
   * 聚合用户的发音能力画像（全部评测）。
   */
  async getSpeechProfile(userid: string): Promise<SpeechProfileDto> {
    const agg = await prisma.speech_recognition.aggregate({
      where: { userid },
      _count: { recognitionid: true },
      _avg: {
        overallScore: true,
        accuracyScore: true,
        fluencyScore: true,
        integrityScore: true,
        speed: true,
      },
    });

    const evalCount = agg._count.recognitionid;
    const avgSpeed = agg._avg.speed;

    return {
      evalCount,
      avgOverall: agg._avg.overallScore,
      avgAccuracy: agg._avg.accuracyScore,
      avgFluency: agg._avg.fluencyScore,
      avgIntegrity: agg._avg.integrityScore,
      avgSpeed,
      speedFitScore: avgSpeed !== null ? calcSpeedFitScore(avgSpeed) : null,
      cefrLevel:
        evalCount >= MIN_EVALS_FOR_LEVEL &&
        agg._avg.overallScore !== null &&
        agg._avg.fluencyScore !== null
          ? deriveCefrLevel(agg._avg.overallScore, agg._avg.fluencyScore)
          : null,
    };
  },

  /**
   * 获取可用于自适应推荐的 CEFR 等级；评测数据不足时返回 null
   * （调用方应回退到用户手动设置的 learnLevel）。
   */
  async getDerivedLevel(userid: string): Promise<string | null> {
    const profile = await this.getSpeechProfile(userid);
    return profile.cefrLevel;
  },

  /**
   * 将画像转为雷达图维度点（缺维度以 0 计，前端提示数据积累中）。
   */
  toRadarData(profile: SpeechProfileDto): SpeechProfileRadarPoint[] {
    const dims: [string, number | null][] = [
      ["准确度", profile.avgAccuracy],
      ["流利度", profile.avgFluency],
      ["完整度", profile.avgIntegrity],
      ["语速适配", profile.speedFitScore],
      ["综合表现", profile.avgOverall],
    ];
    return dims.map(([dim, v]) => ({
      dim,
      score: v !== null ? Math.round(v) : 0,
      fullMark: 100,
    }));
  },
};
