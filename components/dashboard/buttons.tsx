"use client";

import {
  IdentificationIcon,
  PencilIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import {
  deleteEpisode,
  deletePodcast,
  deleteUser,
  EpisodeDelState,
  PodcastDelState,
  UserDelState,
} from "@/app/lib/actions";
import { startTransition, useActionState, useEffect, useState } from "react";
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

// 更新剧集按钮
export function UpdateEpisodeBtn({ id }: { id: string }) {
  return (
    <Link
      href={`/dashboard/episodes/${id}/edit`}
      className="rounded-md border p-2 hover:bg-gray-100"
    >
      <PencilIcon className="w-5" />
    </Link>
  );
}

// 删除剧集按钮
interface DeleteEpisodeProps {
  id: string;
  coverFileName: string;
  audioFileName: string;
  subtitleEnFileName: string;
  subtitleZhFileName: string;
}
// 删除播客按钮
export function DeleteEpisodeBtn({
  id,
  coverFileName,
  audioFileName,
  subtitleEnFileName,
  subtitleZhFileName,
}: DeleteEpisodeProps) {
  const delEpisodeState: EpisodeDelState = {
    message: "",
    status: 0,
  };
  const [state, formAction] = useActionState<EpisodeDelState, FormData>(
    deleteEpisode.bind(
      null,
      id,
      coverFileName,
      audioFileName,
      subtitleEnFileName,
      subtitleZhFileName,
    ),
    delEpisodeState,
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

export function ReadUserBtn({ id }: { id: string }) {
  return (
    <Link
      href={`/dashboard/users/${id}`}
      className="rounded-md border p-2 hover:bg-gray-100"
    >
      <IdentificationIcon className="w-5" />
    </Link>
  );
}

// 更新用户按钮
export function UpdateUserBtn({ id }: { id: string }) {
  return (
    <Link
      href={`/dashboard/users/${id}/setting`}
      className="rounded-md border p-2 hover:bg-gray-100"
    >
      <ShieldCheckIcon className="w-5" />
    </Link>
  );
}

interface DeleteUserProps {
  id: string;
  avatarFileName: string;
}
// 删除用户按钮
export function DeleteUserBtn({ id, avatarFileName }: DeleteUserProps) {
  const delUserState: UserDelState = {
    message: "",
    status: 0,
  };
  const [state, formAction] = useActionState<UserDelState, FormData>(
    deleteUser.bind(null, id, avatarFileName),
    delUserState,
  );
  // 处理 重定向
  useEffect(() => {
    if (state?.message?.startsWith("redirect:")) {
      if (state.message != null) {
        const redirectPath = state.message.split(":")[1];
        console.log("删除资源成功后导航：", redirectPath);
        redirect(redirectPath);
        // TODO FIX：删除用户后，需要重新加载用户列表，否则用户列表中会显示删除的用户
      }
    }
  }, [state]);
  // 模态框状态管理
  const [isModalOpen, setIsModalOpen] = useState(false);
  // 打开模态框
  const openModal = () => setIsModalOpen(true);
  // 关闭模态框
  const closeModal = () => setIsModalOpen(false);
  // 确认删除操作
  const handleConfirmDelete = (event: React.FormEvent) => {
    event.preventDefault(); // 阻止表单默认提交行为
    const formData = new FormData(event.currentTarget as HTMLFormElement); // 从表单创建 FormData
    // 使用 startTransition 包裹 formActiont
    startTransition(() => {
      formAction(formData); // 传递 FormData 给 formAction
    });
    closeModal(); // 关闭模态框
  };

  return (
    <>
      {/* 删除按钮 */}
      <button
        onClick={openModal}
        className="flex items-center rounded-md border border-red-500 bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        <span className="sr-only">delete</span>
        <TrashIcon className="h-5 w-5" />
      </button>

      {/* 自定义模态框 */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={closeModal} // 点击背景关闭模态框
        >
          <div
            className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()} // 阻止点击模态框内容时关闭
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-800">
              确认删除
            </h3>
            <p className="mb-6 text-sm text-gray-600">
              确定要删除该用户吗？此操作不可撤销！
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={closeModal}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                取消
              </button>
              <form onSubmit={handleConfirmDelete}>
                <input type="hidden" name="id" value={id} />
                <input
                  type="hidden"
                  name="avatarFileName"
                  value={avatarFileName}
                />
                <button
                  type="submit"
                  className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  确认删除
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
