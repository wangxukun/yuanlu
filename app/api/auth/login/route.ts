import bcrypt from "bcrypt";
import prisma from "@/app/lib/prisma";

export async function login(phone: string, password: string) {
  const user = await prisma.user.findFirst({
    where: { phone },
  });

  if (!user) {
    return { success: false, message: "用户不存在" };
  }

  // 验证密码
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return { success: false, message: "密码错误" };
  }

  return { success: true, message: "登录成功", data: user };
}
