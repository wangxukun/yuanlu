import React from "react";
import "../globals.css";
import AuthProvider from "@/app/AuthProvider";
import "@/app/lib/sessionCleaner";
import SideNav from "@/components/dashboard/sidenav";
import { LeaveConfirmProvider } from "@/components/LeaveConfirmProvider";
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
              <div className="grow p-6 md:overflow-y-auto md:p-12">
                {children}
              </div>
            </div>
          </LeaveConfirmProvider>
        </body>
      </html>
    </AuthProvider>
  );
}
