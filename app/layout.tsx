import type { Metadata } from "next";
import React from "react";
import { lusitana } from "@/components/fonts";
import "./globals.css";
import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
import AuthProvider from "@/app/AuthProvider";
import "@/app/lib/sessionCleaner";

export const metadata: Metadata = {
  title: "远路漫漫播客",
  description: "远路漫漫的学习播客",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${lusitana.className} antialiased`}>
        <Header />
        <div className="bg-white pt-10 min-h-screen">
          {/* 这里的 pt-10 是为了给 Header 留出空间 */}
          <AuthProvider>{children}</AuthProvider>
        </div>
        <Footer />
      </body>
    </html>
  );
}
