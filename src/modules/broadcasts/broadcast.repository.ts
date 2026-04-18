import { BroadcastType, Prisma, TargetAudience, UserRole } from "@prisma/client";
import prisma from "../../config/prisma";
import type {
  BroadcastListFilters,
  BroadcastRecipient,
  CreateBroadcastInput,
  UpdateBroadcastInput,
} from "./broadcast.types";

const buildWhere = (filters?: BroadcastListFilters): Prisma.BroadcastWhereInput => ({
  ...(filters?.type ? { type: filters.type } : {}),
  ...(filters?.targetAudience ? { targetAudience: filters.targetAudience } : {}),
  ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
});

export const createBroadcastRecord = (data: CreateBroadcastInput & { createdBy: string }) =>
  prisma.broadcast.create({
    data: {
      title: data.title,
      message: data.message,
      type: data.type,
      targetAudience: data.targetAudience,
      isActive: data.isActive ?? true,
      publishAt: data.publishAt instanceof Date ? data.publishAt : new Date(data.publishAt ?? Date.now()),
      expiresAt:
        data.expiresAt === undefined || data.expiresAt === null
          ? null
          : data.expiresAt instanceof Date
            ? data.expiresAt
            : new Date(data.expiresAt),
      createdBy: data.createdBy,
      imageUrl: data.imageUrl ?? null,
      ctaLabel: data.ctaLabel ?? null,
      ctaLink: data.ctaLink ?? null,
    },
  });

export const listBroadcastRecords = (filters?: BroadcastListFilters) =>
  prisma.broadcast.findMany({
    where: buildWhere(filters),
    orderBy: {
      createdAt: "desc",
    },
  });

export const findBroadcastById = (id: string) =>
  prisma.broadcast.findUnique({
    where: { id },
  });

export const updateBroadcastRecord = (id: string, data: UpdateBroadcastInput) =>
  prisma.broadcast.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.message !== undefined ? { message: data.message } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.targetAudience !== undefined
        ? { targetAudience: data.targetAudience }
        : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.publishAt !== undefined
        ? {
            publishAt:
              data.publishAt instanceof Date
                ? data.publishAt
                : new Date(data.publishAt),
          }
        : {}),
      ...(data.expiresAt !== undefined
        ? {
            expiresAt:
              data.expiresAt === null
                ? null
                : data.expiresAt instanceof Date
                  ? data.expiresAt
                  : new Date(data.expiresAt),
          }
        : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
      ...(data.ctaLabel !== undefined ? { ctaLabel: data.ctaLabel } : {}),
      ...(data.ctaLink !== undefined ? { ctaLink: data.ctaLink } : {}),
    },
  });

export const softDeleteBroadcastRecord = (id: string) =>
  prisma.broadcast.update({
    where: { id },
    data: {
      isActive: false,
    },
  });

export const findActiveBroadcastsForAudiences = (audiences: TargetAudience[], now: Date) =>
  prisma.broadcast.findMany({
    where: {
      isActive: true,
      targetAudience: {
        in: audiences,
      },
      publishAt: {
        lte: now,
      },
      OR: [
        {
          expiresAt: null,
        },
        {
          expiresAt: {
            gt: now,
          },
        },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
  });

export const findUserRecipientBatch = async (
  cursor?: string,
  take = 200
): Promise<BroadcastRecipient[]> => {
  const users = await prisma.user.findMany({
    where: {
      role: UserRole.USER,
      isBlocked: false,
      email: {
        not: null,
      },
    },
    select: {
      user_id: true,
      name: true,
      email: true,
    },
    orderBy: {
      user_id: "asc",
    },
    ...(cursor ? { cursor: { user_id: cursor }, skip: 1 } : {}),
    take,
  });

  return users.map((user) => ({
    id: user.user_id,
    name: user.name,
    email: user.email!,
    audience: TargetAudience.USER,
  }));
};

export const findCompanyRecipientBatch = async (
  cursor?: string,
  take = 200
): Promise<BroadcastRecipient[]> => {
  const companies = await prisma.company.findMany({
    select: {
      companyId: true,
      companyName: true,
      email: true,
    },
    orderBy: {
      companyId: "asc",
    },
    ...(cursor ? { cursor: { companyId: cursor }, skip: 1 } : {}),
    take,
  });

  return companies.map((company) => ({
    id: company.companyId,
    name: company.companyName,
    email: company.email,
    audience: TargetAudience.COMPANY,
  }));
};

export const findDeliveryRecipientBatch = async (
  cursor?: string,
  take = 200
): Promise<BroadcastRecipient[]> => {
  const partners = await prisma.deliveryPartner.findMany({
    where: {
      isActive: true,
      user: {
        email: {
          not: null,
        },
      },
    },
    select: {
      id: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      id: "asc",
    },
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take,
  });

  return partners.map((partner) => ({
    id: partner.id,
    name: partner.user.name,
    email: partner.user.email!,
    audience: TargetAudience.DELIVERY_PARTNER,
  }));
};

export { BroadcastType, TargetAudience };
