/**
 * Types for entry, exit, and roll rules
 */

export interface EntryRules {
  /** Minimum IV percentile to enter */
  minIVPercentile?: number;

  /** Maximum IV percentile to enter */
  maxIVPercentile?: number;

  /** Minimum days to expiration */
  minDTE: number;

  /** Maximum days to expiration */
  maxDTE: number;

  /** Allowed days of week for entry (0 = Sunday, 6 = Saturday) */
  allowedDaysOfWeek?: number[];

  /** Minimum time of day (HH:MM in market time) */
  minTimeOfDay?: string;

  /** Maximum time of day (HH:MM in market time) */
  maxTimeOfDay?: string;

  /** Require price above/below moving average */
  priceVsMA?: {
    period: number;
    direction: "above" | "below";
  };

  /** Delta range for entry */
  deltaRange?: {
    min: number;
    max: number;
  };

  /** Minimum credit to receive (as fraction of spread width) */
  minCreditRatio?: number;
}

export interface ExitRules {
  /** Profit target as percentage of max profit (0-1) */
  profitTarget?: number;

  /** Stop loss as percentage of max loss (0-1) */
  stopLoss?: number;

  /** Exit at this DTE regardless of P&L */
  maxDTE?: number;

  /** Exit if delta breaches this value */
  deltaBreach?: {
    threshold: number;
    direction: "above" | "below";
  };

  /** Exit on specific days before expiration */
  daysBeforeExpiration?: number[];

  /** Trailing stop loss (percentage of max profit achieved) */
  trailingStop?: {
    activationLevel: number; // Start trailing after this % profit
    trailAmount: number; // Trail by this % of max profit
  };

  /** Time-based exit rules */
  timeBasedExits?: {
    /** Exit if position held for this many days */
    maxHoldingPeriod?: number;
    /** Exit on Friday regardless of P&L */
    exitOnFriday?: boolean;
  };
}

export interface RollRules {
  /** Roll when DTE reaches this threshold */
  rollAtDTE: number;

  /** Roll to this many days out */
  rollToDTE: number;

  /** Only roll if can receive credit */
  requireCredit: boolean;

  /** Minimum credit to roll (as fraction of current spread width) */
  minRollCredit?: number;

  /** Whether to adjust strikes when rolling */
  adjustStrikes: boolean;

  /** Strike adjustment rules */
  strikeAdjustment?: {
    /** Adjust to this delta */
    targetDelta?: number;
    /** Or adjust by this many strikes */
    strikeCount?: number;
    /** Direction to adjust */
    direction?: "up" | "down" | "auto";
  };

  /** Maximum number of times to roll a position */
  maxRolls?: number;

  /** If can't roll for credit, should we close? */
  closeIfNoCredit: boolean;
}

export interface Position {
  /** Position ID */
  id: string;

  /** Trade details */
  trade: {
    symbol: string;
    legs: Array<{
      type: "call" | "put";
      strike: number;
      expiration: string;
      quantity: number;
      delta?: number;
    }>;
    entryDate: string;
    entryCredit: number;
    spreadWidth: number;
  };

  /** Current P&L info */
  pnl: {
    currentValue: number; // Current value of the position
    realizedPnL: number; // P&L in dollars
    percentOfMaxProfit: number; // 0-1
    percentOfMaxLoss: number; // 0-1
  };

  /** Current Greeks */
  greeks?: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };

  /** Roll history */
  rollHistory?: Array<{
    date: string;
    fromExpiration: string;
    toExpiration: string;
    credit: number;
    reason: string;
  }>;
}

export interface MarketContext {
  /** Current date/time */
  currentDateTime: Date;

  /** Current underlying price */
  underlyingPrice: number;

  /** Current IV percentile */
  ivPercentile?: number;

  /** Moving averages */
  movingAverages?: {
    [period: number]: number;
  };

  /** Market hours info */
  marketHours?: {
    isOpen: boolean;
    openTime: string;
    closeTime: string;
  };
}

export type RuleDecision = {
  /** Whether to take the action */
  shouldAct: boolean;

  /** Reason for the decision */
  reason: string;

  /** List of rules that triggered */
  triggeredRules: string[];

  /** Additional metadata */
  metadata?: Record<string, any>;
};

export interface RollDecision extends RuleDecision {
  /** Recommended new expiration date */
  newExpiration?: string;

  /** Recommended strike adjustment */
  strikeAdjustment?: {
    legIndex: number;
    currentStrike: number;
    newStrike: number;
  }[];

  /** Expected credit from roll */
  expectedCredit?: number;
}
