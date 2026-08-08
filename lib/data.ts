import { generateSignatureUrl } from "@/lib/oss";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

import { Tag } from "@/core/tag/tag.entity";
import { Podcast } from "@/core/podcast/podcast.entity";
import { Episode } from "@/core/episode/episode.entity";
import { User } from "@/core/user/user.entity";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

/**
 * 获取标签列表
 */
export async function fetchTags(): Promise<Tag[]> {
  const res = await fetch(`${baseUrl}/api/tag/list`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch tags");
  }
  return await res.json();
}
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
  const data = await res.json();
  if (data.length > 0) {
    for (let i = 0; i < data.length; i++) {
      if (data[i].user_profile && data[i].user_profile.avatarFileName) {
        data[i].user_profile.avatarUrl = await generateSignatureUrl(
          data[i].user_profile.avatarFileName,
          3600 * 3,
        );
      } else if (data[i].user_profile) {
        data[i].user_profile.avatarUrl =
          "/static/images/apple-touch-icon-dark.png";
      }
    }
  }
  return data;
}

/**
 * 根据userid获取用户
 * @param id
 */
export async function fetchUserById(id: string): Promise<User> {
  const res = await fetch(`${baseUrl}/api/user/detail?id=${id}`, {
    method: "GET",
    headers: {},
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch user");
  }
  return await res.json();
}

/**
 * 在线用户数和用户列表
 */
interface OnlineUsersData {
  numberOfOnlineUsers: number;
  onlineUsers: Array<{ userid: string; role: string }>;
}

/**
 * 获取在线用户数和用户列表
 */
export async function fetchOnlineUsers(): Promise<OnlineUsersData> {
  try {
    const onlineUsersRaw = await prisma.user.findMany({
      where: { isOnline: true },
      select: { userid: true, role: true },
    });
    const onlineUsers = onlineUsersRaw.map((user) => ({
      userid: user.userid,
      role: user.role || "USER",
    }));

    return {
      numberOfOnlineUsers: onlineUsersRaw.length,
      onlineUsers,
    };
  } catch (error) {
    console.error("Failed to fetch online users from DB:", error);
    return {
      numberOfOnlineUsers: 0,
      onlineUsers: [],
    };
  }
}

/**
 * 获取播客列表
 * @returns {Promise<Podcast[]>} 返回播客列表，每个播客包含未 episodes 数组
 */
export async function fetchPodcasts(): Promise<Podcast[]> {
  console.log("当前 NEXT_PHASE:", process.env.NEXT_PHASE);
  // 在构建阶段跳过数据获取
  if (process.env.NEXT_PHASE === "phase-production-build") {
    console.log("构建阶段，跳过数据获取");
    return [];
  }

  try {
    const res = await fetch(`${baseUrl}/api/podcast/list`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      console.error(`获取播客失败: ${res.status} ${res.statusText}`);
      throw new Error("Failed to fetch podcasts");
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("获取播客列表失败:", error);
    return [];
  }
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
      if (
        data.episode[i].subtitleEnUrl &&
        data.episode[i].subtitleEnUrl.length > 0
      ) {
        data.episode[i].subtitleEnUrl = await generateSignatureUrl(
          data.episode[i].subtitleEnFileName,
          3600 * 3,
        );
      }
      if (
        data.episode[i].subtitleZhUrl &&
        data.episode[i].subtitleZhUrl.length > 0
      ) {
        data.episode[i].subtitleZhUrl = await generateSignatureUrl(
          data.episode[i].subtitleZhFileName,
          3600 * 3,
        );
      }
      if (
        data.episode[i].subtitleBilingualUrl &&
        data.episode[i].subtitleBilingualUrl.length > 0
      ) {
        data.episode[i].subtitleBilingualUrl = await generateSignatureUrl(
          data.episode[i].subtitleBilingualFileName,
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
export async function fetchEpisodes(): Promise<Episode[]> {
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
  const headersList = await headers();
  const cookie = headersList.get("cookie") || "";
  const res = await fetch(`${baseUrl}/api/episode/detail?id=${id}`, {
    method: "GET",
    headers: { Cookie: cookie },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch episode");
  }
  const data = await res.json();
  data.coverUrl = await generateSignatureUrl(data.coverFileName, 3600 * 3);
  data.audioUrl = await generateSignatureUrl(data.audioFileName, 3600 * 3);
  if (data.subtitleEnUrl && data.subtitleEnUrl.length > 0) {
    data.subtitleEnUrl = await generateSignatureUrl(
      data.subtitleEnFileName,
      3600 * 3,
    );
  }
  if (data.subtitleZhUrl && data.subtitleZhUrl.length > 0) {
    data.subtitleZhUrl = await generateSignatureUrl(
      data.subtitleZhFileName,
      3600 * 3,
    );
  }
  if (data.subtitleBilingualUrl && data.subtitleBilingualUrl.length > 0) {
    data.subtitleBilingualUrl = await generateSignatureUrl(
      data.subtitleBilingualFileName,
      3600 * 3,
    );
  }
  if (data.podcast) {
    data.podcast.coverUrl = await generateSignatureUrl(
      data.podcast.coverFileName,
      3600 * 3,
    );
  }
  return data;
}

/**
 * 获取字幕
 * @param subtitleUrl
 */
async function data(subtitleUrl: string) {
  if (subtitleUrl === null || subtitleUrl.length === 0) {
    console.log("No subtitle URL provided: ", subtitleUrl?.length);
    return [];
  } else {
    try {
      console.log("Fetching subtitle from:", subtitleUrl);
      const res = await fetch(subtitleUrl, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        console.error(
          `Failed to fetch subtitle. Status: ${res.status} ${res.statusText}`,
        );
        const text = await res.text();
        console.error("Response body:", text.substring(0, 200));
        return [];
      }

      const srtData = await res.text();
      return parseSrt(srtData);
    } catch (err) {
      console.error("Failed to fetch subtitles. URL:", subtitleUrl);
      console.error(err);
      return [];
    }
  }
}

interface SubtitleItem {
  id: number;
  start: number;
  end: number;
  text: string;
}

// 辅助函数：将 SRT 的时间字符串转换为秒
function parseSrtTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(":");
  if (parts.length !== 3) return 0;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const secParts = parts[2].split(",");
  const seconds = parseInt(secParts[0], 10);
  const ms = secParts.length > 1 ? parseInt(secParts[1], 10) : 0;
  return hours * 3600 + minutes * 60 + seconds + ms / 1000;
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
        start: parseSrtTimeToSeconds(timeMatch[1]),
        end: parseSrtTimeToSeconds(timeMatch[2]),
        text,
      };
    })
    .filter(Boolean) as SubtitleItem[];
};

/**
 * 合并字幕
 * @param episode
 */
export async function mergeSubtitles(episode: Episode) {
  // 1. 优先使用双语 JSON 字幕
  if (episode.subtitleBilingualUrl) {
    try {
      const res = await fetch(episode.subtitleBilingualUrl, {
        method: "GET",
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0) {
          console.log(
            "[Subtitle Loader] Loaded bilingual subtitles (JSON format)",
          );
          // JSON 字幕自带 start, end, speaker, textEn, textCn, words
          return json.map((item) => ({
            id: item.id,
            start: item.start,
            end: item.end,
            speaker: item.speaker,
            textEn: item.textEn,
            textCn: item.textCn,
            words: item.words,
          }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch bilingual subtitle JSON", error);
    }
  }

  // 2. 降级使用分开的 SRT 字幕
  const subtitleEn = (await data(episode.subtitleEnUrl as string)) || null;
  const subtitleZh = (await data(episode.subtitleZhUrl as string)) || null;

  if (subtitleEn === null || subtitleEn.length === 0) {
    return [];
  }

  if (subtitleZh === null) {
    console.log("[Subtitle Loader] Loaded English-only subtitles (SRT format)");
    return subtitleEn.map((item) => {
      return {
        id: item.id,
        start: item.start,
        end: item.end,
        textEn: item.text,
        textCn: "",
      };
    });
  }

  if (subtitleEn.length !== subtitleZh.length) {
    throw new Error("中英文字幕不匹配");
  }

  console.log(
    "[Subtitle Loader] Loaded Bilingual subtitles (Merged SRT format)",
  );
  return subtitleEn.map((enItem) => {
    // 找到对应ID的中文字幕项
    const zhItem = subtitleZh.find((item) => item.id === enItem.id);
    if (!zhItem) {
      throw new Error(`Chinese subtitle not found for ID: ${enItem.id}`);
    }
    return {
      id: enItem.id,
      start: enItem.start,
      end: enItem.end,
      textEn: enItem.text,
      textCn: zhItem.text,
    };
  });
}
