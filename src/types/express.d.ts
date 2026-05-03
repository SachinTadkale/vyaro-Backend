import { UserRole } from "@prisma/client";
import { SupportedLang } from "../services/translation/translation.interface";

declare global {
  namespace Express {
    interface Request {
      user: {
        userId: string;
        role?: UserRole;
        companyId?: string;
        actorType?: "FARMER" | "COMPANY" | "DELIVERY_PARTNER";
      };
      /**
       * Active language for this request, resolved by langMiddleware.
       * Sourced from the `x-lang` header. Defaults to "en".
       */
      lang: SupportedLang;
      file?: Express.Multer.File;
    }
  }
}

export {};
