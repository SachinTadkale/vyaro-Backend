# Broadcast System

## Overview

The Broadcast module provides centralized admin-to-user communication for Farmzy across web and mobile clients. It is designed for in-app visibility first, with optional side-channel delivery for high-priority messages.

Broadcasts are not tied to transactional email rendering. They are a separate domain module with their own storage, filtering, UI metadata mapping, and lifecycle rules.

## Purpose

This module exists so Farmzy admins can communicate platform-wide updates in a structured and scalable way:

- Announce product updates
- Publish maintenance windows
- Send critical alerts
- Highlight success news
- Target specific audiences without duplicating client logic

## Architecture

The module follows the repo’s modular monolith pattern:

- `broadcast.controller.ts`
  Handles HTTP requests/responses
- `broadcast.service.ts`
  Applies validation, scheduling rules, filtering logic, and side effects
- `broadcast.repository.ts`
  Encapsulates all Prisma access
- `broadcast.mapper.ts`
  Maps broadcast type to UI metadata and API response shape
- `broadcast.types.ts`
  Defines shared input/output types
- `broadcast.routes.ts`
  Exposes admin and authenticated-user endpoints

## Database Schema

Prisma enums:

- `BroadcastType`
  - `UPDATE`
  - `IMPORTANT`
  - `MAINTENANCE`
  - `ALERT`
  - `SUCCESS`
- `TargetAudience`
  - `ALL`
  - `USER`
  - `COMPANY`
  - `DELIVERY_PARTNER`

Prisma model:

```prisma
model Broadcast {
  id             String          @id @default(uuid())
  title          String
  message        String
  type           BroadcastType
  targetAudience TargetAudience
  isActive       Boolean         @default(true)
  publishAt      DateTime
  expiresAt      DateTime?
  createdBy      String
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  imageUrl       String?
  ctaLabel       String?
  ctaLink        String?
}
```

## Visibility Rules

Active broadcasts must satisfy all of the following:

- `isActive = true`
- `publishAt <= now`
- `expiresAt IS NULL OR expiresAt > now`
- `targetAudience` matches the authenticated actor or `ALL`

Audience resolution:

- Delivery partner: `ALL`, `DELIVERY_PARTNER`
- Company: `ALL`, `COMPANY`
- User: `ALL`, `USER`
- Admin preview: `ALL`

## UI Mapping

Admins only choose the broadcast `type`. The system automatically returns the UI metadata.

| Type | Icon | Color | Priority | Behavior |
| --- | --- | --- | --- | --- |
| `UPDATE` | `megaphone` | `#4E6F3D` | `1` | `FEED` |
| `SUCCESS` | `check-circle` | `#2F855A` | `2` | `HIGHLIGHTED_FEED` |
| `IMPORTANT` | `bell` | `#7ED957` | `3` | `BANNER` |
| `MAINTENANCE` | `wrench` | `#D69E2E` | `4` | `WARNING_BANNER` |
| `ALERT` | `alert-triangle` | `#E53E3E` | `5` | `POPUP` |

Sorting for active feed:

1. Higher priority first
2. Newer `createdAt` first

## Notification Integration

Broadcasts are separate from email rendering, but can trigger downstream channels:

- `IMPORTANT`
  - Push dispatch is queued as a non-blocking side effect placeholder
- `ALERT`
  - Push dispatch is queued as a non-blocking side effect placeholder
  - Email fan-out is triggered asynchronously through the Notification module

Current implementation intentionally keeps email fan-out out of the request/response path. For very large scale, this should move to a queue worker.

## APIs

Base path:

```http
/api/broadcasts
```

### Admin: Create Broadcast

```http
POST /api/broadcasts
Authorization: Bearer <admin-token>
Content-Type: application/json
```

Request:

```json
{
  "title": "Scheduled maintenance window",
  "message": "Farmzy services will undergo maintenance on Sunday from 2:00 AM to 4:00 AM IST.",
  "type": "MAINTENANCE",
  "targetAudience": "ALL",
  "publishAt": "2026-04-18T02:00:00.000Z",
  "expiresAt": "2026-04-18T04:00:00.000Z",
  "ctaLabel": "View Status",
  "ctaLink": "https://status.farmzy.com"
}
```

Response:

```json
{
  "success": true,
  "message": "Broadcast created successfully",
  "data": {
    "id": "uuid",
    "title": "Scheduled maintenance window",
    "message": "Farmzy services will undergo maintenance on Sunday from 2:00 AM to 4:00 AM IST.",
    "type": "MAINTENANCE",
    "targetAudience": "ALL",
    "isActive": true,
    "publishAt": "2026-04-18T02:00:00.000Z",
    "expiresAt": "2026-04-18T04:00:00.000Z",
    "createdBy": "admin-user-id",
    "createdAt": "2026-04-17T10:00:00.000Z",
    "updatedAt": "2026-04-17T10:00:00.000Z",
    "imageUrl": null,
    "ctaLabel": "View Status",
    "ctaLink": "https://status.farmzy.com",
    "ui": {
      "icon": "wrench",
      "color": "#D69E2E",
      "priority": 4,
      "behavior": "WARNING_BANNER"
    }
  }
}
```

### Admin: List Broadcasts

```http
GET /api/broadcasts?type=ALERT&isActive=true
Authorization: Bearer <admin-token>
```

### Admin: Update Broadcast

```http
PATCH /api/broadcasts/:id
Authorization: Bearer <admin-token>
Content-Type: application/json
```

Request:

```json
{
  "title": "Updated maintenance notice",
  "expiresAt": "2026-04-18T06:00:00.000Z"
}
```

### Admin: Soft Delete Broadcast

```http
DELETE /api/broadcasts/:id
Authorization: Bearer <admin-token>
```

Soft delete behavior:

- Sets `isActive = false`
- Keeps record for audit/history

### User: Fetch Active Broadcasts

```http
GET /api/broadcasts/active
Authorization: Bearer <user-or-company-or-delivery-token>
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Platform alert",
      "message": "Unexpected downtime has been detected in one region.",
      "type": "ALERT",
      "targetAudience": "ALL",
      "isActive": true,
      "publishAt": "2026-04-17T10:00:00.000Z",
      "expiresAt": null,
      "createdBy": "admin-user-id",
      "createdAt": "2026-04-17T10:00:00.000Z",
      "updatedAt": "2026-04-17T10:00:00.000Z",
      "imageUrl": null,
      "ctaLabel": "View details",
      "ctaLink": "https://status.farmzy.com",
      "ui": {
        "icon": "alert-triangle",
        "color": "#E53E3E",
        "priority": 5,
        "behavior": "POPUP"
      }
    }
  ]
}
```

## Business Rules

- Title must be at least 3 characters
- Message must be at least 10 characters
- `ctaLabel` and `ctaLink` must be provided together
- `expiresAt` must be later than `publishAt`
- `publishAt` defaults to `now()` when omitted during create

## Example Usage

### Create a success update for companies

```json
{
  "title": "New analytics dashboard available",
  "message": "Company users can now track procurement metrics in the new analytics dashboard.",
  "type": "SUCCESS",
  "targetAudience": "COMPANY",
  "ctaLabel": "Open Dashboard",
  "ctaLink": "https://app.farmzy.com/company/analytics"
}
```

### Create a critical alert for all users

```json
{
  "title": "Temporary payment disruption",
  "message": "Some Razorpay transactions are delayed. Our team is actively monitoring the issue.",
  "type": "ALERT",
  "targetAudience": "ALL",
  "ctaLabel": "Check Status",
  "ctaLink": "https://status.farmzy.com"
}
```

## Scalability Notes

Current design is ready for modular growth:

- In-app retrieval is query-based, not fan-out based
- Email side effects for alerts are asynchronous
- Recipient fan-out is chunked in batches
- UI behavior is type-driven and frontend-friendly

Recommended next steps for large-scale production:

- Move alert email dispatch to a queue worker
- Add push provider integration
- Add per-user read state
- Add analytics for impressions and clicks
- Add audience segmentation beyond role-based targeting
- Add localization / multilingual support
- Add SMS fallback for critical incidents
