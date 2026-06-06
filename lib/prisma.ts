// 为了避免每次请求都创建一个新的 Prisma 客户端实例，可以将 Prisma 客户端实例化代码提取到单独的文件中。
import type { PrismaClient as PrismaClientType } from "@prisma/client";

// 绕过 Turbopack 静态分析以解决 ECS 生产环境下的外部模块别名解析错误
const prismaClientName = "@prisma/client";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require(prismaClientName) as {
  PrismaClient: typeof PrismaClientType;
};

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
