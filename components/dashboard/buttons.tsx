"use client";

import { PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { deletePodcast, PodcastDelState } from "@/app/lib/actions";
import { useActionState, useEffect } from "react";
import { redirect } from "next/navigation";

/** 管理播客类别按钮 */
export function PodcastsBtn() {
  return (
    <Link
      href="/dashboard/podcasts/categories"
      className="flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      <span className="hidden md:block">管理播客类别</span>{" "}
      <PencilIcon className="h-5 md:ml-4" />
    </Link>
  );
}

/** 发布剧集按钮 */
export function CreateEpisodeBtn() {
  return (
    <Link
      href="/dashboard/episodes/create"
      className="flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      <span className="hidden md:block">发布播客剧集</span>{" "}
      <PlusIcon className="h-5 md:ml-4" />
    </Link>
  );
}

/** 创建播客按钮 */
export function CreatePodcastBtn() {
  return (
    <Link
      href="/dashboard/podcasts/create"
      className="flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      <span className="hidden md:block">创建播客</span>{" "}
      <PlusIcon className="h-5 md:ml-4" />
    </Link>
  );
}

// 更新播客按钮
export function UpdatePodcastBtn({ id }: { id: number }) {
  return (
    <Link
      href={`/dashboard/podcasts/${id}/edit`}
      className="rounded-md border p-2 hover:bg-gray-100"
    >
      <PencilIcon className="w-5" />
    </Link>
  );
}

interface DeletePodcastProps {
  id: number;
  coverFileName: string;
}
// 删除播客按钮
export function DeletePodcastBtn({ id, coverFileName }: DeletePodcastProps) {
  const delPodcastState: PodcastDelState = {
    message: "",
    status: 0,
  };
  const [state, formAction] = useActionState<PodcastDelState, FormData>(
    deletePodcast.bind(null, id, coverFileName),
    delPodcastState,
  );
  // 处理 重定向
  useEffect(() => {
    if (state?.message?.startsWith("redirect:")) {
      if (state.message != null) {
        const redirectPath = state.message.split(":")[1];
        console.log("删除资源成功后导航：", redirectPath);
        redirect(redirectPath);
      }
    }
  }, [state]);
  return (
    <form action={formAction}>
      <button type="submit" className="rounded-md border p-2 hover:bg-gray-100">
        <span className="sr-only">delete</span>
        <TrashIcon className="w-5" />
      </button>
    </form>
  );
}
