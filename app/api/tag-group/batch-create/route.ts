import { TagType } from "@/core/tag/tag.entity";
import prisma from "@/lib/prisma";

const tagGroups = [
  {
    name: "学习阶段",
    description: "按照欧洲语言共同参考框架(CEFR)划分的英语能力等级",
    imageUrl: "/images/levels.png",
    sortOrder: 1,
    allowedTypes: [TagType.UNIVERSAL],
  },
  {
    name: "考试认证",
    description: "国内外主流英语考试备考资源",
    imageUrl: "/images/examination-certification.png",
    sortOrder: 2,
    allowedTypes: [TagType.UNIVERSAL],
  },
  {
    name: "技能培养",
    description: "针对特定语言技能的专项训练",
    imageUrl: "/images/skill-training.png",
    sortOrder: 3,
    allowedTypes: [TagType.EPISODE],
  },
  {
    name: "主题场景",
    description: "不同生活与职业场景的实用英语",
    imageUrl: "/images/scenario-based.png",
    sortOrder: 4,
    allowedTypes: [TagType.UNIVERSAL],
  },
  {
    name: "内容形式",
    description: "播客内容呈现方式与教学形态",
    imageUrl: "/images/content-format.png",
    sortOrder: 5,
    allowedTypes: [TagType.PODCAST, TagType.EPISODE],
  },
  {
    name: "附加功能",
    description: "增强学习效果的技术与辅助功能",
    imageUrl: "/images/extra-features.png",
    sortOrder: 6,
    allowedTypes: [TagType.UNIVERSAL],
  },
  {
    name: "教学类型",
    description: "系统化课程与特色教学模式",
    imageUrl: "/images/teaching-style.png",
    sortOrder: 7,
    allowedTypes: [TagType.PODCAST],
  },
  {
    name: "考试备战",
    description: "应试技巧与真题解析专项内容",
    imageUrl: "/images/exam-preparation.png",
    sortOrder: 8,
    allowedTypes: [TagType.PODCAST],
  },
];

export async function GET() {
  console.log("Initializing tag_group...");
  try {
    // 使用 Promise.all 确保所有 upsert 操作完成
    await Promise.all(
      tagGroups.map(async (group) => {
        try {
          await prisma.tag_group.upsert({
            where: { name: group.name },
            update: { description: group.description }, // 更新已存在标签的描述
            create: group,
          });
        } catch (error) {
          console.error(`Error upserting tag_group ${group.name}:`, error);
          // 可以选择抛出错误或者记录日志后继续执行其他标签
          throw error; // 如果需要严格事务性行为
        }
      }),
    );

    return new Response("tag_groups initialized successfully", { status: 200 });
  } catch (error) {
    console.error("Error initializing tag_groups:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
