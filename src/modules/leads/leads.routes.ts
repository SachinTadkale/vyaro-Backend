import { Router } from "express";
import {
  createLead,
  deleteLead,
  getLeadById,
  getLeads,
} from "./leads.controller";

const router = Router();

router.post("/", createLead);
router.get("/", getLeads);
router.get("/:id", getLeadById);
router.delete("/:id", deleteLead);

export default router;
