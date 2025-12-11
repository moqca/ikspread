/**
 * Types for risk filtering and trade evaluation
 */

export interface OptionLeg {
  /** Option type: call or put */
  type: "call" | "put";

  /** Strike price */
  strike: number;

  /** Expiration date (ISO format) */
  expiration: string;

  /** Number of contracts (positive = long, negative = short) */
  quantity: number;

  /** Option delta */
  delta?: number;

  /** Option gamma */
  gamma?: number;

  /** Option theta */
  theta?: number;

  /** Option vega */
  vega?: number;

  /** Implied volatility */
  iv?: number;
}

export interface Trade {
  /** Unique trade identifier */
  id: string;

  /** Underlying symbol */
  symbol: string;

  /** Option legs */
  legs: OptionLeg[];

  /** Net credit/debit (positive = credit received) */
  netCredit: number;

  /** Current underlying price */
  underlyingPrice: number;

  /** Underlying volume */
  underlyingVolume?: number;

  /** Underlying market cap */
  underlyingMarketCap?: number;

  /** IV percentile */
  ivPercentile?: number;

  /** Strategy name */
  strategy?: string;
}

export interface RiskCheckResult {
  /** Whether the trade passes all risk checks */
  passed: boolean;

  /** List of failed checks */
  failures: string[];

  /** List of warnings (non-blocking) */
  warnings: string[];
}

export interface PortfolioState {
  /** Current portfolio value */
  totalValue: number;

  /** Number of open positions */
  openPositions: number;

  /** Total capital at risk */
  totalRisk: number;

  /** Available buying power */
  availableBuyingPower: number;
}
