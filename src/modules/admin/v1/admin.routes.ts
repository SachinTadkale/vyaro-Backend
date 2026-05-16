/**
 * Module: Admin.routes
 * Purpose: Implements the Admin.routes module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
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
  getMarketRatesSyncStatus,
  syncMarketRatesAdmin,
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

// Market Rates Sync Monitoring & Execution Routes
router.get(
  "/market-rates/sync-status",
  authMiddleware,
  adminOnly,
  getMarketRatesSyncStatus
);

router.post(
  "/market-rates/sync",
  authMiddleware,
  adminOnly,
  syncMarketRatesAdmin
);

export default router;

