"use client";

import React, { useState, useEffect, useRef } from "react";
import { PhotoIcon } from "@heroicons/react/24/outline";
import { deleteFile } from "@/app/lib/actions";

export interface UploadCoverResponse {
  status: number;
  message: string;
  coverFileName: string;
  coverUrl: string;
}

interface UploadCoverProps {
  /** 上传完成时触发，返回上传响应 */
  onUploadComplete?: (response: UploadCoverResponse) => void;
  coverApi: string;
}

export default function UploadCover({
  onUploadComplete,
  coverApi,
}: UploadCoverProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCoverResponse, setUploadCoverResponse] =
    useState<UploadCoverResponse | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPreviewUrl("/static/images/episode-light.png");
    }
  }, []);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("cover", file);

      const res = await fetch(coverApi, {
        method: "POST",
        body: formData,
      } as RequestInit);

      const result: UploadCoverResponse = await res.json();
      setUploadCoverResponse(result);

      if (result.status === 200) {
        // 通知父组件上传完成
        onUploadComplete?.(result);
      }
    } catch (error) {
      console.error("上传封面图片失败", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReplace = () => {
    coverInputRef.current?.click();
  };

  const handleDelete = async () => {
    if (uploadCoverResponse?.coverFileName) {
      const { status, message } = await deleteFile(
        uploadCoverResponse.coverFileName,
      );
      if (status === 200) {
        console.log(message);
      } else {
        console.error(message);
      }
    }

    // 清除状态
    // setFileName("");
    setUploadCoverResponse(null);
    setPreviewUrl("/static/images/episode-light.png");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("文件改变");
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // 设置文件信息
      // setFileName(file.name);

      // 如果已有上传的文件，先删除旧文件
      if (uploadCoverResponse?.coverFileName) {
        deleteFile(uploadCoverResponse.coverFileName).then(
          ({ status, message }) => {
            if (status === 200) {
              console.log(message);
              uploadFile(file);
            } else {
              console.error(message);
            }
          },
        );
      } else {
        uploadFile(file);
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-row items-start bg-base-100">
        <div
          className="relative cursor-pointer group"
          onClick={() => {
            if (!uploadCoverResponse) {
              coverInputRef.current?.click();
            }
          }}
        >
          <div className="w-48 h-48 rounded-lg overflow-hidden border border-gray-300 relative">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="封面预览"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <PhotoIcon className="w-12 h-12 text-gray-400" />
              </div>
            )}

            {!uploadCoverResponse && (
              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-sm font-medium">
                  点击上传封面
                </span>
              </div>
            )}

            {uploadCoverResponse && (
              <div className="absolute inset-0 flex flex-col justify-between">
                <div></div> {/* 用于顶部对齐的空元素 */}
                <div className="flex flex-row justify-around bg-gray-800">
                  <button
                    className="btn btn-xs btn-link text-neutral-content no-underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReplace();
                    }}
                  >
                    更换封面
                  </button>
                  <button
                    className="btn btn-xs btn-link text-neutral-content no-underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                  >
                    删除封面
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {isUploading && (
          <div className="mt-2 text-sm text-gray-600">上传中...</div>
        )}
      </div>

      <input
        type="file"
        accept="image/*"
        ref={coverInputRef}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
