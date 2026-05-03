/**
 * Module: Async Handler
 * Purpose: Implements the Async Handler module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { Request, Response, NextFunction } from "express";

const asyncHandler =
  (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
  ) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export default asyncHandler;