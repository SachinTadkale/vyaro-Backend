import {
  DeliveryStatus,
  UserRole,
  VerificationStatus,
} from "@prisma/client";
import ApiError from "../../utils/apiError";
import {
  COMPLETED_PAYMENT_STATUSES,
  DELIVERY_FAILURE_STATUSES,
  DELIVERY_STATUS_FLOW,
  OVERRIDE_ALLOWED_STATUSES,
} from "./delivery.constants";
import {
  createOrReassignDelivery,
  findDeliveryById,
  findDeliveryPartnerById,
  findNextAvailablePartner,
  findOrderForDeliveryAssignment,
  updateDeliveryStatusRecord,
} from "./delivery.repository";
import {
  AssignDeliveryInput,
  DeliveryActor,
  DeliveryDetailsRecord,
  DeliveryStatusTransitionDecision,
  DeliveryStatusUpdateResult,
  UpdateDeliveryStatusInput,
} from "./delivery.types";

const isAdmin = (actor: DeliveryActor) => actor.role === UserRole.ADMIN;
const isCompanyActor = (actor: DeliveryActor) => actor.actorType === "COMPANY";
const isDeliveryPartner = (actor: DeliveryActor) =>
  actor.role === UserRole.DELIVERY_PARTNER;

const formatDelivery = (delivery: DeliveryDetailsRecord) => ({
  id: delivery.deliveryId,
  orderId: delivery.orderId,
  assignedBy: delivery.assignedBy,
  partnerId: delivery.partnerId,
  status: delivery.status,
  pickupTime: delivery.pickupTime,
  deliveryTime: delivery.deliveryTime,
  createdAt: delivery.createdAt,
  updatedAt: delivery.updatedAt,
  order: {
    id: delivery.order.orderId,
    companyId: delivery.order.companyId,
    sellerId: delivery.order.sellerId,
    orderStatus: delivery.order.orderStatus,
    paymentStatus: delivery.order.paymentStatus,
    quantity: delivery.order.quantity,
    finalPrice: delivery.order.finalPrice,
    createdAt: delivery.order.createdAt,
    product: {
      name: delivery.order.productName,
      category: delivery.order.productCategory,
      unit: delivery.order.productUnit,
    },
    company: {
      id: delivery.order.company.companyId,
      name: delivery.order.company.companyName,
      email: delivery.order.company.email,
    },
  },
  partner: delivery.partner
    ? {
        id: delivery.partner.id,
        userId: delivery.partner.userId,
        name: delivery.partner.user.name,
        phone: delivery.partner.user.phone_no,
        email: delivery.partner.user.email,
        vehicleType: delivery.partner.vehicleType,
        licenseNumber: delivery.partner.licenseNumber,
        isAvailable: delivery.partner.isAvailable,
        isActive: delivery.partner.isActive,
        lastSeenAt: delivery.partner.lastSeenAt,
      }
    : null,
});

const assertAssignmentAuthorization = (
  actor: DeliveryActor,
  orderCompanyId: string,
) => {
  if (isAdmin(actor)) {
    return;
  }

  if (!isCompanyActor(actor) || !actor.companyId || actor.companyId !== orderCompanyId) {
    throw new ApiError(403, "Unauthorized", {
      code: "UNAUTHORIZED",
    });
  }
};

const assertDeliveryReadable = (
  actor: DeliveryActor,
  delivery: DeliveryDetailsRecord,
) => {
  if (isAdmin(actor)) {
    return;
  }

  if (isCompanyActor(actor)) {
    if (actor.companyId === delivery.order.companyId) {
      return;
    }

    throw new ApiError(403, "Unauthorized", {
      code: "UNAUTHORIZED",
    });
  }

  if (isDeliveryPartner(actor) && actor.userId === delivery.partner?.userId) {
    return;
  }

  throw new ApiError(403, "Unauthorized", {
    code: "UNAUTHORIZED",
  });
};

const assertPartnerEligible = async (deliveryPartnerId: string) => {
  const partner = await findDeliveryPartnerById(deliveryPartnerId);

  if (
    !partner ||
    !partner.isAvailable ||
    !partner.isActive ||
    partner.user.role !== UserRole.DELIVERY_PARTNER ||
    partner.user.isBlocked ||
    partner.user.verificationStatus !== VerificationStatus.VERIFIED
  ) {
    throw new ApiError(400, "Invalid delivery partner", {
      code: "INVALID_PARTNER",
    });
  }

  return partner;
};

const assertOrderReadyForDelivery = async (
  orderId: string,
  actor: DeliveryActor,
) => {
  const order = await findOrderForDeliveryAssignment(
    orderId,
    isAdmin(actor) ? undefined : actor.companyId,
  );

  if (!order) {
    throw new ApiError(404, "Order not found", {
      code: "ORDER_NOT_FOUND",
    });
  }

  assertAssignmentAuthorization(actor, order.companyId);

  if (!COMPLETED_PAYMENT_STATUSES.has(order.paymentStatus)) {
    throw new ApiError(409, "Order payment is not completed", {
      code: "ORDER_NOT_PAID",
    });
  }

  return order;
};

export const evaluateDeliveryTransition = (
  currentStatus: DeliveryStatus,
  nextStatus: DeliveryStatus,
  actor: DeliveryActor,
): DeliveryStatusTransitionDecision => {
  if (currentStatus === nextStatus) {
    return { ok: true, isNoop: true };
  }

  if (currentStatus === DeliveryStatus.DELIVERED) {
    return { ok: false, code: "INVALID_STATUS_TRANSITION" };
  }

  if (isDeliveryPartner(actor)) {
    const expectedNextStatus = DELIVERY_STATUS_FLOW[currentStatus];

    if (expectedNextStatus === nextStatus) {
      return { ok: true, isNoop: false };
    }

    return { ok: false, code: "INVALID_STATUS_TRANSITION" };
  }

  if (
    (isCompanyActor(actor) || isAdmin(actor)) &&
    OVERRIDE_ALLOWED_STATUSES.has(nextStatus) &&
    !DELIVERY_FAILURE_STATUSES.has(currentStatus)
  ) {
    return { ok: true, isNoop: false };
  }

  const expectedNextStatus = DELIVERY_STATUS_FLOW[currentStatus];

  if (expectedNextStatus === nextStatus) {
    return { ok: true, isNoop: false };
  }

  return { ok: false, code: "INVALID_STATUS_TRANSITION" };
};

export const assignDelivery = async (
  actor: DeliveryActor,
  input: AssignDeliveryInput,
) => {
  const order = await assertOrderReadyForDelivery(input.orderId, actor);
  await assertPartnerEligible(input.deliveryPartnerId);

  if (order.delivery) {
    if (
      order.delivery.status !== DeliveryStatus.FAILED &&
      order.delivery.status !== DeliveryStatus.CANCELLED
    ) {
      if (order.delivery.partnerId === input.deliveryPartnerId) {
        const existingDelivery = await findDeliveryById(order.delivery.deliveryId);

        if (!existingDelivery) {
          throw new ApiError(404, "Delivery not found", {
            code: "DELIVERY_NOT_FOUND",
          });
        }

        return {
          delivery: formatDelivery(existingDelivery),
          isExistingDelivery: true,
        };
      }

      throw new ApiError(409, "Delivery already exists for this order", {
        code: "DELIVERY_ALREADY_EXISTS",
      });
    }
  }

  const delivery = await createOrReassignDelivery({
    orderId: input.orderId,
    assignedBy: actor.companyId ?? actor.userId,
    deliveryPartnerId: input.deliveryPartnerId,
  });

  return {
    delivery: formatDelivery(delivery),
    isExistingDelivery: false,
  };
};

export const autoAssignDelivery = async (
  actor: DeliveryActor,
  orderId: string,
) => {
  const partner = await findNextAvailablePartner();

  if (!partner) {
    throw new ApiError(400, "Invalid delivery partner", {
      code: "INVALID_PARTNER",
    });
  }

  return assignDelivery(actor, {
    orderId,
    deliveryPartnerId: partner.id,
  });
};

export const updateDeliveryStatus = async (
  actor: DeliveryActor,
  deliveryId: string,
  input: UpdateDeliveryStatusInput,
): Promise<DeliveryStatusUpdateResult> => {
  const delivery = await findDeliveryById(deliveryId);

  if (!delivery) {
    throw new ApiError(404, "Delivery not found", {
      code: "DELIVERY_NOT_FOUND",
    });
  }

  assertDeliveryReadable(actor, delivery);

  if (isDeliveryPartner(actor) && actor.userId !== delivery.partner?.userId) {
    throw new ApiError(403, "Unauthorized", {
      code: "UNAUTHORIZED",
    });
  }

  const transition = evaluateDeliveryTransition(
    delivery.status,
    input.status,
    actor,
  );

  if (!transition.ok) {
    throw new ApiError(409, "Invalid delivery status transition", {
      code: transition.code,
      details: {
        currentStatus: delivery.status,
        nextStatus: input.status,
      },
    });
  }

  if (transition.isNoop) {
    return {
      delivery,
      isNoop: true,
    };
  }

  const updatedDelivery = await updateDeliveryStatusRecord({
    deliveryId,
    status: input.status,
  });

  return {
    delivery: updatedDelivery,
    isNoop: false,
  };
};

export const getDelivery = async (actor: DeliveryActor, deliveryId: string) => {
  const delivery = await findDeliveryById(deliveryId);

  if (!delivery) {
    throw new ApiError(404, "Delivery not found", {
      code: "DELIVERY_NOT_FOUND",
    });
  }

  assertDeliveryReadable(actor, delivery);

  return formatDelivery(delivery);
};
