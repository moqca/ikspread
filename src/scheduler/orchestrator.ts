import { Scheduler } from "./scheduler";
import { OrchestratorConfig, ScheduledTask } from "./types";
import { getUSMarketHoursConfig } from "./market-hours";

/**
 * Trading orchestrator - coordinates all trading activities
 */
export class TradingOrchestrator {
  private scheduler: Scheduler;
  private config: OrchestratorConfig;

  constructor(config: OrchestratorConfig) {
    this.config = config;

    // Create scheduler with market hours
    if (!config.schedule.marketHours) {
      config.schedule.marketHours = getUSMarketHoursConfig();
    }

    this.scheduler = new Scheduler(config.schedule);

    // Register default tasks
    this.registerDefaultTasks();
  }

  /**
   * Register default trading tasks
   */
  private registerDefaultTasks(): void {
    // Task 1: Monitor existing positions for exits
    if (this.config.enablePositionMonitoring) {
      const monitorTask: ScheduledTask = {
        id: "position-monitor",
        name: "Monitor Positions for Exit/Roll",
        execute: async () => {
          await this.monitorPositions();
        },
        enabled: true,
        priority: 100, // Highest priority
        requiresMarketOpen: true,
      };
      this.scheduler.registerTask(monitorTask);
    }

    // Task 2: Scan for new entry opportunities
    if (this.config.enableEntryScanning) {
      const scanTask: ScheduledTask = {
        id: "entry-scanner",
        name: "Scan for Entry Opportunities",
        execute: async () => {
          await this.scanForEntries();
        },
        enabled: true,
        priority: 50, // Medium priority
        requiresMarketOpen: true,
      };
      this.scheduler.registerTask(scanTask);
    }

    // Task 3: Check positions for rolling
    if (this.config.enableRollManagement) {
      const rollTask: ScheduledTask = {
        id: "roll-manager",
        name: "Check Positions for Rolling",
        execute: async () => {
          await this.manageRolls();
        },
        enabled: true,
        priority: 75, // High priority
        requiresMarketOpen: true,
      };
      this.scheduler.registerTask(rollTask);
    }
  }

  /**
   * Monitor existing positions for exit signals
   */
  private async monitorPositions(): Promise<void> {
    console.log("📊 Monitoring positions...");

    if (this.config.dryRun) {
      console.log("  [DRY RUN] Would check positions for exit criteria");
      console.log("  - Check profit targets");
      console.log("  - Check stop losses");
      console.log("  - Check DTE thresholds");
      console.log("  - Check delta breaches");
      return;
    }

    // TODO: Implement actual position monitoring
    // This would:
    // 1. Get all open positions from broker
    // 2. For each position:
    //    - Load applicable exit rules
    //    - Evaluate exit conditions
    //    - If exit triggered, place closing order
    // 3. Log results

    console.log("  Position monitoring not yet implemented (needs broker integration)");
  }

  /**
   * Scan for new entry opportunities
   */
  private async scanForEntries(): Promise<void> {
    console.log("🔍 Scanning for entry opportunities...");

    if (this.config.dryRun) {
      console.log("  [DRY RUN] Would scan for new trades");
      console.log("  - Fetch screener data");
      console.log("  - Apply risk filters");
      console.log("  - Evaluate entry rules");
      console.log("  - Calculate position sizes");
      console.log("  - Place orders if criteria met");
      return;
    }

    // TODO: Implement entry scanning
    // This would:
    // 1. Fetch screener data (from TradeOtter or other source)
    // 2. For each opportunity:
    //    - Load applicable strategy config
    //    - Check risk filters
    //    - Evaluate entry rules
    //    - Calculate position size
    //    - If all pass, place order
    // 3. Log results

    console.log("  Entry scanning not yet implemented (needs data source integration)");
  }

  /**
   * Check positions for rolling opportunities
   */
  private async manageRolls(): Promise<void> {
    console.log("🔄 Checking for roll opportunities...");

    if (this.config.dryRun) {
      console.log("  [DRY RUN] Would check positions for rolling");
      console.log("  - Check DTE thresholds");
      console.log("  - Evaluate roll rules");
      console.log("  - Calculate roll credits");
      console.log("  - Adjust strikes if needed");
      console.log("  - Execute rolls or close positions");
      return;
    }

    // TODO: Implement roll management
    // This would:
    // 1. Get all open positions
    // 2. For each position:
    //    - Check if eligible for rolling
    //    - Evaluate roll rules
    //    - Calculate expected credit
    //    - If roll approved, execute
    //    - Otherwise close if required
    // 3. Log results

    console.log("  Roll management not yet implemented (needs broker integration)");
  }

  /**
   * Start the orchestrator
   */
  start(): void {
    console.log("🚀 Starting Trading Orchestrator");
    console.log(`   Interval: ${this.config.schedule.intervalMinutes} minutes`);
    console.log(`   Market Hours Gating: ${this.config.schedule.respectMarketHours}`);
    console.log(`   Dry Run: ${this.config.dryRun}`);
    console.log(`   Position Monitoring: ${this.config.enablePositionMonitoring}`);
    console.log(`   Entry Scanning: ${this.config.enableEntryScanning}`);
    console.log(`   Roll Management: ${this.config.enableRollManagement}`);
    console.log();

    this.scheduler.start();
  }

  /**
   * Stop the orchestrator
   */
  stop(): void {
    console.log("🛑 Stopping Trading Orchestrator");
    this.scheduler.stop();
  }

  /**
   * Trigger immediate execution
   */
  async runNow(): Promise<void> {
    console.log("⚡ Manual execution triggered");
    await this.scheduler.runNow();
  }

  /**
   * Get scheduler instance
   */
  getScheduler(): Scheduler {
    return this.scheduler;
  }

  /**
   * Get orchestrator configuration
   */
  getConfig(): OrchestratorConfig {
    return { ...this.config };
  }

  /**
   * Register a custom task
   */
  registerCustomTask(task: ScheduledTask): void {
    this.scheduler.registerTask(task);
  }

  /**
   * Enable/disable specific features
   */
  setFeatureEnabled(feature: keyof Pick<OrchestratorConfig, "enablePositionMonitoring" | "enableEntryScanning" | "enableRollManagement">, enabled: boolean): void {
    this.config[feature] = enabled;

    // Update corresponding task
    const taskMap = {
      enablePositionMonitoring: "position-monitor",
      enableEntryScanning: "entry-scanner",
      enableRollManagement: "roll-manager",
    };

    const taskId = taskMap[feature];
    if (enabled) {
      this.scheduler.enableTask(taskId);
    } else {
      this.scheduler.disableTask(taskId);
    }
  }
}

/**
 * Create default orchestrator with recommended settings
 */
export function createDefaultOrchestrator(dryRun: boolean = true): TradingOrchestrator {
  const config: OrchestratorConfig = {
    schedule: {
      intervalMinutes: 15,
      respectMarketHours: true,
      marketHours: getUSMarketHoursConfig(),
      timezone: "America/New_York",
      runOnStart: false,
      maxConsecutiveErrors: 5,
    },
    enablePositionMonitoring: true,
    enableEntryScanning: true,
    enableRollManagement: true,
    dryRun,
  };

  return new TradingOrchestrator(config);
}
