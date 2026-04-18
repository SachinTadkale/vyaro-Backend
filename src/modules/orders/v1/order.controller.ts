import { Request, Response } from "express";
import asyncHandler from "../../../utils/asyncHandler";
import * as orderService from "../order.service";
import notificationService from "../../notification/notification.service";
import { NotificationEventType } from "../../notification/notification.types";
import { sendEventNotificationEmail } from "../../../lib/email";
import {
  companyOrdersQuerySchema,
  createOrderSchema,
  farmerOrdersQuerySchema,
  orderIdParamSchema,
  validateSchema,
} from "../order.validation";

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const payload = validateSchema(createOrderSchema, req.body);
  const result = await orderService.createOrder(req.user.companyId, payload);
  if (result.notificationPayload) {
    void notificationService.sendNotification(
      NotificationEventType.ORDER_PLACED,
      result.notificationPayload,
    );
  }
  if (result.sellerNotificationPayload?.user?.email) {
    void sendEventNotificationEmail({
      to: result.sellerNotificationPayload.user.email,
      subject: "New order received",
      audience: "USER",
      eventLabel: "New incoming order",
      title: "You have a new order request",
      summary:
        "A company has placed a new order on your listing. Review and accept or reject this request.",
      details: [
        { label: "Order ID", value: result.sellerNotificationPayload.order.id },
        {
          label: "Company",
          value: result.sellerNotificationPayload.company.name,
        },
        {
          label: "Product",
          value: result.sellerNotificationPayload.order.productName,
        },
        {
          label: "Quantity",
          value: `${result.sellerNotificationPayload.order.quantity} ${result.sellerNotificationPayload.order.productUnit}`,
        },
        {
          label: "Total Amount",
          value: result.sellerNotificationPayload.order.totalAmount,
        },
        { label: "Status", value: result.sellerNotificationPayload.order.status },
      ],
      tone: "warning",
    });
  }

  res.status(201).json({
    success: true,
    message: result.message,
    data: result.order,
  });
});

export const getFarmerOrders = asyncHandler(async (req: Request, res: Response) => {
  const query = validateSchema(farmerOrdersQuerySchema, req.query);
  const result = await orderService.getFarmerOrders(req.user.userId, query);

  res.status(200).json({
    success: true,
    ...result,
  });
});

export const getFarmerOrderById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = validateSchema(orderIdParamSchema, req.params);
    const order = await orderService.getFarmerOrderById(req.user.userId, id);

    res.status(200).json({
      success: true,
      data: order,
    });
  },
);

export const getCompanyOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const query = validateSchema(companyOrdersQuerySchema, req.query);
    const result = await orderService.getCompanyOrders(
      req.user.companyId,
      query,
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  },
);

export const getCompanyOrderById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = validateSchema(orderIdParamSchema, req.params);
    const order = await orderService.getCompanyOrderById(
      req.user.companyId,
      id,
    );

    res.status(200).json({
      success: true,
      data: order,
    });
  },
);

export const acceptOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = validateSchema(orderIdParamSchema, req.params);
  const result = await orderService.acceptOrder(req.user.userId, id);
  if (result.notificationPayload) {
    void notificationService.sendNotification(
      NotificationEventType.ORDER_CONFIRMED,
      result.notificationPayload,
    );
  }

  res.status(200).json({
    success: true,
    message: result.message,
    data: result.order,
  });
});

export const rejectOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = validateSchema(orderIdParamSchema, req.params);
  const result = await orderService.rejectOrder(req.user.userId, id);
  if (result.notificationPayload) {
    void notificationService.sendNotification(
      NotificationEventType.ORDER_CANCELLED,
      result.notificationPayload,
    );
  }

  res.status(200).json({
    success: true,
    message: result.message,
    data: result.order,
  });
});

export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = validateSchema(orderIdParamSchema, req.params);
  const result = await orderService.cancelOrder(req.user.companyId, id);
  if (result.notificationPayload) {
    void notificationService.sendNotification(
      NotificationEventType.ORDER_CANCELLED,
      result.notificationPayload,
    );
  }

  res.status(200).json({
    success: true,
    message: result.message,
    data: result.order,
  });
});
