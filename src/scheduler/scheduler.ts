import {
  ScheduleConfig,
  ScheduledTask,
  SchedulerState,
  TaskExecutionResult,
  SchedulerEvent,
  SchedulerEventHandler,
} from "./types";
import { isMarketOpen } from "./market-hours";

/**
 * Task scheduler with market hours gating
 */
export class Scheduler {
  private config: ScheduleConfig;
  private tasks: Map<string, ScheduledTask> = new Map();
  private state: SchedulerState;
  private intervalId?: NodeJS.Timeout;
  private eventHandlers: SchedulerEventHandler[] = [];

  constructor(config: ScheduleConfig) {
    this.config = config;
    this.state = {
      isRunning: false,
      totalRuns: 0,
      consecutiveErrors: 0,
      history: [],
    };
  }

  /**
   * Register a task to be scheduled
   */
  registerTask(task: ScheduledTask): void {
    this.tasks.set(task.id, task);
    this.emit({ type: "task_start", timestamp: new Date(), data: { taskId: task.id } });
  }

  /**
   * Unregister a task
   */
  unregisterTask(taskId: string): void {
    this.tasks.delete(taskId);
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.state.isRunning) {
      console.warn("Scheduler is already running");
      return;
    }

    this.state.isRunning = true;
    this.emit({ type: "start", timestamp: new Date() });

    // Run immediately if configured
    if (this.config.runOnStart) {
      this.runTasks().catch((err) => {
        console.error("Error in initial run:", err);
      });
    }

    // Set up interval
    const intervalMs = this.config.intervalMinutes * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.runTasks().catch((err) => {
        console.error("Error in scheduled run:", err);
      });
    }, intervalMs);

    console.log(`Scheduler started (interval: ${this.config.intervalMinutes} minutes)`);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.state.isRunning) {
      console.warn("Scheduler is not running");
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.state.isRunning = false;
    this.emit({ type: "stop", timestamp: new Date() });

    console.log("Scheduler stopped");
  }

  /**
   * Execute all registered tasks
   */
  private async runTasks(): Promise<void> {
    const now = new Date();
    this.state.lastRunTime = now;

    // Calculate next run time
    const nextRun = new Date(now.getTime() + this.config.intervalMinutes * 60 * 1000);
    this.state.nextRunTime = nextRun;

    // Check market hours if configured
    if (this.config.respectMarketHours && this.config.marketHours) {
      const marketStatus = isMarketOpen(this.config.marketHours, now);

      if (!marketStatus.isOpen) {
        console.log(`Market is closed: ${marketStatus.closedReason}`);
        this.emit({
          type: "market_closed",
          timestamp: now,
          data: { status: marketStatus },
        });
        return;
      }

      console.log("Market is open - executing tasks");
    }

    // Get enabled tasks sorted by priority
    const enabledTasks = Array.from(this.tasks.values())
      .filter((task) => task.enabled)
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    if (enabledTasks.length === 0) {
      console.log("No enabled tasks to run");
      return;
    }

    console.log(`Running ${enabledTasks.length} task(s)...`);

    // Execute tasks sequentially
    const results: TaskExecutionResult[] = [];
    let hasError = false;

    for (const task of enabledTasks) {
      // Check if task requires market to be open
      if (task.requiresMarketOpen && this.config.respectMarketHours && this.config.marketHours) {
        const marketStatus = isMarketOpen(this.config.marketHours, new Date());
        if (!marketStatus.isOpen) {
          console.log(`Skipping task ${task.name} - requires market to be open`);
          continue;
        }
      }

      const result = await this.executeTask(task);
      results.push(result);

      if (!result.success) {
        hasError = true;
      }
    }

    // Update state
    this.state.totalRuns++;
    this.state.history.push(...results);

    // Keep only last 100 results
    if (this.state.history.length > 100) {
      this.state.history = this.state.history.slice(-100);
    }

    // Track consecutive errors
    if (hasError) {
      this.state.consecutiveErrors++;
    } else {
      this.state.consecutiveErrors = 0;
    }

    // Check if we should stop due to errors
    const maxErrors = this.config.maxConsecutiveErrors ?? 10;
    if (this.state.consecutiveErrors >= maxErrors) {
      console.error(
        `Stopping scheduler due to ${this.state.consecutiveErrors} consecutive errors`
      );
      this.stop();
      this.emit({
        type: "error",
        timestamp: new Date(),
        data: { reason: "max_consecutive_errors" },
      });
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: ScheduledTask): Promise<TaskExecutionResult> {
    const startTime = new Date();

    this.emit({
      type: "task_start",
      timestamp: startTime,
      data: { taskId: task.id, taskName: task.name },
    });

    try {
      console.log(`[Task] Starting: ${task.name}`);
      await task.execute();

      const endTime = new Date();
      const result: TaskExecutionResult = {
        taskId: task.id,
        taskName: task.name,
        startTime,
        endTime,
        durationMs: endTime.getTime() - startTime.getTime(),
        success: true,
      };

      console.log(`[Task] Completed: ${task.name} (${result.durationMs}ms)`);

      this.emit({
        type: "task_complete",
        timestamp: endTime,
        data: result,
      });

      return result;
    } catch (error) {
      const endTime = new Date();
      const result: TaskExecutionResult = {
        taskId: task.id,
        taskName: task.name,
        startTime,
        endTime,
        durationMs: endTime.getTime() - startTime.getTime(),
        success: false,
        error: String(error),
      };

      console.error(`[Task] Failed: ${task.name} - ${error}`);

      this.emit({
        type: "task_error",
        timestamp: endTime,
        data: result,
      });

      return result;
    }
  }

  /**
   * Run tasks immediately (manual trigger)
   */
  async runNow(): Promise<void> {
    console.log("Manual task execution triggered");
    await this.runTasks();
  }

  /**
   * Get current scheduler state
   */
  getState(): SchedulerState {
    return { ...this.state };
  }

  /**
   * Get execution history
   */
  getHistory(limit?: number): TaskExecutionResult[] {
    const history = [...this.state.history];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.state.history = [];
  }

  /**
   * Register an event handler
   */
  on(handler: SchedulerEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Unregister an event handler
   */
  off(handler: SchedulerEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index >= 0) {
      this.eventHandlers.splice(index, 1);
    }
  }

  /**
   * Emit an event to all handlers
   */
  private emit(event: SchedulerEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error("Error in event handler:", error);
      }
    }
  }

  /**
   * Get list of registered tasks
   */
  getTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Enable a task
   */
  enableTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.enabled = true;
    }
  }

  /**
   * Disable a task
   */
  disableTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.enabled = false;
    }
  }
}
