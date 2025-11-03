"use client";
import React, { useState, useEffect } from "react";

export default function Page() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    // 检查是否有存储的文件信息
    const storedFileInfo = sessionStorage.getItem("uploadedAudioFileInfo");
    if (storedFileInfo) {
      const fileInfo = JSON.parse(storedFileInfo);
      setFileName(fileInfo.name);
      // 模拟上传过程
      simulateUpload();
    }

    // 清理函数，组件卸载时释放创建的对象 URL
    return () => {
      const fileUrl = sessionStorage.getItem("uploadedAudioFileUrl");
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, []);

  const simulateUpload = () => {
    setIsUploading(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 10) + 1;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setIsUploading(false);
      }
      setUploadProgress(progress);
    }, 200);
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
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">上传音频文件</h2>

          {fileName && (
            <div className="mb-6">
              <p className="text-lg mb-2">文件名: {fileName}</p>

              <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>

              <div className="flex justify-between">
                <span>上传进度: {uploadProgress}%</span>
                <span>{isUploading ? "上传中..." : "上传完成"}</span>
              </div>
            </div>
          )}

          {!fileName && (
            <div className="text-center py-12">
              <p className="text-gray-500">暂无文件上传</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
