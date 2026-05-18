import { AiProvider } from "../types/ai-platform.types";

interface ProviderHealthStatus {
  provider: AiProvider;
  isHealthy: boolean;
  consecutiveFailures: number;
  unhealthySince?: Date;
  lastFailureTime?: Date;
  latencySamples: number[];
}

export class ProviderHealthService {
  private static instance: ProviderHealthService;
  private healthLedger: Map<AiProvider, ProviderHealthStatus> = new Map();
  private readonly FAILURE_THRESHOLD = 5; // 5 consecutive errors triggers breaker
  private readonly COOLDOWN_MS = 60000;   // 60-second cooldown
  private readonly MAX_LATENCY_SAMPLES = 20;

  private constructor() {
    this.initializeLedger();
  }

  public static getInstance(): ProviderHealthService {
    if (!ProviderHealthService.instance) {
      ProviderHealthService.instance = new ProviderHealthService();
    }
    return ProviderHealthService.instance;
  }

  private initializeLedger() {
    Object.values(AiProvider).forEach((provider) => {
      this.healthLedger.set(provider, {
        provider,
        isHealthy: true,
        consecutiveFailures: 0,
        latencySamples: [],
      });
    });
  }

  /**
   * Evaluates if a provider is currently healthy and can execute requests.
   */
  public isProviderHealthy(provider: AiProvider): boolean {
    const status = this.healthLedger.get(provider);
    if (!status) return true;

    if (!status.isHealthy && status.unhealthySince) {
      const timeSinceUnhealthy = Date.now() - status.unhealthySince.getTime();
      if (timeSinceUnhealthy >= this.COOLDOWN_MS) {
        // Cooldown period expired, trigger half-open test
        console.warn(`[CIRCUIT BREAKER] Cooldown expired for provider: ${provider}. Attempting half-open retry.`);
        status.isHealthy = true;
        status.consecutiveFailures = 0;
        status.unhealthySince = undefined;
        return true;
      }
      return false;
    }
    return true;
  }

  /**
   * Records a successful execution and resets consecutive failure counters.
   */
  public recordSuccess(provider: AiProvider, latencyMs: number) {
    const status = this.healthLedger.get(provider);
    if (!status) return;

    status.isHealthy = true;
    status.consecutiveFailures = 0;
    status.unhealthySince = undefined;

    // Track rolling latency average
    status.latencySamples.push(latencyMs);
    if (status.latencySamples.length > this.MAX_LATENCY_SAMPLES) {
      status.latencySamples.shift();
    }
  }

  /**
   * Records an execution failure, incrementing consecutive failure limits
   * and potentially tripping the circuit breaker.
   */
  public recordFailure(provider: AiProvider, errorMessage: string) {
    const status = this.healthLedger.get(provider);
    if (!status) return;

    status.consecutiveFailures += 1;
    status.lastFailureTime = new Date();

    console.error(
      `[PROVIDER HEALTH] Recorded failure for provider ${provider}. Consecutive: ${status.consecutiveFailures}. Error: ${errorMessage}`
    );

    if (status.consecutiveFailures >= this.FAILURE_THRESHOLD && status.isHealthy) {
      status.isHealthy = false;
      status.unhealthySince = new Date();
      console.error(
        `[CIRCUIT BREAKER TRIPPED] Provider ${provider} has failed ${status.consecutiveFailures} consecutive times. Disabling for 60 seconds.`
      );
    }
  }

  /**
   * Returns average latency for a provider.
   */
  public getAverageLatency(provider: AiProvider): number {
    const status = this.healthLedger.get(provider);
    if (!status || status.latencySamples.length === 0) return 0;
    const sum = status.latencySamples.reduce((acc, lat) => acc + lat, 0);
    return sum / status.latencySamples.length;
  }

  /**
   * Retrieves overall health diagnostic report.
   */
  public getHealthReport() {
    return Array.from(this.healthLedger.values()).map((status) => ({
      provider: status.provider,
      isHealthy: status.isHealthy,
      consecutiveFailures: status.consecutiveFailures,
      unhealthySince: status.unhealthySince,
      averageLatencyMs: this.getAverageLatency(status.provider),
    }));
  }
}
