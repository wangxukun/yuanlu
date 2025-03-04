// app/api/send-verification-code/route.ts
import Dysmsapi20170525, { SendSmsRequest } from "@alicloud/dysmsapi20170525";
import * as $OpenApi from "@alicloud/openapi-client";
import { randomInt } from "crypto";
import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

// 阿里云配置
const config = new $OpenApi.Config({
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
  endpoint: "dysmsapi.aliyuncs.com",
});

export async function POST(request: Request) {
  const { phone } = await request.json();

  if (!phone) {
    return NextResponse.json(
      { success: false, message: "手机号不能为空" },
      { status: 400 },
    );
  }

  try {
    // 生成6位随机验证码
    const code = randomInt(100000, 999999).toString();

    // 存储到 PostgreSQL
    await prisma.sms_code.create({
      data: {
        phone,
        code,
      },
    });

    // 初始化短信客户端
    const smsClient = new Dysmsapi20170525(config);

    // 使用测试签名和模板
    const sendReq = new SendSmsRequest({
      phoneNumbers: phone,
      signName: "阿里云短信测试", // 测试签名
      templateCode: "SMS_154950909", // 测试模板
      templateParam: JSON.stringify({ code }),
    });

    // 发送短信
    const result = await smsClient.sendSms(sendReq);

    // 处理短信发送结果
    if (!result || !result.body) {
      return NextResponse.json({
        success: false,
        error: "Invalid response from SMS service",
      });
    }

    if (result.body.code === "OK") {
      return NextResponse.json({ success: true });
    } else {
      await prisma.sms_code.deleteMany({
        where: { phone },
      });
      return NextResponse.json(
        { success: false, message: result.body.message || "短信发送失败" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("短信发送错误:", error);

    let errorMessage = "服务器内部错误";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 },
    );
  }
}
