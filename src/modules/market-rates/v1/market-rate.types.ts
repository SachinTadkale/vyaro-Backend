export interface AgmarknetPriceRecord {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  grade: string;
  arrival_date: string;
  min_price: string | number;
  max_price: string | number;
  modal_price: string | number;
}

export interface MarketRateFilter {
  commodity?: string;
  state?: string;
  district?: string;
  mandi?: string;
  grade?: string;
}

export enum PriceDirection {
  UP = "UP",
  DOWN = "DOWN",
  STABLE = "STABLE"
}

export enum DemandLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH"
}
