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