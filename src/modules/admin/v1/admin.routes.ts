import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth.middleware";
import { adminOnly } from "../../../middleware/admin.middleware";
import {
  approveCompany,
  approveUser,
  blockUser,
  getAdminStats,
  getCompanies,
  getOrders,
  getPendingCompanies,
  getPendingUsers,
  getUsers,
  rejectCompany,
  rejectUser,
  unblockUser,
} from "../v1/admin.controller";

const router = Router();

router.get("/stats", authMiddleware, adminOnly, getAdminStats);

router.get("/users", authMiddleware, adminOnly, getUsers);

router.get(
  "/users/pending-kyc",
  authMiddleware,
  adminOnly,
  getPendingUsers
);

router.patch("/users/:id/block", authMiddleware, adminOnly, blockUser);

router.patch("/users/:id/unblock", authMiddleware, adminOnly, unblockUser);

router.get("/companies", authMiddleware, adminOnly, getCompanies);

router.get(
  "/companies/pending-verification",
  authMiddleware,
  adminOnly,
  getPendingCompanies
);

router.get("/orders", authMiddleware, adminOnly, getOrders);

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
