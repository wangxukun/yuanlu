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
      <div className="flex items-center space-x-4">
        <Image src={logoSrc} alt="远路播客 Logo" width={40} height={40} />
        <p className="text-xs font-bold italic">远路播客</p>
      </div>
    </div>
  );
}
