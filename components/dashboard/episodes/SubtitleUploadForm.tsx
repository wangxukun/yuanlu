"use client";

import React, { useRef, useEffect, useActionState } from "react";
import { uploadEnSubtitle, uploadZhSubtitle } from "@/lib/actions";
import { SubtitleManagementState } from "@/lib/types";

interface SubtitleUploadFormProps {
  episodeId: string;
  language: "en" | "zh";
}

export function SubtitleUploadForm({
  episodeId,
  language,
}: SubtitleUploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, isPending] = useActionState<
    SubtitleManagementState,
    FormData
  >(language === "en" ? uploadEnSubtitle : uploadZhSubtitle, {
    success: false,
    message: "",
  });

  // 上传成功后刷新页面
  useEffect(() => {
    if (state?.success) {
      // 延迟刷新以显示成功消息
      const timer = setTimeout(() => {
        window.location.reload();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state?.success]);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.name.endsWith(".srt") && !file.name.endsWith(".vtt")) {
      alert("请选择 .srt 或 .vtt 格式的字幕文件");
      // 清空文件输入框
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }
    // 提交表单
    event.target.form?.requestSubmit();
  };

  return (
    <form action={formAction}>
      <input
        type="file"
        ref={fileInputRef}
        name="subtitleFile"
        onChange={handleFileChange}
        accept=".srt,.vtt"
        className="hidden"
      />
      <input type="hidden" name="episodeId" value={episodeId} />
      <button
        type="button"
        onClick={handleButtonClick}
        className="btn btn-primary"
        disabled={isPending}
      >
        上传
      </button>
      {state?.message && (
        <p
          className={`mt-2 text-sm ${state.success ? "text-success" : "text-error"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
