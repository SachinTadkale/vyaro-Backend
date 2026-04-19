import prisma from "../../config/prisma";
import { TransactionDirection, TransactionStatus } from "@prisma/client";

export const getTransactions = async (
  actor: {
    userId: string;
    companyId?: string;
    actorType: "USER" | "COMPANY";
  },
  query: any,
) => {
  const {
    page = 1,
    limit = 10,
    type,
    direction,
    status,
    fromDate,
    toDate,
    search,
    sort = "desc",
  } = query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  let where: any = {};

  // 🔹 Role filter
  if (actor.actorType === "USER") {
    where.userId = actor.userId;
  }

  if (actor.actorType === "COMPANY") {
    where.companyId = actor.companyId;
  }

  // 🔹 Filters
  if (type) where.type = type;
  if (direction) where.direction = direction;
  if (status) where.status = status;

  if (fromDate || toDate) {
    where.createdAt = {
      ...(fromDate && { gte: new Date(fromDate) }),
      ...(toDate && { lte: new Date(toDate) }),
    };
  }

  // 🔥 SEARCH (FULL)
  if (search) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          {
            transactionId: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            orderId: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            order: {
              productName: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
          ...(isNaN(Number(search))
            ? []
            : [
                {
                  amount: Number(search),
                },
              ]),
        ],
      },
    ];
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: {
        createdAt: sort === "asc" ? "asc" : "desc",
      },
      skip,
      take,
      select: {
        transactionId: true,
        paymentId: true,
        orderId: true,
        userId: true,
        companyId: true,
        actorType: true,
        amount: true,
        amountInPaise: true,
        type: true,
        direction: true,
        status: true,
        isEscrow: true,
        createdAt: true,
        order: {
          select: {
            productName: true,
          },
        },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    transactions,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / take),
    },
  };
};

export const getTransactionSummary = async (actor: any) => {
  let where: any = {
    direction: TransactionDirection.CREDIT,
    status: TransactionStatus.SUCCESS,
  };

  if (actor.actorType === "USER") {
    where.userId = actor.userId;
  }

  if (actor.actorType === "COMPANY") {
    where.companyId = actor.companyId;
  }

  const result = await prisma.transaction.aggregate({
    where,
    _sum: {
      amount: true,
    },
    _count: true,
  });
  return {
    totalEarnings: result._sum.amount ?? 0,
    totalTransactions: result._count,
  };
};
