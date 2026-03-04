import { Router } from "express";
import {
  registerUser,
  loginUser,
  requestOtpController,
  loginWithOtpController,
} from "./auth.controller";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/requestOtp", requestOtpController);
router.post("/loginWithOtp", loginWithOtpController);

export default router;