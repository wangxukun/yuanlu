"use client";

import { useEffect, useState } from "react";

/**
 * 收藏播客按钮
 * @param podcastid
 * @param userid
 */
export function PodcastFavoriteBtn({
  podcastid,
  userid,
}: {
  podcastid: string;
  userid: string;
}) {
  const [favorite, setFavorite] = useState(false);
  useEffect(() => {
    //  定义检查是否已收藏函数
    const favoriteCheck = async () => {
      const response = await fetch(
        `/api/podcast/favorite/find-unique?podcastid=${podcastid}&userid=${userid}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        } as RequestInit,
      );
      const data = await response.json();
      return data.success;
    };
    // 检查收藏状态
    favoriteCheck().then((result) => {
      setFavorite(result);
    });
  }, [favorite]);
  const handlePodcastFavoriteSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append("podcastid", podcastid);
    formData.append("userid", userid);
    if (favorite) {
      const res = await fetch("/api/podcast/favorite/delete", {
        method: "DELETE",
        body: formData,
      } as RequestInit);
      if (res.ok) {
        setFavorite(!favorite);
      }
    } else {
      const res = await fetch("/api/podcast/favorite/insert", {
        method: "POST",
        body: formData,
      } as RequestInit);
      if (res.ok) {
        setFavorite(!favorite);
      }
    }
  };

  return (
    <form onSubmit={handlePodcastFavoriteSubmit}>
      <button
        type="submit"
        className={`flex items-center text-sm px-2 py-1 rounded-lg transition-colors ${
          favorite
            ? "bg-red-100 text-red-600 hover:bg-red-200" // 已收藏状态样式
            : "bg-gray-100 text-gray-600 hover:bg-gray-200" // 未收藏状态样式
        }`}
      >
        {/* 收藏图标 */}
        <svg
          className="w-4 h-4 mr-1"
          fill={favorite ? "currentColor" : "none"} // 动态填充状态
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        收藏
      </button>
    </form>
  );
}

export function EpisodeFavoriteBtn({
  episodeid,
  userid,
}: {
  episodeid: string;
  userid: string;
}) {
  const [favorite, setFavorite] = useState(false);
  useEffect(() => {
    //  定义检查是否已收藏函数
    const favoriteCheck = async () => {
      const response = await fetch(
        `/api/episode/favorite/find-unique?episodeid=${episodeid}&userid=${userid}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        } as RequestInit,
      );
      const data = await response.json();
      return data.success;
    };
    // 检查收藏状态
    favoriteCheck().then((result) => {
      setFavorite(result);
    });
  }, [favorite]);
  const handleEpisodeFavoriteSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append("episodeid", episodeid);
    formData.append("userid", userid);
    if (favorite) {
      const res = await fetch("/api/episode/favorite/delete", {
        method: "DELETE",
        body: formData,
      } as RequestInit);
      if (res.ok) {
        setFavorite(!favorite);
      }
    } else {
      const res = await fetch("/api/episode/favorite/insert", {
        method: "POST",
        body: formData,
      } as RequestInit);
      if (res.ok) {
        setFavorite(!favorite);
      }
    }
  };

  return (
    <form onSubmit={handleEpisodeFavoriteSubmit}>
      <button
        type="submit"
        className={`flex items-center text-sm px-2 py-1 rounded-lg transition-colors ${
          favorite
            ? "bg-red-100 text-red-600 hover:bg-red-200" // 已收藏状态样式
            : "bg-gray-100 text-gray-600 hover:bg-gray-200" // 未收藏状态样式
        }`}
      >
        {/* 收藏图标 */}
        <svg
          className="w-4 h-4 mr-1"
          fill={favorite ? "currentColor" : "none"} // 动态填充状态
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        收藏
      </button>
    </form>
  );
}
