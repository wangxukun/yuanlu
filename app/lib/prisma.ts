// 为了避免每次请求都创建一个新的 Prisma 客户端实例，可以将 Prisma 客户端实例化代码提取到单独的文件中。
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export default prisma;
