import SignOutButton from "@/components/auth/signout-button";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import React from "react";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import CardWrapper from "@/components/dashboard/cards";
import { lusitana } from "@/components/fonts";
import { prisma } from "@/app/lib/prisma";

export default async function Page() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  // 更新活动时间
  try {
    await prisma.user.update({
      where: { userid: Number(session.user.userid) },
      data: { lastActiveAt: new Date() },
    });
  } finally {
    await prisma.$disconnect();
  }

  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Dashboard
      </h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <CardWrapper />
      </div>
      <div className="bg-gray-50 rounded-xl p-6 w-full max-w-7xl mx-auto mt-40">
        <div className="flex flex-col items-center justify-center space-y-4">
          <h2 className="text-lg font-bold text-slate-500">
            欢迎，{session.user.phone || ""}
          </h2>
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
