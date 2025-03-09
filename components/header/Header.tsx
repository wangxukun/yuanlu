"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react"; // 引入 useState 来管理菜单状态

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false); // 菜单状态
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 用户登录状态
  const [userName, setUserName] = useState(""); // 用户名

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false); // 点击子菜单项时关闭菜单
  };

  // 模拟用户登录状态
  const handleLogin = () => {
    setIsLoggedIn(true);
    setUserName("已登录"); // 模拟设置用户名
  };

  return (
    <header className="fixed top-0 left-0 w-full bg-white z-50">
      <div className="max-w-md sm:max-w-3xl lg:max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* 手机尺寸下的菜单按钮 */}
          <button
            className="lg:hidden flex items-center space-x-2 px-4 py-2 hover:drop-shadow-md rounded-lg transition-colors"
            onClick={toggleMenu}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-gray-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* 手机尺寸下居中显示 LOGO 和网站标题 */}
          <div className="lg:hidden flex items-center justify-center flex-grow">
            <Link href="/" passHref>
              <div className="flex items-center space-x-4">
                <Image
                  src="/static/images/logo.png"
                  alt="远路播客 Logo"
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <span className="text-xl text-slate-500 font-bold leading-tight">
                  远路播客
                </span>
              </div>
            </Link>
          </div>

          {/* 手机尺寸下的全局搜索按钮 */}
          <button className="lg:hidden flex items-center space-x-2 px-4 py-2 hover:drop-shadow-md rounded-lg transition-colors">
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
          </button>

          {/* 桌面尺寸下的左侧 LOGO 和网站标题 */}
          <Link
            href={`${process.env.NEXT_PUBLIC_BASE_URL}`}
            passHref
            className="hidden lg:flex items-center space-x-4"
          >
            <Image
              src="/static/images/logo.png"
              alt="远路漫漫播客 Logo"
              width={40}
              height={40}
              className="rounded-full"
            />
            <span className="text-xl text-slate-500 font-bold leading-tight">
              远路播客
            </span>
          </Link>

          {/* 桌面尺寸下的右侧按钮组 */}
          <div className="hidden lg:flex items-center space-x-4 text-sm">
            <button className="flex items-center space-x-2 px-4 py-2 hover:drop-shadow-md rounded-lg transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-700"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M17.293 7.293a1 1 0 011.414 1.414l-11 11a1 1 0 01-1.414-1.414l11-11zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="hidden sm:inline text-slate-600">标签</span>
            </button>

            <button className="flex items-center hover:drop-shadow-md space-x-2 px-4 py-2 rounded-lg transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-700"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="hidden sm:inline text-slate-600">频道</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 hover:drop-shadow-md rounded-lg transition-colors">
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

            <Link
              href="/auth/login"
              className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors hover:drop-shadow-md"
              onClick={handleLogin} // 模拟登录
            >
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
              <span className="text-slate-500 hidden sm:inline">
                {isLoggedIn ? userName : "登录"}
              </span>
            </Link>
          </div>
        </div>

        {/* 手机尺寸下的菜单 */}
        <div
          className={`fixed inset-0 z-40 transition-transform duration-300 ease-in-out ${
            isMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* 菜单遮罩层 */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={closeMenu}
          ></div>

          {/* 菜单内容 */}
          <div className="fixed top-0 left-0 h-full w-3/5 bg-white shadow-lg">
            {/* 用户信息组件 */}
            <Link
              href={isLoggedIn ? "/user-center" : "/auth/signup"}
              passHref
              onClick={closeMenu}
            >
              <div className="flex items-center space-x-4 p-4 border-b border-gray-200 hover:bg-gray-100 transition-colors">
                {/* 用户头像 */}
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  {isLoggedIn ? (
                    <Image
                      src="/static/images/user-avatar.png" // 用户头像路径
                      alt="用户头像"
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  )}
                </div>
                {/* 登录/注册或用户名 */}
                <span className="text-slate-600">
                  {isLoggedIn ? userName : "登录/注册"}
                </span>
              </div>
            </Link>

            {/* 子菜单项 */}
            <div className="flex flex-col space-y-4 p-4">
              <Link href="/" passHref>
                <div
                  className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={closeMenu}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-700"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  <span className="text-slate-600">首页</span>
                </div>
              </Link>

              <Link href="/channels" passHref>
                <div
                  className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={closeMenu}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-700"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                  <span className="text-slate-600">频道浏览</span>
                </div>
              </Link>

              <Link href="/favorites" passHref>
                <div
                  className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={closeMenu}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-700"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-slate-600">我的收藏</span>
                </div>
              </Link>

              <Link href="/contact" passHref>
                <div
                  className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={closeMenu}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-700"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <span className="text-slate-600">联系我们</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
