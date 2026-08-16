/** 发音能力画像 DTO（数据来自用户全部语音评测的聚合） */
export interface SpeechProfileDto {
  /** 评测总次数 */
  evalCount: number;
  /** 综合分均值（0-100，无数据为 null） */
  avgOverall: number | null;
  /** 准确度均值 */
  avgAccuracy: number | null;
  /** 流利度均值 */
  avgFluency: number | null;
  /** 完整度均值 */
  avgIntegrity: number | null;
  /** 语速均值（词/分钟） */
  avgSpeed: number | null;
  /** 语速适配分（0-100，越接近理想区间越高） */
  speedFitScore: number | null;
  /** 推导出的 CEFR 等级（评测次数不足时为 null） */
  cefrLevel: string | null;
}

/** 雷达图维度点 */
export interface SpeechProfileRadarPoint {
  dim: string;
  score: number;
  fullMark: number;
}
