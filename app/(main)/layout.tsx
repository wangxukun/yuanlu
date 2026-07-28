// app/(main)/layout.tsx
import type { Metadata } from "next";
import React, { Suspense } from "react";
import { jakarta, sourceSerif } from "@/components/fonts";
import "@/app/globals.css";
import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
import AuthProvider from "@/app/AuthProvider";
import SideNav from "@/components/main/sidenav";
import PlayControlBar from "@/components/controls/PlayControlBar";

import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";
import PageTracker from "@/components/main/PageTracker";
import { ModalProvider } from "@/components/providers/ModalProvider";
import GlobalAudio from "@/components/player/GlobalAudio";
import SubscriptionFlashToast from "@/components/subscription/SubscriptionFlashToast";
import MobileBottomNav from "@/components/main/MobileBottomNav";
import MobilePlayerBar from "@/components/player/MobilePlayerBar";

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
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${jakarta.variable} ${sourceSerif.variable} font-sans antialiased bg-base-200 text-base-content min-h-screen flex flex-col`}
      >
        <AuthProvider>
          <ThemeProvider
            attribute="data-theme"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Suspense fallback={null}>
              <PageTracker />
            </Suspense>
            <Toaster richColors />
            <SubscriptionFlashToast />
            <ModalProvider />

            {/* 挂载全局音频引擎，不随页面切换销毁 */}
            <GlobalAudio />

            <div className="drawer xl:drawer-open min-h-screen w-full">
              <input
                id="main-drawer"
                type="checkbox"
                className="drawer-toggle"
              />

              <div className="drawer-content flex flex-col relative w-full transition-all duration-300">
                <div className="hidden md:block">
                  <Header />
                </div>

                <main className="flex-1 flex flex-col w-full pb-[var(--mobile-bottom-total)] md:pb-0">
                  <div className="flex-1 w-full">{children}</div>
                  {/* Footer: 桌面端显示，移动端隐藏 */}
                  <div className="hidden md:block">
                    <Footer />
                  </div>
                </main>
              </div>

              {/* 侧边栏: 移动端隐藏 drawer-side, 桌面端 xl:drawer-open */}
              <div className="drawer-side z-[100]">
                <label
                  htmlFor="main-drawer"
                  aria-label="close sidebar"
                  className="drawer-overlay"
                ></label>
                <SideNav />
              </div>
            </div>

            {/* 桌面端/平板端：浮动播放控制条 */}
            <div className="hidden md:block">
              <PlayControlBar />
            </div>

            {/* 移动端专属：Mini Player + 底部导航栏 */}
            <div className="md:hidden">
              <MobilePlayerBar />
              <MobileBottomNav />
            </div>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
