import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import React from "react";
import { authOptions } from "@/app/lib/auth";
import CardWrapper from "@/components/dashboard/cards";
import { lusitana } from "@/components/fonts";
import prisma from "@/app/lib/prisma";

export default async function Page() {
  const session = await getServerSession(authOptions);

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
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        后台管理控制台
      </h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <CardWrapper />
      </div>
      <div className="bg-gray-50 rounded-xl p-6 w-full max-w-7xl mx-auto mt-40">
        <div className="flex flex-col items-center justify-center space-y-4">
          <h1 className="text-4xl font-bold mb-4">Welcome to Podcasts</h1>
          <p className="text-lg text-gray-600 mb-8">
            Create a new podcast or manage existing podcasts.
          </p>
          <h2 className="text-lg font-bold text-slate-500">
            欢迎，
            {session.user.phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2") ||
              ""}
          </h2>
        </div>
      </div>
    </main>
  );
}
