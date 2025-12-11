/**
 * Demo script showing how to use risk filtering and position sizing together
 * Run with: ts-node examples/position-sizing-demo.ts
 */

import { loadConfig } from "../src/config";
import { checkRisk, checkGlobalLimits } from "../src/risk";
import { calculatePositionSize, calculateReturnOnCapital } from "../src/position";
import type { Trade, PortfolioState } from "../src/risk/types";
import type { PositionSizingConfig } from "../src/position/types";

// Example portfolio state
const portfolioState: PortfolioState = {
  totalValue: 100000,
  openPositions: 3,
  totalRisk: 5000,
  availableBuyingPower: 50000,
};

// Example position sizing config
const positionSizingConfig: PositionSizingConfig = {
  method: "percent-portfolio",
  percentRisk: 0.02, // Risk 2% per trade
  minSize: 1,
  maxSize: 10,
  roundToInteger: true,
  considerMargin: true,
};

// Example trade: Put credit spread on SPY
// Sell 450 put, buy 445 put (5-point spread)
// Credit received: $1.50 per contract
const exampleTrade: Trade = {
  id: "trade-001",
  symbol: "SPY",
  legs: [
    {
      type: "put",
      strike: 450,
      expiration: "2025-02-15",
      quantity: -1, // Short
      delta: 0.3,
      gamma: 0.05,
      theta: -0.5,
      vega: 2.0,
      iv: 0.18,
    },
    {
      type: "put",
      strike: 445,
      expiration: "2025-02-15",
      quantity: 1, // Long
      delta: -0.25,
      gamma: 0.04,
      theta: 0.4,
      vega: -1.8,
      iv: 0.17,
    },
  ],
  netCredit: 1.5, // $1.50 credit per spread
  underlyingPrice: 475,
  underlyingVolume: 100000000,
  underlyingMarketCap: 50000000000,
  ivPercentile: 65,
  strategy: "credit-spread",
};

function runDemo() {
  console.log("=== Position Sizing & Risk Management Demo ===\n");

  // Step 1: Load risk configuration
  console.log("Step 1: Loading risk configuration...");
  const config = loadConfig("config/risk-config.example.json");
  console.log(`✓ Loaded config with ${config.strategies.length} strategies\n`);

  // Step 2: Check global portfolio limits
  console.log("Step 2: Checking global portfolio limits...");
  const globalCheck = checkGlobalLimits(portfolioState, config);
  if (globalCheck.passed) {
    console.log("✓ Portfolio is within global limits");
  } else {
    console.log("✗ Portfolio exceeds limits:");
    globalCheck.failures.forEach((f) => console.log(`  - ${f}`));
  }
  console.log();

  // Step 3: Find strategy config
  console.log("Step 3: Finding strategy configuration...");
  const strategy = config.strategies.find((s) => s.name === "credit-spread");
  if (!strategy) {
    console.log("✗ Strategy not found");
    return;
  }
  console.log(`✓ Found strategy: ${strategy.name}\n`);

  // Step 4: Check risk filters
  console.log("Step 4: Checking trade against risk filters...");
  const riskCheck = checkRisk(
    exampleTrade,
    strategy.risk,
    strategy.underlyingFilters,
    portfolioState
  );

  if (riskCheck.passed) {
    console.log("✓ Trade passes all risk filters");
  } else {
    console.log("✗ Trade failed risk checks:");
    riskCheck.failures.forEach((f) => console.log(`  - ${f}`));
  }

  if (riskCheck.warnings.length > 0) {
    console.log("⚠ Warnings:");
    riskCheck.warnings.forEach((w) => console.log(`  - ${w}`));
  }
  console.log();

  // Step 5: Calculate position size
  console.log("Step 5: Calculating position size...");

  // For a 5-point spread with $1.50 credit, max loss = $5.00 - $1.50 = $3.50
  const spreadWidth = 5;
  const maxLossPerContract = (spreadWidth - exampleTrade.netCredit) * 100; // $350
  const creditPerContract = exampleTrade.netCredit * 100; // $150
  const marginPerContract = maxLossPerContract; // For spreads, margin = max loss

  const positionSize = calculatePositionSize(positionSizingConfig, {
    portfolioValue: portfolioState.totalValue,
    availableBuyingPower: portfolioState.availableBuyingPower,
    maxLossPerContract,
    creditPerContract,
    marginPerContract,
    signalStrength: 0.8, // 80% confidence
  });

  console.log(`Position Size: ${positionSize.contracts} contracts`);
  console.log(`Method: ${positionSize.method}`);
  console.log(`Dollar Risk: $${positionSize.dollarRisk.toFixed(2)}`);
  console.log(`Percent Risk: ${(positionSize.percentRisk * 100).toFixed(2)}%`);
  console.log(`Margin Required: $${positionSize.marginRequired?.toFixed(2)}`);
  if (positionSize.cappedByConstraint) {
    console.log(`⚠ Capped by: ${positionSize.cappedByConstraint}`);
  }
  console.log(`Details: ${positionSize.details}`);
  console.log();

  // Step 6: Calculate return metrics
  console.log("Step 6: Calculating return metrics...");
  const roc = calculateReturnOnCapital(creditPerContract, maxLossPerContract);
  console.log(`Return on Capital: ${(roc * 100).toFixed(2)}%`);
  console.log(`Total Credit: $${(creditPerContract * positionSize.contracts).toFixed(2)}`);
  console.log(`Total Max Loss: $${(maxLossPerContract * positionSize.contracts).toFixed(2)}`);
  console.log();

  // Step 7: Final summary
  console.log("=== Final Trade Summary ===");
  console.log(`Symbol: ${exampleTrade.symbol}`);
  console.log(`Strategy: ${exampleTrade.strategy}`);
  console.log(`Contracts: ${positionSize.contracts}`);
  console.log(`Total Credit: $${(creditPerContract * positionSize.contracts).toFixed(2)}`);
  console.log(`Max Risk: $${positionSize.dollarRisk.toFixed(2)}`);
  console.log(`Risk Checks: ${riskCheck.passed ? "✓ PASSED" : "✗ FAILED"}`);
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
