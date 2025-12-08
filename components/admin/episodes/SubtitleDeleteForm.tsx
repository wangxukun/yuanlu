"use client";

import React, { useEffect } from "react";
import { useActionState } from "react";
import { deleteEnSubtitle, deleteZhSubtitle } from "@/lib/actions";
import { ActionState } from "@/lib/types";

interface Props {
  episodeId: string;
  fileName: string;
  language: "en" | "zh";
}

/**
 * 删除字幕，字幕管理页面使用
 * @param episodeId
 * @param fileName
 * @param language
 * @constructor
 */
export function SubtitleDeleteForm({ episodeId, fileName, language }: Props) {
  const initialState: ActionState = {
    success: false,
    message: "",
  };

  const [state, action, isPending] = useActionState<ActionState, FormData>(
    language === "en" ? deleteEnSubtitle : deleteZhSubtitle,
    initialState,
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

  return (
    <>
      <form action={action}>
        <input type="hidden" name="episodeId" value={episodeId} />
        <input type="hidden" name="fileName" value={fileName} />
        <button type="submit" className="btn btn-error" disabled={isPending}>
          {isPending ? "删除中..." : "删除"}
        </button>
      </form>
      {state.message && <p>{state.message}</p>}
    </>
  );
}
