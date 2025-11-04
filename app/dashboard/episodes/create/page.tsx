"use client";
import React, { useState, useEffect, useRef } from "react";
import { MusicalNoteIcon } from "@heroicons/react/24/outline";

// 音频文件信息接口
interface FileInfo {
  name: string;
  type: string;
  size: number;
  lastModified: number;
}

interface UploadFileResponse {
  status: number;
  message: string;
  audioFileName: string;
  audioUrl: string;
}

export default function Page() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [uploadedSize, setUploadedSize] = useState(0);
  const audioInputRef = useRef<HTMLInputElement>(null);

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

  // 添加转换字节到MB的辅助函数
  const bytesToMB = (bytes: number): number => {
    return bytes / (1024 * 1024);
  };

  const uploadFile = async (fileUrl: string, fileInfo: FileInfo) => {
    // 设置上传中
    setIsUploading(true);
    // 设置上传进度为0
    setUploadProgress(0);
    setUploadedSize(0); // 重置已上传大小
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

      // 使用XMLHttpRequest实现真实的上传进度监控
      const uploadWithProgress = (): Promise<UploadFileResponse> => {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          // 监听上传进度
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(progress);
              setUploadedSize(event.loaded); // 更新已上传大小
            }
          });

          // 监听请求完成
          xhr.addEventListener("load", () => {
            if (xhr.status === 200) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch (e) {
                console.error("解析响应失败:", e);
                resolve({
                  status: 500,
                  message: "解析响应失败",
                  audioFileName: "",
                  audioUrl: "",
                });
              }
            } else {
              reject(new Error(`上传失败: ${xhr.statusText}`));
            }
          });

          // 监听错误
          xhr.addEventListener("error", () => {
            reject(new Error("网络错误"));
          });

          // 发送请求
          const formData = new FormData();
          formData.append("audio", file);
          xhr.open("POST", "/api/podcast/upload-episode-audio");
          xhr.send(formData as XMLHttpRequestBodyInit);
        });
      };

      // 执行上传
      const result = await uploadWithProgress();

      // 处理上传结果
      const { status, message, audioFileName, audioUrl } = result;
      if (status === 200) {
        // 标记上传完成
        if (typeof window !== "undefined") {
          sessionStorage.setItem("uploadCompleted", "true");
        }
        console.log(message);
        console.log("audioFileName:", audioFileName);
        console.log("audioUrl:", audioUrl);
      } else {
        throw new Error(`上传失败: ${message}`);
      }
    } catch (error) {
      console.error("上传音频文件失败", error);
    } finally {
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
          <h2 className="text-xl font-bold mb-6">上传音频文件</h2>

          {fileName && fileInfo && (
            <div className="flex gap-x-4 bg-base-100 p-4">
              <MusicalNoteIcon className="w-12 h-12 text-cyan-500 flex-none" />
              <div className="flex-1">
                <div className="flex justify-between">
                  <p className="text-sm mb-2">文件名: {fileName}</p>
                  <button
                    className="btn btn-soft btn-info transition-colors w-50 h-8 mb-2"
                    onClick={() => {
                      audioInputRef.current?.click();
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="size-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3"
                      />
                    </svg>
                    更换音频
                  </button>
                </div>

                <div className="w-full bg-gray-500 rounded-full h-1 mb-2">
                  <div
                    className="bg-green-500 h-1 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-xs text-accent-content">
                  <span>上传进度: {uploadProgress}%</span>
                  <span>{isUploading ? "上传中..." : "上传完成"}</span>
                </div>

                {/* 显示已上传大小 */}
                {isUploading && (
                  <p className="text-sm text-gray-600 mt-1">
                    已上传: {bytesToMB(uploadedSize).toFixed(2)} MB /{" "}
                    {bytesToMB(fileInfo.size).toFixed(2)} MB
                  </p>
                )}
              </div>
              {/* 隐藏的文件输入 */}
              <input
                type="file"
                accept="audio/*"
                ref={audioInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    console.log("文件名:", file.name);
                  }
                }}
              />
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
