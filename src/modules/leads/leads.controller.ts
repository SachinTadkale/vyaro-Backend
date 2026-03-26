import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import ApiError from "../../utils/apiError";
import * as leadsService from "./leads.service";
import { createLeadSchema } from "./leads.validation";

export const createLead = asyncHandler(async (req: Request, res: Response) => {
  const result = createLeadSchema.safeParse(req.body);

  if (!result.success) {
    throw new ApiError(400, "Invalid lead data", {
      details: result.error.flatten(),
    });
  }

  const response = await leadsService.createLead(result.data);

  res.status(201).json({
    success: true,
    message: response.message,
    data: response.lead,
  });
});

export const getLeads = asyncHandler(async (_req: Request, res: Response) => {
  const leads = await leadsService.getLeads();

  res.status(200).json({
    success: true,
    data: leads,
  });
});

export const getLeadById = asyncHandler(async (req: Request, res: Response) => {
  const lead = await leadsService.getLeadById(req.params.id);

  res.status(200).json({
    success: true,
    data: lead,
  });
});

export const deleteLead = asyncHandler(async (req: Request, res: Response) => {
  const response = await leadsService.deleteLead(req.params.id);

  res.status(200).json({
    success: true,
    message: response.message,
  });
});
