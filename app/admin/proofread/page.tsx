import { Metadata } from "next";
import ProofreadReviewClient from "@/components/admin/proofread/ProofreadReviewClient";

export const metadata: Metadata = {
  title: "字幕校对审核",
};

export default function ProofreadReviewPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-base-content">字幕校对审核</h1>
        <p className="text-base-content/50 mt-1">
          审核普通用户提交的字幕校对请求。
        </p>
      </div>

      <ProofreadReviewClient />
    </div>
  );
}
