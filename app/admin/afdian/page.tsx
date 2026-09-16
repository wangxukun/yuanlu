import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ClaimClient from "./ClaimClient";

export const metadata = { title: "订单认领" };

/**
 * [P2-3] 爱发电未匹配订单认领面板。
 * 页面仅做管理员门禁，数据与操作走 /api/admin/afdian/*（requireAdmin 强校验）。
 */
export default async function AfdianClaimPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen bg-base-200/20">
      <ClaimClient />
    </div>
  );
}
