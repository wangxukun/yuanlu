// E2E 清理：删除两个临时测试用户（learning_paths/items 经 onDelete: Cascade 级联清除）。
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  for (const userid of ["android-e2e-user-a", "android-e2e-user-b"]) {
    const paths = await prisma.learning_paths.findMany({
      where: { userid },
      select: { pathid: true, pathName: true },
    });
    const r1 = await prisma.user.deleteMany({ where: { userid } });
    console.log(
      `deleted user ${userid}:`,
      r1.count,
      "(cascade paths:",
      paths.map((p) => p.pathid).join(",") || "-",
      ")",
    );
  }
  // 兜底：万一有漏网路径（userid 断链不会发生，防御性检查）
  const leftover = await prisma.learning_paths.findMany({
    where: { pathName: { contains: "E2E" } },
    select: { pathid: true },
  });
  if (leftover.length) {
    await prisma.learning_paths.deleteMany({
      where: { pathid: { in: leftover.map((l) => l.pathid) } },
    });
    console.log(
      "cleaned leftover paths:",
      leftover.map((l) => l.pathid),
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
