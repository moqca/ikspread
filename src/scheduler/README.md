# Scheduler & Orchestration

Automated task scheduling with market hours gating and trading orchestration for the ikspread trading bot.

## Features

- **Periodic Scheduling**: Run tasks at configurable intervals (e.g., every 15 minutes)
- **Market Hours Gating**: Automatically respect market hours and holidays
- **Trading Orchestration**: Coordinate position monitoring, entry scanning, and roll management
- **Event System**: Subscribe to scheduler events for logging and monitoring
- **Dry Run Mode**: Test orchestration logic without executing real trades
- **Priority-Based Execution**: Tasks execute in priority order
- **Error Handling**: Automatic retry and failure tracking
- **Custom Tasks**: Register additional tasks as needed

## Quick Start

### Basic Scheduler

```typescript
import { Scheduler } from './scheduler';

const config = {
  intervalMinutes: 15,
  respectMarketHours: true,
  runOnStart: false,
};

const scheduler = new Scheduler(config);

// Register a task
scheduler.registerTask({
  id: 'my-task',
  name: 'My Task',
  execute: async () => {
    console.log('Task running!');
  },
  enabled: true,
  priority: 100,
});

// Start scheduling
scheduler.start();

// Stop when done
scheduler.stop();
```

### Trading Orchestrator

```typescript
import { createDefaultOrchestrator } from './scheduler';

// Create orchestrator in dry-run mode
const orchestrator = createDefaultOrchestrator(true);

// Start the orchestrator
orchestrator.start();

// Trigger manual execution
await orchestrator.runNow();

// Stop when done
orchestrator.stop();
```

## Market Hours

The scheduler includes US market hours by default:
- **Open**: 9:30 AM ET
- **Close**: 4:00 PM ET
- **Days**: Monday-Friday
- **Holidays**: 2025 US market holidays included
- **Grace Periods**: 15 minutes after open, 15 minutes before close

### Check Market Status

```typescript
import { isMarketOpen, getUSMarketHoursConfig } from './scheduler';

const config = getUSMarketHoursConfig();
const status = isMarketOpen(config);

if (status.isOpen) {
  console.log('Market is open!');
} else {
  console.log(`Market closed: ${status.closedReason}`);
}
```

### Custom Market Hours

```typescript
const customConfig = {
  openTime: '08:00',
  closeTime: '17:00',
  openDays: [1, 2, 3, 4, 5], // Mon-Fri
  holidays: ['2025-12-25'],
  graceAfterOpen: 30,
  graceBeforeClose: 30,
};
```

## Orchestrator Tasks

The orchestrator runs three main tasks:

### 1. Position Monitoring (Priority: 100)
Monitors existing positions for exit signals:
- Profit targets
- Stop losses
- DTE thresholds
- Delta breaches
- Trailing stops

### 2. Roll Management (Priority: 75)
Checks positions for rolling opportunities:
- DTE-based roll triggers
- Credit requirement validation
- Strike adjustments
- Close-if-no-credit fallback

### 3. Entry Scanning (Priority: 50)
Scans for new trade opportunities:
- Fetch screener data
- Apply risk filters
- Evaluate entry rules
- Calculate position sizes
- Place orders if criteria met

## Custom Tasks

Register additional tasks as needed:

```typescript
const customTask = {
  id: 'custom-analytics',
  name: 'Daily Analytics',
  execute: async () => {
    // Your custom logic here
    console.log('Running analytics...');
  },
  enabled: true,
  priority: 25,
  requiresMarketOpen: false, // Can run anytime
};

orchestrator.registerCustomTask(customTask);
```

## Configuration

### Schedule Configuration

```typescript
interface ScheduleConfig {
  intervalMinutes: number;        // 15 for every 15 minutes
  respectMarketHours: boolean;    // true to gate on market hours
  timezone?: string;              // 'America/New_York'
  runOnStart?: boolean;           // Run immediately on start
  maxConsecutiveErrors?: number;  // Stop after N errors
  marketHours?: MarketHoursConfig;
}
```

### Orchestrator Configuration

```typescript
interface OrchestratorConfig {
  schedule: ScheduleConfig;
  enablePositionMonitoring: boolean;
  enableEntryScanning: boolean;
  enableRollManagement: boolean;
  dryRun: boolean; // Test mode
}
```

## Event Handling

Subscribe to scheduler events:

```typescript
orchestrator.getScheduler().on((event) => {
  console.log(`Event: ${event.type}`, event.data);
});
```

Event types:
- `start` - Scheduler started
- `stop` - Scheduler stopped
- `task_start` - Task execution started
- `task_complete` - Task completed successfully
- `task_error` - Task failed
- `market_closed` - Skipped execution (market closed)
- `error` - Scheduler error

## Feature Toggles

Enable/disable features at runtime:

```typescript
// Disable entry scanning
orchestrator.setFeatureEnabled('enableEntryScanning', false);

// Re-enable it
orchestrator.setFeatureEnabled('enableEntryScanning', true);
```

## Execution History

Track task execution history:

```typescript
const scheduler = orchestrator.getScheduler();

// Get last 10 executions
const history = scheduler.getHistory(10);

history.forEach((result) => {
  console.log(`${result.taskName}: ${result.success ? '✓' : '✗'} (${result.durationMs}ms)`);
});
```

## State Monitoring

Check scheduler state:

```typescript
const state = scheduler.getState();

console.log(`Running: ${state.isRunning}`);
console.log(`Total runs: ${state.totalRuns}`);
console.log(`Last run: ${state.lastRunTime}`);
console.log(`Next run: ${state.nextRunTime}`);
console.log(`Errors: ${state.consecutiveErrors}`);
```

## Integration with Trading Logic

The orchestrator provides hooks for integrating actual trading logic:

```typescript
// In orchestrator.ts, implement these methods:

private async monitorPositions() {
  // 1. Get open positions from broker
  // 2. Load exit rules for each position
  // 3. Evaluate exit conditions using src/rules/exit
  // 4. Place closing orders if exit triggered
}

private async scanForEntries() {
  // 1. Fetch screener data from TradeOtter
  // 2. Apply risk filters using src/risk/filters
  // 3. Evaluate entry rules using src/rules/entry
  // 4. Calculate position size using src/position/sizing
  // 5. Place orders if all criteria pass
}

private async manageRolls() {
  // 1. Get positions near expiration
  // 2. Evaluate roll rules using src/rules/roll
  // 3. Calculate expected credits
  // 4. Execute rolls or close positions
}
```

## Running the Demo

```bash
npm run demo:scheduler
```

This demonstrates:
1. Market hours checking
2. Basic task scheduling
3. Market hours gating
4. Trading orchestration
5. Custom task registration
6. Feature toggles

## Production Deployment

For production use:

1. Set `dryRun: false` in orchestrator config
2. Implement actual trading logic in orchestrator methods
3. Connect to broker API (IBKR)
4. Connect to data sources (TradeOtter)
5. Set up monitoring and alerting
6. Configure error handling and notifications
7. Use proper logging system
8. Set appropriate interval (15 minutes recommended)

## Architecture

```
Scheduler
├── Market Hours Checker
│   ├── Check current time
│   ├── Verify market day
│   └── Check holidays
├── Task Manager
│   ├── Register tasks
│   ├── Prioritize tasks
│   └── Execute sequentially
├── Event System
│   └── Emit events for monitoring
└── State Management
    ├── Track executions
    ├── Monitor errors
    └── Maintain history

Orchestrator
├── Position Monitoring
├── Roll Management
├── Entry Scanning
└── Custom Tasks
```

## Best Practices

1. **Use dry-run mode** for testing
2. **Monitor execution history** for issues
3. **Set appropriate intervals** (15 min recommended)
4. **Respect market hours** to avoid off-hours activity
5. **Handle errors gracefully** with retries
6. **Log all events** for debugging
7. **Test with custom tasks** before production
8. **Use feature toggles** for gradual rollout
