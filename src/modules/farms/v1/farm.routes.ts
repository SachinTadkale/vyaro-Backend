/**
 * Module: Farm.routes
 * Purpose: Implements the Farm.routes module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { Router } from "express";
import { addFarm } from "./farm.controller";
import { authMiddleware } from "../../../middleware/auth.middleware";

const router = Router();

router.post("/", authMiddleware, addFarm);

export default router;