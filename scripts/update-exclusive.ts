import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("开始批量更新 episode 表...");

  const result = await prisma.episode.updateMany({
    data: {
      isExclusive: false,
    },
  });

  console.log(`更新完成！共修改了 ${result.count} 条记录。`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
