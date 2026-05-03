/**
 * Module: Marketplace.controller
 * Purpose: Implements the Marketplace.controller module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { Request, Response } from "express";
import asyncHandler from "../../../utils/asyncHandler";
import * as marketplaceService from "../marketplace.service";
import notificationService from "../../notification/notification.service";
import { NotificationEventType } from "../../notification/notification.types";
import {
  createListingSchema,
  listingGeoQuerySchema,
  listingIdParamSchema,
  marketplaceListingsQuerySchema,
  myListingsQuerySchema,
  updateListingSchema,
  validateSchema,
} from "../marketplace.validator";

/**
 * Create Listing.
 */
export const createListing = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = validateSchema(createListingSchema, req.body);
    const result = await marketplaceService.createListing(
      req.user.userId,
      payload,
    );
    if (result.notificationPayload) {
      void notificationService.sendNotification(
        NotificationEventType.LISTING_CREATED,
        result.notificationPayload,
      );
    }

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.listing,
    });
  },
);

/**
 * Get Marketplace Listings.
 */
export const getMarketplaceListings = asyncHandler(
  async (req: Request, res: Response) => {
    const query = validateSchema(marketplaceListingsQuerySchema, req.query);
    const result = await marketplaceService.getMarketplaceListings(query);

    res.status(200).json({
      success: true,
      ...result,
    });
  },
);

/**
 * Get Single Listing.
 */
export const getSingleListing = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = validateSchema(listingIdParamSchema, req.params);
    const geoQuery = validateSchema(listingGeoQuerySchema, req.query);
    const listing = await marketplaceService.getListingById(id, {
      userId: req.user.userId,
      actorType: req.user.actorType,
    }, geoQuery);

    res.status(200).json({
      success: true,
      data: listing,
    });
  },
);

/**
 * Update Listing.
 */
export const updateListing = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = validateSchema(listingIdParamSchema, req.params);
    const payload = validateSchema(updateListingSchema, req.body);
    const result = await marketplaceService.updateListing(
      id,
      req.user.userId,
      payload,
    );

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.listing,
    });
  },
);

/**
 * Delete Listing.
 */
export const deleteListing = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = validateSchema(listingIdParamSchema, req.params);
    const result = await marketplaceService.deleteListing(id, req.user.userId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  },
);

/**
 * Get My Listings.
 */
export const getMyListings = asyncHandler(
  async (req: Request, res: Response) => {
    const query = validateSchema(myListingsQuerySchema, req.query);
    const result = await marketplaceService.getMyListings(
      req.user.userId,
      query,
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  },
);
