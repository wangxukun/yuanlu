/**
 * core/wxpay/orders.core.ts — C 端订单列表纯逻辑（订单中心页配套）
 *
 * 微信《小程序订单中心设置规范》要求有「选择商品/服务-下单-支付」流程的
 * 小程序在提审表单填报订单中心 path；本模块 + GET /api/wxpay/orders 即
 * 该页的数据源。零依赖纯函数：仅做标签映射与 DTO 裁剪，供 route 组合
 * prisma 使用；scripts/test-wxpay-orders.mjs 直测（Node ≥22 type-strip）。
 *
 * 口径：
 *   - DTO 字段白名单收紧：只下发 C 端展示所需的 8 个字段——productId/
 *     wxOrderId/orderid/userid 属平台/内部标识，不下发（最小披露）；
 *   - 标签文案与 admin 路由同源不同名：admin 面向运营（「已发货」「对账
 *     不符（转人工）」），C 端面向买家（「已完成」「处理中」）；
 *   - amountYuan 由服务端一次性格式化（分→元两位小数），前端不自行除法
 *     ——与金额恒来自服务端的 SKU 红线同精神。
 */

/** C 端单次拉取上限（会员购买频次低，100 笔足够覆盖；与 admin take 同量级） */
export const USER_ORDER_TAKE = 100;

/** 档位展示名（与 admin/wxpay/orders 路由 PLAN_LABELS 同文案） */
export const USER_PLAN_LABELS: Record<string, string> = {
  WEEKLY: "周卡",
  MONTHLY: "月卡",
  QUARTERLY: "季卡",
  YEARLY: "年卡",
};

/** 订单状态 C 端文案（买家视角；未知状态回退原值展示） */
export const USER_STATUS_LABELS: Record<string, string> = {
  PENDING: "待支付",
  ACTIVATED: "已完成",
  AMOUNT_MISMATCH: "处理中",
  REFUNDED: "已退款",
  CLOSED: "已关闭",
};

/** prisma wxpayOrder 行的最小投影（route 侧 select 与此对齐） */
export interface UserOrderRow {
  outTradeNo: string;
  planKey: string;
  buyQuantity: number;
  amountFen: number;
  daysGranted: number;
  status: string;
  createAt: Date | string;
}

/** C 端订单 DTO（字段白名单，见文件头） */
export interface UserOrderDto {
  outTradeNo: string;
  planKey: string;
  planName: string;
  buyQuantity: number;
  amountYuan: string;
  daysGranted: number;
  status: string;
  statusLabel: string;
  createAt: string;
}

/** 分→元（两位小数字符串；0/1 分边界与非法值兜底 "0.00"） */
export function fenToYuan(fen: unknown): string {
  const n = typeof fen === "number" && Number.isFinite(fen) ? fen : 0;
  return (Math.round(n) / 100).toFixed(2);
}

/** 单行裁剪映射：标签回退原值、金额格式化、createAt 统一 ISO 串 */
export function toUserOrderDto(row: UserOrderRow): UserOrderDto {
  return {
    outTradeNo: row.outTradeNo,
    planKey: row.planKey,
    planName: USER_PLAN_LABELS[row.planKey] ?? row.planKey,
    buyQuantity: row.buyQuantity,
    amountYuan: fenToYuan(row.amountFen),
    daysGranted: row.daysGranted,
    status: row.status,
    statusLabel: USER_STATUS_LABELS[row.status] ?? row.status,
    createAt:
      row.createAt instanceof Date
        ? row.createAt.toISOString()
        : String(row.createAt),
  };
}
