import { UserProfileInjector } from "./injectors/user-profile.injector";
import { WeatherInjector } from "./injectors/weather.injector";
import { MarketRatesInjector } from "./injectors/market-rates.injector";

export class AiContextInjectorRouter {
  /**
   * Resolves requested contexts concurrently and outputs a combined prompt context block.
   */
  public static async resolveContexts(
    requiredKeys: string[],
    userId?: string
  ): Promise<string> {
    if (!requiredKeys || requiredKeys.length === 0) return "";

    const promises = requiredKeys.map(async (key) => {
      switch (key.toUpperCase()) {
        case "USER_PROFILE":
          return UserProfileInjector.injectContext(userId);
        case "WEATHER":
          return WeatherInjector.injectContext(userId);
        case "MARKET_RATES":
          return MarketRatesInjector.injectContext(userId);
        default:
          return `[Context tag ${key} requested but has no compiled injector]`;
      }
    });

    const results = await Promise.all(promises);
    return results.join("\n\n");
  }
}
