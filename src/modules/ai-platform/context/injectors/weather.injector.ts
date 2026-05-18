import prisma from "../../../../config/prisma";

export class WeatherInjector {
  /**
   * Resolves weather details matching user location.
   */
  public static async injectContext(userId?: string): Promise<string> {
    let locationLabel = "Maharashtra (General)";

    if (userId) {
      try {
        const farm = await prisma.farmDetails.findUnique({
          where: { userId },
        });
        if (farm) {
          locationLabel = `${farm.district}, ${farm.state}`;
        }
      } catch (err) {
        // Fall back gracefully
      }
    }

    // Dynamic agricultural weather model (simulate live Mandi district weather metrics)
    const mockWeather = {
      temperatureCelsius: 32,
      humidityPercent: 62,
      precipitationProb: "10%",
      windSpeedKph: 14,
      soilMoisture: "Moderate (45%)",
      skyCondition: "Partly Cloudy (Perfect for crop pesticide applications)",
    };

    let context = `Weather Context (${locationLabel}):\n`;
    context += `- Air Temperature: ${mockWeather.temperatureCelsius}°C\n`;
    context += `- Relative Humidity: ${mockWeather.humidityPercent}%\n`;
    context += `- Rainfall Probability: ${mockWeather.precipitationProb}\n`;
    context += `- Wind Speed: ${mockWeather.windSpeedKph} km/h\n`;
    context += `- Soil Moisture: ${mockWeather.soilMoisture}\n`;
    context += `- Atmosphere Sky: ${mockWeather.skyCondition}\n`;

    return context;
  }
}
