// app/(main)/layout.tsx
import type { Metadata } from "next";
import React, { Suspense } from "react";
import { inter, lusitana } from "@/components/fonts";
import "@/app/globals.css";
import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
import AuthProvider from "@/app/AuthProvider";
import "@/lib/sessionCleaner";
import SideNav from "@/components/main/sidenav";
import PlayControlBar from "@/components/controls/PlayControlBar";
import BottomNav from "@/components/main/BottomNav";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";
import PageTracker from "@/components/main/PageTracker";
import { ModalProvider } from "@/components/providers/ModalProvider";
import GlobalAudio from "@/components/player/GlobalAudio"; // <--- 新增引入

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
      <body
        className={`${inter.variable} ${lusitana.variable} font-sans antialiased bg-base-200 text-base-content min-h-screen flex flex-col`}
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
            <ModalProvider />

            {/* 挂载全局音频引擎，不随页面切换销毁 */}
            <GlobalAudio />

            <div className="drawer lg:drawer-open min-h-screen w-full">
              <input
                id="main-drawer"
                type="checkbox"
                className="drawer-toggle"
              />

              <div className="drawer-content flex flex-col relative w-full transition-all duration-300">
                <Header />

                <main className="flex-1 flex flex-col w-full pt-[var(--header-height-mobile)] lg:pt-[var(--header-height-desktop)] pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] lg:pb-0">
                  <div className="flex-1 w-full">{children}</div>
                  <Footer />
                </main>

                <PlayControlBar />
                <BottomNav />
              </div>

              <div className="drawer-side z-[100]">
                <label
                  htmlFor="main-drawer"
                  aria-label="close sidebar"
                  className="drawer-overlay"
                ></label>
                <SideNav />
              </div>
            </div>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
