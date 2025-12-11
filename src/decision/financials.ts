import { AnalystRatings, FinancialHealth } from "./types";

/**
 * Analyze analyst ratings for a symbol
 *
 * Note: Placeholder implementation. In production would:
 * 1. Use WebSearch to find recent analyst ratings
 * 2. Use financial data API (Alpha Vantage, Yahoo Finance, etc.)
 * 3. Aggregate consensus and recent changes
 */
export async function analyzeAnalystRatings(symbol: string): Promise<AnalystRatings> {
  console.log(`[Ratings] Analyzing analyst ratings for ${symbol}...`);

  // TODO: Replace with actual API implementation
  // const ratings = await financialDataAPI.getAnalystRatings(symbol)

  const mockRatings: Record<string, AnalystRatings> = {
    OKLO: {
      consensus: "buy",
      buyCount: 8,
      holdCount: 3,
      sellCount: 1,
      priceTarget: 28.5,
      recentChanges: [
        {
          firm: "Goldman Sachs",
          action: "initiate",
          rating: "Buy",
          date: "2024-12-05",
        },
        {
          firm: "Morgan Stanley",
          action: "upgrade",
          rating: "Overweight",
          date: "2024-12-01",
        },
      ],
      summary: "Consensus Buy with average price target of $28.50. Recent upgrades on clean energy thesis.",
    },
    TSLA: {
      consensus: "hold",
      buyCount: 12,
      holdCount: 18,
      sellCount: 8,
      priceTarget: 285.0,
      recentChanges: [
        {
          firm: "UBS",
          action: "downgrade",
          rating: "Neutral",
          date: "2024-12-08",
        },
        {
          firm: "Barclays",
          action: "downgrade",
          rating: "Underweight",
          date: "2024-12-03",
        },
      ],
      summary: "Mixed ratings with recent downgrades on valuation concerns. Price target implies limited upside.",
    },
    DUOL: {
      consensus: "buy",
      buyCount: 10,
      holdCount: 4,
      sellCount: 0,
      priceTarget: 245.0,
      recentChanges: [
        {
          firm: "JP Morgan",
          action: "reiterate",
          rating: "Overweight",
          date: "2024-12-06",
        },
      ],
      summary: "Strong Buy consensus on AI feature rollout and user growth. No sell ratings.",
    },
  };

  await new Promise((resolve) => setTimeout(resolve, 500));

  return (
    mockRatings[symbol] || {
      consensus: "unknown",
      buyCount: 0,
      holdCount: 0,
      sellCount: 0,
      recentChanges: [],
      summary: "No analyst coverage available.",
    }
  );
}

/**
 * Analyze financial health of a company
 *
 * Note: Placeholder implementation. In production would:
 * 1. Use financial data API to get fundamentals
 * 2. Calculate health score based on metrics
 * 3. Analyze trends over time
 */
export async function analyzeFinancialHealth(symbol: string): Promise<FinancialHealth> {
  console.log(`[Financial] Analyzing financial health for ${symbol}...`);

  // TODO: Replace with actual API implementation
  // const fundamentals = await financialDataAPI.getFundamentals(symbol)

  const mockFinancials: Record<string, FinancialHealth> = {
    OKLO: {
      score: 45,
      isProfitable: false,
      revenueTrend: "growing",
      debtLevel: "moderate",
      metrics: {
        marketCap: 2800000000,
        peRatio: undefined, // Not profitable
        debtToEquity: 0.35,
        revenueGrowth: 0.85, // 85% YoY
      },
      summary: "Pre-revenue company with strong growth prospects. Not yet profitable but well-funded with moderate debt.",
    },
    TSLA: {
      score: 75,
      isProfitable: true,
      revenueTrend: "growing",
      debtLevel: "low",
      metrics: {
        marketCap: 1200000000000,
        peRatio: 72.5,
        debtToEquity: 0.12,
        revenueGrowth: 0.19, // 19% YoY
      },
      summary: "Profitable with strong revenue growth. Low debt levels. High valuation (PE 72.5) is a concern.",
    },
    DUOL: {
      score: 82,
      isProfitable: true,
      revenueTrend: "growing",
      debtLevel: "low",
      metrics: {
        marketCap: 8500000000,
        peRatio: 45.2,
        debtToEquity: 0.08,
        revenueGrowth: 0.42, // 42% YoY
      },
      summary: "Strong financial health. Profitable with excellent revenue growth (42% YoY) and minimal debt.",
    },
  };

  await new Promise((resolve) => setTimeout(resolve, 500));

  return (
    mockFinancials[symbol] || {
      score: 50,
      isProfitable: false,
      revenueTrend: "unknown",
      debtLevel: "unknown",
      summary: "Insufficient financial data available.",
    }
  );
}

/**
 * Calculate analyst ratings impact on decision score
 */
export function calculateRatingsImpact(ratings: AnalystRatings, weight: number): number {
  // Convert consensus to score (0-100)
  const consensusScores: Record<AnalystRatings["consensus"], number> = {
    strong_buy: 100,
    buy: 75,
    hold: 50,
    sell: 25,
    strong_sell: 0,
    unknown: 50,
  };

  const baseScore = consensusScores[ratings.consensus];

  // Adjust for recent downgrades
  const recentDowngrades = ratings.recentChanges.filter((c) => c.action === "downgrade").length;
  const downgradeAdjustment = Math.min(recentDowngrades * 10, 30); // Max -30 points

  const adjustedScore = Math.max(0, baseScore - downgradeAdjustment);

  return adjustedScore * weight;
}

/**
 * Calculate financial health impact on decision score
 */
export function calculateFinancialImpact(financial: FinancialHealth, weight: number): number {
  return financial.score * weight;
}

/**
 * Extract analyst rating flags
 */
export function extractRatingFlags(ratings: AnalystRatings): string[] {
  const flags: string[] = [];

  if (ratings.consensus === "sell" || ratings.consensus === "strong_sell") {
    flags.push(`Analyst consensus is ${ratings.consensus.toUpperCase()}`);
  }

  const recentDowngrades = ratings.recentChanges.filter((c) => c.action === "downgrade");
  if (recentDowngrades.length >= 2) {
    flags.push(
      `${recentDowngrades.length} recent analyst downgrades: ${recentDowngrades
        .map((d) => d.firm)
        .join(", ")}`
    );
  }

  return flags;
}

/**
 * Extract financial health flags
 */
export function extractFinancialFlags(financial: FinancialHealth): string[] {
  const flags: string[] = [];

  if (!financial.isProfitable) {
    flags.push("Company is not yet profitable");
  }

  if (financial.revenueTrend === "declining") {
    flags.push("Revenue is declining");
  }

  if (financial.debtLevel === "high") {
    flags.push("High debt levels - financial risk");
  }

  if (financial.score < 40) {
    flags.push(`Poor financial health score (${financial.score}/100)`);
  }

  return flags;
}
