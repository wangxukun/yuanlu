import type { Metadata } from "next";
import React from "react";
import { lusitana } from "@/components/fonts";
import "@/app/globals.css";
import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
import AuthProvider from "@/app/AuthProvider";
import "@/lib/sessionCleaner";
import SideNav from "@/components/main/sidenav";
import PlayControlBar from "@/components/controls/PlayControlBar";
import EmailCheckDialog from "@/components/auth/email-check-dialog";
import SignInDialog from "@/components/auth/sign-in-dialog";
import SignUpDialog from "@/components/auth/sign-up-dialog";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";

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
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${lusitana.className} antialiased flex flex-col h-full`}
      >
        <AuthProvider>
          <ThemeProvider
            attribute="data-theme"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Toaster richColors />
            <div className="flex">
              {/* 左侧导航栏 */}
              <SideNav />
              {/* 右侧内容区域 */}
              <div className="relative flex flex-1 flex-col h-screen pt-[58px]">
                {/* 顶部导航栏 */}
                <Header />
                {/* ✅ 全局模态登录框 */}
                <EmailCheckDialog />
                <SignInDialog />
                <SignUpDialog />
                {/* 主体内容区域 */}
                <main className="flex-1 lg:pl-[260px] bg-base-100 overflow-y-auto">
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
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
