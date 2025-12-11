import { EntryRules, MarketContext, RuleDecision } from "./types";
import type { Trade } from "../risk/types";

/**
 * Evaluate whether a trade should be entered based on entry rules
 */
export function evaluateEntry(
  trade: Trade,
  rules: EntryRules,
  context: MarketContext
): RuleDecision {
  const triggeredRules: string[] = [];
  const failures: string[] = [];

  // Check IV percentile
  if (rules.minIVPercentile !== undefined && trade.ivPercentile !== undefined) {
    if (trade.ivPercentile < rules.minIVPercentile) {
      failures.push(
        `IV percentile ${trade.ivPercentile} below minimum ${rules.minIVPercentile}`
      );
    } else {
      triggeredRules.push("min-iv-percentile");
    }
  }

  if (rules.maxIVPercentile !== undefined && trade.ivPercentile !== undefined) {
    if (trade.ivPercentile > rules.maxIVPercentile) {
      failures.push(
        `IV percentile ${trade.ivPercentile} above maximum ${rules.maxIVPercentile}`
      );
    } else {
      triggeredRules.push("max-iv-percentile");
    }
  }

  // Check DTE for all legs
  trade.legs.forEach((leg, idx) => {
    const dte = calculateDTE(leg.expiration, context.currentDateTime);

    if (dte < rules.minDTE) {
      failures.push(`Leg ${idx + 1} DTE ${dte} below minimum ${rules.minDTE}`);
    } else if (dte > rules.maxDTE) {
      failures.push(`Leg ${idx + 1} DTE ${dte} above maximum ${rules.maxDTE}`);
    } else {
      triggeredRules.push(`dte-check-leg-${idx + 1}`);
    }
  });

  // Check day of week
  if (rules.allowedDaysOfWeek && rules.allowedDaysOfWeek.length > 0) {
    const currentDay = context.currentDateTime.getDay();
    if (!rules.allowedDaysOfWeek.includes(currentDay)) {
      failures.push(
        `Day of week ${currentDay} not in allowed days: ${rules.allowedDaysOfWeek.join(", ")}`
      );
    } else {
      triggeredRules.push("day-of-week");
    }
  }

  // Check time of day
  if (rules.minTimeOfDay || rules.maxTimeOfDay) {
    const currentTime = formatTime(context.currentDateTime);

    if (rules.minTimeOfDay && currentTime < rules.minTimeOfDay) {
      failures.push(`Time ${currentTime} before minimum ${rules.minTimeOfDay}`);
    } else if (rules.maxTimeOfDay && currentTime > rules.maxTimeOfDay) {
      failures.push(`Time ${currentTime} after maximum ${rules.maxTimeOfDay}`);
    } else {
      triggeredRules.push("time-of-day");
    }
  }

  // Check price vs moving average
  if (rules.priceVsMA && context.movingAverages) {
    const ma = context.movingAverages[rules.priceVsMA.period];
    if (ma !== undefined) {
      const meetsCondition =
        (rules.priceVsMA.direction === "above" && context.underlyingPrice > ma) ||
        (rules.priceVsMA.direction === "below" && context.underlyingPrice < ma);

      if (!meetsCondition) {
        failures.push(
          `Price $${context.underlyingPrice} not ${rules.priceVsMA.direction} MA(${rules.priceVsMA.period}) $${ma.toFixed(2)}`
        );
      } else {
        triggeredRules.push("price-vs-ma");
      }
    }
  }

  // Check delta range
  if (rules.deltaRange) {
    const netDelta = calculateNetDelta(trade.legs);
    if (netDelta !== null) {
      if (netDelta < rules.deltaRange.min || netDelta > rules.deltaRange.max) {
        failures.push(
          `Net delta ${netDelta.toFixed(3)} outside range [${rules.deltaRange.min}, ${rules.deltaRange.max}]`
        );
      } else {
        triggeredRules.push("delta-range");
      }
    }
  }

  // Check minimum credit ratio
  if (rules.minCreditRatio !== undefined) {
    // Estimate spread width from strikes (assumes vertical spread)
    const spreadWidth = estimateSpreadWidth(trade.legs);
    if (spreadWidth !== null) {
      const creditRatio = trade.netCredit / spreadWidth;
      if (creditRatio < rules.minCreditRatio) {
        failures.push(
          `Credit ratio ${(creditRatio * 100).toFixed(1)}% below minimum ${(rules.minCreditRatio * 100).toFixed(1)}%`
        );
      } else {
        triggeredRules.push("min-credit-ratio");
      }
    }
  }

  const shouldAct = failures.length === 0;
  const reason = shouldAct
    ? `All entry conditions met (${triggeredRules.length} rules passed)`
    : `Entry blocked: ${failures.join("; ")}`;

  return {
    shouldAct,
    reason,
    triggeredRules,
    metadata: { failures },
  };
}

function calculateDTE(expiration: string, currentDate: Date): number {
  const expirationDate = new Date(expiration);
  const diffMs = expirationDate.getTime() - currentDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function calculateNetDelta(legs: Array<{ delta?: number; quantity: number }>): number | null {
  const hasAllDeltas = legs.every((leg) => leg.delta !== undefined);
  if (!hasAllDeltas) return null;

  return legs.reduce((sum, leg) => sum + (leg.delta ?? 0) * leg.quantity, 0);
}

function estimateSpreadWidth(legs: Array<{ strike: number }>): number | null {
  if (legs.length !== 2) return null;
  return Math.abs(legs[0].strike - legs[1].strike);
}
