import { Router } from "express";
import {
  registerUser,
  loginUser,
  requestOtpController,
  loginWithOtpController,
  resetPasswordController,
  forgotPasswordController,
} from "./auth.controller";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/requestOtp", requestOtpController);
router.post("/loginWithOtp", loginWithOtpController);
router.post("/forgotPassword", forgotPasswordController);
router.post("/resetPassword", resetPasswordController);

export default router;