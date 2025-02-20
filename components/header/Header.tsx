"use client";
import Image from "next/image"; // 引入 Next.js 的 Image 组件
import Link from "next/link"; // 引入 Next.js 的 Link 组件

export default function Header() {
  return (
    <header className="fixed top-0 left-0 w-full bg-white shadow z-50">
      <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {" "}
          {/* 使用 justify-between 实现左右对齐 */}
          {/* 左侧：LOGO 和网站标题 */}
          <Link href="http://localhost:3000/" passHref>
            <div className="flex items-center space-x-4">
              <Image
                src="/static/images/logo.png" // 图片路径
                alt="远路漫漫播客 Logo" // 替代文本
                width={40} // 图片宽度
                height={40} // 图片高度
                className="rounded-full" // 可选：将图片设置为圆形
              />
              <span className="text-xl text-slate-500 font-bold leading-tight">
                远路漫漫播客
              </span>
            </div>
          </Link>
          {/* 右侧：按钮组 */}
          <div className="flex items-center space-x-4 text-sm">
            {/* 全局搜索按钮 */}
            <button className="flex items-center space-x-2 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-700"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="hidden sm:inline text-slate-600">搜索</span>
            </button>

            {/* 登录按钮 */}
            <button className="flex items-center space-x-2 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors text-gray-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-700"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-slate-500 hidden sm:inline">登录</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
