import { Router } from "express";
import { 
  getMarketRates, 
  getTrending, 
  getGainers, 
  getLosers, 
  triggerSync, 
  getNearby
} from "./market-rates.controller";

const router = Router();

/**
 * @route GET /api/v1/market-rates
 */
router.get("/", getMarketRates);

/**
 * @route GET /api/v1/market-rates/trending
 */
router.get("/trending", getTrending);

/**
 * @route GET /api/v1/market-rates/gainers
 */
router.get("/gainers", getGainers);

/**
 * @route GET /api/v1/market-rates/losers
 */
router.get("/losers", getLosers);

/**
 * @route GET /api/v1/market-rates/nearby
 */
router.get("/nearby", getNearby);

/**
 * @route POST /api/v1/market-rates/sync
 */
router.post("/sync", triggerSync);

export default router;
