import { UserRole } from "@prisma/client";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import ApiError from "../utils/apiError";

const JWT_SECRET: Secret = process.env.JWT_SECRET as Secret;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!JWT_SECRET) {
  throw new ApiError(500, "Authentication service not configured");
}

export type JwtPayload = {
  userId: string;
  role?: UserRole;
  companyId?: string;
  actorType?: "USER" | "COMPANY";
};

export const generateToken = (payload: JwtPayload) => {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, JWT_SECRET, options);
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
