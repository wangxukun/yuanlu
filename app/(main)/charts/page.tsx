import { Metadata } from "next";

export const metadata: Metadata = {
  title: "排行榜 | 远路",
  description: "查看最受欢迎的播客系列。",
};

export default function Charts() {
  return (
    <div className="bg-base-100 flex flex-col items-center justify-items-center min-h-screen p-2 gap-16 sm:p-20 font-(family-name:--font-geist-sans)">
      <p className="text-base-content">排行榜</p>
    </div>
  );
}
