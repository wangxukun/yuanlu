import { generateSignatureUrl } from "@/app/lib/oss";
import { Episode, EpisodeTableData } from "@/app/types/podcast";
import axios from "axios";
import { User } from "@/app/types/user";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

/**
 * 获取用户列表
 */
export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${baseUrl}/api/user/list`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch users");
  }
  return await res.json();
}

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
  data.coverUrl = await generateSignatureUrl(data.coverFileName, 3600 * 3);
  if (data.episode && data.episode.length > 0) {
    for (let i = 0, len = data.episode.length; i < len; i++) {
      data.episode[i].coverUrl = await generateSignatureUrl(
        data.episode[i].coverFileName,
        3600 * 3,
      );
      data.episode[i].audioUrl = await generateSignatureUrl(
        data.episode[i].audioFileName,
        3600 * 3,
      );
      if (data.episode[i].subtitleEnUrl.length > 0) {
        data.episode[i].subtitleEnUrl = await generateSignatureUrl(
          data.episode[i].subtitleEnFileName,
          3600 * 3,
        );
      }
      if (data.episode[i].subtitleZhUrl.length > 0) {
        data.episode[i].subtitleZhUrl = await generateSignatureUrl(
          data.episode[i].subtitleZhFileName,
          3600 * 3,
        );
      }
    }
  }
  return data;
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

/**
 * 获取单集详情，包含所属的 podcast
 * @param id episode id
 */
export async function fetchEpisodeById(id: string): Promise<Episode> {
  const res = await fetch(`${baseUrl}/api/episode/detail?id=${id}`, {
    method: "GET",
    headers: {},
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch episode");
  }
  const data = await res.json();
  data.coverUrl = await generateSignatureUrl(data.coverFileName, 3600 * 3);
  data.audioUrl = await generateSignatureUrl(data.audioFileName, 3600 * 3);
  if (data.subtitleEnUrl.length > 0) {
    data.subtitleEnUrl = await generateSignatureUrl(
      data.subtitleEnFileName,
      3600 * 3,
    );
  }
  if (data.subtitleZhUrl.length > 0) {
    data.subtitleZhUrl = await generateSignatureUrl(
      data.subtitleZhFileName,
      3600 * 3,
    );
  }
  if (data.category) {
    data.category.coverUrl = await generateSignatureUrl(
      data.category.coverFileName,
      3600 * 3,
    );
  }
  return data;
}

/**
 * 获取字幕
 * @param subtitleUrl
 */
async function fetchSubtitles(subtitleUrl: string) {
  if (subtitleUrl?.length === 0) {
    return [];
  } else {
    try {
      const response = await axios.get(subtitleUrl);
      return parseSrt(response.data);
    } catch (err) {
      console.error("Failed to fetch subtitles:", err);
    }
  }
}

interface SubtitleItem {
  id: number;
  startTime: string;
  endTime: string;
  text: string;
}

// SRT 文件解析函数
const parseSrt = (srtText: string): SubtitleItem[] => {
  const subtitleBlocks = srtText.trim().split(/\r?\n\r?\n/);
  return subtitleBlocks
    .map((block) => {
      const lines = block.split(/\r?\n/);
      if (lines.length < 3) return null;
      const id = parseInt(lines[0]);
      const timeMatch = lines[1].match(
        /(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/,
      );
      if (!timeMatch) return null;
      const text = lines.slice(2).join("\n");
      return {
        id,
        startTime: timeMatch[1],
        endTime: timeMatch[2],
        text,
      };
    })
    .filter(Boolean) as SubtitleItem[];
};

export async function mergeSubtitles(episode: Episode) {
  const subtitleEn =
    (await fetchSubtitles(episode.subtitleEnUrl as string)) || null;
  const subtitleZh =
    (await fetchSubtitles(episode.subtitleZhUrl as string)) || null;
  if (subtitleEn === null) {
    return [];
  }
  if (subtitleEn.length === 0) {
    return [];
  }
  if (subtitleZh === null) {
    return subtitleEn.map((item) => {
      return {
        id: item.id,
        startTime: item.startTime,
        endTime: item.endTime,
        textEn: item.text,
        textZh: "",
      };
    });
  }

  if (subtitleEn.length !== subtitleZh.length) {
    throw new Error("中英文字幕不匹配");
  }

  return subtitleEn.map((enItem) => {
    // 找到对应ID的中文字幕项
    const zhItem = subtitleZh.find((item) => item.id === enItem.id);
    if (!zhItem) {
      throw new Error(`Chinese subtitle not found for ID: ${enItem.id}`);
    }
    return {
      id: enItem.id,
      startTime: enItem.startTime,
      endTime: enItem.endTime,
      textEn: enItem.text,
      textZh: zhItem.text,
    };
  });
}
