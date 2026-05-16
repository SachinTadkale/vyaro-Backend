import { Request, Response } from "express";
import { MarketRateService } from "./market-rate.service";

const service = new MarketRateService();

export const getMarketRates = async (req: Request, res: Response) => {
  try {
    const filters = {
      commodity: req.query.commodity as string,
      state: req.query.state as string,
      district: req.query.district as string,
      mandi: req.query.mandi as string,
    };

    const rates = await service.getAllRates(filters);
    res.json({ success: true, data: rates });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching rates" });
  }
};

export const getTrending = async (req: Request, res: Response) => {
  try {
    const rates = await service.getTrending();
    res.json({ success: true, data: rates });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching trending" });
  }
};

export const getGainers = async (req: Request, res: Response) => {
  try {
    const rates = await service.getGainers();
    res.json({ success: true, data: rates });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching gainers" });
  }
};

export const getLosers = async (req: Request, res: Response) => {
  try {
    const rates = await service.getLosers();
    res.json({ success: true, data: rates });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching losers" });
  }
};

export const getNearby = async (req: Request, res: Response) => {
  try {
    const state = req.query.state as string;
    const district = req.query.district as string;

    if (!state) {
      return res.status(400).json({ success: false, message: "State is required for nearby rates" });
    }

    const rates = await service.getNearby(state, district);
    res.json({ success: true, data: rates });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching nearby rates" });
  }
};

/**
 * Manually trigger sync (admin only in future)
 */
export const triggerSync = async (req: Request, res: Response) => {
  try {
    // Non-blocking sync
    service.syncMarketRates();
    res.json({ success: true, message: "Sync started in background" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error starting sync" });
  }
};
