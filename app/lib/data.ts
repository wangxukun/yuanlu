import { generateSignatureUrl } from "@/app/lib/oss";

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
  coverUrl?: string;
  coverFileName?: string;
  from: string;
}

/**
 * 获取播客列表
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
