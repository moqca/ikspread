/**
 * Types for AI-powered decision engine
 */

export interface ScreenerOpportunity {
  /** Symbol */
  symbol: string;

  /** Trade type */
  type: string;

  /** Strike configuration (e.g., "90p/85p") */
  strikes: string;

  /** Days to expiration */
  dte: number;

  /** Credit received */
  credit: number;

  /** Return on Risk */
  ror: number;

  /** Annualized percentage */
  annualizedPercent: number;

  /** Probability of Profit */
  pop: number;

  /** Otter Score (0-100) */
  otterScore: number;

  /** Updated timestamp */
  updatedAt: string;
}

export interface NewsSentiment {
  /** Overall sentiment score (-1 to 1, where -1 is very bearish, 1 is very bullish) */
  score: number;

  /** Sentiment label */
  label: "very_bearish" | "bearish" | "neutral" | "bullish" | "very_bullish";

  /** Number of articles analyzed */
  articleCount: number;

  /** Key topics mentioned */
  topics: string[];

  /** Recent headlines (last 3-5) */
  headlines: string[];

  /** Summary of sentiment */
  summary: string;

  /** Confidence (0-1) */
  confidence: number;
}

export interface AnalystRatings {
  /** Consensus rating */
  consensus: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell" | "unknown";

  /** Number of buy ratings */
  buyCount: number;

  /** Number of hold ratings */
  holdCount: number;

  /** Number of sell ratings */
  sellCount: number;

  /** Average price target */
  priceTarget?: number;

  /** Recent upgrades/downgrades */
  recentChanges: Array<{
    firm: string;
    action: "upgrade" | "downgrade" | "initiate" | "reiterate";
    rating: string;
    date: string;
  }>;

  /** Summary */
  summary: string;
}

export interface FinancialHealth {
  /** Overall health score (0-100) */
  score: number;

  /** Is company profitable? */
  isProfitable: boolean;

  /** Revenue trend */
  revenueTrend: "growing" | "stable" | "declining" | "unknown";

  /** Debt level assessment */
  debtLevel: "low" | "moderate" | "high" | "unknown";

  /** Key metrics */
  metrics?: {
    marketCap?: number;
    peRatio?: number;
    debtToEquity?: number;
    revenueGrowth?: number;
  };

  /** Summary */
  summary: string;
}

export interface RiskEvents {
  /** Has upcoming earnings? */
  hasEarnings: boolean;

  /** Days until earnings (if applicable) */
  daysUntilEarnings?: number;

  /** Has dividend upcoming? */
  hasDividend: boolean;

  /** Ex-dividend date */
  exDividendDate?: string;

  /** Other significant events */
  events: Array<{
    type: string;
    description: string;
    date: string;
    impact: "high" | "medium" | "low";
  }>;

  /** Summary */
  summary: string;
}

export interface MarketContext {
  /** Sector performance */
  sectorTrend: "outperforming" | "inline" | "underperforming" | "unknown";

  /** Market regime */
  marketRegime: "bullish" | "neutral" | "bearish" | "volatile" | "unknown";

  /** VIX level assessment */
  vixLevel: "low" | "normal" | "elevated" | "high" | "unknown";

  /** Summary */
  summary: string;
}

export interface DecisionAnalysis {
  /** Symbol analyzed */
  symbol: string;

  /** Original Otter Score */
  otterScore: number;

  /** News sentiment analysis */
  sentiment: NewsSentiment;

  /** Analyst ratings */
  ratings: AnalystRatings;

  /** Financial health */
  financial: FinancialHealth;

  /** Risk events */
  riskEvents: RiskEvents;

  /** Market context */
  marketContext: MarketContext;

  /** Overall decision score (0-100) */
  decisionScore: number;

  /** Recommendation */
  recommendation: "STRONG_BUY" | "BUY" | "NEUTRAL" | "AVOID" | "STRONG_AVOID";

  /** Reasoning summary */
  reasoning: string;

  /** Key flags (concerns to be aware of) */
  flags: string[];

  /** Confidence level (0-1) */
  confidence: number;

  /** Analysis timestamp */
  analyzedAt: Date;
}

export interface DecisionEngineConfig {
  /** Enable news sentiment analysis */
  enableNewsSentiment: boolean;

  /** Enable analyst ratings check */
  enableAnalystRatings: boolean;

  /** Enable financial health check */
  enableFinancialHealth: boolean;

  /** Enable risk events detection */
  enableRiskEvents: boolean;

  /** Enable market context analysis */
  enableMarketContext: boolean;

  /** Minimum decision score to proceed (0-100) */
  minDecisionScore: number;

  /** Weight for sentiment in final score (0-1) */
  sentimentWeight: number;

  /** Weight for analyst ratings in final score (0-1) */
  ratingsWeight: number;

  /** Weight for financial health in final score (0-1) */
  financialWeight: number;

  /** Weight for risk events in final score (0-1, negative impact) */
  riskEventsWeight: number;

  /** LLM model to use */
  model?: "sonnet" | "opus" | "haiku";

  /** Cache TTL in minutes */
  cacheTTL?: number;
}

export interface DecisionCache {
  /** Cached analyses by symbol */
  analyses: Map<string, DecisionAnalysis>;

  /** Get cached analysis if still valid */
  get(symbol: string): DecisionAnalysis | undefined;

  /** Set cached analysis */
  set(symbol: string, analysis: DecisionAnalysis): void;

  /** Clear cache */
  clear(): void;
}
