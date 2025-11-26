import {
  Access,
  EpisodeManagementItem,
  Status,
} from "@/core/episode/dto/episode-management-item";

const generateMockData = (): EpisodeManagementItem[] => {
  const episodes: EpisodeManagementItem[] = [];
  const statuses = [
    Status.PUBLISHED,
    Status.REVIEWING,
    Status.PUBLISHED,
    Status.PUBLISHED,
  ];
  const accesses = [Access.FREE, Access.MEMBER, Access.FREE];

  for (let i = 1; i <= 35; i++) {
    // 使用固定值替代随机数，以避免hydration错误
    const month = ((i % 12) + 1).toString().padStart(2, "0");
    const day = (((i * 2) % 28) + 1).toString().padStart(2, "0");
    const hours = (i % 60).toString().padStart(2, "0");
    const minutes = ((i * 3) % 60).toString().padStart(2, "0");
    const likes = i * 100;
    const plays = i * 1000;
    const favorites = i * 50;
    const shares = i * 20;
    const comments = i * 5;

    episodes.push({
      id: `ep-${i}`,
      title: `Ep.${i} - ${i % 2 === 0 ? "Mastering Business English" : "Casual Conversations in Coffee Shops"}`,
      coverUrl: `https://picsum.photos/seed/${i + 100}/200/200`,
      publishDate: `2023-${month}-${day}`,
      status: statuses[i % statuses.length],
      access: accesses[i % accesses.length],
      duration: `${hours}:${minutes}`,
      stats: {
        likes: likes,
        plays: plays,
        favorites: favorites,
        shares: shares,
        comments: comments,
      },
    });
  }
  return episodes;
};

export const MOCK_EPISODES = generateMockData();

export const NAV_ITEMS = [
  { name: "仪表盘", icon: "LayoutDashboard", active: false },
  { name: "内容管理", icon: "Mic", active: true },
  { name: "用户分析", icon: "Users", active: false },
  { name: "财务统计", icon: "PieChart", active: false },
  { name: "系统设置", icon: "Settings", active: false },
];
