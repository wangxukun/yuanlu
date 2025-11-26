import React from "react";
import "../globals.css";
import AuthProvider from "@/app/AuthProvider";
import "@/lib/sessionCleaner";
import SideNav from "@/components/dashboard/sidenav";
import { LeaveConfirmProvider } from "@/components/LeaveConfirmProvider";
import Header from "@/components/dashboard/header/Header";
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <html lang="en">
        <body>
          <LeaveConfirmProvider>
            <div className="flex h-screen flex-col md:flex-row md:overflow-hidden">
              <div className="w-full flex-none md:w-64">
                <SideNav />
              </div>
              {/* 右侧内容区域 */}
              <div className="relative flex flex-1 flex-col h-screen pt-[58px]">
                {/* 顶部面包 */}
                <Header />
                <div className="grow p-6 md:overflow-y-auto md:p-12">
                  {children}
                </div>
              </div>
            </div>
          </LeaveConfirmProvider>
        </body>
      </html>
    </AuthProvider>
  );
}
