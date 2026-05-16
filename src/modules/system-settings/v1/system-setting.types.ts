/**
 * System Setting Keys — All known runtime control keys.
 * Using this enum prevents magic strings across the codebase.
 */
export enum SystemSettingKey {
  // ── Features (API-level toggles) ──────────────────────
  ENABLE_MARKETPLACE          = "ENABLE_MARKETPLACE",
  ENABLE_ORDERS               = "ENABLE_ORDERS",
  ENABLE_PAYMENTS             = "ENABLE_PAYMENTS",
  ENABLE_DELIVERY             = "ENABLE_DELIVERY",
  ENABLE_MARKET_RATES         = "ENABLE_MARKET_RATES",
  ENABLE_AI                   = "ENABLE_AI",
  ENABLE_NEWS                 = "ENABLE_NEWS",
  ENABLE_QR                   = "ENABLE_QR",
  ENABLE_MY_CROPS             = "ENABLE_MY_CROPS",

  // ── UI Visibility (frontend-level toggles) ────────────
  // visible=false  → hide entirely from nav/home
  // visible=true   → show (enabled state controls interaction)
  VISIBLE_MARKETPLACE         = "VISIBLE_MARKETPLACE",
  VISIBLE_ORDERS              = "VISIBLE_ORDERS",
  VISIBLE_MARKET_RATES        = "VISIBLE_MARKET_RATES",
  VISIBLE_AI                  = "VISIBLE_AI",
  VISIBLE_NEWS                = "VISIBLE_NEWS",
  VISIBLE_QR                  = "VISIBLE_QR",
  VISIBLE_DELIVERY            = "VISIBLE_DELIVERY",
  VISIBLE_MY_CROPS            = "VISIBLE_MY_CROPS",

  // ── Cron Jobs ─────────────────────────────────────────
  ENABLE_DELIVERY_CRON        = "ENABLE_DELIVERY_CRON",
  ENABLE_MARKET_RATE_CRON     = "ENABLE_MARKET_RATE_CRON",
  ENABLE_NOTIFICATION_CRON    = "ENABLE_NOTIFICATION_CRON",
  ENABLE_CLEANUP_CRON         = "ENABLE_CLEANUP_CRON",

  // ── Integrations ──────────────────────────────────────
  ENABLE_EMAIL_SERVICE        = "ENABLE_EMAIL_SERVICE",
  ENABLE_PUSH_NOTIFICATIONS   = "ENABLE_PUSH_NOTIFICATIONS",
  ENABLE_GOV_MARKET_API       = "ENABLE_GOV_MARKET_API",
  ENABLE_CLOUDINARY           = "ENABLE_CLOUDINARY",

  // ── Maintenance ───────────────────────────────────────
  MAINTENANCE_MODE            = "MAINTENANCE_MODE",
  READ_ONLY_MODE              = "READ_ONLY_MODE",
  DISABLE_REGISTRATIONS       = "DISABLE_REGISTRATIONS",
}

/** Default seed definitions for all known settings */
export const DEFAULT_SETTINGS: Array<{
  key: SystemSettingKey;
  value: string;
  displayName: string;
  description: string;
  category: "FEATURE" | "CRON" | "INTEGRATION" | "MAINTENANCE";
  groupKey: string;
  isCritical: boolean;
}> = [
  // ── Feature toggles (API-level) ─────────────────────────────────────────────
  { key: SystemSettingKey.ENABLE_MARKETPLACE,       value: "true",  displayName: "Marketplace",             description: "Allow marketplace listing and browsing",         category: "FEATURE",     groupKey: "FEATURE",      isCritical: true  },
  { key: SystemSettingKey.ENABLE_ORDERS,            value: "true",  displayName: "Orders",                  description: "Allow order creation and management",            category: "FEATURE",     groupKey: "FEATURE",      isCritical: true  },
  { key: SystemSettingKey.ENABLE_PAYMENTS,          value: "true",  displayName: "Payments",                description: "Allow payment processing and Razorpay webhooks", category: "FEATURE",     groupKey: "FEATURE",      isCritical: true  },
  { key: SystemSettingKey.ENABLE_DELIVERY,          value: "true",  displayName: "Delivery",                description: "Allow delivery assignment and tracking",         category: "FEATURE",     groupKey: "FEATURE",      isCritical: false },
  { key: SystemSettingKey.ENABLE_MARKET_RATES,      value: "true",  displayName: "Market Intelligence",     description: "Allow mandi pricing and analytics access",       category: "FEATURE",     groupKey: "FEATURE",      isCritical: false },
  { key: SystemSettingKey.ENABLE_AI,                value: "false", displayName: "AI Features",             description: "Enable AI recommendation engine",                category: "FEATURE",     groupKey: "FEATURE",      isCritical: false },
  { key: SystemSettingKey.ENABLE_NEWS,              value: "false", displayName: "News Module",             description: "Enable agriculture news feed",                   category: "FEATURE",     groupKey: "FEATURE",      isCritical: false },
  { key: SystemSettingKey.ENABLE_QR,                value: "false", displayName: "QR Sharing",              description: "Enable QR code profile sharing",                 category: "FEATURE",     groupKey: "FEATURE",      isCritical: false },
  { key: SystemSettingKey.ENABLE_MY_CROPS,          value: "true",  displayName: "My Crops",                description: "Allow farmers to manage their crop inventory",   category: "FEATURE",     groupKey: "FEATURE",      isCritical: true  },

  // ── UI Visibility toggles (frontend-level) ──────────────────────────────────
  { key: SystemSettingKey.VISIBLE_MARKETPLACE,      value: "true",  displayName: "Show Marketplace in UI",  description: "Show/hide marketplace in navigation and home",         category: "FEATURE", groupKey: "UI_VISIBILITY", isCritical: false },
  { key: SystemSettingKey.VISIBLE_ORDERS,           value: "true",  displayName: "Show Orders in UI",       description: "Show/hide orders in navigation and home",              category: "FEATURE", groupKey: "UI_VISIBILITY", isCritical: false },
  { key: SystemSettingKey.VISIBLE_MARKET_RATES,     value: "true",  displayName: "Show Market Rates in UI", description: "Show/hide mandi rates in navigation and home",         category: "FEATURE", groupKey: "UI_VISIBILITY", isCritical: false },
  { key: SystemSettingKey.VISIBLE_AI,               value: "true",  displayName: "Show AI in UI",           description: "Show AI as coming-soon in navigation",                 category: "FEATURE", groupKey: "UI_VISIBILITY", isCritical: false },
  { key: SystemSettingKey.VISIBLE_NEWS,             value: "true",  displayName: "Show News in UI",         description: "Show news as coming-soon in navigation",               category: "FEATURE", groupKey: "UI_VISIBILITY", isCritical: false },
  { key: SystemSettingKey.VISIBLE_QR,               value: "false", displayName: "Show QR in UI",           description: "Show/hide QR profile sharing button",                  category: "FEATURE", groupKey: "UI_VISIBILITY", isCritical: false },
  { key: SystemSettingKey.VISIBLE_DELIVERY,         value: "true",  displayName: "Show Delivery in UI",     description: "Show/hide delivery tracking for delivery partners",     category: "FEATURE", groupKey: "UI_VISIBILITY", isCritical: false },
  { key: SystemSettingKey.VISIBLE_MY_CROPS,         value: "true",  displayName: "Show My Crops in UI",     description: "Show/hide My Crops in home screen quick actions",        category: "FEATURE", groupKey: "UI_VISIBILITY", isCritical: false },

  // ── Cron Jobs ────────────────────────────────────────────────────────────────
  { key: SystemSettingKey.ENABLE_DELIVERY_CRON,     value: "true",  displayName: "Delivery Expiry Cron",    description: "Marks stale delivery assignments as expired (runs every 30 min)", category: "CRON", groupKey: "CRON", isCritical: false },
  { key: SystemSettingKey.ENABLE_MARKET_RATE_CRON,  value: "true",  displayName: "Market Rate Sync Cron",   description: "Syncs official mandi prices from Data.gov.in (runs daily at 6 AM)", category: "CRON", groupKey: "CRON", isCritical: false },
  { key: SystemSettingKey.ENABLE_NOTIFICATION_CRON, value: "false", displayName: "Notification Cron",       description: "Scheduled push notification delivery (not yet built)",            category: "CRON", groupKey: "CRON", isCritical: false },
  { key: SystemSettingKey.ENABLE_CLEANUP_CRON,      value: "false", displayName: "Cleanup Cron",            description: "Cleanup expired OTPs and stale records (not yet built)",          category: "CRON", groupKey: "CRON", isCritical: false },

  // ── Integrations ─────────────────────────────────────────────────────────────
  { key: SystemSettingKey.ENABLE_EMAIL_SERVICE,     value: "true",  displayName: "Email Service (SMTP)",    description: "Enable transactional email via Gmail SMTP",    category: "INTEGRATION", groupKey: "INTEGRATION", isCritical: false },
  { key: SystemSettingKey.ENABLE_PUSH_NOTIFICATIONS,value: "false", displayName: "Push Notifications",      description: "Enable FCM push notifications (not yet built)", category: "INTEGRATION", groupKey: "INTEGRATION", isCritical: false },
  { key: SystemSettingKey.ENABLE_GOV_MARKET_API,    value: "true",  displayName: "Govt Market API",         description: "Sync live mandi prices from Data.gov.in",      category: "INTEGRATION", groupKey: "INTEGRATION", isCritical: false },
  { key: SystemSettingKey.ENABLE_CLOUDINARY,        value: "true",  displayName: "Cloudinary Uploads",      description: "Enable image/document upload via Cloudinary",  category: "INTEGRATION", groupKey: "INTEGRATION", isCritical: false },

  // ── Maintenance ──────────────────────────────────────────────────────────────
  { key: SystemSettingKey.MAINTENANCE_MODE,         value: "false", displayName: "Maintenance Mode",        description: "Blocks ALL non-owner API access. Use with extreme caution.", category: "MAINTENANCE", groupKey: "MAINTENANCE", isCritical: true },
  { key: SystemSettingKey.READ_ONLY_MODE,           value: "false", displayName: "Read-only Mode",          description: "Blocks all write operations across the platform",             category: "MAINTENANCE", groupKey: "MAINTENANCE", isCritical: true },
  { key: SystemSettingKey.DISABLE_REGISTRATIONS,    value: "false", displayName: "Disable Registrations",   description: "Prevents new user and company registrations",                 category: "MAINTENANCE", groupKey: "MAINTENANCE", isCritical: false },
];

/** Default seed definitions for route toggles */
export const DEFAULT_ROUTE_TOGGLES: Array<{
  method: string;
  path: string;
  enabled: boolean;
  displayName: string;
  description: string;
  groupKey: string;
  moduleKey: string;
  isCritical: boolean;
}> = [
  // ── Auth Module ─────────────────────────────────────────────────────────────
  { method: "POST", path: "/api/v1/auth/user/login",       enabled: true, displayName: "User Login",               description: "Authenticate Farmer/Delivery user", groupKey: "AUTH", moduleKey: "AUTH", isCritical: true },
  { method: "POST", path: "/api/v1/auth/user/register",    enabled: true, displayName: "User Registration",        description: "Register new users",             groupKey: "AUTH", moduleKey: "AUTH", isCritical: false },
  { method: "POST", path: "/api/v1/auth/company/login",    enabled: true, displayName: "Company Login",            description: "Authenticate Company user",      groupKey: "AUTH", moduleKey: "AUTH", isCritical: true },
  { method: "POST", path: "/api/v1/auth/admin/login",      enabled: true, displayName: "Admin Login",              description: "Authenticate Admin user",        groupKey: "AUTH", moduleKey: "AUTH", isCritical: true },

  // ── App Config ──────────────────────────────────────────────────────────────
  { method: "GET",  path: "/api/v1/app-config",            enabled: true, displayName: "App Config",               description: "Get runtime config for frontend",groupKey: "SYSTEM", moduleKey: "SYSTEM", isCritical: true },

  // ── Marketplace Module ──────────────────────────────────────────────────────
  { method: "GET",  path: "/api/v1/marketplace/listings",  enabled: true, displayName: "View Listings",            description: "Browse marketplace listings",    groupKey: "MARKETPLACE", moduleKey: "MARKETPLACE", isCritical: false },
  { method: "POST", path: "/api/v1/marketplace/listings",  enabled: true, displayName: "Create Listing",           description: "Create new product listing",     groupKey: "MARKETPLACE", moduleKey: "MARKETPLACE", isCritical: false },

  // ── Orders Module ───────────────────────────────────────────────────────────
  { method: "POST", path: "/api/v1/orders",                enabled: true, displayName: "Create Order",             description: "Place a new order",              groupKey: "ORDERS", moduleKey: "ORDERS", isCritical: false },
  { method: "GET",  path: "/api/v1/orders",                enabled: true, displayName: "Get Orders",               description: "Retrieve user orders",           groupKey: "ORDERS", moduleKey: "ORDERS", isCritical: false },
  { method: "GET",  path: "/api/v1/orders/history",        enabled: true, displayName: "Order History",            description: "Retrieve order history",         groupKey: "ORDERS", moduleKey: "ORDERS", isCritical: false },

  // ── Market Rates Module ─────────────────────────────────────────────────────
  { method: "GET",  path: "/api/v1/market-rates",          enabled: true, displayName: "Get Market Rates",         description: "Retrieve mandi market rates",    groupKey: "MARKET_RATES", moduleKey: "MARKET_RATES", isCritical: false },

  // ── Delivery Module ─────────────────────────────────────────────────────────
  { method: "GET",  path: "/api/v1/deliveries",            enabled: true, displayName: "Get Deliveries",           description: "Retrieve all deliveries",        groupKey: "DELIVERY", moduleKey: "DELIVERY", isCritical: false },
  { method: "PATCH",path: "/api/v1/deliveries/status",     enabled: true, displayName: "Update Delivery Status",   description: "Update status of a delivery",    groupKey: "DELIVERY", moduleKey: "DELIVERY", isCritical: false },

  // ── Payments Module ─────────────────────────────────────────────────────────
  { method: "POST", path: "/api/v1/payments/intent",       enabled: true, displayName: "Create Payment Intent",    description: "Initialize payment process",     groupKey: "PAYMENTS", moduleKey: "PAYMENTS", isCritical: false },
  { method: "POST", path: "/api/v1/payments/verify",       enabled: true, displayName: "Verify Payment",           description: "Verify completed payment",       groupKey: "PAYMENTS", moduleKey: "PAYMENTS", isCritical: true },

  // ── Users & KYC Module ──────────────────────────────────────────────────────
  { method: "GET",  path: "/api/v1/users/profile",         enabled: true, displayName: "User Profile",             description: "Get user profile details",       groupKey: "USERS", moduleKey: "USERS", isCritical: false },
  { method: "POST", path: "/api/v1/kyc-records",           enabled: true, displayName: "Submit KYC",               description: "Submit KYC documents",           groupKey: "USERS", moduleKey: "USERS", isCritical: false },

  // ── Farms & Products Module ─────────────────────────────────────────────────
  { method: "GET",  path: "/api/v1/farms",                 enabled: true, displayName: "Get Farms",                description: "Retrieve user farms",            groupKey: "FARMS", moduleKey: "FARMS", isCritical: false },
  { method: "POST", path: "/api/v1/farms",                 enabled: true, displayName: "Create Farm",              description: "Register a new farm",            groupKey: "FARMS", moduleKey: "FARMS", isCritical: false },
  { method: "GET",  path: "/api/v1/products",              enabled: true, displayName: "Get Products",             description: "Retrieve platform products",     groupKey: "PRODUCTS", moduleKey: "PRODUCTS", isCritical: false },
];

/** Redis cache key prefix for system settings */
export const CACHE_PREFIX_SETTING   = "SYSSET:";
/** Redis cache key prefix for route toggles */
export const CACHE_PREFIX_ROUTE     = "ROUTE:";
/** Redis cache key for the full app-config blob */
export const APPCONFIG_CACHE_KEY    = "APPCONFIG:v1";
/** TTL for per-setting cached values in seconds */
export const CACHE_TTL_SECONDS      = 60;
/** TTL for the app-config blob (5 minutes) */
export const APPCONFIG_CACHE_TTL    = 300;
