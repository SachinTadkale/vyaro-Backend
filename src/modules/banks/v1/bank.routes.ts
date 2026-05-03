/**
 * Module: Bank.routes
 * Purpose: Implements the Bank.routes module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { Router } from "express";
import { addBankDetails } from "./bank.controller";
import { authMiddleware } from "../../../middleware/auth.middleware";

const router = Router();

router.post("/", authMiddleware, addBankDetails);

export default router;