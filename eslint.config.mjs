import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import eslintConfigPrettier from "eslint-config-prettier";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  // import.meta.dirname is available after Node.js v20.11.0
  baseDirectory: import.meta.dirname,
  recommendedConfig: pluginJs.configs.recommended,
});

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/public/static/images/**"],
  },
  // 基础文件匹配
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },

  // 全局变量
  { languageOptions: { globals: globals.browser } },

  // ESLint 推荐规则
  pluginJs.configs.recommended,

  // TypeScript 推荐规则
  ...tseslint.configs.recommended,

  // React 配置（关键修复部分）
  {
    plugins: {
      react: pluginReact,
    },
    settings: {
      react: {
        version: "detect", // ✅ 必须在此处明确设置
      },
    },
    rules: {
      ...pluginReact.configs["jsx-runtime"].rules, // 继承推荐规则
      "react/react-in-jsx-scope": "off", // 关闭旧规则
      "react/jsx-uses-react": "off", // 关闭旧规则
    },
  },
  ...compat.config({
    extends: ["eslint:recommended", "next"],
  }),
  // Prettier 兼容（必须放在最后）
  eslintConfigPrettier,
];
