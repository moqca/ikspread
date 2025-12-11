import { RiskConfig, UnderlyingFilters, GlobalConfig } from "../config/types";
import { Trade, RiskCheckResult, PortfolioState } from "./types";

/**
 * Check if a trade passes risk filters
 */
export function checkRisk(
  trade: Trade,
  riskConfig: RiskConfig,
  underlyingFilters: UnderlyingFilters,
  portfolioState?: PortfolioState
): RiskCheckResult {
  const failures: string[] = [];
  const warnings: string[] = [];

  // Check position size
  const totalContracts = trade.legs.reduce((sum, leg) => sum + Math.abs(leg.quantity), 0);
  if (totalContracts > riskConfig.maxPositionSize) {
    failures.push(
      `Position size ${totalContracts} exceeds max ${riskConfig.maxPositionSize}`
    );
  }

  // Check portfolio allocation
  if (portfolioState) {
    const tradeValue = Math.abs(trade.netCredit) * 100 * totalContracts;
    const allocation = tradeValue / portfolioState.totalValue;
    if (allocation > riskConfig.maxPortfolioAllocation) {
      failures.push(
        `Portfolio allocation ${(allocation * 100).toFixed(2)}% exceeds max ${(riskConfig.maxPortfolioAllocation * 100).toFixed(2)}%`
      );
    }
  }

  // Check days to expiration
  trade.legs.forEach((leg, idx) => {
    const dte = calculateDaysToExpiration(leg.expiration);
    if (dte < riskConfig.minDaysToExpiration) {
      failures.push(
        `Leg ${idx + 1} DTE ${dte} below min ${riskConfig.minDaysToExpiration}`
      );
    }
    if (dte > riskConfig.maxDaysToExpiration) {
      failures.push(
        `Leg ${idx + 1} DTE ${dte} exceeds max ${riskConfig.maxDaysToExpiration}`
      );
    }
  });

  // Check delta
  const netDelta = calculateNetDelta(trade.legs);
  if (netDelta !== null) {
    if (netDelta < riskConfig.delta.min || netDelta > riskConfig.delta.max) {
      failures.push(
        `Net delta ${netDelta.toFixed(3)} outside range [${riskConfig.delta.min}, ${riskConfig.delta.max}]`
      );
    }
  }

  // Check Greeks limits
  if (riskConfig.greeks.maxGamma) {
    const netGamma = calculateNetGreek(trade.legs, "gamma");
    if (netGamma !== null && Math.abs(netGamma) > riskConfig.greeks.maxGamma) {
      failures.push(
        `Net gamma ${Math.abs(netGamma).toFixed(3)} exceeds max ${riskConfig.greeks.maxGamma}`
      );
    }
  }

  if (riskConfig.greeks.maxTheta) {
    const netTheta = calculateNetGreek(trade.legs, "theta");
    if (netTheta !== null && Math.abs(netTheta) > riskConfig.greeks.maxTheta) {
      warnings.push(
        `Net theta ${Math.abs(netTheta).toFixed(3)} exceeds max ${riskConfig.greeks.maxTheta}`
      );
    }
  }

  if (riskConfig.greeks.maxVega) {
    const netVega = calculateNetGreek(trade.legs, "vega");
    if (netVega !== null && Math.abs(netVega) > riskConfig.greeks.maxVega) {
      warnings.push(
        `Net vega ${Math.abs(netVega).toFixed(3)} exceeds max ${riskConfig.greeks.maxVega}`
      );
    }
  }

  // Check minimum credit
  if (riskConfig.minCredit && trade.netCredit < riskConfig.minCredit) {
    failures.push(
      `Net credit $${trade.netCredit.toFixed(2)} below min $${riskConfig.minCredit.toFixed(2)}`
    );
  }

  // Check spread width
  if (riskConfig.maxSpreadWidth) {
    const spreadWidth = calculateSpreadWidth(trade.legs);
    if (spreadWidth && spreadWidth > riskConfig.maxSpreadWidth) {
      failures.push(
        `Spread width ${spreadWidth} exceeds max ${riskConfig.maxSpreadWidth}`
      );
    }
  }

  // Check IV percentile
  if (riskConfig.ivPercentile && trade.ivPercentile !== undefined) {
    if (
      trade.ivPercentile < riskConfig.ivPercentile.min ||
      trade.ivPercentile > riskConfig.ivPercentile.max
    ) {
      failures.push(
        `IV percentile ${trade.ivPercentile} outside range [${riskConfig.ivPercentile.min}, ${riskConfig.ivPercentile.max}]`
      );
    }
  }

  // Check underlying filters
  const underlyingCheck = checkUnderlyingFilters(trade, underlyingFilters);
  failures.push(...underlyingCheck.failures);
  warnings.push(...underlyingCheck.warnings);

  return {
    passed: failures.length === 0,
    failures,
    warnings,
  };
}

/**
 * Check underlying filters
 */
function checkUnderlyingFilters(
  trade: Trade,
  filters: UnderlyingFilters
): { failures: string[]; warnings: string[] } {
  const failures: string[] = [];
  const warnings: string[] = [];

  // Check allowed symbols
  if (filters.allowedSymbols && filters.allowedSymbols.length > 0) {
    if (!filters.allowedSymbols.includes(trade.symbol)) {
      failures.push(`Symbol ${trade.symbol} not in allowed list`);
    }
  }

  // Check blocked symbols
  if (filters.blockedSymbols && filters.blockedSymbols.includes(trade.symbol)) {
    failures.push(`Symbol ${trade.symbol} is blocked`);
  }

  // Check price range
  if (filters.minPrice && trade.underlyingPrice < filters.minPrice) {
    failures.push(
      `Underlying price $${trade.underlyingPrice} below min $${filters.minPrice}`
    );
  }

  if (filters.maxPrice && trade.underlyingPrice > filters.maxPrice) {
    failures.push(
      `Underlying price $${trade.underlyingPrice} exceeds max $${filters.maxPrice}`
    );
  }

  // Check volume
  if (filters.minVolume && trade.underlyingVolume !== undefined) {
    if (trade.underlyingVolume < filters.minVolume) {
      warnings.push(
        `Underlying volume ${trade.underlyingVolume} below min ${filters.minVolume}`
      );
    }
  }

  // Check market cap
  if (filters.minMarketCap && trade.underlyingMarketCap !== undefined) {
    if (trade.underlyingMarketCap < filters.minMarketCap) {
      warnings.push(
        `Market cap $${trade.underlyingMarketCap} below min $${filters.minMarketCap}`
      );
    }
  }

  return { failures, warnings };
}

/**
 * Calculate days to expiration from ISO date string
 */
function calculateDaysToExpiration(expiration: string): number {
  const expirationDate = new Date(expiration);
  const now = new Date();
  const diffMs = expirationDate.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate net delta from option legs
 */
function calculateNetDelta(legs: Array<{ delta?: number; quantity: number }>): number | null {
  const hasAllDeltas = legs.every(leg => leg.delta !== undefined);
  if (!hasAllDeltas) return null;

  return legs.reduce((sum, leg) => sum + (leg.delta ?? 0) * leg.quantity, 0);
}

/**
 * Calculate net Greek (gamma, theta, vega) from option legs
 */
function calculateNetGreek(
  legs: Array<{ gamma?: number; theta?: number; vega?: number; quantity: number }>,
  greek: "gamma" | "theta" | "vega"
): number | null {
  const hasAllGreeks = legs.every(leg => leg[greek] !== undefined);
  if (!hasAllGreeks) return null;

  return legs.reduce((sum, leg) => sum + (leg[greek] ?? 0) * leg.quantity, 0);
}

/**
 * Calculate spread width (for vertical spreads)
 */
function calculateSpreadWidth(
  legs: Array<{ strike: number; type: string; quantity: number }>
): number | null {
  if (legs.length !== 2) return null;

  const [leg1, leg2] = legs;
  if (leg1.type !== leg2.type) return null;

  return Math.abs(leg1.strike - leg2.strike);
}

/**
 * Check global portfolio limits
 */
export function checkGlobalLimits(
  portfolioState: PortfolioState,
  globalConfig: GlobalConfig
): RiskCheckResult {
  const failures: string[] = [];
  const warnings: string[] = [];

  if (portfolioState.openPositions >= globalConfig.maxOpenPositions) {
    failures.push(
      `Open positions ${portfolioState.openPositions} at/exceeds max ${globalConfig.maxOpenPositions}`
    );
  }

  if (portfolioState.totalRisk >= globalConfig.maxTotalRisk) {
    failures.push(
      `Total risk $${portfolioState.totalRisk} at/exceeds max $${globalConfig.maxTotalRisk}`
    );
  }

  return {
    passed: failures.length === 0,
    failures,
    warnings,
  };
}
