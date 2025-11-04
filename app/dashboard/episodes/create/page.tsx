"use client";
import React, { useState, useEffect } from "react";

// 音频文件信息接口
interface FileInfo {
  name: string;
  type: string;
  size: number;
  lastModified: number;
}

export default function Page() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    // 确保只在浏览器环境中运行
    if (typeof window !== "undefined") {
      // 检查是否已经上传成功
      const uploadStatus = sessionStorage.getItem("uploadCompleted");
      if (uploadStatus === "true") {
        // 如果已经上传成功，则设置进度为100%并返回
        setUploadProgress(100);
        setIsUploading(false);
        return;
      }

      // 检查是否有存储的文件信息
      const storedFileInfo = sessionStorage.getItem("uploadedAudioFileInfo");
      // 获取文件路径
      const url = sessionStorage.getItem("uploadedAudioFileUrl");
      if (storedFileInfo && url) {
        // 解析文件信息
        const fileInfo = JSON.parse(storedFileInfo);
        setFileName(fileInfo.name);
        setFileInfo(fileInfo);
        setFileUrl(url);
      }
    }
  }, []);

  useEffect(() => {
    // 当fileUrl和fileInfo都准备好后开始上传
    if (fileUrl && fileInfo) {
      uploadFile(fileUrl, fileInfo);
    }

    // 清理函数，组件卸载时释放创建的对象 URL
    return () => {
      if (typeof window !== "undefined" && fileUrl) {
        URL.revokeObjectURL(fileUrl);
        sessionStorage.removeItem("uploadedAudioFileInfo");
        sessionStorage.removeItem("uploadedAudioFileUrl");
      }
    };
  }, [fileUrl, fileInfo]);

  const uploadFile = async (fileUrl: string, fileInfo: FileInfo) => {
    // 设置上传中
    setIsUploading(true);
    // 设置上传进度为0
    setUploadProgress(0);
    try {
      // 尝试访问 Blob URL
      const response = await fetch(fileUrl);
      if (!response.ok) {
        console.error("Blob URL 已失效，请重新选择文件上传");
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("uploadedAudioFileInfo");
          sessionStorage.removeItem("uploadedAudioFileUrl");
        }
        setFileName("");
        setIsUploading(false);
        return;
      }
      const blob = await response.blob();
      const file = new File([blob], fileInfo.name, { type: fileInfo.type });

      // 模拟上传进度
      const simulateUploadProgress = () => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.floor(Math.random() * 10);
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
          }
          setUploadProgress(progress);
        }, 200);
      };

      simulateUploadProgress();

      // 等待模拟上传完成后再发送实际请求
      setTimeout(async () => {
        try {
          // 创建FormData对象
          const formData = new FormData();
          formData.append("audio", file);
          // 发送POST请求
          const uploadResponse = await fetch(
            "/api/podcast/upload-episode-audio",
            {
              method: "POST",
              body: formData,
            } as RequestInit,
          );

          if (uploadResponse.ok) {
            // 获取响应数据
            const { status, message } = await uploadResponse.json();
            if (status === 200) {
              // 标记上传完成
              if (typeof window !== "undefined") {
                sessionStorage.setItem("uploadCompleted", "true");
              }
              console.log(message);
            } else {
              throw new Error(`上传失败: ${message}`);
            }
          } else {
            // 上传失败
            throw new Error(`服务器返回错误：${uploadResponse.status}`);
          }
        } catch (error) {
          console.error("上传音频文件失败", error);
        } finally {
          setIsUploading(false);
        }
      }, 2500); // 模拟上传时间
    } catch (error) {
      console.error("上传音频文件失败", error);
      setIsUploading(false);
    }
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
