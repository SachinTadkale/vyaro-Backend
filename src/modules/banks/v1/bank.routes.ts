import { Router } from "express";
import { addBankDetails } from "./bank.controller";
import { authMiddleware } from "../../../middleware/auth.middleware";

const router = Router();

router.post("/", authMiddleware, addBankDetails);

export default router;