"use client";

import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import React, { useRef, useState } from "react";
import { deleteFile } from "@/lib/actions";
import {
  UploadSubtitlesResponse,
  UploadedSubtitleFile,
} from "@/app/types/podcast";

// 定义组件的 Props
interface UploadSubtitlesProps {
  onConfirm?: (files: UploadedSubtitleFile[]) => void;
}

// 添加截断文件名的辅助函数
const truncateFileName = (fileName: string, maxLength: number = 40) => {
  if (fileName.length <= maxLength) {
    return fileName;
  }
  return fileName.substring(0, maxLength) + "...";
};

export default function UploadSubtitles({ onConfirm }: UploadSubtitlesProps) {
  const [subtitleLanguage, setSubtitleLanguage] = useState("");
  const [enUploadCompleted, setEnUploadCompleted] = useState(false);
  const [zhUploadCompleted, setZhUploadCompleted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // 修改 uploadedFiles 状态，添加 response 字段用于保存上传返回数据
  const [uploadedFiles, setUploadedFiles] = useState<UploadedSubtitleFile[]>(
    [],
  );
  const subtitleInputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  // 删除已上传的字幕文件
  const handleDeleteFile = async (index: number) => {
    const newFiles = [...uploadedFiles];
    const deletedFile = newFiles.splice(index, 1)[0];
    // 删除后端的字幕文件
    const { status, message } = await deleteFile(
      deletedFile.response.subtitleFileName,
    );
    if (status === 200) {
      console.log(message);
    } else {
      console.error(message);
    }
    console.log("删除后剩下的已上传文件是：", newFiles);
    // 更新已上传文件列表
    setUploadedFiles(newFiles);

    // 如果删除的是英语或中文字幕，重新启用对应的选项
    if (deletedFile.language === "英语") {
      setEnUploadCompleted(false);
    } else if (deletedFile.language === "中文") {
      setZhUploadCompleted(false);
    }

    // 强制重置 select 元素
    if (selectRef.current) {
      // 触发一次 change 事件来刷新选项状态
      const event = new Event("change", { bubbles: true });
      selectRef.current.dispatchEvent(event);
    }
  };

  // 处理确定操作
  const handleConfirm = () => {
    // 调用父组件传递的 onConfirm 回调函数，并传递 uploadedFiles 数据
    if (onConfirm) {
      onConfirm(uploadedFiles);
    }
  };

  // 上传字幕
  const handleUploadSubtitles = async () => {
    if (subtitleInputRef.current?.files?.length) {
      const file = subtitleInputRef.current.files[0];
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("subtitle", file);

        const response = await fetch("/api/podcast/upload-episode-subtitle", {
          method: "POST",
          body: formData,
        } as RequestInit);

        const result: UploadSubtitlesResponse = await response.json();

        if (result.status === 200) {
          // 获取语言名称
          const languageName = subtitleLanguage === "en" ? "英语" : "中文";

          // 添加到已上传文件列表，包含 response 数据
          setUploadedFiles((prev) => [
            ...prev,
            {
              language: languageName,
              fileName: file.name,
              response: result,
            },
          ]);

          if (subtitleLanguage === "en") {
            // 上传英文字幕
            setEnUploadCompleted(true);
          } else if (subtitleLanguage === "zh-CN") {
            // 上传中文字幕
            setZhUploadCompleted(true);
          }

          // 重置选择
          if (selectRef.current) {
            selectRef.current.value = "";
          }
        }
      } catch (error) {
        console.error("上传字幕失败:", error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <dialog id="upload_subtitles_modal" className="modal">
      <div className="modal-box">
        <div className="flex justify-start items-center gap-4">
          <h3 className="font-bold text-sm">上传字幕</h3>
          <span className="text-xs text-slate-500">支持srt格式</span>
        </div>
        <div className="form-control w-80 flex flex-row m-10 gap-6">
          <select
            id="subtitle_language"
            name="subtitle_language"
            defaultValue=""
            ref={selectRef}
            className="select w-80 h-10 z-100 text-base"
            onChange={(e) => {
              setSubtitleLanguage(e.target.value);
            }}
            disabled={isUploading}
          >
            <option value="" disabled>
              选择字幕语言
            </option>
            <option value="en" disabled={enUploadCompleted}>
              英语（美国）
            </option>
            <option value="zh-CN" disabled={zhUploadCompleted}>
              中文（简体）
            </option>
          </select>
          <button
            className="btn border-0"
            disabled={
              !subtitleLanguage ||
              (subtitleLanguage === "en" && enUploadCompleted) ||
              (subtitleLanguage === "zh-CN" && zhUploadCompleted) ||
              isUploading
            }
            onClick={() => {
              if (subtitleInputRef.current) {
                subtitleInputRef.current.click();
              }
            }}
          >
            {isUploading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <PlusIcon className="size-[1.2em]" />
            )}
            上传文件
          </button>
          <input
            type="file"
            accept=".srt"
            ref={subtitleInputRef}
            className="hidden"
            onChange={handleUploadSubtitles}
            disabled={isUploading}
          />
        </div>

        {/* 显示已上传的文件列表 */}
        {uploadedFiles.length > 0 && (
          <div className="mx-10 mb-4">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="text-sm py-1 flex items-center justify-between"
              >
                <div>
                  <span className="font-medium">{file.language}:</span>{" "}
                  {truncateFileName(file.fileName)}
                </div>
                <button
                  onClick={() => handleDeleteFile(index)}
                  className="btn btn-xs btn-circle btn-ghost"
                  disabled={isUploading}
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="divider"></div>
        <div className="modal-action">
          <form method="dialog" className="flex justify-center gap-4">
            {/* if there is a button in form, it will close the modal */}
            <button
              className="btn"
              disabled={isUploading}
              // onClick={handleCancel}
            >
              取消
            </button>
            <button
              className="btn"
              disabled={isUploading}
              onClick={handleConfirm}
            >
              确定
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
}
