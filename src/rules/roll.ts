import { RollRules, Position, MarketContext, RollDecision } from "./types";

/**
 * Evaluate whether a position should be rolled based on roll rules
 */
export function evaluateRoll(
  position: Position,
  rules: RollRules,
  context: MarketContext
): RollDecision {
  const triggeredRules: string[] = [];
  let shouldRoll = false;
  const reasons: string[] = [];

  // Check if position has been rolled too many times
  const rollCount = position.rollHistory?.length ?? 0;
  if (rules.maxRolls !== undefined && rollCount >= rules.maxRolls) {
    return {
      shouldAct: false,
      reason: `Max rolls reached (${rollCount}/${rules.maxRolls})`,
      triggeredRules: [],
    };
  }

  // Check DTE
  const currentDTE = calculateMinDTE(position.trade.legs, context.currentDateTime);
  if (currentDTE <= rules.rollAtDTE) {
    shouldRoll = true;
    triggeredRules.push("dte-threshold");
    reasons.push(`DTE ${currentDTE} at or below roll threshold ${rules.rollAtDTE}`);
  } else {
    return {
      shouldAct: false,
      reason: `DTE ${currentDTE} above roll threshold ${rules.rollAtDTE}`,
      triggeredRules: [],
    };
  }

  // Calculate new expiration date
  const currentExpiration = getMinExpiration(position.trade.legs);
  const newExpiration = calculateNewExpiration(currentExpiration, rules.rollToDTE);

  // Estimate roll credit (simplified - would need market data in practice)
  const estimatedCredit = estimateRollCredit(position, rules, context);

  // Check if we can get credit
  if (rules.requireCredit && estimatedCredit <= 0) {
    if (rules.closeIfNoCredit) {
      return {
        shouldAct: false,
        reason: "Cannot roll for credit; close position instead",
        triggeredRules: ["no-credit-close"],
        metadata: {
          estimatedCredit,
          suggestClose: true,
        },
      };
    } else {
      return {
        shouldAct: false,
        reason: "Cannot roll for credit; credit required",
        triggeredRules: [],
        metadata: { estimatedCredit },
      };
    }
  }

  // Check minimum roll credit
  if (rules.minRollCredit !== undefined && estimatedCredit < rules.minRollCredit) {
    if (rules.closeIfNoCredit) {
      return {
        shouldAct: false,
        reason: `Roll credit $${estimatedCredit.toFixed(2)} below minimum $${rules.minRollCredit.toFixed(2)}; close instead`,
        triggeredRules: ["insufficient-credit-close"],
        metadata: {
          estimatedCredit,
          suggestClose: true,
        },
      };
    } else {
      return {
        shouldAct: false,
        reason: `Roll credit $${estimatedCredit.toFixed(2)} below minimum $${rules.minRollCredit.toFixed(2)}`,
        triggeredRules: [],
        metadata: { estimatedCredit },
      };
    }
  }

  // Calculate strike adjustments if needed
  let strikeAdjustments: RollDecision["strikeAdjustment"];
  if (rules.adjustStrikes && rules.strikeAdjustment) {
    strikeAdjustments = calculateStrikeAdjustments(position, rules.strikeAdjustment, context);
    if (strikeAdjustments && strikeAdjustments.length > 0) {
      triggeredRules.push("strike-adjustment");
      reasons.push(
        `Adjusting ${strikeAdjustments.length} strike(s) for ${rules.strikeAdjustment.direction ?? "auto"} movement`
      );
    }
  }

  const reason = reasons.join(" | ");

  return {
    shouldAct: shouldRoll,
    reason,
    triggeredRules,
    newExpiration,
    strikeAdjustment: strikeAdjustments,
    expectedCredit: estimatedCredit,
    metadata: {
      currentDTE,
      rollCount,
      currentExpiration,
    },
  };
}

/**
 * Calculate minimum DTE across all legs
 */
function calculateMinDTE(
  legs: Array<{ expiration: string }>,
  currentDate: Date
): number {
  return Math.min(
    ...legs.map((leg) => {
      const expirationDate = new Date(leg.expiration);
      const diffMs = expirationDate.getTime() - currentDate.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    })
  );
}

/**
 * Get earliest expiration date
 */
function getMinExpiration(legs: Array<{ expiration: string }>): string {
  return legs.reduce((min, leg) =>
    leg.expiration < min ? leg.expiration : min,
    legs[0].expiration
  );
}

/**
 * Calculate new expiration date
 */
function calculateNewExpiration(currentExpiration: string, rollToDTE: number): string {
  const current = new Date(currentExpiration);
  const newDate = new Date(current);
  newDate.setDate(newDate.getDate() + rollToDTE);
  return newDate.toISOString().split("T")[0];
}

/**
 * Estimate roll credit (simplified)
 * In practice, this would query market data for current and new expiration prices
 */
function estimateRollCredit(
  position: Position,
  rules: RollRules,
  context: MarketContext
): number {
  // Simplified estimation: assume we can collect time value difference
  // This is a placeholder - real implementation would fetch option prices

  const currentDTE = calculateMinDTE(position.trade.legs, context.currentDateTime);
  const additionalDTE = rules.rollToDTE;

  // Rough estimate: $0.05 per day of additional time per contract
  // This is very simplified and should be replaced with real pricing
  const estimatedCredit = additionalDTE * 0.05 * position.trade.legs.length;

  return estimatedCredit;
}

/**
 * Calculate strike adjustments for rolling
 */
function calculateStrikeAdjustments(
  position: Position,
  adjustment: NonNullable<RollRules["strikeAdjustment"]>,
  context: MarketContext
): RollDecision["strikeAdjustment"] {
  const adjustments: NonNullable<RollDecision["strikeAdjustment"]> = [];

  position.trade.legs.forEach((leg, idx) => {
    let newStrike = leg.strike;

    if (adjustment.targetDelta !== undefined) {
      // Adjust to target delta
      // Simplified: move strike based on moneyness
      const moneyness = leg.strike / context.underlyingPrice;
      const targetMoneyness = calculateTargetMoneyness(
        adjustment.targetDelta,
        leg.type
      );

      newStrike = context.underlyingPrice * targetMoneyness;
      newStrike = roundToStrike(newStrike);
    } else if (adjustment.strikeCount !== undefined) {
      // Adjust by specific number of strikes (assuming $5 wide strikes)
      const strikeWidth = 5;
      const direction =
        adjustment.direction === "up"
          ? 1
          : adjustment.direction === "down"
          ? -1
          : determineAutoDirection(leg, context);

      newStrike = leg.strike + direction * strikeWidth * adjustment.strikeCount;
    }

    if (newStrike !== leg.strike) {
      adjustments.push({
        legIndex: idx,
        currentStrike: leg.strike,
        newStrike,
      });
    }
  });

  return adjustments.length > 0 ? adjustments : undefined;
}

/**
 * Calculate target moneyness for a given delta
 */
function calculateTargetMoneyness(targetDelta: number, optionType: "call" | "put"): number {
  // Simplified conversion from delta to moneyness
  // Real implementation would use Black-Scholes or similar
  const absDelta = Math.abs(targetDelta);

  if (optionType === "call") {
    // For calls: higher delta = lower strike (more ITM)
    return 1 - (0.5 - absDelta) * 0.5;
  } else {
    // For puts: higher delta = higher strike (more ITM)
    return 1 + (0.5 - absDelta) * 0.5;
  }
}

/**
 * Determine automatic adjustment direction based on position P&L
 */
function determineAutoDirection(
  leg: Position["trade"]["legs"][0],
  context: MarketContext
): number {
  // If short leg, move away from underlying price to reduce risk
  // If long leg, move toward underlying price to increase value
  const isShort = leg.quantity < 0;

  if (leg.type === "call") {
    return isShort && context.underlyingPrice > leg.strike ? 1 : -1;
  } else {
    return isShort && context.underlyingPrice < leg.strike ? -1 : 1;
  }
}

/**
 * Round to nearest strike (typically $5 or $1 increments)
 */
function roundToStrike(price: number): number {
  // For prices > 100, round to $5
  // For prices <= 100, round to $1
  if (price > 100) {
    return Math.round(price / 5) * 5;
  } else {
    return Math.round(price);
  }
}

/**
 * Check if a position is eligible for rolling
 */
export function isRollEligible(
  position: Position,
  rules: RollRules,
  context: MarketContext
): { eligible: boolean; reason: string } {
  const rollCount = position.rollHistory?.length ?? 0;

  if (rules.maxRolls !== undefined && rollCount >= rules.maxRolls) {
    return {
      eligible: false,
      reason: `Max rolls reached (${rollCount}/${rules.maxRolls})`,
    };
  }

  const currentDTE = calculateMinDTE(position.trade.legs, context.currentDateTime);
  if (currentDTE > rules.rollAtDTE) {
    return {
      eligible: false,
      reason: `DTE ${currentDTE} above roll threshold ${rules.rollAtDTE}`,
    };
  }

  return {
    eligible: true,
    reason: "Position eligible for rolling",
  };
}
