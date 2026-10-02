/**
 * core/wxpay/order.service.ts — 虚拟支付下单服务（模块 E T4.3）
 *
 * POST /api/wxpay/order 的业务层：requireAuth 通过后——
 *   1. buyQuantity 校验（1-99 整数）；
 *   2. SKU 解析（getWxpaySku：配置/道具缺失、未知档位均显式报错；
 *      金额分恒定来自 SKU 表，不收前端价——amountFen = 单价分 × 份数）；
 *   3. 绑定校验（wxOpenId/wxSessionKey 缺失 = 未绑定或绑定过期，提示
 *      重新发起购买——前端 T3.3 流程每次购买前静默 bind，即签即用）；
 *   4. outTradeNo 生成（22 位唯一，重复点击各自成单由单号区分）；
 *   5. buildSignData 固定键序组装 → paySig（AppKey 签 uri+'&'+signData）+
 *      signature（sessionKey 签 signData）——同一串零改写直达前端；
 *   6. wxpay_orders 落 PENDING。
 * 重复点击产生多笔 PENDING 属预期（各自 outTradeNo 区分）；超时未支付
 * 订单关闭口径 TBD（附录 B，首版靠兜底查单收敛，不做自动关单）。
 */
import prisma from "@/lib/prisma";
import { readWxpayConfig, getWxpaySku } from "./config";
import {
  buildSignData,
  computePaySig,
  computeSignature,
  CLIENT_PAY_URI,
} from "./signature";
import { isValidBuyQuantity, generateOutTradeNo } from "./order.core";

export interface CreateWxpayOrderDto {
  planKey: string;
  buyQuantity: number;
}

export interface WxpayOrderPayload {
  outTradeNo: string;
  signData: string;
  paySig: string;
  signature: string;
}

export class WxpayOrderService {
  static async createOrder(
    userid: string,
    dto: CreateWxpayOrderDto,
  ): Promise<WxpayOrderPayload> {
    if (!dto || typeof dto.planKey !== "string" || !dto.planKey) {
      throw new Error("参数不完整");
    }
    if (!isValidBuyQuantity(dto.buyQuantity)) {
      throw new Error("购买数量须为 1-99 的整数");
    }

    const sku = getWxpaySku(dto.planKey); // 金额/道具显式报错不静默
    const config = readWxpayConfig(); // 失败时 getWxpaySku 已抛；此处取 offerId/appKey

    const user = await prisma.user.findUnique({
      where: { userid },
      select: { wxOpenId: true, wxSessionKey: true },
    });
    if (!user) {
      throw new Error("用户不存在");
    }
    if (!user.wxOpenId || !user.wxSessionKey) {
      throw new Error("微信账号未绑定，请重新发起购买");
    }

    const outTradeNo = generateOutTradeNo();
    const signData = buildSignData({
      offerId: config.offerId,
      buyQuantity: dto.buyQuantity,
      productId: sku.productId,
      goodsPrice: sku.priceFen,
      outTradeNo,
      attach: userid,
    });
    const paySig = computePaySig(config.appKey, CLIENT_PAY_URI, signData);
    const signature = computeSignature(user.wxSessionKey, signData);

    await prisma.wxpayOrder.create({
      data: {
        outTradeNo,
        userid,
        planKey: sku.planKey,
        productId: sku.productId,
        buyQuantity: dto.buyQuantity,
        amountFen: sku.priceFen * dto.buyQuantity,
        status: "PENDING",
      },
    });

    return { outTradeNo, signData, paySig, signature };
  }
}
