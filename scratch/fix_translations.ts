import prisma from "../src/config/prisma";

async function main() {
  const result = await prisma.translationDictionary.deleteMany({
    where: {
      key: "tomato"
    }
  });
  console.log(`Deleted ${result.count} entries for "tomato"`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
