import { createCanvas } from "canvas";
import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function POST() {
  const width = 200;
  const height = 100;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // 生成随机验证码
  const code = Math.random().toString(36).substring(2, 6).toUpperCase();
  const answer = code; // 可根据需求调整答案生成逻辑

  // 绘制背景
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(0, 0, width, height);

  // 绘制验证码文本
  ctx.font = "bold 40px Arial";
  ctx.fillStyle = "#333";
  ctx.fillText(code, 50, 70);

  // 添加干扰线
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.8)`;
    ctx.beginPath();
    ctx.moveTo(Math.random() * width, Math.random() * height);
    ctx.lineTo(Math.random() * width, Math.random() * height);
    ctx.stroke();
  }

  // 存储验证码
  const captcha = await prisma.captcha.create({
    data: {
      code,
      answer,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5分钟有效期
    },
  });

  // 返回图片
  const buffer = canvas.toBuffer("image/png");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/png",
      "X-Captcha-Id": captcha.id, // 返回验证码ID
    },
    status: 200,
  });
}
