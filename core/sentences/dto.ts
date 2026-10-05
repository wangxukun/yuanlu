import { z } from "zod";

/** 收藏句子入参：episodeid + 字幕定位（subtitleId 优先，起止时间兜底定位与播放窗口） */
export const toggleSentenceSaveSchema = z.object({
  episodeid: z.string().min(1),
  subtitleId: z.number().int().nullable().optional(),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  enText: z.string().min(1),
  zhText: z.string().optional().nullable(),
});

/** 更新句子元信息（标签 / 笔记）入参 */
export const updateSentenceMetaSchema = z.object({
  id: z.number().int(),
  note: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string().min(1).max(20)).max(10).optional(),
});

/** 列表筛选参数：播客来源（剧集）/ 标签 / 时间范围 / 中英文全文检索 */
export const savedSentenceQuerySchema = z.object({
  episodeid: z.string().optional(),
  tag: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  q: z.string().optional(),
});

/** [SRS] 复习打卡入参：quality 四档（0=忘记 1=模糊 2=认识 3=简单，vocabulary 同口径） */
export const submitSentenceReviewSchema = z.object({
  id: z.number().int(),
  quality: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
});

export type ToggleSentenceSaveInput = z.infer<typeof toggleSentenceSaveSchema>;
export type UpdateSentenceMetaInput = z.infer<typeof updateSentenceMetaSchema>;
export type SavedSentenceQuery = z.infer<typeof savedSentenceQuerySchema>;

/** 前端展示用的句子条目（Date 已序列化为 ISO 字符串） */
export interface SavedSentenceItem {
  id: number;
  episodeid: string;
  episodeTitle: string;
  podcastTitle: string | null;
  subtitleId: number | null;
  startTime: number;
  endTime: number;
  enText: string;
  zhText: string | null;
  note: string | null;
  tags: string[];
  /** [SRS] Leitner 熟练度等级（0-6+） */
  proficiency: number;
  /** [SRS] 下次复习到期时间（isDue 判定；null 不会出现——列 NOT NULL，保留联合类型前端防漂移） */
  nextReviewAt: string | null;
  createAt: string;
  updateAt: string;
}
