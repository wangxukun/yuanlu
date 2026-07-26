import { Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";

// 1. UI 字体 (无衬线) - 界面、按钮、数字；中文落系统字体栈
export const jakarta = Plus_Jakarta_Sans({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

// 2. 阅读字体 (衬线) - 英文逐字稿、精读内容（可变字重，含斜体）
export const sourceSerif = Source_Serif_4({
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});
