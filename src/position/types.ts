/**
 * Types for position sizing calculations
 */

export interface PositionSizingConfig {
  /** Position sizing method */
  method: "fixed-contracts" | "fixed-dollar-risk" | "percent-portfolio" | "kelly-criterion";

  /** Fixed number of contracts (for fixed-contracts method) */
  fixedContracts?: number;

  /** Fixed dollar risk per trade (for fixed-dollar-risk method) */
  fixedDollarRisk?: number;

  /** Percentage of portfolio to risk per trade (0-1, for percent-portfolio method) */
  percentRisk?: number;

  /** Win rate for Kelly criterion (0-1) */
  winRate?: number;

  /** Average win/loss ratio for Kelly criterion */
  winLossRatio?: number;

  /** Kelly fraction (0-1, typically 0.25 for quarter-Kelly) */
  kellyFraction?: number;

  /** Minimum position size (contracts) */
  minSize: number;

  /** Maximum position size (contracts) */
  maxSize: number;

  /** Whether to round to nearest integer */
  roundToInteger: boolean;

  /** Account for margin requirements */
  considerMargin: boolean;
}

export interface PositionSizingInput {
  /** Current portfolio value */
  portfolioValue: number;

  /** Available buying power */
  availableBuyingPower: number;

  /** Maximum loss per contract (for spread = spread width - credit received) */
  maxLossPerContract: number;

  /** Credit received per contract */
  creditPerContract: number;

  /** Margin requirement per contract (if applicable) */
  marginPerContract?: number;

  /** Signal strength/confidence (0-1, optional for scaling) */
  signalStrength?: number;

  /** Historical performance data (optional) */
  performance?: {
    winRate: number;
    avgWin: number;
    avgLoss: number;
    totalTrades: number;
  };
}

export interface PositionSizingResult {
  /** Recommended number of contracts */
  contracts: number;

  /** Method used for calculation */
  method: string;

  /** Dollar amount at risk */
  dollarRisk: number;

  /** Percentage of portfolio at risk */
  percentRisk: number;

  /** Margin required (if applicable) */
  marginRequired?: number;

  /** Whether position was capped by constraints */
  cappedByConstraint?: string;

  /** Calculation details */
  details: string;
}
