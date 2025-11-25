import { redirect } from "next/navigation";
import React from "react";
import CardWrapper from "@/components/dashboard/cards";
import prisma from "@/app/lib/prisma";
import { auth } from "@/auth";

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect("/auth/login");
  }

  console.log("session", session);
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
      <div className="bg-gray-50 rounded-xl p-6 w-full max-w-7xl mx-auto mt-40">
        <div className="flex flex-col items-center justify-center space-y-4">
          <h1 className="text-4xl font-bold mb-4">Welcome to Podcasts</h1>
          <p className="text-lg text-gray-600 mb-8">
            Create a new podcast or manage existing podcasts.
          </p>
          <h2 className="text-lg font-bold text-slate-500">
            欢迎，
            {session.user?.email?.split("@")[0]}
          </h2>
        </div>
      </div>
    </main>
  );
}
