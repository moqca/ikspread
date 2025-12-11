/**
 * Demo script showing how to use entry/exit/roll rules
 * Run with: ts-node examples/rules-demo.ts
 */

import { evaluateEntry } from "../src/rules/entry";
import { evaluateExit } from "../src/rules/exit";
import { evaluateRoll, isRollEligible } from "../src/rules/roll";
import type { Trade } from "../src/risk/types";
import type {
  EntryRules,
  ExitRules,
  RollRules,
  Position,
  MarketContext,
} from "../src/rules/types";

// Example market context
const marketContext: MarketContext = {
  currentDateTime: new Date("2025-01-15T14:30:00"),
  underlyingPrice: 475,
  ivPercentile: 65,
  movingAverages: {
    20: 470,
    50: 465,
    200: 450,
  },
  marketHours: {
    isOpen: true,
    openTime: "09:30",
    closeTime: "16:00",
  },
};

// Example entry rules (Iron Condor style)
const entryRules: EntryRules = {
  minIVPercentile: 50,
  maxIVPercentile: 90,
  minDTE: 30,
  maxDTE: 45,
  allowedDaysOfWeek: [1, 2, 3, 4], // Mon-Thu
  minTimeOfDay: "10:00",
  maxTimeOfDay: "15:00",
  deltaRange: {
    min: -0.2,
    max: 0.2,
  },
  minCreditRatio: 0.3,
};

// Example exit rules
const exitRules: ExitRules = {
  profitTarget: 0.5, // Exit at 50% of max profit
  stopLoss: 0.75, // Stop at 75% of max loss
  maxDTE: 7, // Exit when 7 DTE or less
  deltaBreach: {
    threshold: 0.4,
    direction: "above",
  },
  trailingStop: {
    activationLevel: 0.4, // Start trailing after 40% profit
    trailAmount: 0.15, // Trail by 15%
  },
  timeBasedExits: {
    maxHoldingPeriod: 30,
    exitOnFriday: false,
  },
};

// Example roll rules
const rollRules: RollRules = {
  rollAtDTE: 7,
  rollToDTE: 30,
  requireCredit: true,
  minRollCredit: 0.1,
  adjustStrikes: true,
  strikeAdjustment: {
    targetDelta: 0.16,
  },
  maxRolls: 3,
  closeIfNoCredit: true,
};

// Example trade for entry evaluation
const potentialTrade: Trade = {
  id: "trade-002",
  symbol: "SPY",
  legs: [
    {
      type: "put",
      strike: 450,
      expiration: "2025-02-21", // 37 DTE from context date
      quantity: -1,
      delta: 0.3,
    },
    {
      type: "put",
      strike: 445,
      expiration: "2025-02-21",
      quantity: 1,
      delta: -0.25,
    },
  ],
  netCredit: 1.75,
  underlyingPrice: 475,
  underlyingVolume: 100000000,
  ivPercentile: 65,
  strategy: "credit-spread",
};

// Example existing position for exit/roll evaluation
const existingPosition: Position = {
  id: "pos-001",
  trade: {
    symbol: "SPY",
    legs: [
      {
        type: "put",
        strike: 460,
        expiration: "2025-01-22", // 7 DTE from context date
        quantity: -1,
        delta: 0.45,
      },
      {
        type: "put",
        strike: 455,
        expiration: "2025-01-22",
        quantity: 1,
        delta: -0.38,
      },
    ],
    entryDate: "2024-12-20",
    entryCredit: 1.5,
    spreadWidth: 5,
  },
  pnl: {
    currentValue: 0.75, // Position worth $75 to close
    realizedPnL: 75, // Made $75 profit
    percentOfMaxProfit: 0.5, // 50% of max profit
    percentOfMaxLoss: 0, // No loss
  },
  greeks: {
    delta: 0.35,
    gamma: 0.05,
    theta: -0.5,
    vega: 2.0,
  },
  rollHistory: [],
};

function runDemo() {
  console.log("=== Entry/Exit/Roll Rules Demo ===\n");
  console.log(`Market Context: ${marketContext.currentDateTime.toISOString()}`);
  console.log(`Underlying: $${marketContext.underlyingPrice}`);
  console.log(`IV Percentile: ${marketContext.ivPercentile}%\n`);

  // Test 1: Evaluate entry for a new trade
  console.log("--- Test 1: Entry Evaluation ---");
  console.log(`Trade: ${potentialTrade.symbol} ${potentialTrade.legs[0].strike}/${potentialTrade.legs[1].strike} put spread`);
  console.log(`Credit: $${potentialTrade.netCredit}`);
  console.log();

  const entryDecision = evaluateEntry(potentialTrade, entryRules, marketContext);
  console.log(`Should Enter: ${entryDecision.shouldAct ? "✓ YES" : "✗ NO"}`);
  console.log(`Reason: ${entryDecision.reason}`);
  if (entryDecision.triggeredRules.length > 0) {
    console.log(`Triggered Rules: ${entryDecision.triggeredRules.join(", ")}`);
  }
  console.log();

  // Test 2: Evaluate exit for existing position
  console.log("--- Test 2: Exit Evaluation ---");
  console.log(`Position: ${existingPosition.trade.symbol} ${existingPosition.trade.legs[0].strike}/${existingPosition.trade.legs[1].strike} put spread`);
  console.log(`Entry Date: ${existingPosition.trade.entryDate}`);
  console.log(`Current P&L: $${existingPosition.pnl.realizedPnL}`);
  console.log(`Profit %: ${(existingPosition.pnl.percentOfMaxProfit * 100).toFixed(1)}% of max`);
  console.log();

  const exitDecision = evaluateExit(existingPosition, exitRules, marketContext);
  console.log(`Should Exit: ${exitDecision.shouldAct ? "✓ YES" : "✗ NO"}`);
  console.log(`Reason: ${exitDecision.reason}`);
  if (exitDecision.triggeredRules.length > 0) {
    console.log(`Triggered Rules: ${exitDecision.triggeredRules.join(", ")}`);
  }
  if (exitDecision.metadata) {
    console.log(`Current DTE: ${exitDecision.metadata.currentDTE}`);
  }
  console.log();

  // Test 3: Check if position is roll eligible
  console.log("--- Test 3: Roll Eligibility Check ---");
  const rollEligibility = isRollEligible(existingPosition, rollRules, marketContext);
  console.log(`Roll Eligible: ${rollEligibility.eligible ? "✓ YES" : "✗ NO"}`);
  console.log(`Reason: ${rollEligibility.reason}`);
  console.log();

  // Test 4: Evaluate roll decision
  if (rollEligibility.eligible) {
    console.log("--- Test 4: Roll Evaluation ---");
    const rollDecision = evaluateRoll(existingPosition, rollRules, marketContext);
    console.log(`Should Roll: ${rollDecision.shouldAct ? "✓ YES" : "✗ NO"}`);
    console.log(`Reason: ${rollDecision.reason}`);
    if (rollDecision.newExpiration) {
      console.log(`New Expiration: ${rollDecision.newExpiration}`);
    }
    if (rollDecision.expectedCredit !== undefined) {
      console.log(`Expected Credit: $${rollDecision.expectedCredit.toFixed(2)}`);
    }
    if (rollDecision.strikeAdjustment) {
      console.log("Strike Adjustments:");
      rollDecision.strikeAdjustment.forEach((adj) => {
        console.log(
          `  Leg ${adj.legIndex + 1}: ${adj.currentStrike} → ${adj.newStrike}`
        );
      });
    }
    if (rollDecision.metadata?.suggestClose) {
      console.log("⚠ Suggestion: Close position instead of rolling");
    }
    console.log();
  }

  // Test 5: Scenarios
  console.log("--- Test 5: Different Scenarios ---\n");

  // Scenario A: Position at profit target
  const profitablePosition: Position = {
    ...existingPosition,
    pnl: {
      ...existingPosition.pnl,
      percentOfMaxProfit: 0.52, // Above 50% profit target
      realizedPnL: 78,
    },
  };
  const profitTargetExit = evaluateExit(profitablePosition, exitRules, marketContext);
  console.log("Scenario A: Position at 52% of max profit");
  console.log(`  Should Exit: ${profitTargetExit.shouldAct ? "✓ YES" : "✗ NO"}`);
  console.log(`  Reason: ${profitTargetExit.reason}`);
  console.log();

  // Scenario B: Position with stop loss triggered
  const losingPosition: Position = {
    ...existingPosition,
    pnl: {
      currentValue: 3.8,
      realizedPnL: -230,
      percentOfMaxProfit: 0,
      percentOfMaxLoss: 0.82, // Above 75% stop loss
    },
  };
  const stopLossExit = evaluateExit(losingPosition, exitRules, marketContext);
  console.log("Scenario B: Position at 82% of max loss");
  console.log(`  Should Exit: ${stopLossExit.shouldAct ? "✓ YES" : "✗ NO"}`);
  console.log(`  Reason: ${stopLossExit.reason}`);
  console.log();

  // Scenario C: Entry on wrong day
  const weekendContext: MarketContext = {
    ...marketContext,
    currentDateTime: new Date("2025-01-18T14:30:00"), // Saturday
  };
  const weekendEntry = evaluateEntry(potentialTrade, entryRules, weekendContext);
  console.log("Scenario C: Attempting entry on Saturday");
  console.log(`  Should Enter: ${weekendEntry.shouldAct ? "✓ YES" : "✗ NO"}`);
  console.log(`  Reason: ${weekendEntry.reason}`);
  console.log();

  console.log("=== Demo Complete ===");
}

// Run demo if executed directly
if (require.main === module) {
  try {
    runDemo();
  } catch (error) {
    console.error("Demo failed:", error);
    process.exitCode = 1;
  }
}
