const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      role: {
        in: ['ADMIN', 'OWNER']
      }
    },
    select: {
      email: true,
      role: true,
      name: true
    }
  });
  
  console.log("=========================================");
  console.log("AVAILABLE ADMIN/OWNER USERS IN DATABASE");
  console.log("=========================================");
  console.log(JSON.stringify(users, null, 2));
  
  await prisma.$disconnect();
}

main();
