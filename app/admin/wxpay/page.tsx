import { auth } from "@/auth";
import { redirect } from "next/navigation";
import OrdersClient from "./OrdersClient";

export const metadata = { title: "微信订单" };

/**
 * [模块E T4.6] 微信虚拟支付订单面板（对齐 afdian 认领页模式）。
 * 页面仅做管理员门禁，数据走 /api/admin/wxpay/orders（requireAdmin 强校验）。
 * 只读列表：状态机筛选 + 搜索 + 汇总；月限额/账单核对走 MP 后台人工口径。
 */
export default async function WxpayOrdersPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen bg-base-200/20">
      <OrdersClient />
    </div>
  );
}
