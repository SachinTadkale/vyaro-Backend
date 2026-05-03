import prisma from "../config/prisma";
import { DeliveryStatus } from "@prisma/client";

export const expireDeliveries = async () => {
  await prisma.delivery.updateMany({
    where: {
      status: DeliveryStatus.PENDING_ASSIGNMENT,
      assignmentStatus: "OPEN",
      assignmentExpiresAt: {
        lt: new Date(),
      },
    },
    data: {
      assignmentStatus: "EXPIRED",
    },
  });

  console.log("Expired deliveries updated");
};