import bcrypt from "bcrypt";

async function hashPassword() {
  const password = "Company@123"; // the plain password currently in DB
  const hash = await bcrypt.hash(password, 12);
  console.log(hash);
}

hashPassword();