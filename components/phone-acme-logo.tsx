"use client";

import Image from "next/image";
import { useTheme } from "next-themes";

export default function PhoneAcmeLogo() {
  const { theme } = useTheme();
  // 根据主题选择不同的图片
  const logoSrc =
    theme === "dark"
      ? "/static/images/apple-touch-icon-dark.png"
      : "/static/images/apple-touch-icon-light.png";
  return (
    <div>
      <div className="flex items-center">
        <Image src={logoSrc} alt="远路播客 Logo" width={40} height={40} />
        {/* 1. hidden sm:block: 默认(手机)隐藏，屏幕 > 640px (平板) 时显示
          2. ml-3: 给文本左侧添加间距 (替代父级的 space-x-4，避免隐藏时有残留间距)
          3. whitespace-nowrap: 强制不换行
        */}
        <p className="hidden sm:block ml-3 text-xs font-bold italic whitespace-nowrap">
          远路播客
        </p>
      </div>
    </div>
  );
}
