import { AiRoleContext } from "@prisma/client";

export const DEFAULT_AI_MODEL = "deepseek/deepseek-chat-v3-0324:free";
export const DEFAULT_OPENROUTER_URL = "https://openrouter.ai/api/v1";

export const SYSTEM_PROMPTS = {
  BASE: `You are Saira Ai, a specialized agricultural, supply-chain, and marketplace assistant built specifically for Indian farmers, companies, transporters, and platform administrators.
Always provide localized, practical, extremely concise, actionable, and safe advice. 
Do not hallucinate rates, locations, or regulations. Always cite data from the provided context (e.g. current mandi rates) where applicable.`,

  FARMER: `You are a friendly and expert Agriculture Extension Officer and Market advisor. Help the farmer maximize their profits and maintain soil health.
Speak in clear, straightforward language. Adopt their preferred language (English, Hindi, Marathi) and use regional agricultural terms (e.g., 'mandi', 'khurpi', 'quintal'). Provide specific fertilizer dosages, biological disease prevention, and advice on whether to sell now based on market trends near them.`,

  DELIVERY_PARTNER: `You are the FarmZy Dispatch and Logistics Guide. Help the delivery partner optimize their earnings, plan fuel-efficient routes, maintain their vehicle, and coordinate pickups and drop-offs.
Keep advice highly practical, encouraging, simple, and safety-first.`,

  COMPANY: `You are an expert Corporate Procurement Analyst and Supply Chain Strategist for agribusiness. Help the purchasing team optimize procurement and purchasing budgets.
Focus on price forecasting, volume discounts, nearby farmer clusters, route optimization, and supplier risk metrics. Keep answers data-heavy, professional, and directly focused on profitability and stock planning.`,

  ADMIN: `You are the FarmZy System Optimization Consultant. Help the administrator monitor system health, flag disputes, detect potential frauds, optimize user retention, and identify supply-chain bottlenecks.
Keep reports metric-focused, systematic, highlighting actionable recommendations for the FarmZy developer or ops team.`,

  OWNER: `You are the FarmZy Chief Strategic Advisor. Help the startup founders and system owners scale the business, explore monetization avenues, analyze revenue growth, prepare pitch deck statistics, and expand to new territories.
Provide ambitious yet highly realistic strategies focused on retention, organic growth, commission structures, and competitive metrics.`,
};

export interface DefaultPromptTemplate {
  title: string;
  roleContext: AiRoleContext;
  badgeLabel: string;
  promptTemplate: string;
}

export const DEFAULT_PROMPT_TEMPLATES: DefaultPromptTemplate[] = [
  // --- FARMER BADGES ---
  {
    title: "Market Prices",
    roleContext: AiRoleContext.FARMER,
    badgeLabel: "Market Prices",
    promptTemplate:
      "What is today's tomato or onion rate near me? Please tell me the current mandi rates.",
  },
  {
    title: "Crop Advice",
    roleContext: AiRoleContext.FARMER,
    badgeLabel: "Crop Advice",
    promptTemplate:
      "Which crop should I grow in this season? Provide a details guide for my region.",
  },
  {
    title: "Weather Help",
    roleContext: AiRoleContext.FARMER,
    badgeLabel: "Weather Help",
    promptTemplate:
      "Suggest irrigation or farming precautions based on current weather patterns in my area.",
  },
  {
    title: "Fertilizer Suggestion",
    roleContext: AiRoleContext.FARMER,
    badgeLabel: "Fertilizer Suggestion",
    promptTemplate:
      "Suggest the best organic or NPK fertilizer dosage for a healthy yield of sugarcane or onion.",
  },
  {
    title: "Disease Detection Guidance",
    roleContext: AiRoleContext.FARMER,
    badgeLabel: "Disease Detection Guidance",
    promptTemplate:
      "My onion leaves are turning yellow or white. What could be the disease and how do I cure it organically?",
  },

  // --- COMPANY BADGES ---
  {
    title: "Current Mandi Rates",
    roleContext: AiRoleContext.COMPANY,
    badgeLabel: "Current Mandi Rates",
    promptTemplate:
      "Show the latest mandi rates in my state, highlighting the districts with the lowest procurement cost.",
  },
  {
    title: "High Demand Crops",
    roleContext: AiRoleContext.COMPANY,
    badgeLabel: "High Demand Crops",
    promptTemplate:
      "Which crops are in high demand in Maharashtra this week? Let me know where the demand is concentrated.",
  },
  {
    title: "Procurement Insights",
    roleContext: AiRoleContext.COMPANY,
    badgeLabel: "Procurement Insights",
    promptTemplate:
      "Suggest a details procurement and pricing strategy for this week to optimize logistics and buying price.",
  },
  {
    title: "Supplier Risk",
    roleContext: AiRoleContext.COMPANY,
    badgeLabel: "Supplier Risk",
    promptTemplate:
      "How can we evaluate supplier completion rate and minimize order delays or dispute risks?",
  },

  // --- ADMIN BADGES ---
  {
    title: "Fraud Detection Insights",
    roleContext: AiRoleContext.ADMIN,
    badgeLabel: "Fraud Detection Insights",
    promptTemplate:
      "What are the common indicators of platform transaction fraud or artificial price bidding, and how can we audit them?",
  },
  {
    title: "Dispute Analysis",
    roleContext: AiRoleContext.ADMIN,
    badgeLabel: "Dispute Analysis",
    promptTemplate:
      "Why are order disputes increasing? Give me a template for standard operational resolutions.",
  },
  {
    title: "System Health Suggestions",
    roleContext: AiRoleContext.ADMIN,
    badgeLabel: "System Health Suggestions",
    promptTemplate:
      "Recommend strategies to optimize delivery partner assignment latency and pickup delays.",
  },

  // --- OWNER BADGES ---
  {
    title: "Revenue Growth",
    roleContext: AiRoleContext.OWNER,
    badgeLabel: "Revenue Growth",
    promptTemplate:
      "How can FarmZy increase its overall transaction margin and monthly recurring revenue (MRR)?",
  },
  {
    title: "Expansion Strategy",
    roleContext: AiRoleContext.OWNER,
    badgeLabel: "Expansion Strategy",
    promptTemplate:
      "Which Indian states and district mandi clusters should FarmZy expand to next, and why?",
  },
  {
    title: "AI Monetization",
    roleContext: AiRoleContext.OWNER,
    badgeLabel: "AI Monetization",
    promptTemplate:
      "Suggest premium features or SaaS add-ons for Companies and Farmers that we can monetize.",
  },

  // --- DELIVERY PARTNER BADGES ---
  {
    title: "Fuel Optimization",
    roleContext: AiRoleContext.DELIVERY_PARTNER,
    badgeLabel: "Fuel Optimization",
    promptTemplate:
      "Provide best driving practices for fuel optimization based on vehicle load weight.",
  },
  {
    title: "Peak Delivery Hours",
    roleContext: AiRoleContext.DELIVERY_PARTNER,
    badgeLabel: "Peak Delivery Hours",
    promptTemplate:
      "What are the busiest mandi delivery hours, and how can I complete more assignments during peak time?",
  },
];
