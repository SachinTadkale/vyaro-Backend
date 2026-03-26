import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import prisma from "../../config/prisma";
import ApiError from "../../utils/apiError";
import { CreateLeadInput } from "./leads.validation";

type LeadRow = {
  id: string;
  email: string;
  role: "FARMER" | "COMPANY";
  name: string | null;
  createdAt: Date;
};

const cleanOptionalName = (name?: string) => {
  if (!name) {
    return undefined;
  }

  const cleanedName = name.trim().replace(/\s+/g, " ");
  return cleanedName.length > 0 ? cleanedName : undefined;
};

export const createLead = async (data: CreateLeadInput) => {
  const existingLead = await prisma.$queryRaw<Array<Pick<LeadRow, "id">>>(Prisma.sql`
    SELECT "id"
    FROM "leads"
    WHERE "email" = ${data.email}
    LIMIT 1
  `);

  if (existingLead.length > 0) {
    throw new ApiError(409, "Lead already exists with this email", {
      code: "LEAD_ALREADY_EXISTS",
    });
  }

  const lead = await prisma.$queryRaw<LeadRow[]>(Prisma.sql`
    INSERT INTO "leads" ("id", "email", "role", "name", "createdAt")
    VALUES (${randomUUID()}, ${data.email}, ${data.role}::"LeadRole", ${cleanOptionalName(data.name)}, NOW())
    RETURNING "id", "email", "role", "name", "createdAt"
  `);

  return {
    message: "Lead created successfully",
    lead: lead[0],
  };
};

export const getLeads = async () => {
  return prisma.$queryRaw<LeadRow[]>(Prisma.sql`
    SELECT "id", "email", "role", "name", "createdAt"
    FROM "leads"
    ORDER BY "createdAt" DESC
  `);
};

export const getLeadById = async (id: string) => {
  const lead = await prisma.$queryRaw<LeadRow[]>(Prisma.sql`
    SELECT "id", "email", "role", "name", "createdAt"
    FROM "leads"
    WHERE "id" = ${id}
    LIMIT 1
  `);

  if (lead.length === 0) {
    throw new ApiError(404, "Lead not found");
  }

  return lead[0];
};

export const deleteLead = async (id: string) => {
  const existingLead = await prisma.$queryRaw<Array<Pick<LeadRow, "id">>>(Prisma.sql`
    SELECT "id"
    FROM "leads"
    WHERE "id" = ${id}
    LIMIT 1
  `);

  if (existingLead.length === 0) {
    throw new ApiError(404, "Lead not found");
  }

  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM "leads"
    WHERE "id" = ${id}
  `);

  return {
    message: "Lead deleted successfully",
  };
};
