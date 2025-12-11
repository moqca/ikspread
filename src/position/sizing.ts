import { PositionSizingConfig, PositionSizingInput, PositionSizingResult } from "./types";

/**
 * Calculate position size based on configured method
 */
export function calculatePositionSize(
  config: PositionSizingConfig,
  input: PositionSizingInput
): PositionSizingResult {
  let contracts: number;
  let details: string;
  let cappedByConstraint: string | undefined;

  switch (config.method) {
    case "fixed-contracts":
      ({ contracts, details } = calculateFixedContracts(config, input));
      break;

    case "fixed-dollar-risk":
      ({ contracts, details } = calculateFixedDollarRisk(config, input));
      break;

    case "percent-portfolio":
      ({ contracts, details } = calculatePercentPortfolio(config, input));
      break;

    case "kelly-criterion":
      ({ contracts, details } = calculateKellyCriterion(config, input));
      break;

    default:
      throw new Error(`Unknown position sizing method: ${config.method}`);
  }

  // Apply signal strength scaling if provided
  if (input.signalStrength !== undefined && input.signalStrength < 1) {
    const originalContracts = contracts;
    contracts = Math.floor(contracts * input.signalStrength);
    details += ` | Scaled by signal strength ${input.signalStrength.toFixed(2)}: ${originalContracts} → ${contracts}`;
  }

  // Apply min/max constraints
  if (contracts < config.minSize) {
    cappedByConstraint = "minimum";
    contracts = config.minSize;
    details += ` | Capped at minimum: ${config.minSize}`;
  }

  if (contracts > config.maxSize) {
    cappedByConstraint = "maximum";
    contracts = config.maxSize;
    details += ` | Capped at maximum: ${config.maxSize}`;
  }

  // Check buying power constraint
  if (config.considerMargin && input.marginPerContract) {
    const marginRequired = contracts * input.marginPerContract;
    if (marginRequired > input.availableBuyingPower) {
      const originalContracts = contracts;
      contracts = Math.floor(input.availableBuyingPower / input.marginPerContract);
      cappedByConstraint = "buying-power";
      details += ` | Limited by buying power: ${originalContracts} → ${contracts}`;
    }
  }

  // Round to integer if required
  if (config.roundToInteger) {
    contracts = Math.floor(contracts);
  }

  const dollarRisk = contracts * input.maxLossPerContract;
  const percentRisk = dollarRisk / input.portfolioValue;
  const marginRequired = input.marginPerContract ? contracts * input.marginPerContract : undefined;

  return {
    contracts,
    method: config.method,
    dollarRisk,
    percentRisk,
    marginRequired,
    cappedByConstraint,
    details,
  };
}

/**
 * Fixed contracts method - always use a fixed number of contracts
 */
function calculateFixedContracts(
  config: PositionSizingConfig,
  input: PositionSizingInput
): { contracts: number; details: string } {
  if (!config.fixedContracts) {
    throw new Error("fixedContracts must be specified for fixed-contracts method");
  }

  return {
    contracts: config.fixedContracts,
    details: `Fixed contracts: ${config.fixedContracts}`,
  };
}

/**
 * Fixed dollar risk method - risk a fixed dollar amount per trade
 */
function calculateFixedDollarRisk(
  config: PositionSizingConfig,
  input: PositionSizingInput
): { contracts: number; details: string } {
  if (!config.fixedDollarRisk) {
    throw new Error("fixedDollarRisk must be specified for fixed-dollar-risk method");
  }

  const contracts = config.fixedDollarRisk / input.maxLossPerContract;

  return {
    contracts,
    details: `Fixed dollar risk $${config.fixedDollarRisk} / max loss per contract $${input.maxLossPerContract.toFixed(2)} = ${contracts.toFixed(2)} contracts`,
  };
}

/**
 * Percent portfolio method - risk a percentage of portfolio value
 */
function calculatePercentPortfolio(
  config: PositionSizingConfig,
  input: PositionSizingInput
): { contracts: number; details: string } {
  if (!config.percentRisk) {
    throw new Error("percentRisk must be specified for percent-portfolio method");
  }

  const dollarRisk = input.portfolioValue * config.percentRisk;
  const contracts = dollarRisk / input.maxLossPerContract;

  return {
    contracts,
    details: `Portfolio risk ${(config.percentRisk * 100).toFixed(2)}% of $${input.portfolioValue} = $${dollarRisk.toFixed(2)} / max loss per contract $${input.maxLossPerContract.toFixed(2)} = ${contracts.toFixed(2)} contracts`,
  };
}

/**
 * Kelly criterion method - optimal betting size based on edge and win rate
 */
function calculateKellyCriterion(
  config: PositionSizingConfig,
  input: PositionSizingInput
): { contracts: number; details: string } {
  // Use config values or fall back to performance data
  let winRate = config.winRate;
  let winLossRatio = config.winLossRatio;

  if (input.performance) {
    winRate = input.performance.winRate;
    if (input.performance.avgLoss !== 0) {
      winLossRatio = Math.abs(input.performance.avgWin / input.performance.avgLoss);
    }
  }

  if (winRate === undefined || winLossRatio === undefined) {
    throw new Error(
      "Kelly criterion requires winRate and winLossRatio in config or performance data"
    );
  }

  // Kelly formula: f = (bp - q) / b
  // where:
  //   f = fraction of bankroll to bet
  //   b = odds received on the bet (win/loss ratio)
  //   p = probability of winning (win rate)
  //   q = probability of losing (1 - win rate)
  const p = winRate;
  const q = 1 - winRate;
  const b = winLossRatio;

  let kellyFraction = (b * p - q) / b;

  // Apply Kelly fraction multiplier (for fractional Kelly)
  const kellyMultiplier = config.kellyFraction ?? 0.25;
  kellyFraction *= kellyMultiplier;

  // Ensure non-negative
  kellyFraction = Math.max(0, kellyFraction);

  const dollarRisk = input.portfolioValue * kellyFraction;
  const contracts = dollarRisk / input.maxLossPerContract;

  return {
    contracts,
    details: `Kelly criterion: win rate ${(p * 100).toFixed(2)}%, win/loss ratio ${b.toFixed(2)}, Kelly fraction ${kellyFraction.toFixed(4)} (${(kellyMultiplier * 100).toFixed(0)}% Kelly) = ${contracts.toFixed(2)} contracts`,
  };
}

/**
 * Calculate recommended position size as percentage of max allowed
 */
export function calculateScaledPosition(
  baseContracts: number,
  scaleFactor: number,
  minSize: number,
  maxSize: number
): number {
  const scaled = baseContracts * scaleFactor;
  return Math.max(minSize, Math.min(maxSize, Math.floor(scaled)));
}

/**
 * Adjust position size based on volatility
 * Higher volatility = smaller position size
 */
export function adjustForVolatility(
  contracts: number,
  currentIV: number,
  historicalIV: number,
  minSize: number
): number {
  const volatilityRatio = currentIV / historicalIV;

  // If current IV is 2x historical IV, reduce position by 50%
  const adjustment = 1 / Math.sqrt(volatilityRatio);

  return Math.max(minSize, Math.floor(contracts * adjustment));
}

/**
 * Calculate total buying power required for a position
 */
export function calculateBuyingPowerRequired(
  contracts: number,
  maxLossPerContract: number,
  creditPerContract: number
): number {
  // For credit spreads, buying power = max loss - credit received
  return contracts * (maxLossPerContract - creditPerContract);
}

/**
 * Calculate return on capital for a position
 */
export function calculateReturnOnCapital(
  creditPerContract: number,
  maxLossPerContract: number
): number {
  const capitalAtRisk = maxLossPerContract - creditPerContract;
  if (capitalAtRisk <= 0) return 0;

  return creditPerContract / capitalAtRisk;
}
