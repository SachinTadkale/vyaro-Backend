/**
 * Module: Leads.routes
 * Purpose: Implements the Leads.routes module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { Router } from "express";
import {
  createLead,
  deleteLead,
  getLeadById,
  getLeads,
} from "./leads.controller";

const router = Router();

router.post("/addLead", createLead);
router.get("/getLeads", getLeads);
router.get("/getLeadById/:id", getLeadById);
router.delete("/deleteLead/:id", deleteLead);

export default router;