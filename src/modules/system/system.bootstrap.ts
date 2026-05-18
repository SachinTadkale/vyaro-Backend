import prisma from "../../config/prisma";
import {
  DEFAULT_SETTINGS,
  DEFAULT_ROUTE_TOGGLES,
} from "../system-settings/v1/system-setting.types";
import { systemSettingsService } from "../system-settings/v1/system-setting.service";
import { CreatedSource, UserRole, RestrictionSeverity } from "@prisma/client";

export const SYSTEM_REGISTRY_VERSION = 1;

async function initializeSystemSettings() {
  let createdCount = 0;
  for (const setting of DEFAULT_SETTINGS) {
    const existing = await prisma.systemSetting.findUnique({
      where: { key: setting.key },
    });

    if (!existing) {
      try {
        await prisma.systemSetting.create({
          data: {
            key: setting.key,
            value: setting.value,
            displayName: setting.displayName,
            description: setting.description,
            category: setting.category,

            groupKey: setting.groupKey,
            isCritical: setting.isCritical,
            isSeededBySystem: true,
            createdSource: CreatedSource.SYSTEM_BOOTSTRAP,
          },
        });
        createdCount++;
      } catch (error: any) {
        if (error.code === "P2002") {
          // Ignored: Row was created concurrently by a parallel thread or dev server hot-reload
        } else {
          throw error;
        }
      }
    }
  }
  if (createdCount > 0) {
    console.log(
      `✅ SystemSettings: bootstrapped ${createdCount} new defaults.`,
    );
  }
}

async function initializeRouteToggles() {
  let createdCount = 0;
  for (const route of DEFAULT_ROUTE_TOGGLES) {
    const method = route.method.toUpperCase();
    const path = route.path.toLowerCase().replace(/\/+$/, "");

    const existing = await prisma.routeToggle.findUnique({
      where: { method_path: { method, path } },
    });

    if (!existing) {
      try {
        await prisma.routeToggle.create({
          data: {
            method,
            path,
            enabled: route.enabled,
            displayName: route.displayName,
            description: route.description,
            groupKey: route.groupKey,
            moduleKey: route.moduleKey,
            isCritical: route.isCritical,
            isSeededBySystem: true,
            createdSource: CreatedSource.SYSTEM_BOOTSTRAP,
          },
        });
        createdCount++;
      } catch (error: any) {
        if (error.code === "P2002") {
          // Ignored: Row was created concurrently by a parallel thread or dev server hot-reload
        } else {
          throw error;
        }
      }
    }
  }
  if (createdCount > 0) {
    console.log(`✅ RouteToggles: bootstrapped ${createdCount} new defaults.`);
  }
}

async function initializeAiWrappers() {
  const coreRules = `You are Saira AI, a concise enterprise operations assistant for FarmZy.

Rules:
- Keep responses short and actionable.
- Never explain AI limitations unless explicitly asked.
- Never mention being an AI model.
- Never output multilingual corruption or broken unicode.
- Use professional English only.
- Keep responses under 100 words unless detailed explanation is requested.
- Avoid repetition.
- Avoid motivational filler text.
- Use bullet points when useful.
- Focus only on the user's actual question.
- Prioritize clarity and actionable insights.

If dashboard/app context is provided:
- use it naturally
- summarize insights briefly
- suggest next steps when appropriate

Never hallucinate platform data.`;

  const defaultWrappers = [
    {
      key: "farmer_advisor",
      name: "Saira AI Farmer Advisor",
      description:
        "Localized agricultural crop advice, mandi prices, and weather forecasting",
      role: "FARMER",
      systemPrompt: `${coreRules}\n\nRole-specific target: Assist the farmer with crop advisory, biological disease prevention, weather precautions, and local mandi pricing trends. Context: {{DYNAMIC_CONTEXT}}`,
      provider: "GEMINI",
      modelName: "gemini-2.5-flash-lite",
      temperature: 0.3,
      maxTokens: 180,
      requiredContexts: ["USER_PROFILE", "WEATHER", "MARKET_RATES"],
    },
    {
      key: "company_procurement",
      name: "Saira AI Procurement Advisor",
      description: "Procurement intelligence and supplier negotiation advisory",
      role: "COMPANY",
      systemPrompt: `${coreRules}\n\nRole-specific target: Assist the corporate buyer/company procurement team with pricing trends, regional mandi procurement options, supplier risk, and order logs. Context: {{DYNAMIC_CONTEXT}}`,
      provider: "GEMINI",
      modelName: "gemini-2.5-flash-lite",
      temperature: 0.3,
      maxTokens: 180,
      requiredContexts: ["USER_PROFILE", "MARKET_RATES"],
    },
    {
      key: "delivery_logistics",
      name: "Saira AI Logistics Advisor",
      description: "Logistics routing and weather advisory for delivery agents",
      role: "DELIVERY_PARTNER",
      systemPrompt: `${coreRules}\n\nRole-specific target: Assist the delivery partner/transporter with routing safety, active weather anomalies, fuel efficiency, and active logistics tasks. Context: {{DYNAMIC_CONTEXT}}`,
      provider: "GEMINI",
      modelName: "gemini-2.5-flash-lite",
      temperature: 0.3,
      maxTokens: 180,
      requiredContexts: ["USER_PROFILE", "WEATHER"],
    },
    {
      key: "admin_optimizer",
      name: "Saira AI Admin Platform Advisor",
      description:
        "Anomalies lookup and systems auditing advisory for admins and owners",
      role: "ADMIN",
      systemPrompt: `${coreRules}\n\nRole-specific target: Assist the platform owner or system administrator with system health audits, transaction fraud metrics, disputed orders, and operational anomalies. Context: {{DYNAMIC_CONTEXT}}`,
      provider: "GEMINI",
      modelName: "gemini-2.5-flash-lite",
      temperature: 0.3,
      maxTokens: 180,
      requiredContexts: ["USER_PROFILE"],
    },
  ];

  let seededCount = 0;
  for (const wrapper of defaultWrappers) {
    const existing = await prisma.aiWrapper.findFirst({
      where: { key: wrapper.key, deletedAt: null },
    });

    try {
      if (existing) {
        // Dynamic auto-sync: updates prompts, models, and optimized token/temp parameters
        await prisma.aiWrapper.update({
          where: { id: existing.id },
          data: {
            systemPrompt: wrapper.systemPrompt,
            modelName: wrapper.modelName,
            temperature: wrapper.temperature,
            maxTokens: wrapper.maxTokens,
            provider: wrapper.provider as any,
          },
        });
        seededCount++;
      } else {
        await prisma.aiWrapper.create({
          data: {
            key: wrapper.key,
            name: wrapper.name,
            description: wrapper.description,
            systemPrompt: wrapper.systemPrompt,
            provider: wrapper.provider as any,
            modelName: wrapper.modelName,
            temperature: wrapper.temperature,
            maxTokens: wrapper.maxTokens,
            allowedRoles: [wrapper.role],
            contextConfig: wrapper.requiredContexts,
            badgeConfig: [],
            moderationConfig: {},
            responseConfig: {},
            status: "ACTIVE",
          },
        });
        seededCount++;
      }
    } catch (error: any) {
      if (error.code === "P2002") {
        // Ignored: Row was created concurrently by a parallel thread or dev server hot-reload
      } else {
        throw error;
      }
    }
  }

  if (seededCount > 0) {
    console.log(
      `✅ AI Platform: synchronized/seeded ${seededCount} Saira AI default wrappers.`,
    );
  }
}

export async function bootstrapRuntimeControls() {
  console.log(
    `🚀 Starting Runtime Control Bootstrap (Registry v${SYSTEM_REGISTRY_VERSION})`,
  );

  try {
    await initializeSystemSettings();
    await initializeRouteToggles();
    await initializeAiWrappers();
    await initializeAiGovernance();

    // Sync Redis
    await systemSettingsService.refreshSettingsCache();

    // Warm-up and pre-hydrate the memory cache (Refinement #7)
    await systemSettingsService.hydrateCacheOnStartup();

    console.log(
      `✅ Runtime Controls Bootstrapped & Redis Synced successfully.`,
    );
  } catch (error) {
    console.error("❌ Failed to bootstrap runtime controls:", error);
    throw error;
  }
}

// ─── AI Governance Bootstrap ──────────────────────────────────────────────────

async function initializeAiGovernance() {
  await seedDefaultQuotas();
  await seedDefaultRestrictionCodes();
}

/**
 * Seeds default monthly token quotas per role.
 * User-level quotas override these. Idempotent — skips if already seeded.
 */
async function seedDefaultQuotas() {
  const nextMonthReset = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 1);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const defaults: { role: UserRole; monthlyTokenLimit: number; isUnlimited: boolean }[] = [
    { role: UserRole.OWNER,            monthlyTokenLimit: 500_000, isUnlimited: true  },
    { role: UserRole.ADMIN,            monthlyTokenLimit: 100_000, isUnlimited: false },
    { role: UserRole.COMPANY,          monthlyTokenLimit: 200_000, isUnlimited: false },
    { role: UserRole.FARMER,           monthlyTokenLimit:  50_000, isUnlimited: false },
    { role: UserRole.DELIVERY_PARTNER, monthlyTokenLimit:  30_000, isUnlimited: false },
  ];

  let seeded = 0;
  for (const def of defaults) {
    const exists = await prisma.aIQuota.findFirst({
      where: { role: def.role, userId: null },
    });
    if (!exists) {
      await prisma.aIQuota.create({
        data: {
          role: def.role,
          monthlyTokenLimit: def.monthlyTokenLimit,
          isUnlimited: def.isUnlimited,
          usedTokens: 0,
          resetAt: nextMonthReset(),
        },
      });
      seeded++;
    } else if (exists.monthlyTokenLimit !== def.monthlyTokenLimit) {
      await prisma.aIQuota.update({
        where: { id: exists.id },
        data: { monthlyTokenLimit: def.monthlyTokenLimit },
      });
      seeded++;
    }
  }
  if (seeded > 0) {
    console.log(`✅ AI Governance: seeded/updated ${seeded} default role quotas.`);
  }
}

/**
 * Seeds the system's built-in restriction code registry.
 * These codes are used for structured AI access control.
 * Requires an OWNER account to exist — skips gracefully if none found.
 */
async function seedDefaultRestrictionCodes() {
  const owner = await prisma.user.findFirst({
    where: { role: UserRole.OWNER },
    select: { user_id: true },
  });

  if (!owner) return; // No owner yet — will be seeded on next restart

  const codes = [
    {
      code: "AI-FREE-TIER",
      title: "Free Subscription Tier Override",
      description: "Limits monthly Saira AI token quota allocation to 5,000 tokens.",
      severity: RestrictionSeverity.INFO,
      httpStatus: 200,
    },
    {
      code: "AI-LIMITED-ACCESS",
      title: "Limited Access Tier Override",
      description: "Limits monthly Saira AI token quota allocation to 15,000 tokens.",
      severity: RestrictionSeverity.WARNING,
      httpStatus: 200,
    },
    {
      code: "AI-4001",
      title: "Standard Quota Limit Reached",
      description: "AI monthly token limit reached. Standard quota has been exhausted.",
      severity: RestrictionSeverity.BLOCK,
      httpStatus: 429,
    },
    {
      code: "AI-4002",
      title: "Manual Control Restriction",
      description: "AI copilot features have been restricted by the platform administrator.",
      severity: RestrictionSeverity.BLOCK,
      httpStatus: 403,
    },
    {
      code: "AI-4003",
      title: "High Usage Pattern Advisory",
      description: "Heavy interaction detected. Continue within token budgeting guidelines to prevent temporary throttles.",
      severity: RestrictionSeverity.WARNING,
      httpStatus: 429,
    },
    {
      code: "AI-4004",
      title: "Corporate/Account Hold",
      description: "AI assistant services are locked due to account suspension status.",
      severity: RestrictionSeverity.CRITICAL,
      httpStatus: 403,
    },
    {
      code: "AI-4005",
      title: "Rate Limit Gate Activated",
      description: "Too many operations in a short window. Please wait a brief moment.",
      severity: RestrictionSeverity.WARNING,
      httpStatus: 429,
    },
    {
      code: "AI-4006",
      title: "Governance Policy Violation",
      description: "AI access disabled due to platform usage safety rules or persistent prompt injections.",
      severity: RestrictionSeverity.CRITICAL,
      httpStatus: 403,
    },
  ];

  let seeded = 0;
  for (const def of codes) {
    const exists = await prisma.restrictionCode.findUnique({ where: { code: def.code } });
    if (!exists) {
      await prisma.restrictionCode.create({
        data: { ...def, createdById: owner.user_id },
      });
      seeded++;
    } else if (exists.title !== def.title || exists.description !== def.description || exists.severity !== def.severity || exists.httpStatus !== def.httpStatus) {
      await prisma.restrictionCode.update({
        where: { id: exists.id },
        data: {
          title: def.title,
          description: def.description,
          severity: def.severity,
          httpStatus: def.httpStatus,
        },
      });
      seeded++;
    }
  }
  if (seeded > 0) {
    console.log(`✅ AI Governance: seeded/updated ${seeded} restriction codes.`);
  }
}
