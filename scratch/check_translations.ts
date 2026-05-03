import prisma from "../src/config/prisma";

async function main() {
  const translations = await prisma.translationDictionary.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(translations, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
