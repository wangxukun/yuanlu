import { redirect } from "next/navigation";
import React from "react";
import CardWrapper from "@/components/admin/cards";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect("/auth/login");
  }

  // 更新活动时间
  try {
    await prisma.user.update({
      where: { userid: session.user.userid },
      data: { lastActiveAt: new Date() },
    });
  } finally {
    await prisma.$disconnect();
  }

  return (
    <main>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <CardWrapper />
      </div>
      <div className="bg-base-100 rounded-xl p-6 w-full max-w-7xl mx-auto mt-10 lg:mt-40 shadow-sm border border-base-200">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <h1 className="text-4xl font-bold mb-4">远路播客后台管理系统</h1>
          <p className="text-lg text-gray-600 mb-8">创建或管理一档播客</p>
          <h2 className="text-lg font-bold text-slate-500">
            欢迎，
            {session.user?.nickname}
          </h2>
        </div>
      </div>
    </main>
  );
}
