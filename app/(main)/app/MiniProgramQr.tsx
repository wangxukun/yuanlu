"use client";

import { useState } from "react";
import { QrCode } from "lucide-react";

/**
 * 小程序码展示(带缺图兜底):
 * 图片放在 public/static/images/miniprogram-code.png,放入即显示;
 * 尚未上传时(onError)渲染占位框,不出现裂图。
 */
export default function MiniProgramQr({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="shrink-0 w-52 h-52 rounded-2xl border-2 border-dashed border-ink-200 dark:border-ink-600 flex flex-col items-center justify-center gap-3 text-center px-4">
        <QrCode className="w-10 h-10 text-ink-300 dark:text-ink-500" />
        <p className="text-xs text-ink-400 dark:text-ink-500 font-medium leading-relaxed">
          小程序码整理中
          <br />
          可先在微信中搜索「远路播客」
        </p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={208}
      height={208}
      className="shrink-0 w-52 h-52 rounded-2xl border border-ink-100 dark:border-ink-700 bg-white object-contain p-2"
      onError={() => setFailed(true)}
    />
  );
}
