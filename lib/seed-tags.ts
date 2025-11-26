// seedTags.ts
import prisma from "@/lib/prisma";
import { TagType } from "@/core/tag/tag.entity";

export async function initializeTags() {
  const podcastTags = [
    {
      name: "口语训练",
      type: TagType.PODCAST,
      description: "提升英语口语能力的系列课程，包含对话练习和发音指导",
    },
    {
      name: "听力精讲",
      type: TagType.PODCAST,
      description: "针对不同场景的听力强化训练，包含精听和泛听材料",
    },
    {
      name: "语法详解",
      type: TagType.PODCAST,
      description: "系统讲解英语语法规则与常见错误分析",
    },
    {
      name: "词汇拓展",
      type: TagType.UNIVERSAL,
      description: "通过主题分类和词根词缀记忆法扩展词汇量",
    },
    {
      name: "发音矫正",
      type: TagType.PODCAST,
      description: "针对中国学习者常见发音问题的纠正训练",
    },
    {
      name: "商务英语",
      type: TagType.PODCAST,
      description: "涵盖会议、邮件、谈判等职场场景的专业英语",
    },
    {
      name: "学术英语",
      type: TagType.PODCAST,
      description: "适用于论文写作、学术演讲的规范英语表达",
    },
    {
      name: "初级课程",
      type: TagType.PODCAST,
      description: "适合英语入门学习者的基础教学内容",
    },
    {
      name: "中级课程",
      type: TagType.PODCAST,
      description: "针对具备基础的学习者设计的提升课程",
    },
    {
      name: "高级课程",
      type: TagType.PODCAST,
      description: "面向高阶学习者的复杂场景应用教学",
    },
    {
      name: "全级别适用",
      type: TagType.UNIVERSAL,
      description: "所有英语水平学习者均可使用的内容",
    },
    {
      name: "访谈对话",
      type: TagType.PODCAST,
      description: "通过真实人物访谈学习自然对话技巧",
    },
    {
      name: "故事教学",
      type: TagType.PODCAST,
      description: "通过叙事性内容培养语言感知能力",
    },
    {
      name: "专题讲座",
      type: TagType.PODCAST,
      description: "深度解析特定语言知识点的专题课程",
    },
    {
      name: "每日会话",
      type: TagType.PODCAST,
      description: "日常高频场景的短对话练习集合",
    },
    {
      name: "旅行英语",
      type: TagType.PODCAST,
      description: "涵盖机场、酒店、问路等旅行场景用语",
    },
    {
      name: "职场英语",
      type: TagType.PODCAST,
      description: "面试、办公室沟通、职业发展相关英语",
    },
    {
      name: "文化洞察",
      type: TagType.UNIVERSAL,
      description: "结合英语国家文化背景的语言学习",
    },
    {
      name: "考试备战",
      type: TagType.PODCAST,
      description: "各类英语考试的应试技巧与真题解析",
    },
    {
      name: "雅思备考",
      type: TagType.PODCAST,
      description: "针对雅思考试各模块的专项训练",
    },
    {
      name: "托福备考",
      type: TagType.PODCAST,
      description: "TOEFL iBT考试相关的模拟训练",
    },
    {
      name: "儿童英语",
      type: TagType.PODCAST,
      description: "适合青少儿的趣味英语学习内容",
    },
    {
      name: "口音训练",
      type: TagType.PODCAST,
      description: "美式/英式发音的专项区分练习",
    },
    {
      name: "影视解析",
      type: TagType.PODCAST,
      description: "通过影视片段学习地道表达方式",
    },
  ];

  const episodeTags = [
    {
      name: "时态精析",
      type: TagType.EPISODE,
      description: "深入解析特定英语时态的用法与区别",
    },
    {
      name: "短语动词",
      type: TagType.EPISODE,
      description: "常见动词短语的搭配与使用场景",
    },
    {
      name: "习语大全",
      type: TagType.EPISODE,
      description: "英语常用习语及其文化背景解析",
    },
    {
      name: "介词用法",
      type: TagType.EPISODE,
      description: "易混淆介词的对比分析与练习",
    },
    {
      name: "俚语解析",
      type: TagType.EPISODE,
      description: "当代英语流行俚语及其适用场合",
    },
    {
      name: "影子跟读",
      type: TagType.EPISODE,
      description: "通过同步跟读训练提升语音语调",
    },
    {
      name: "速记技巧",
      type: TagType.EPISODE,
      description: "听力过程中的高效笔记记录方法",
    },
    {
      name: "倍速听力",
      type: TagType.EPISODE,
      description: "不同语速的听力适应性训练",
    },
    {
      name: "错题解析",
      type: TagType.EPISODE,
      description: "典型错误案例分析与纠正",
    },
    {
      name: "机场场景",
      type: TagType.EPISODE,
      description: "值机、安检、登机全流程英语",
    },
    {
      name: "面试模拟",
      type: TagType.EPISODE,
      description: "常见职位英语面试实景演练",
    },
    {
      name: "酒店入住",
      type: TagType.EPISODE,
      description: "预订、入住、退房的完整对话范例",
    },
    {
      name: "社交场合",
      type: TagType.EPISODE,
      description: "派对、聚会等社交场景交流技巧",
    },
    {
      name: "随堂测试",
      type: TagType.EPISODE,
      description: "课程配套知识点检测练习",
    },
    {
      name: "角色扮演",
      type: TagType.EPISODE,
      description: "情景模拟对话练习",
    },
    {
      name: "听写训练",
      type: TagType.EPISODE,
      description: "通过听写提升拼写和语法意识",
    },
    {
      name: "嘉宾分享",
      type: TagType.EPISODE,
      description: "特邀外籍嘉宾的真实语言示范",
    },
    {
      name: "带字幕",
      type: TagType.EPISODE,
      description: "提供可切换的多语言字幕支持",
    },
    {
      name: "文本下载",
      type: TagType.EPISODE,
      description: "可离线使用的课程文字稿资源",
    },
    {
      name: "互动练习",
      type: TagType.EPISODE,
      description: "包含即时反馈的交互式学习模块",
    },
  ];

  const difficultyTags = [
    {
      name: "入门级",
      type: TagType.UNIVERSAL,
      description: "CEFR A1级 - 适合零基础学习者",
    },
    {
      name: "基础级",
      type: TagType.UNIVERSAL,
      description: "CEFR A2级 - 掌握基本日常用语",
    },
    {
      name: "进阶级",
      type: TagType.UNIVERSAL,
      description: "CEFR B1级 - 能应对日常交流场景",
    },
    {
      name: "熟练级",
      type: TagType.UNIVERSAL,
      description: "CEFR B2级 - 流利进行专业领域交流",
    },
    {
      name: "专业级",
      type: TagType.UNIVERSAL,
      description: "CEFR C1级 - 学术及商务场景高级应用",
    },
    {
      name: "精通级",
      type: TagType.UNIVERSAL,
      description: "CEFR C2级 - 接近母语者理解能力",
    },
    {
      name: "小学水平",
      type: TagType.UNIVERSAL,
      description: "适合义务教育小学阶段的英语内容",
    },
    {
      name: "初中水平",
      type: TagType.UNIVERSAL,
      description: "对应初中英语教学大纲要求",
    },
    {
      name: "高中水平",
      type: TagType.UNIVERSAL,
      description: "涵盖高考英语核心知识点",
    },
    {
      name: "大学四级",
      type: TagType.UNIVERSAL,
      description: "CET-4考试相关的学习资源",
    },
    {
      name: "大学六级",
      type: TagType.UNIVERSAL,
      description: "CET-6考试强化训练材料",
    },
    {
      name: "考研英语",
      type: TagType.UNIVERSAL,
      description: "研究生入学考试英语专项辅导",
    },
  ];

  // 使用事务批量创建
  // await prisma.$transaction([
  //   ...podcastTags.map((tags) =>
  //     prisma.tags.upsert({
  //       where: { name: tags.name },
  //       update: {},
  //       batch-create: tags,
  //     }),
  //   ),
  //   ...episodeTags.map((tags) =>
  //     prisma.tags.upsert({
  //       where: { name: tags.name },
  //       update: {},
  //       batch-create: tags,
  //     }),
  //   ),
  //   ...difficultyTags.map((tags) =>
  //     prisma.tags.upsert({
  //       where: { name: tags.name },
  //       update: {},
  //       batch-create: tags,
  //     }),
  //   ),
  // ]);

  // 合并所有标签并去重
  const allTags = [...podcastTags, ...episodeTags, ...difficultyTags];

  allTags.map((tag) =>
    prisma.tag.upsert({
      where: { name: tag.name },
      update: { description: tag.description }, // 更新已存在标签的描述
      create: tag,
    }),
  );

  console.log(
    "成功创建%d个播客标签和%d个剧集标签",
    podcastTags.length,
    episodeTags.length,
    difficultyTags.length,
  );
}

initializeTags()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
