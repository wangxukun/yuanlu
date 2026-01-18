// yuanlu/core/learning-path/dto.ts

import { z } from "zod";

// Zod Schema 用于表单验证
export const CreateLearningPathSchema = z.object({
  pathName: z.string().min(1, "名称不能为空").max(255, "名称过长"),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
});

export const AddEpisodeToPathSchema = z.object({
  pathid: z.number(),
  episodeid: z.string(),
});

export type CreateLearningPathDto = z.infer<typeof CreateLearningPathSchema>;

// 返回给前端的类型定义
export interface LearningPathItemDto {
  id: number;
  episodeid: string;
  order: number;
  addedAt: Date;
  episode: {
    title: string;
    coverUrl: string;
    duration: number;
  };
}

export interface LearningPathDto {
  pathid: number;
  userid: string;
  pathName: string;
  description: string | null;
  isPublic: boolean;
  itemCount: number; // 统计包含多少集
  items?: LearningPathItemDto[]; // 详情页才返回具体列表
  creationAt: Date | null;
}
