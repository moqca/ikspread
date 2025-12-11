/**
 * Demo script showing scheduler and orchestration features
 * Run with: ts-node examples/scheduler-demo.ts
 */

import {
  Scheduler,
  TradingOrchestrator,
  createDefaultOrchestrator,
  isMarketOpen,
  getUSMarketHoursConfig,
  minutesUntilMarketOpen,
  minutesUntilMarketClose,
} from "../src/scheduler";
import type { ScheduledTask, ScheduleConfig } from "../src/scheduler/types";

function runDemo() {
  console.log("=== Scheduler & Orchestration Demo ===\n");

  // Demo 1: Market Hours Check
  console.log("--- Demo 1: Market Hours Check ---");
  const marketConfig = getUSMarketHoursConfig();
  const marketStatus = isMarketOpen(marketConfig);

  console.log(`Current Time: ${marketStatus.currentTime.toLocaleString()}`);
  console.log(`Market Status: ${marketStatus.isOpen ? "🟢 OPEN" : "🔴 CLOSED"}`);

  if (!marketStatus.isOpen) {
    console.log(`Reason: ${marketStatus.closedReason}`);
    const minutesUntilOpen = minutesUntilMarketOpen(marketConfig);
    console.log(`Opens in: ${minutesUntilOpen} minutes`);
  } else {
    const minutesUntilClose = minutesUntilMarketClose(marketConfig);
    console.log(`Closes in: ${minutesUntilClose} minutes`);
  }
  console.log();

  // Demo 2: Basic Scheduler
  console.log("--- Demo 2: Basic Scheduler (1-minute interval) ---");

  const scheduleConfig: ScheduleConfig = {
    intervalMinutes: 1, // Run every 1 minute for demo
    respectMarketHours: false, // Ignore market hours for demo
    runOnStart: true,
    maxConsecutiveErrors: 3,
  };

  const scheduler = new Scheduler(scheduleConfig);

  // Register some demo tasks
  let taskACount = 0;
  let taskBCount = 0;

  const taskA: ScheduledTask = {
    id: "demo-task-a",
    name: "Demo Task A",
    execute: async () => {
      taskACount++;
      console.log(`  [Task A] Executed (count: ${taskACount})`);
      await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate work
    },
    enabled: true,
    priority: 100,
  };

  const taskB: ScheduledTask = {
    id: "demo-task-b",
    name: "Demo Task B",
    execute: async () => {
      taskBCount++;
      console.log(`  [Task B] Executed (count: ${taskBCount})`);
      await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate work
    },
    enabled: true,
    priority: 50,
  };

  scheduler.registerTask(taskA);
  scheduler.registerTask(taskB);

  // Register event listener
  scheduler.on((event) => {
    if (event.type === "task_complete") {
      console.log(
        `  ✓ Task completed: ${event.data.taskName} (${event.data.durationMs}ms)`
      );
    }
  });

  console.log("Starting scheduler for 3 seconds...");
  scheduler.start();

  // Run for 3 seconds then stop
  setTimeout(() => {
    scheduler.stop();

    const state = scheduler.getState();
    console.log("\nScheduler stopped");
    console.log(`Total runs: ${state.totalRuns}`);
    console.log(`Task A executions: ${taskACount}`);
    console.log(`Task B executions: ${taskBCount}`);
    console.log();

    // Continue to Demo 3
    runDemo3();
  }, 3000);
}

function runDemo3() {
  console.log("--- Demo 3: Market Hours Gating ---");

  const scheduleConfig: ScheduleConfig = {
    intervalMinutes: 15,
    respectMarketHours: true,
    marketHours: getUSMarketHoursConfig(),
    runOnStart: true,
    maxConsecutiveErrors: 5,
  };

  const scheduler = new Scheduler(scheduleConfig);

  const marketTask: ScheduledTask = {
    id: "market-hours-task",
    name: "Market Hours Task",
    execute: async () => {
      console.log("  ✓ Task executed during market hours!");
    },
    enabled: true,
    requiresMarketOpen: true,
  };

  scheduler.registerTask(marketTask);

  console.log("Triggering scheduler with market hours gating...");
  scheduler.runNow().then(() => {
    const history = scheduler.getHistory();
    console.log(`Execution history entries: ${history.length}`);
    console.log();

    // Continue to Demo 4
    runDemo4();
  });
}

function runDemo4() {
  console.log("--- Demo 4: Trading Orchestrator ---");

  // Create orchestrator in dry-run mode
  const orchestrator = createDefaultOrchestrator(true);

  // Register event listener
  orchestrator.getScheduler().on((event) => {
    if (event.type === "start") {
      console.log("  📢 Orchestrator started");
    } else if (event.type === "market_closed") {
      console.log(`  📢 Market closed: ${event.data.status.closedReason}`);
    } else if (event.type === "task_start") {
      console.log(`  📢 Task starting: ${event.data.taskName}`);
    }
  });

  console.log("Starting orchestrator for single run...\n");

  // Trigger immediate execution
  orchestrator.start();
  orchestrator.runNow().then(() => {
    const state = orchestrator.getScheduler().getState();
    console.log(`\nOrchestrator state:`);
    console.log(`  Total runs: ${state.totalRuns}`);
    console.log(`  Last run: ${state.lastRunTime?.toLocaleTimeString()}`);

    orchestrator.stop();

    // Continue to Demo 5
    runDemo5();
  });
}

function runDemo5() {
  console.log("\n--- Demo 5: Custom Task Registration ---");

  const orchestrator = createDefaultOrchestrator(true);

  // Register a custom task
  const customTask: ScheduledTask = {
    id: "custom-analytics",
    name: "Daily Analytics Report",
    execute: async () => {
      console.log("  📊 Generating daily analytics...");
      console.log("  - Portfolio performance");
      console.log("  - Win/loss ratio");
      console.log("  - Risk metrics");
      console.log("  ✓ Analytics complete");
    },
    enabled: true,
    priority: 25,
    requiresMarketOpen: false, // Can run anytime
  };

  orchestrator.registerCustomTask(customTask);

  console.log("Custom task registered");
  console.log("Tasks in orchestrator:");
  orchestrator.getScheduler().getTasks().forEach((task) => {
    console.log(`  - ${task.name} (priority: ${task.priority ?? 0})`);
  });
  console.log();

  // Continue to Demo 6
  runDemo6();
}

function runDemo6() {
  console.log("--- Demo 6: Feature Toggle ---");

  const orchestrator = createDefaultOrchestrator(true);

  console.log("Initial configuration:");
  const config = orchestrator.getConfig();
  console.log(`  Position Monitoring: ${config.enablePositionMonitoring}`);
  console.log(`  Entry Scanning: ${config.enableEntryScanning}`);
  console.log(`  Roll Management: ${config.enableRollManagement}`);

  // Disable entry scanning
  console.log("\nDisabling entry scanning...");
  orchestrator.setFeatureEnabled("enableEntryScanning", false);

  const updatedConfig = orchestrator.getConfig();
  console.log("\nUpdated configuration:");
  console.log(`  Position Monitoring: ${updatedConfig.enablePositionMonitoring}`);
  console.log(`  Entry Scanning: ${updatedConfig.enableEntryScanning}`);
  console.log(`  Roll Management: ${updatedConfig.enableRollManagement}`);
  console.log();

  console.log("=== Demo Complete ===");
  console.log("\nKey Features Demonstrated:");
  console.log("1. ✓ Market hours checking with holiday support");
  console.log("2. ✓ Periodic task scheduling");
  console.log("3. ✓ Market hours gating for tasks");
  console.log("4. ✓ Trading orchestration with dry-run mode");
  console.log("5. ✓ Custom task registration");
  console.log("6. ✓ Feature toggles");
  console.log("\nNext Steps:");
  console.log("- Integrate with broker API (IBKR)");
  console.log("- Connect to data sources (TradeOtter)");
  console.log("- Implement actual trading logic in orchestrator");
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
