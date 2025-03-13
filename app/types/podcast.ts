export interface Episode {
  id: string;
  title: string;
  date: string;
  duration: string;
  imageUrl: string;
  isExclusive: boolean;
  publisher: string;
  category: string; // 新增分类字段
  description: string;
  transcript: {
    // 修改为对象数组格式
    time: string;
    en: string;
    cn: string;
  }[];
}
