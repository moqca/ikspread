/**
 * Configuration types for risk management and strategy filtering
 */

export interface RiskConfig {
  /** Maximum position size per trade (contracts) */
  maxPositionSize: number;

  /** Maximum percentage of portfolio to allocate per trade (0-1) */
  maxPortfolioAllocation: number;

  /** Minimum days to expiration for options */
  minDaysToExpiration: number;

  /** Maximum days to expiration for options */
  maxDaysToExpiration: number;

  /** Delta range filters */
  delta: {
    min: number;
    max: number;
  };

  /** Greeks risk limits */
  greeks: {
    maxGamma?: number;
    maxTheta?: number;
    maxVega?: number;
  };

  /** IV percentile filters */
  ivPercentile?: {
    min: number;
    max: number;
  };

  /** Minimum credit to receive for spreads */
  minCredit?: number;

  /** Maximum spread width */
  maxSpreadWidth?: number;
}

export interface UnderlyingFilters {
  /** Allowed symbols (empty = allow all) */
  allowedSymbols?: string[];

  /** Blocked symbols */
  blockedSymbols?: string[];

  /** Minimum underlying price */
  minPrice?: number;

  /** Maximum underlying price */
  maxPrice?: number;

  /** Minimum average daily volume */
  minVolume?: number;

  /** Minimum market cap */
  minMarketCap?: number;
}

export interface StrategyConfig {
  /** Strategy name */
  name: string;

  /** Is strategy enabled */
  enabled: boolean;

  /** Risk parameters */
  risk: RiskConfig;

  /** Underlying filters */
  underlyingFilters: UnderlyingFilters;

  /** Strategy-specific parameters */
  parameters?: Record<string, any>;
}

export interface GlobalConfig {
  /** Maximum total portfolio value at risk */
  maxTotalRisk: number;

  /** Maximum number of open positions */
  maxOpenPositions: number;

  /** Default risk config (can be overridden per strategy) */
  defaultRisk: RiskConfig;

  /** Global underlying filters */
  globalUnderlyingFilters: UnderlyingFilters;

  /** Individual strategy configurations */
  strategies: StrategyConfig[];
}
