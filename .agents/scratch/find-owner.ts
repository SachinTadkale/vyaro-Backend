import prisma from "../../src/config/prisma";
import { UserRole } from "@prisma/client";

async function main() {
  const owners = await prisma.user.findMany({
    where: { role: UserRole.OWNER }
  });
  console.log("OWNERS IN DATABASE:");
  console.log(JSON.stringify(owners, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
