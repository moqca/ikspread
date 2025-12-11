import { RiskEvents, MarketContext } from "./types";

/**
 * Detect risk events for a symbol
 *
 * Note: Placeholder implementation. In production would:
 * 1. Use earnings calendar API
 * 2. Use dividend calendar API
 * 3. Use corporate events API
 * 4. Use WebSearch for recent announcements
 */
export async function detectRiskEvents(symbol: string): Promise<RiskEvents> {
  console.log(`[RiskEvents] Detecting risk events for ${symbol}...`);

  // TODO: Replace with actual API implementation
  // const earnings = await earningsAPI.getNextEarnings(symbol)
  // const dividend = await dividendAPI.getNextDividend(symbol)
  // const events = await corporateEventsAPI.getUpcoming(symbol)

  const mockRiskEvents: Record<string, RiskEvents> = {
    OKLO: {
      hasEarnings: true,
      daysUntilEarnings: 8,
      hasDividend: false,
      events: [
        {
          type: "earnings",
          description: "Q4 2024 Earnings Release",
          date: "2025-01-20",
          impact: "high",
        },
        {
          type: "regulatory",
          description: "NRC approval decision expected",
          date: "2025-02-15",
          impact: "high",
        },
      ],
      summary: "Earnings in 8 days. Important regulatory approval decision pending in February.",
    },
    TSLA: {
      hasEarnings: true,
      daysUntilEarnings: 2,
      hasDividend: false,
      events: [
        {
          type: "earnings",
          description: "Q4 2024 Earnings Release",
          date: "2025-01-25",
          impact: "high",
        },
        {
          type: "product",
          description: "Cybertruck production update",
          date: "2025-01-25",
          impact: "medium",
        },
      ],
      summary: "⚠️ CRITICAL: Earnings in 2 days! High risk period - avoid opening new positions.",
    },
    DUOL: {
      hasEarnings: false,
      daysUntilEarnings: undefined,
      hasDividend: false,
      exDividendDate: undefined,
      events: [
        {
          type: "conference",
          description: "EdTech Conference Presentation",
          date: "2025-02-10",
          impact: "low",
        },
      ],
      summary: "No major risk events in near term. Next earnings expected in late February.",
    },
  };

  await new Promise((resolve) => setTimeout(resolve, 500));

  return (
    mockRiskEvents[symbol] || {
      hasEarnings: false,
      hasDividend: false,
      events: [],
      summary: "No significant risk events detected.",
    }
  );
}

/**
 * Analyze market context
 *
 * Note: Placeholder implementation. In production would:
 * 1. Use market data API for sector performance
 * 2. Use VIX data
 * 3. Use market breadth indicators
 */
export async function analyzeMarketContext(symbol: string): Promise<MarketContext> {
  console.log(`[MarketContext] Analyzing market context for ${symbol}...`);

  // TODO: Replace with actual market data API
  // const sectorData = await marketAPI.getSectorPerformance(symbol)
  // const vixData = await marketAPI.getVIX()

  const mockContext: Record<string, MarketContext> = {
    OKLO: {
      sectorTrend: "outperforming",
      marketRegime: "bullish",
      vixLevel: "normal",
      summary: "Clean energy sector outperforming. Favorable market conditions for growth stocks.",
    },
    TSLA: {
      sectorTrend: "underperforming",
      marketRegime: "volatile",
      vixLevel: "elevated",
      summary: "Auto sector under pressure. Elevated volatility (VIX 22). Challenging environment.",
    },
    DUOL: {
      sectorTrend: "inline",
      marketRegime: "neutral",
      vixLevel: "normal",
      summary: "EdTech sector performing in line with market. Stable conditions.",
    },
  };

  await new Promise((resolve) => setTimeout(resolve, 500));

  return (
    mockContext[symbol] || {
      sectorTrend: "unknown",
      marketRegime: "unknown",
      vixLevel: "unknown",
      summary: "Market context data unavailable.",
    }
  );
}

/**
 * Calculate risk events impact on decision score
 * Risk events reduce the score (negative impact)
 */
export function calculateRiskEventsImpact(riskEvents: RiskEvents, weight: number): number {
  let impactScore = 0;

  // Earnings within next 7 days = major risk
  if (riskEvents.hasEarnings && riskEvents.daysUntilEarnings !== undefined) {
    if (riskEvents.daysUntilEarnings <= 3) {
      impactScore = -80; // Major negative impact
    } else if (riskEvents.daysUntilEarnings <= 7) {
      impactScore = -40; // Moderate negative impact
    } else if (riskEvents.daysUntilEarnings <= 14) {
      impactScore = -20; // Minor negative impact
    }
  }

  // Dividend ex-date proximity
  if (riskEvents.hasDividend && riskEvents.exDividendDate) {
    const daysToExDiv = calculateDaysUntil(riskEvents.exDividendDate);
    if (daysToExDiv <= 2) {
      impactScore = Math.min(impactScore - 30, impactScore); // Reduce score
    }
  }

  // High-impact events
  const highImpactEvents = riskEvents.events.filter((e) => e.impact === "high");
  impactScore -= highImpactEvents.length * 15;

  // Apply weight (note: this is a negative impact)
  return impactScore * weight;
}

/**
 * Extract risk event flags
 */
export function extractRiskEventFlags(riskEvents: RiskEvents): string[] {
  const flags: string[] = [];

  // Critical: Earnings very soon
  if (riskEvents.hasEarnings && riskEvents.daysUntilEarnings !== undefined) {
    if (riskEvents.daysUntilEarnings <= 3) {
      flags.push(
        `🚨 CRITICAL: Earnings in ${riskEvents.daysUntilEarnings} days - HIGH RISK`
      );
    } else if (riskEvents.daysUntilEarnings <= 7) {
      flags.push(`⚠️ Earnings in ${riskEvents.daysUntilEarnings} days - exercise caution`);
    }
  }

  // Dividend ex-date
  if (riskEvents.hasDividend && riskEvents.exDividendDate) {
    const daysToExDiv = calculateDaysUntil(riskEvents.exDividendDate);
    if (daysToExDiv <= 2) {
      flags.push(`Dividend ex-date in ${daysToExDiv} days`);
    }
  }

  // High-impact events
  const highImpactEvents = riskEvents.events.filter((e) => e.impact === "high");
  for (const event of highImpactEvents) {
    flags.push(`High-impact event: ${event.description} on ${event.date}`);
  }

  return flags;
}

/**
 * Get risk event recommendation modifier
 */
export function getRiskEventRecommendationModifier(
  riskEvents: RiskEvents
): "UPGRADE" | "DOWNGRADE" | "NEUTRAL" {
  // Earnings within 3 days = automatic downgrade
  if (
    riskEvents.hasEarnings &&
    riskEvents.daysUntilEarnings !== undefined &&
    riskEvents.daysUntilEarnings <= 3
  ) {
    return "DOWNGRADE";
  }

  // Multiple high-impact events = downgrade
  const highImpactCount = riskEvents.events.filter((e) => e.impact === "high").length;
  if (highImpactCount >= 2) {
    return "DOWNGRADE";
  }

  return "NEUTRAL";
}

/**
 * Calculate days until a date
 */
function calculateDaysUntil(dateStr: string): number {
  const targetDate = new Date(dateStr);
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Extract market context flags
 */
export function extractMarketContextFlags(context: MarketContext): string[] {
  const flags: string[] = [];

  if (context.vixLevel === "high" || context.vixLevel === "elevated") {
    flags.push(`Elevated volatility environment (VIX ${context.vixLevel})`);
  }

  if (context.sectorTrend === "underperforming") {
    flags.push("Sector underperforming broader market");
  }

  if (context.marketRegime === "bearish" || context.marketRegime === "volatile") {
    flags.push(`Challenging market regime: ${context.marketRegime}`);
  }

  return flags;
}
