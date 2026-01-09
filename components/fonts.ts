import { Inter, Lusitana } from "next/font/google";

// 1. 主要 UI 字体 (无衬线) - 用于界面、按钮、中文
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter", // 定义 CSS 变量名
  display: "swap",
});

// 2. 阅读/标题字体 (衬线) - 用于英文逐字稿、大标题
export const lusitana = Lusitana({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-lusitana",
  display: "swap",
});

// 可选：如果你想引入 Google 的中文字体（注意文件较大，通常建议用系统字体回退方案，这里仅作演示）
// export const notoserifSC = Noto_Serif_SC({
//   weight: ["400", "700"],
//   subsets: ["latin"],
//   preload: false, // 中文字体通常不预加载
//   variable: "--font-noto-serif",
// });
