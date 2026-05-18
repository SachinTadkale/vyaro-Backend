const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const updated = await prisma.user.update({
    where: {
      email: 'admin@gmail.com'
    },
    data: {
      password: hashedPassword
    }
  });
  
  console.log("=========================================");
  console.log("SUCCESSFULLY UPDATED ADMIN PASSWORD!");
  console.log("=========================================");
  console.log("User:", updated.email);
  console.log("New Password: admin123");
  
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Error updating admin password:", err);
  process.exit(1);
});
