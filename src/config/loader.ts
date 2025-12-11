import * as fs from "fs";
import * as path from "path";
import { GlobalConfig, StrategyConfig } from "./types";

/**
 * Load configuration from a JSON file
 */
export function loadConfig(configPath: string): GlobalConfig {
  const fullPath = path.resolve(configPath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Config file not found: ${fullPath}`);
  }

  const contents = fs.readFileSync(fullPath, "utf-8");
  const config = JSON.parse(contents) as GlobalConfig;

  validateConfig(config);

  return config;
}

/**
 * Load configuration from environment variable or default path
 */
export function loadConfigFromEnv(): GlobalConfig {
  const configPath = process.env.RISK_CONFIG_PATH ?? path.join(process.cwd(), "config", "risk-config.json");
  return loadConfig(configPath);
}

/**
 * Basic validation of configuration
 */
function validateConfig(config: GlobalConfig): void {
  if (!config.maxTotalRisk || config.maxTotalRisk <= 0) {
    throw new Error("maxTotalRisk must be positive");
  }

  if (!config.maxOpenPositions || config.maxOpenPositions <= 0) {
    throw new Error("maxOpenPositions must be positive");
  }

  if (!config.defaultRisk) {
    throw new Error("defaultRisk is required");
  }

  validateRiskConfig(config.defaultRisk);

  if (config.strategies) {
    config.strategies.forEach((strategy, idx) => {
      if (!strategy.name) {
        throw new Error(`Strategy at index ${idx} missing name`);
      }
      if (strategy.risk) {
        validateRiskConfig(strategy.risk);
      }
    });
  }
}

function validateRiskConfig(risk: any): void {
  if (!risk.maxPositionSize || risk.maxPositionSize <= 0) {
    throw new Error("maxPositionSize must be positive");
  }

  if (!risk.maxPortfolioAllocation || risk.maxPortfolioAllocation <= 0 || risk.maxPortfolioAllocation > 1) {
    throw new Error("maxPortfolioAllocation must be between 0 and 1");
  }

  if (!risk.minDaysToExpiration || risk.minDaysToExpiration < 0) {
    throw new Error("minDaysToExpiration must be non-negative");
  }

  if (!risk.maxDaysToExpiration || risk.maxDaysToExpiration <= risk.minDaysToExpiration) {
    throw new Error("maxDaysToExpiration must be greater than minDaysToExpiration");
  }

  if (!risk.delta || typeof risk.delta.min !== "number" || typeof risk.delta.max !== "number") {
    throw new Error("delta.min and delta.max are required");
  }

  if (risk.delta.min >= risk.delta.max) {
    throw new Error("delta.max must be greater than delta.min");
  }
}

/**
 * Get enabled strategies from config
 */
export function getEnabledStrategies(config: GlobalConfig): StrategyConfig[] {
  return config.strategies.filter(s => s.enabled);
}
