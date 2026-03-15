import { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user: {
        userId: string;
        role?: UserRole;
        companyId?: string;
        actorType?: "USER" | "COMPANY";
      };
      file?: Express.Multer.File;
    }
  }
}

export {};
