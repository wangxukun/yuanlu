/** @type {import('tailwindcss').Config} */
import daisyui from "daisyui";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Sans (无衬线): 用于 UI、中文正文
        // 逻辑：优先使用 Inter，然后是中文系统字体栈
        sans: [
          "var(--font-inter)",
          "PingFang SC", // Mac 中文
          "Microsoft YaHei", // Windows 中文
          "Hiragino Sans GB",
          "Heiti SC",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        // Serif (衬线): 用于 英文逐字稿、大标题
        // 逻辑：优先使用 Lusitana，然后是通用衬线
        serif: [
          "var(--font-lusitana)",
          "Georgia",
          "Times New Roman",
          "ui-serif",
          "serif",
        ],
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: ["light", "dark"],
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
    logs: true,
    rtl: false,
  },
  darkMode: ["selector", '[data-theme="dark"]'],
};
