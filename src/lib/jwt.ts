import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { UserRole } from "@prisma/client";

const JWT_SECRET: Secret = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

//////////////////////////////////////
// TOKEN PAYLOAD TYPE
//////////////////////////////////////

export type JwtPayload = {
  userId: string;
  role?: UserRole;
  companyId?: string;
  actorType?: "USER" | "COMPANY";
};

//////////////////////////////////////
// GENERATE TOKEN
//////////////////////////////////////

export const generateToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, JWT_SECRET, options);
};

//////////////////////////////////////
// VERIFY TOKEN
//////////////////////////////////////

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
