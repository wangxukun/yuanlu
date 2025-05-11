import type { Metadata } from "next";
import React from "react";
import { lusitana } from "@/components/fonts";
import "../globals.css";
import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
import AuthProvider from "@/app/AuthProvider";
import "@/app/lib/sessionCleaner";
import SideNav from "@/components/main/sidenav";
import PlayControlBar from "@/components/controls/PlayControlBar";
import EmailCheckForm from "@/components/auth/email-check-form";

export const metadata: Metadata = {
  title: "远路播客",
  description: "远路漫漫的学习播客",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <html lang="en">
        <body
          className={`${lusitana.className} antialiased flex flex-col bg-gray-100 h-full`}
        >
          <div className="flex">
            {/* 左侧导航栏 */}
            <SideNav />
            {/* 右侧内容区域 */}
            <div className="relative flex flex-1 flex-col h-screen pt-[58px]">
              {/* 顶部导航栏 */}
              <Header />
              {/* ✅ 全局模态登录框 */}
              <dialog id="login_modal_box" className="modal">
                <div className="modal-box">
                  <form method="dialog" className="mb-4">
                    <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
                      ✕
                    </button>
                  </form>
                  {/*<h3 className="font-bold text-lg">欢迎登录</h3>*/}
                  <EmailCheckForm />
                  {/* 例如放置 <LoginDialog /> */}
                </div>
              </dialog>
              {/* 主体内容区域 */}
              <main className="flex-1 bg-gray-50 overflow-y-auto">
                <div className="w-full min-h-[calc(100vh-8rem)]">
                  {children}
                </div>
                {/* 底部页脚 */}
                <Footer />
              </main>
              {/* 底部播放器控制栏 */}
              <PlayControlBar />
            </div>
          </div>
        </body>
      </html>
    </AuthProvider>
  );
}
