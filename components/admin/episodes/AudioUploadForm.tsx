"use client";

import React, { useRef, useEffect, useActionState } from "react";
import { uploadEpisodeAudio } from "@/lib/actions";
import { ActionState } from "@/lib/types";

interface AudioUploadFormProps {
  episodeId: string;
}

export function AudioUploadForm({ episodeId }: AudioUploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    uploadEpisodeAudio,
    {
      success: false,
      message: "",
    },
  );

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

    if (!file.name.match(/\.(mp3|wav|m4a|aac)$/i)) {
      alert("请选择格式正确的音频文件 (mp3, wav, m4a, aac)");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }
    event.target.form?.requestSubmit();
  };

  return (
    <form action={formAction}>
      <input
        type="file"
        ref={fileInputRef}
        name="audioFile"
        onChange={handleFileChange}
        accept="audio/*"
        className="hidden"
      />
      <input type="hidden" name="episodeId" value={episodeId} />
      <button
        type="button"
        onClick={handleButtonClick}
        className="btn btn-primary"
        disabled={isPending}
      >
        {isPending ? "上传中..." : "替换音频"}
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
