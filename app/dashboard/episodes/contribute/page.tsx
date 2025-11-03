"use client";
import React from "react";
import { useRef } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  // const podcasts = await fetchPodcasts();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  return (
    <div className="inline-block w-full align-middle">
      <div className="breadcrumbs text-xl">
        <ul>
          <li>
            <a href="/dashboard/episodes">音频管理</a>
          </li>
          <li>音频投稿</li>
        </ul>
      </div>
      <div className="hero bg-base-200 min-h-[80vh]">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-5xl font-bold">投稿剧集</h1>
            <p className="py-6">发布一集播客音频</p>
            {/* 隐藏的文件输入 */}
            <input
              type="file"
              accept="audio/*"
              ref={audioInputRef}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  console.log("选择的文件:", file);
                  // 只存储文件基本信息到 sessionStorage
                  sessionStorage.setItem(
                    "uploadedAudioFileInfo",
                    JSON.stringify({
                      name: file.name,
                      size: file.size,
                      type: file.type,
                      lastModified: file.lastModified,
                    }),
                  );

                  // 创建一个 URL 对象用于传递文件数据
                  const fileUrl = URL.createObjectURL(file);
                  // 将文件 URL 存储到 sessionStorage
                  sessionStorage.setItem("uploadedAudioFileUrl", fileUrl);

                  // 跳转到创建页面
                  router.push("/dashboard/episodes/create");
                }
              }}
            />
            <button
              className="btn btn-primary w-64"
              onClick={() => {
                audioInputRef.current?.click(); // 触发文件选择对话框
              }}
            >
              上传音频
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
