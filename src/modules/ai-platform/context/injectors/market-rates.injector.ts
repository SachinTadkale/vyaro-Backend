import prisma from "../../../../config/prisma";

export class MarketRatesInjector {
  /**
   * Fetches latest 5 Mandi market price records for context.
   */
  public static async injectContext(userId?: string): Promise<string> {
    let district: string | undefined;

    if (userId) {
      try {
        const farm = await prisma.farmDetails.findUnique({
          where: { userId },
        });
        if (farm) {
          district = farm.district;
        }
      } catch (err) {
        // Fall back gracefully
      }
    }

    try {
      // Find latest prices matching the user's district or general state
      const rates = await prisma.marketRate.findMany({
        where: district ? { district } : undefined,
        orderBy: { recordedDate: "desc" },
        take: 6,
      });

      if (rates.length === 0) {
        // Fallback to recent crop prices if database contains zero records initially
        return `Mandi Market Rates Context (Fallback):\n` +
          `- Tomatoes: 1500 - 2200 INR/Quintal (Modal: 1800 INR)\n` +
          `- Potatoes: 1200 - 1800 INR/Quintal (Modal: 1500 INR)\n` +
          `- Onions: 1800 - 2500 INR/Quintal (Modal: 2100 INR)\n` +
          `- Mandi Source: General Agricultural Markets, Maharashtra`;
      }

      let context = `Mandi Market Rates Context (${district || "All Regions"}):\n`;
      rates.forEach((r) => {
        context += `- ${r.commodity} (${r.variety || "Standard"}): Modal Price = ${r.modalPrice} INR/Quintal (Range: ${r.minPrice ?? 0} - ${r.maxPrice ?? 0} INR) at Mandi: ${r.mandiName}\n`;
      });

      return context;
    } catch (err: any) {
      console.error("[CONTEXT INJECTOR] Failed MarketRates injection:", err.message);
      return "Mandi Market Rates Context: [Market rates temporarily offline]";
    }
  }
}
