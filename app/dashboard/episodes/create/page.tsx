"use client";

import UploadAudio, {
  UploadFileResponse,
} from "@/components/dashboard/episodes/uploadAudio";
import UploadCover, {
  UploadCoverResponse,
} from "@/components/dashboard/episodes/uploadCover";
import React from "react";
export default function Page() {
  const handleUploadAudioComplete = (response: UploadFileResponse) => {
    console.log("父组件接收到上传结果：", response);
    // ✅ 这里可以进行后续操作，比如保存数据库、跳转页面等
  };
  const handleUploadCoverComplete = (response: UploadCoverResponse) => {
    console.log("父组件接收到上传结果：", response);
    // ✅ 这里可以进行后续操作，比如保存数据库、跳转页面等
  };

  return (
    <div className="inline-block w-full align-middle">
      <div className="breadcrumbs text-xl">
        <ul>
          <li>
            <a href="/dashboard/episodes">音频管理</a>
          </li>
          <li>发布音频</li>
        </ul>
      </div>
      <div className="rounded-lg bg-gray-50 p-2 md:pt-0 max-w-5xl mx-auto">
        <UploadAudio onUploadComplete={handleUploadAudioComplete} />
        <div className="flex flex-row">
          <div className="flex items-center justify-center mr-4">
            <span className="text-red-500">*</span>
            <span>封面</span>
          </div>
          <UploadCover onUploadComplete={handleUploadCoverComplete} />
        </div>
        <div className="flex flex-row">
          <div className="flex items-center justify-center mr-4">
            <span className="text-red-500">*</span>
            <span>标题</span>
          </div>
          <input
            type="text"
            className="input input-success flex-1 ml-4"
            placeholder="请输入标题"
          />
        </div>
      </div>
    </div>
  );
}
