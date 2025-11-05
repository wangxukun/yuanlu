"use client";

import UploadAudio, {
  UploadFileResponse,
} from "@/components/dashboard/episodes/uploadAudio";
export default function Page() {
  const handleUploadComplete = (response: UploadFileResponse) => {
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
      <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
        <UploadAudio onUploadComplete={handleUploadComplete} />
      </div>
    </div>
  );
}
