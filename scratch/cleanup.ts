import prisma from "../src/config/prisma";

async function main() {
  await prisma.translationDictionary.deleteMany({
    where: {
      key: {
        in: ["tomato", "a"]
      }
    }
  });
  console.log("Cleared dictionary for tomato and a");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
