import React from "react";
import "../globals.css";
import AuthProvider from "@/app/AuthProvider";
import "@/lib/sessionCleaner";
import SideNav from "@/components/admin/sidenav";
import { LeaveConfirmProvider } from "@/components/LeaveConfirmProvider";
import Header from "@/components/admin/header/Header";
import { lusitana } from "@/components/fonts";
import { Toaster } from "sonner";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | 远路管理后台",
    default: "管理后台",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <html lang="en">
        <body className={lusitana.className}>
          <Toaster richColors />
          <LeaveConfirmProvider>
            <div className="drawer lg:drawer-open h-screen overflow-hidden">
              <input
                id="admin-drawer"
                type="checkbox"
                className="drawer-toggle"
              />
              <div className="drawer-content flex flex-1 flex-col h-screen overflow-hidden relative">
                <Header />
                <div className="grow p-4 md:p-6 lg:p-12 overflow-y-auto">
                  {children}
                </div>
              </div>
              <div className="drawer-side z-[100] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <label
                  htmlFor="admin-drawer"
                  aria-label="close sidebar"
                  className="drawer-overlay"
                ></label>
                <div className="w-[260px] h-full bg-base-100 border-r border-base-200">
                  <SideNav />
                </div>
              </div>
            </div>
          </LeaveConfirmProvider>
        </body>
      </html>
    </AuthProvider>
  );
}
