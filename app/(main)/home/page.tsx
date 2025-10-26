"use client";
import PodcastAuthPrompt from "@/components/main/home/podcast-auth-prompt";
import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();
  return (
    <div>
      {status === "unauthenticated" && <PodcastAuthPrompt />}
      {status === "authenticated" && session && (
        <h1 className="text-base-content">你的主页</h1>
      )}
    </div>
  );
}
