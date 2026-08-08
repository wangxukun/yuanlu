// 为了避免每次请求都创建一个新的 Prisma 客户端实例，可以将 Prisma 客户端实例化代码提取到单独的文件中。
import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  let url = process.env.DATABASE_URL;
  if (url && !url.includes("connection_limit")) {
    const separator = url.includes("?") ? "&" : "?";
    url += `${separator}connection_limit=50&pool_timeout=30`;
  }

  return new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
  });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
