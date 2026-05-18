import { AiRoleContext } from "@prisma/client";
import prisma from "../../../config/prisma";
import { SYSTEM_PROMPTS } from "../constants/ai.constants";
import { logger } from "../../../utils/logger";

/**
 * Builds the contextual data block for a Farmer by querying their farm location,
 * registered crops, and the latest regional mandi prices.
 */
export const buildFarmerContext = async (userId: string): Promise<{ contextText: string; language: string }> => {
  try {
    // 1. Fetch Farm Details
    const farm = await prisma.farmDetails.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            name: true,
            location: true,
          },
        },
      },
    }) as any;

    // 2. Fetch Farmer's registered crops/products
    const products = await prisma.product.findMany({
      where: { userId },
      select: { productName: true, category: true },
      take: 5,
    });

    const cropList = products.map((p) => p.productName).join(", ") || "None registered yet";

    // 3. Fetch regional market rates (mandi rates) based on district/state
    let mandiRatesText = "No regional rates currently available.";
    let state = "Maharashtra"; // Defaults if farm profile is incomplete
    let district = "";

    if (farm) {
      state = farm.state;
      district = farm.district;

      const rates = await prisma.marketRate.findMany({
        where: {
          state: { equals: state, mode: "insensitive" },
          district: district ? { equals: district, mode: "insensitive" } : undefined,
        },
        orderBy: { recordedDate: "desc" },
        take: 5,
      });

      if (rates.length > 0) {
        mandiRatesText = rates
          .map(
            (r) =>
              `- ${r.commodity} (${r.variety || "General"}): Modal Price ₹${r.modalPrice}/${r.unit} at ${r.mandiName} Mandi (Rec: ${r.recordedDate.toDateString()})`
          )
          .join("\n");
      }
    }

    const farmInfo = farm
      ? `Location: ${farm.village}, District: ${farm.district}, State: ${farm.state}. Land Area: ${farm.landArea || "N/A"} acres.`
      : "No details farm profile established yet.";

    const contextText = `
--- FARMER CONTEXT ---
Farmer Name: ${farm?.user?.name || "Farmer"}
${farmInfo}
Grown Crops: ${cropList}

LATEST REGIONAL MANDI PRICES (State: ${state}, District: ${district || "Any"}):
${mandiRatesText}
----------------------
`;

    // Detect language preference (can support fallback defaults)
    // We will append explicit instructions later
    return { contextText, language: "en" };
  } catch (error) {
    logger.error(error as any, "❌ Error building Farmer context");
    return { contextText: "Error loading regional farmer profile.", language: "en" };
  }
};

/**
 * Builds the contextual data block for a Company by checking their stock inventory,
 * HQ location, and active order counts.
 */
export const buildCompanyContext = async (companyId: string): Promise<{ contextText: string; language: string }> => {
  try {
    const company = await prisma.company.findUnique({
      where: { companyId },
      include: {
        inventories: {
          take: 5,
        },
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!company) {
      return { contextText: "Company context unavailable.", language: "en" };
    }

    const inventoryText = company.inventories
      .map((inv) => `- ${inv.stockName}: ${inv.stockWeight}kg @ ₹${inv.stockPrice}/kg`)
      .join("\n") || "No inventory items registered.";

    const contextText = `
--- COMPANY CONTEXT ---
Company Name: ${company.companyName}
HQ Location: ${company.hqLocation}
Total Active Orders: ${company._count.orders}

CURRENT STOCK INVENTORY:
${inventoryText}
-----------------------
`;

    return { contextText, language: "en" };
  } catch (error) {
    logger.error(error as any, "❌ Error building Company context");
    return { contextText: "Error loading company context.", language: "en" };
  }
};

/**
 * Builds context for Admins by providing high-level platform health indicators.
 */
export const buildAdminContext = async (): Promise<string> => {
  try {
    const disputesCount = await prisma.dispute.count({
      where: { status: "OPEN" },
    });
    const ordersCount = await prisma.order.count();
    const verifiedFarmersCount = await prisma.user.count({
      where: { role: "FARMER", verificationStatus: "VERIFIED" },
    });
    const verifiedCompaniesCount = await prisma.company.count({
      where: { verification: "VERIFIED" },
    });

    return `
--- PLATFORM PERFORMANCE METRICS ---
Open Disputes: ${disputesCount}
Total Platform Orders: ${ordersCount}
Verified Farmers: ${verifiedFarmersCount}
Verified Procurement Companies: ${verifiedCompaniesCount}
-------------------------------------
`;
  } catch (error) {
    logger.error(error as any, "❌ Error building Admin context");
    return "Error loading platform metric summary.";
  }
};

/**
 * Builds context for Owners focusing on financials.
 */
export const buildOwnerContext = async (): Promise<string> => {
  try {
    const totalTransactions = await prisma.transaction.aggregate({
      where: { status: "SUCCESS" },
      _sum: {
        amount: true,
      },
    });

    const activeUsersCount = await prisma.user.count({
      where: { isBlocked: false },
    });

    const platformCommission = await prisma.transaction.aggregate({
      where: { type: "PLATFORM_COMMISSION", status: "SUCCESS" },
      _sum: {
        amount: true,
      },
    });

    return `
--- SYSTEM FINANCIAL METRICS ---
Successful Transaction Volume (Gross): ₹${totalTransactions._sum.amount ?? 0}
Net Platform Commissions: ₹${platformCommission._sum.amount ?? 0}
Active System User Accounts: ${activeUsersCount}
---------------------------------
`;
  } catch (error) {
    logger.error(error as any, "❌ Error building Owner context");
    return "Error loading system financial analytics.";
  }
};

/**
 * Generates the full system prompt, incorporating role specifications,
 * localized language output rules, and the dynamically fetched database context.
 */
export const generateSystemPrompt = (
  roleContext: AiRoleContext,
  contextData: string,
  targetLang: "en" | "hi" | "mr" = "en"
): string => {
  // 1. Resolve base role prompt
  let promptBody = SYSTEM_PROMPTS.BASE + "\n\n";

  switch (roleContext) {
    case AiRoleContext.FARMER:
      promptBody += SYSTEM_PROMPTS.FARMER;
      break;
    case AiRoleContext.COMPANY:
      promptBody += SYSTEM_PROMPTS.COMPANY;
      break;
    case AiRoleContext.ADMIN:
      promptBody += SYSTEM_PROMPTS.ADMIN;
      break;
    case AiRoleContext.OWNER:
      promptBody += SYSTEM_PROMPTS.OWNER;
      break;
    case AiRoleContext.DELIVERY_PARTNER:
      promptBody += SYSTEM_PROMPTS.DELIVERY_PARTNER;
      break;
  }

  // 2. Append localization rules
  const langRule =
    targetLang === "hi"
      ? "\n\nCRITICAL LANGUAGE INSTRUCTION: You MUST respond in fluent HINDI (हिंदी) only. Use clear and easy Devanagari script. Incorporate local agricultural vocabulary where helpful."
      : targetLang === "mr"
        ? "\n\nCRITICAL LANGUAGE INSTRUCTION: You MUST respond in fluent MARATHI (मराठी) only. Use clear Devanagari script and local Marathi agricultural terminology (e.g. शेतकरी, बाजार भाव)."
        : "\n\nCRITICAL LANGUAGE INSTRUCTION: Respond in fluent, direct ENGLISH only. Keep the vocabulary simple and suitable for agribusiness.";

  promptBody += langRule;

  // 3. Inject context data if present
  if (contextData) {
    promptBody += `\n\nDYNAMIC CONTEXT INFORMATION:\n${contextData}\nUse the above live data to answer user queries accurately.`;
  }

  return promptBody;
};
