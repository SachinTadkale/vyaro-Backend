import {
  AuditEntityType,
  Prisma,
} from "@prisma/client";
import prisma from "../../config/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

type AuditEntry = {
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  performedBy: string;
  metadata?: Prisma.InputJsonValue;
};

export const createAuditLogs = async (
  db: DbClient,
  entries: AuditEntry[],
) => {
  for (const entry of entries) {
    await db.auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        performedBy: entry.performedBy,
        metadata: entry.metadata,
      },
    });
  }
};
