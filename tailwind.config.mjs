/** @type {import('tailwindcss').Config} */
import daisyui from "daisyui";

/**
 * 远路设计系统 · 唯一合法色板
 * ink     —— 暖纸中性色（替代 slate/gray）
 * primary —— 远青（替代 indigo/emerald/green）
 * accent  —— 曙光橙（替代 purple/amber/orange/yellow 强调用途）
 * info    —— 黛蓝（替代 blue/sky/cyan/violet）
 * error   —— 陶土红（替代 red/rose）
 */
const yuanluColors = {
  ink: {
    50: "#FAF8F3",
    100: "#F1EDE4",
    200: "#E3DDCF",
    300: "#CFC7B4",
    400: "#A79E8A",
    500: "#857C68",
    600: "#655D4C",
    700: "#4A4436",
    800: "#322D23",
    900: "#221F18",
    950: "#151310",
  },
  primary: {
    50: "#EDF7F2",
    100: "#D5EDE1",
    200: "#AEDCC8",
    300: "#7DC5A8",
    400: "#4DA989",
    500: "#2E8F6F",
    600: "#1F7A5C",
    700: "#1A6349",
    800: "#164E3B",
    900: "#0F3628",
    950: "#0A241B",
  },
  accent: {
    50: "#FDF4E7",
    100: "#FAE5C6",
    200: "#F4D09A",
    300: "#ECB35E",
    400: "#E59D2E",
    500: "#D98A17",
    600: "#B96F0F",
    700: "#96580D",
    800: "#74440F",
    900: "#4E2E0B",
    950: "#2E1D07",
  },
  info: {
    50: "#EFF5FA",
    100: "#DDEAF3",
    200: "#B9D2E4",
    300: "#8DB3CF",
    400: "#6393B6",
    500: "#4A7FA5",
    600: "#3C6989",
    700: "#31536E",
    800: "#264154",
    900: "#1A2C3A",
    950: "#12202B",
  },
  error: {
    50: "#FBEFED",
    100: "#F5DAD5",
    200: "#EBB4AA",
    300: "#DE8577",
    400: "#DB6B5C",
    500: "#D2503F",
    600: "#B8402F",
    700: "#963324",
    800: "#73271C",
    900: "#4D1A12",
    950: "#2A0E09",
  },
};

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: yuanluColors,
      fontFamily: {
        // Sans (无衬线): UI 与中文正文
        // 西文 Plus Jakarta Sans，中文落系统字体栈
        sans: [
          "var(--font-jakarta)",
          "PingFang SC", // Mac 中文
          "Microsoft YaHei", // Windows 中文
          "Hiragino Sans GB",
          "Heiti SC",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        // Display: 大标题/数字（与 sans 同栈，语义化别名）
        display: [
          "var(--font-jakarta)",
          "PingFang SC",
          "Microsoft YaHei",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        // Serif (衬线): 英文逐字稿、精读内容
        serif: [
          "var(--font-serif)",
          "Georgia",
          "Times New Roman",
          "ui-serif",
          "serif",
        ],
      },
      keyframes: {
        wiggle: {
          "0%, 100%": { transform: "rotate(-15deg)" },
          "50%": { transform: "rotate(15deg)" },
        },
        eq: {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
      },
      animation: {
        wiggle: "wiggle 0.6s ease-in-out infinite",
        eq: "eq 1s ease-in-out infinite",
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
      },
      boxShadow: {
        e1: "var(--e1)",
        e2: "var(--e2)",
        e3: "var(--e3)",
      },
      zIndex: {
        nav: "var(--z-nav)",
        miniplayer: "var(--z-miniplayer)",
        sheet: "var(--z-sheet)",
        modal: "var(--z-modal)",
        toast: "var(--z-toast)",
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    // 注意：daisyui 5 的 JS 配置只接受主题"名"（不支持 v4 的内联主题对象），
    // 语义色覆盖见 app/globals.css 中的 --color-* 变量覆写
    themes: ["light", "dark"],
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
    logs: false,
    rtl: false,
  },
  darkMode: ["selector", '[data-theme="dark"]'],
};
