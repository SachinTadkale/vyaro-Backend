import { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user: {
        userId: string;
        role?: UserRole;
        companyId?: string;
        actorType?: "USER" | "COMPANY" | "DELIVERY_PARTNER";
      };
      file?: Express.Multer.File;
    }
  }
}

export {};
