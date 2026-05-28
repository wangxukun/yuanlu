"use client";

import React, { useRef, useEffect, useActionState } from "react";
import { uploadEpisodeCover } from "@/lib/actions";
import { ActionState } from "@/lib/types";

interface CoverUploadFormProps {
  episodeId: string;
}

export function CoverUploadForm({ episodeId }: CoverUploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    uploadEpisodeCover,
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

    if (!file.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
      alert("请选择格式正确的图片文件 (jpg, png, webp, gif)");
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
        name="coverFile"
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <input type="hidden" name="episodeId" value={episodeId} />
      <button
        type="button"
        onClick={handleButtonClick}
        className="btn btn-primary"
        disabled={isPending}
      >
        {isPending ? "上传中..." : "替换封面"}
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
