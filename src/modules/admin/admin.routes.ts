import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { adminOnly } from "../../middleware/admin.middleware";
import {
  approveCompany,
  approveUser,
  getPendingCompanies,
  getPendingUsers,
  rejectCompany,
  rejectUser,
} from "./admin.controller";

const router = Router();

router.get(
  "/users/pending-kyc",
  authMiddleware,
  adminOnly,
  getPendingUsers
);

router.get(
  "/companies/pending-verification",
  authMiddleware,
  adminOnly,
  getPendingCompanies
);

router.patch(
  "/companies/:id/approve",
  authMiddleware,
  adminOnly,
  approveCompany
);

router.patch(
  "/companies/:id/reject",
  authMiddleware,
  adminOnly,
  rejectCompany
);

// Approve user
router.patch(
  "/users/:id/approve",
  authMiddleware,
  adminOnly,
  approveUser
);

router.patch(
  "/users/:id/reject",
  authMiddleware,
  adminOnly,
  rejectUser
);

export default router;
