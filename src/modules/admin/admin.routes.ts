import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { adminOnly } from "../../middleware/admin.middleware";
import {
  approveUser,
  getPendingUsers,
  rejectUser,
  blockUser,
  unblockUser,
} from "./admin.controller";

const router = Router();

router.get(
  "/users/pending-kyc",
  authMiddleware,
  adminOnly,
  getPendingUsers
);

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

router.patch(
  "/users/:id/block",
  authMiddleware,
  adminOnly,
  blockUser
);

router.patch(
  "/users/:id/unblock",
  authMiddleware,
  adminOnly,
  unblockUser
);

export default router;