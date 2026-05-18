const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const wrappers = await prisma.aiWrapper.findMany({
      where: { deletedAt: null }
    });
    console.log("Active AI Wrappers in DB:");
    wrappers.forEach(w => {
      console.log(`- Key: ${w.key} | Name: ${w.name} | Provider: ${w.provider} | Model: ${w.modelName} | Status: ${w.status}`);
    });
  } catch (err) {
    console.error("Prisma error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
