import { z } from "zod";

export const FeaturePlatformSchema = z.enum(["BOTH", "APP", "WEB", "ADMIN"]);
export type FeaturePlatform = z.infer<typeof FeaturePlatformSchema>;

export const FeatureRegistryEntrySchema = z.object({
  key: z.string(),
  enableKey: z.string(),
  visibleKey: z.string(),
  label: z.string(),
  description: z.string(),
  platform: FeaturePlatformSchema,
  routePrefixes: z.array(z.string()),
  defaultEnabled: z.boolean(),
  defaultVisible: z.boolean(),
  roles: z.array(z.string()).optional(),
  dependsOn: z.array(z.string()).optional(),
  category: z.enum(["FEATURE", "CRON", "INTEGRATION", "MAINTENANCE"]).default("FEATURE")
});

export type FeatureRegistryEntry = z.infer<typeof FeatureRegistryEntrySchema>;

export const FEATURE_REGISTRY: Record<string, FeatureRegistryEntry> = {
  marketplace: {
    key: "marketplace",
    enableKey: "ENABLE_MARKETPLACE",
    visibleKey: "VISIBLE_MARKETPLACE",
    label: "Marketplace",
    description: "Allows agricultural listing creation, search, and details",
    platform: "BOTH",
    routePrefixes: ["/api/v1/marketplace"],
    defaultEnabled: true,
    defaultVisible: true,
    category: "FEATURE"
  },
  orders: {
    key: "orders",
    enableKey: "ENABLE_ORDERS",
    visibleKey: "VISIBLE_ORDERS",
    label: "Orders",
    description: "Allows order placement, tracking, and details",
    platform: "BOTH",
    routePrefixes: ["/api/v1/orders"],
    defaultEnabled: true,
    defaultVisible: true,
    dependsOn: ["marketplace"],
    category: "FEATURE"
  },
  payments: {
    key: "payments",
    enableKey: "ENABLE_PAYMENTS",
    visibleKey: "VISIBLE_PAYMENTS",
    label: "Payments",
    description: "Enables online payments, Razorpay checkouts, and transactional queries",
    platform: "BOTH",
    routePrefixes: ["/api/v1/payments"],
    defaultEnabled: true,
    defaultVisible: true,
    category: "FEATURE"
  },
  delivery: {
    key: "delivery",
    enableKey: "ENABLE_DELIVERY",
    visibleKey: "VISIBLE_DELIVERY",
    label: "Delivery",
    description: "Allows delivery assignations, tracking maps, and partner matching",
    platform: "APP",
    routePrefixes: ["/api/v1/deliveries"],
    defaultEnabled: true,
    defaultVisible: true,
    category: "FEATURE"
  },
  marketRates: {
    key: "marketRates",
    enableKey: "ENABLE_MARKET_RATES",
    visibleKey: "VISIBLE_MARKET_RATES",
    label: "Market Intelligence",
    description: "Mandi market rates sync and pricing lists",
    platform: "BOTH",
    routePrefixes: ["/api/v1/market-rates"],
    defaultEnabled: true,
    defaultVisible: true,
    category: "FEATURE"
  },
  ai: {
    key: "ai",
    enableKey: "ENABLE_AI",
    visibleKey: "VISIBLE_AI",
    label: "AI Crop Advisor",
    description: "AI Crop advisor diagnostic and recommendation engine",
    platform: "BOTH",
    routePrefixes: ["/api/v1/ai-advisor"],
    defaultEnabled: false,
    defaultVisible: true,
    category: "FEATURE"
  },
  news: {
    key: "news",
    enableKey: "ENABLE_NEWS",
    visibleKey: "VISIBLE_NEWS",
    label: "Agriculture News",
    description: "Agritech news blogs, alerts, and feeds",
    platform: "BOTH",
    routePrefixes: ["/api/v1/news"],
    defaultEnabled: false,
    defaultVisible: true,
    category: "FEATURE"
  },
  qr: {
    key: "qr",
    enableKey: "ENABLE_QR",
    visibleKey: "VISIBLE_QR",
    label: "QR Sharing",
    description: "QR Code download profiles sharing",
    platform: "BOTH",
    routePrefixes: ["/api/v1/qr"],
    defaultEnabled: false,
    defaultVisible: false,
    category: "FEATURE"
  },
  myCrops: {
    key: "myCrops",
    enableKey: "ENABLE_MY_CROPS",
    visibleKey: "VISIBLE_MY_CROPS",
    label: "My Crops Inventory",
    description: "Farmer active crops yields inventory and trackings",
    platform: "APP",
    routePrefixes: ["/api/v1/farms", "/api/v1/products"],
    defaultEnabled: true,
    defaultVisible: true,
    roles: ["FARMER", "ADMIN", "OWNER"],
    category: "FEATURE"
  },
  transactions: {
    key: "transactions",
    enableKey: "ENABLE_TRANSACTIONS",
    visibleKey: "VISIBLE_TRANSACTIONS",
    label: "Transactions Ledger",
    description: "History of financial operations and invoices",
    platform: "BOTH",
    routePrefixes: ["/api/v1/transactions"],
    defaultEnabled: true,
    defaultVisible: true,
    category: "FEATURE"
  },
  wallet: {
    key: "wallet",
    enableKey: "ENABLE_WALLET",
    visibleKey: "VISIBLE_WALLET",
    label: "User Wallet",
    description: "In-app digital balance, top-ups, and payouts",
    platform: "APP",
    routePrefixes: ["/api/v1/wallet"],
    defaultEnabled: true,
    defaultVisible: true,
    category: "FEATURE"
  },
  notifications: {
    key: "notifications",
    enableKey: "ENABLE_NOTIFICATIONS",
    visibleKey: "VISIBLE_NOTIFICATIONS",
    label: "Notifications System",
    description: "Platform in-app and push notification services",
    platform: "BOTH",
    routePrefixes: ["/api/v1/notifications"],
    defaultEnabled: true,
    defaultVisible: true,
    category: "FEATURE"
  },
  analytics: {
    key: "analytics",
    enableKey: "ENABLE_ANALYTICS",
    visibleKey: "VISIBLE_ANALYTICS",
    label: "Analytics & Reports",
    description: "Insight dashboards and detailed system telemetry",
    platform: "WEB",
    routePrefixes: ["/api/v1/analytics"],
    defaultEnabled: true,
    defaultVisible: true,
    roles: ["ADMIN", "OWNER", "COMPANY"],
    category: "FEATURE"
  },
  admin: {
    key: "admin",
    enableKey: "ENABLE_ADMIN_PORTAL",
    visibleKey: "VISIBLE_ADMIN_PORTAL",
    label: "Admin Portal",
    description: "Administrative operations and system toggles access",
    platform: "ADMIN",
    routePrefixes: ["/api/v1/admin"],
    defaultEnabled: true,
    defaultVisible: true,
    roles: ["ADMIN", "OWNER"],
    category: "FEATURE"
  },
  kyc: {
    key: "kyc",
    enableKey: "ENABLE_KYC_VERIFICATION",
    visibleKey: "VISIBLE_KYC_VERIFICATION",
    label: "KYC Verification",
    description: "Submit and approve legal KYC documents",
    platform: "BOTH",
    routePrefixes: ["/api/v1/kyc-records"],
    defaultEnabled: true,
    defaultVisible: true,
    category: "FEATURE"
  },
  bank: {
    key: "bank",
    enableKey: "ENABLE_BANK_ACCOUNT",
    visibleKey: "VISIBLE_BANK_ACCOUNT",
    label: "Bank Account Setup",
    description: "Setup and manage active bank payout settings",
    platform: "BOTH",
    routePrefixes: ["/api/v1/bank-accounts"],
    defaultEnabled: true,
    defaultVisible: true,
    category: "FEATURE"
  }
};
