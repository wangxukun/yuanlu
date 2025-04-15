import { generateSignatureUrl } from "@/app/lib/oss";
import { Episode } from "@/app/types/podcast";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

/**
 * 在线用户数和用户列表
 */
interface OnlineUsersData {
  numberOfOnlineUsers: number;
  onlineUsers: Array<{ userid: string; phone: string; role: string }>;
}

/**
 * 获取在线用户数和用户列表
 */
export async function fetchOnlineUsers(): Promise<OnlineUsersData> {
  const res = await fetch(`${baseUrl}/api/auth/online-users`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    return {
      numberOfOnlineUsers: 0,
      onlineUsers: [],
    };
  }
  const data = await res.json();
  const numberOfOnlineUsers = data.count;
  const onlineUsers = data.users;
  return {
    numberOfOnlineUsers,
    onlineUsers,
  };
}

interface Podcast {
  categoryid: number;
  title: string;
  description: string;
  coverUrl: string;
  coverFileName?: string;
  from: string;
  episode: Array<Episode>;
}

/**
 * 获取播客列表
 * @returns {Promise<Podcast[]>} 返回播客列表，每个播客包含未 episodes 数组
 */
export async function fetchPodcasts(): Promise<Podcast[]> {
  const res = await fetch(`${baseUrl}/api/podcast/list`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch podcasts");
  }
  const data = await res.json();
  if (data.length > 0) {
    for (let i = 0; i < data.length; i++) {
      data[i].coverUrl = await generateSignatureUrl(
        data[i].coverFileName,
        3600 * 3,
      );
    }
  }
  return data;
}

/**
 * 获取播客详情，包含 episodes 数组
 * @param id 播客 id
 */
export async function fetchPodcastById(id: string): Promise<Podcast> {
  const res = await fetch(`${baseUrl}/api/podcast/detail?id=${id}`, {
    method: "GET",
    headers: {},
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch podcast");
  }
  const data = await res.json();
  if (data.episode && data.episode.length > 0) {
    data.coverUrl = await generateSignatureUrl(data.coverFileName, 3600 * 3);
    for (let i = 0, len = data.episode.length; i < len; i++) {
      data.episode[i].coverUrl = await generateSignatureUrl(
        data.episode[i].coverFileName,
        3600 * 3,
      );
      data.episode[i].audioUrl = await generateSignatureUrl(
        data.episode[i].audioFileName,
        3600 * 3,
      );
      data.episode[i].subtitleEnUrl = await generateSignatureUrl(
        data.episode[i].subtitleEnFileName,
        3600 * 3,
      );
      data.episode[i].subtitleZhUrl = await generateSignatureUrl(
        data.episode[i].subtitleZhFileName,
        3600 * 3,
      );
    }
  }
  return data;
}

export interface EpisodeTableData {
  episodeid: string;
  coverUrl: string;
  coverFileName: string;
  title: string;
  duration: string;
  audioUrl: string;
  audioFileName: string;
  subtitleEnUrl: string;
  subtitleEnFileName: string;
  subtitleZhUrl: string;
  subtitleZhFileName: string;
  publishAt: string;
  createAt: string;
  status: string;
  isExclusive: boolean;
  category: {
    categoryid: number;
    title: string;
  };
}
/**
 * 获取episode列表
 */
export async function fetchEpisodes(): Promise<EpisodeTableData[]> {
  const res = await fetch(`${baseUrl}/api/episode/list`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch episodes");
  }
  const data = await res.json();
  if (data.length > 0) {
    for (let i = 0; i < data.length; i++) {
      // 生成封面图片的签名链接
      data[i].coverUrl = await generateSignatureUrl(
        data[i].coverFileName,
        3600 * 3,
      );

      // 生成音频文件的签名链接
      data[i].audioUrl = await generateSignatureUrl(
        data[i].audioFileName,
        3600 * 3,
      );
    }
  }
  return data;
}
