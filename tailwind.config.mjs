/** @type {import('tailwindcss').Config} */
import daisyui from "daisyui";
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    themes: ["light", "dark"],
    darkTheme: "dark", // 默认暗色主题名称
    base: true,
    styled: true,
    utils: true,
    logs: true,
    rtl: false,
  },
  darkMode: ["selector", '[data-theme="dark"]'],
};
