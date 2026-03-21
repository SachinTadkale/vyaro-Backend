import { Router } from "express";
import {
  forgotPasswordAdminController,
  loginAdminController,
  resetPasswordAdminController,
} from "./admin-auth.controller";

const router = Router();

router.post("/forgotPassword", forgotPasswordAdminController);
router.post("/login", loginAdminController);
router.post("/resetPassword", resetPasswordAdminController);

export default router;
