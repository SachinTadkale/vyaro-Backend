import { Router } from "express";
import { healthCheck, dbHealth, cacheHealth, configHealth } from "./health.controller";

const router = Router();

router.get("/", healthCheck);
router.get("/db", dbHealth);
router.get("/cache", cacheHealth);
router.get("/config", configHealth);

export default router;
