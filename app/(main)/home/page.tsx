"use client";
import PodcastAuthPrompt from "@/components/main/home/podcast-auth-prompt";
import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();
  return (
    <div className="bg-base-100 flex flex-col items-center justify-items-center min-h-screen p-2 gap-16 sm:p-20 font-(family-name:--font-geist-sans)">
      {status === "unauthenticated" && <PodcastAuthPrompt />}
      {status === "authenticated" && session && (
        <h1 className="text-base-content">你的主页</h1>
      )}
    </div>
  );
}
