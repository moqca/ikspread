import { ExitRules, Position, MarketContext, RuleDecision } from "./types";

/**
 * Evaluate whether a position should be exited based on exit rules
 */
export function evaluateExit(
  position: Position,
  rules: ExitRules,
  context: MarketContext
): RuleDecision {
  const triggeredRules: string[] = [];
  let shouldExit = false;
  const reasons: string[] = [];

  // Check profit target
  if (rules.profitTarget !== undefined) {
    if (position.pnl.percentOfMaxProfit >= rules.profitTarget) {
      shouldExit = true;
      triggeredRules.push("profit-target");
      reasons.push(
        `Profit target reached: ${(position.pnl.percentOfMaxProfit * 100).toFixed(1)}% of max profit (target: ${(rules.profitTarget * 100).toFixed(1)}%)`
      );
    }
  }

  // Check stop loss
  if (rules.stopLoss !== undefined) {
    if (position.pnl.percentOfMaxLoss >= rules.stopLoss) {
      shouldExit = true;
      triggeredRules.push("stop-loss");
      reasons.push(
        `Stop loss triggered: ${(position.pnl.percentOfMaxLoss * 100).toFixed(1)}% of max loss (stop: ${(rules.stopLoss * 100).toFixed(1)}%)`
      );
    }
  }

  // Check DTE
  const currentDTE = calculateMinDTE(position.trade.legs, context.currentDateTime);
  if (rules.maxDTE !== undefined && currentDTE <= rules.maxDTE) {
    shouldExit = true;
    triggeredRules.push("max-dte");
    reasons.push(`DTE ${currentDTE} at or below exit threshold ${rules.maxDTE}`);
  }

  // Check days before expiration
  if (rules.daysBeforeExpiration && rules.daysBeforeExpiration.includes(currentDTE)) {
    shouldExit = true;
    triggeredRules.push("days-before-expiration");
    reasons.push(`Exit scheduled at ${currentDTE} DTE`);
  }

  // Check delta breach
  if (rules.deltaBreach && position.greeks) {
    const currentDelta = position.greeks.delta;
    const breached =
      (rules.deltaBreach.direction === "above" &&
        currentDelta > rules.deltaBreach.threshold) ||
      (rules.deltaBreach.direction === "below" &&
        currentDelta < rules.deltaBreach.threshold);

    if (breached) {
      shouldExit = true;
      triggeredRules.push("delta-breach");
      reasons.push(
        `Delta breach: current ${currentDelta.toFixed(3)} is ${rules.deltaBreach.direction} threshold ${rules.deltaBreach.threshold}`
      );
    }
  }

  // Check trailing stop
  if (rules.trailingStop) {
    const trailingStopCheck = evaluateTrailingStop(position, rules.trailingStop);
    if (trailingStopCheck.triggered) {
      shouldExit = true;
      triggeredRules.push("trailing-stop");
      reasons.push(trailingStopCheck.reason);
    }
  }

  // Check time-based exits
  if (rules.timeBasedExits) {
    if (rules.timeBasedExits.maxHoldingPeriod !== undefined) {
      const holdingPeriod = calculateHoldingPeriod(
        position.trade.entryDate,
        context.currentDateTime
      );
      if (holdingPeriod >= rules.timeBasedExits.maxHoldingPeriod) {
        shouldExit = true;
        triggeredRules.push("max-holding-period");
        reasons.push(
          `Max holding period reached: ${holdingPeriod} days (limit: ${rules.timeBasedExits.maxHoldingPeriod})`
        );
      }
    }

    if (rules.timeBasedExits.exitOnFriday && context.currentDateTime.getDay() === 5) {
      shouldExit = true;
      triggeredRules.push("exit-on-friday");
      reasons.push("Friday exit rule triggered");
    }
  }

  const reason = shouldExit
    ? reasons.join(" | ")
    : "No exit conditions met";

  return {
    shouldAct: shouldExit,
    reason,
    triggeredRules,
    metadata: {
      currentDTE,
      currentPnL: position.pnl.realizedPnL,
      percentOfMaxProfit: position.pnl.percentOfMaxProfit,
      percentOfMaxLoss: position.pnl.percentOfMaxLoss,
    },
  };
}

/**
 * Evaluate trailing stop loss
 */
function evaluateTrailingStop(
  position: Position,
  trailingStop: { activationLevel: number; trailAmount: number }
): { triggered: boolean; reason: string } {
  const maxProfitAchieved = position.pnl.percentOfMaxProfit;

  // Check if we've reached activation level
  if (maxProfitAchieved < trailingStop.activationLevel) {
    return {
      triggered: false,
      reason: "Trailing stop not activated",
    };
  }

  // Calculate trailing stop level
  const trailingStopLevel = maxProfitAchieved - trailingStop.trailAmount;

  // Check if current profit has fallen below trailing stop
  const currentProfit = position.pnl.percentOfMaxProfit;
  if (currentProfit <= trailingStopLevel) {
    return {
      triggered: true,
      reason: `Trailing stop hit: current profit ${(currentProfit * 100).toFixed(1)}% fell below trailing level ${(trailingStopLevel * 100).toFixed(1)}%`,
    };
  }

  return {
    triggered: false,
    reason: "Trailing stop active but not triggered",
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
 * Calculate holding period in days
 */
function calculateHoldingPeriod(entryDate: string, currentDate: Date): number {
  const entry = new Date(entryDate);
  const diffMs = currentDate.getTime() - entry.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate potential profit if exited now
 */
export function calculateExitProfit(
  position: Position,
  currentValue: number
): {
  profit: number;
  percentOfMaxProfit: number;
  percentOfMaxLoss: number;
} {
  const maxProfit = position.trade.entryCredit * 100; // Credit spreads max profit = credit received
  const maxLoss = position.trade.spreadWidth * 100 - maxProfit; // Max loss = spread width - credit

  const profit = maxProfit - currentValue * 100; // Current P&L

  return {
    profit,
    percentOfMaxProfit: profit / maxProfit,
    percentOfMaxLoss: Math.abs(profit) / maxLoss,
  };
}
