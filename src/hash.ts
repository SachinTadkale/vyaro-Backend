/**
 * Module: Hash
 * Purpose: Implements the Hash module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import bcrypt from "bcrypt";

async function hashPassword() {
  const password = process.env.HASH_PASSWORD_INPUT;

  if (!password) {
    throw new Error("Set HASH_PASSWORD_INPUT before running this script.");
  }

  const hash = await bcrypt.hash(password, 12);
  console.log(hash);
}

hashPassword();
