"use client";

import Image from "next/image";
import { useTheme } from "next-themes";

export default function AcmeLogo() {
  const { theme } = useTheme();
  // 根据主题选择不同的图片
  const logoSrc =
    theme === "dark"
      ? "/static/images/apple-touch-icon-dark.png"
      : "/static/images/apple-touch-icon-light.png";
  return (
    <div className="flex items-center gap-3">
      <Image
        src={logoSrc}
        alt="远路播客 Logo"
        width={40}
        height={40}
        className="h-10 w-10 object-contain rounded-xl"
      />
      <p
        className="text-2xl font-bold tracking-tight text-indigo-700"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        远路播客
      </p>
    </div>
  );
}
