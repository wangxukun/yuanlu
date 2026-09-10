import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();

  const expiredCaptcha = await prisma.captcha.count({
    where: { expiresAt: { lt: now } },
  });
  console.log(`expired captcha: ${expiredCaptcha}`);

  const expiredEmail = await prisma.verification_code.count({
    where: { expiresAt: { lt: now } },
  });
  console.log(`expired email codes: ${expiredEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
