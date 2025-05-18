"use client";

import { useEffect, useState } from "react";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import { HeartIcon } from "@heroicons/react/24/outline";

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
        className={`btn btn-active btn-sm ${favorite ? "btn-secondary" : ""}`}
      >
        {favorite ? (
          <HeartSolidIcon className="size-[1.2em]" />
        ) : (
          <HeartIcon className="size-[1.2em]" />
        )}
        喜欢
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
        className={`btn btn-active btn-sm ${favorite ? "btn-secondary" : ""}`}
      >
        {favorite ? (
          <HeartSolidIcon className="size-[1.2em]" />
        ) : (
          <HeartIcon className="size-[1.2em]" />
        )}
        喜欢
      </button>
    </form>
  );
}
