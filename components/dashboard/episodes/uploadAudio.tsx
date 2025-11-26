"use client";
import React, { useState, useEffect, useRef } from "react";
import { CheckCircleIcon, MusicalNoteIcon } from "@heroicons/react/24/outline";
import { deleteFile } from "@/lib/actions";

export interface FileInfo {
  name: string;
  type: string;
  size: number;
  lastModified: number;
}

export interface UploadFileResponse {
  status: number;
  message: string;
  audioFileName: string;
  audioUrl: string;
}

interface UploadAudioProps {
  /** 上传完成时触发，返回上传响应 */
  onUploadComplete?: (response: UploadFileResponse, duration: number) => void;
}

export default function UploadAudio({ onUploadComplete }: UploadAudioProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [uploadFileResponse, setUploadFileResponse] =
    useState<UploadFileResponse | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileDuration, setFileDuration] = useState(0);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // 恢复上传状态
  useEffect(() => {
    if (typeof window !== "undefined") {
      const uploadStatus = sessionStorage.getItem("uploadCompleted");
      if (uploadStatus === "true") {
        setIsUploading(false);
        return;
      }
      const storedFileInfo = sessionStorage.getItem("uploadedAudioFileInfo");
      const url = sessionStorage.getItem("uploadedAudioFileUrl");
      if (storedFileInfo && url) {
        const fileInfo = JSON.parse(storedFileInfo);
        setFileName(fileInfo.name);
        setFileInfo(fileInfo);
        setFileUrl(url);
        setFileDuration(fileInfo.duration);
      }
    }
  }, []);

  // 上传文件
  useEffect(() => {
    if (fileUrl && fileInfo) {
      uploadFile(fileUrl, fileInfo);
    }
    return () => {
      if (typeof window !== "undefined" && fileUrl) {
        URL.revokeObjectURL(fileUrl);
        sessionStorage.removeItem("uploadedAudioFileInfo");
        sessionStorage.removeItem("uploadedAudioFileUrl");
      }
    };
  }, [fileUrl, fileInfo]);

  // MB 转换
  const bytesToMB = (bytes: number): number => bytes / (1024 * 1024);

  const uploadFile = async (fileUrl: string, fileInfo: FileInfo) => {
    setIsUploading(true);
    try {
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

      const formData = new FormData();
      formData.append("audio", file);

      const uploadResponse = await fetch("/api/podcast/upload-episode-audio", {
        method: "POST",
        body: formData,
      } as RequestInit);

      let result: UploadFileResponse;
      if (uploadResponse.ok) {
        try {
          result = await uploadResponse.json();
          setUploadFileResponse(result);
        } catch (e) {
          console.error("解析响应失败:", e);
          result = {
            status: 500,
            message: "解析响应失败",
            audioFileName: "",
            audioUrl: "",
          };
        }
      } else {
        throw new Error(`上传失败: ${uploadResponse.statusText}`);
      }

      setUploadFileResponse(result);

      if (result.status === 200) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("uploadCompleted", "true");
        }
        // ✅ 通知父组件上传完成
        onUploadComplete?.(result, fileDuration);
      }
    } catch (error) {
      console.error("上传音频文件失败", error);
      // 显示错误给用户
      setUploadFileResponse({
        status: 500,
        message: "上传失败: " + (error as Error).message,
        audioFileName: "",
        audioUrl: "",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4">
      {fileName && fileInfo ? (
        <div className="flex gap-x-4 bg-base-100 p-4">
          <MusicalNoteIcon className="w-12 h-12 text-cyan-500 flex-none" />
          <div className="flex-1">
            <div className="flex justify-between">
              <p className="text-sm">文件名: {fileName}</p>
              <button
                className="btn btn-soft btn-info w-50 h-8"
                onClick={() => audioInputRef.current?.click()}
              >
                更换音频
              </button>
            </div>
            <div className="flex flex-row text-sm">
              {isUploading ? (
                <div className="flex">
                  <span className="loading loading-dots loading-xs"></span>
                  上传中...
                </div>
              ) : uploadFileResponse?.status !== 200 ? (
                <div className="flex text-red-500">
                  <span>上传失败: {uploadFileResponse?.message}</span>
                </div>
              ) : (
                <div className="flex">
                  <CheckCircleIcon className="w-4 h-4 text-green-500"></CheckCircleIcon>
                  <span>上传完成</span>
                </div>
              )}
            </div>

            <div className="w-full bg-gray-500 rounded-full h-1 mb-2">
              {isUploading && (
                <div className="bg-blue-500 h-1 rounded-full transition-all duration-300"></div>
              )}
              {!isUploading && uploadFileResponse?.status === 200 && (
                <div className="bg-green-500 h-1 rounded-full transition-all duration-300"></div>
              )}
            </div>

            {isUploading && (
              <p className="text-sm text-gray-600 mt-1">
                文件大小:{bytesToMB(fileInfo.size).toFixed(2)} MB
              </p>
            )}
          </div>

          <input
            type="file"
            accept="audio/*"
            ref={audioInputRef}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setFileName(file.name);
                const fileUrl = URL.createObjectURL(file);
                const newFileInfo: FileInfo = {
                  name: file.name,
                  type: file.type,
                  size: file.size,
                  lastModified: file.lastModified,
                };

                if (uploadFileResponse?.audioFileName) {
                  deleteFile(uploadFileResponse.audioFileName).then(
                    ({ status, message }) => {
                      if (status === 200) {
                        console.log(message);
                      } else {
                        console.error(message);
                      }
                    },
                  );
                }
                // 存储文件信息，触发上传文件
                setFileUrl(fileUrl);
                setFileInfo(newFileInfo);
              }
            }}
          />
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">暂无文件上传</p>
        </div>
      )}
    </div>
  );
}
