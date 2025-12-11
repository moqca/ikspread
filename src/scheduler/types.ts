/**
 * Types for scheduler and orchestration
 */

export interface ScheduleConfig {
  /** Interval in minutes (e.g., 15 for every 15 minutes) */
  intervalMinutes: number;

  /** Enable market hours gating */
  respectMarketHours: boolean;

  /** Market hours configuration */
  marketHours?: MarketHoursConfig;

  /** Time zone for scheduling (default: America/New_York) */
  timezone?: string;

  /** Run immediately on start */
  runOnStart?: boolean;

  /** Maximum consecutive errors before stopping */
  maxConsecutiveErrors?: number;
}

export interface MarketHoursConfig {
  /** Market open time (HH:MM format, in market timezone) */
  openTime: string;

  /** Market close time (HH:MM format, in market timezone) */
  closeTime: string;

  /** Days market is open (0 = Sunday, 6 = Saturday) */
  openDays: number[];

  /** Market holidays (YYYY-MM-DD format) */
  holidays?: string[];

  /** Grace period after market open (minutes) */
  graceAfterOpen?: number;

  /** Grace period before market close (minutes) */
  graceBeforeClose?: number;
}

export interface ScheduledTask {
  /** Unique task identifier */
  id: string;

  /** Task name */
  name: string;

  /** Task function to execute */
  execute: () => Promise<void>;

  /** Is this task enabled? */
  enabled: boolean;

  /** Priority (higher = runs first) */
  priority?: number;

  /** Only run during market hours */
  requiresMarketOpen?: boolean;
}

export interface TaskExecutionResult {
  /** Task ID */
  taskId: string;

  /** Task name */
  taskName: string;

  /** Execution start time */
  startTime: Date;

  /** Execution end time */
  endTime: Date;

  /** Duration in milliseconds */
  durationMs: number;

  /** Success status */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

export interface SchedulerState {
  /** Is scheduler running? */
  isRunning: boolean;

  /** Last execution time */
  lastRunTime?: Date;

  /** Next scheduled run time */
  nextRunTime?: Date;

  /** Total runs executed */
  totalRuns: number;

  /** Consecutive errors */
  consecutiveErrors: number;

  /** Execution history */
  history: TaskExecutionResult[];
}

export interface MarketStatus {
  /** Is market currently open? */
  isOpen: boolean;

  /** Current date/time */
  currentTime: Date;

  /** Reason if market is closed */
  closedReason?: string;

  /** Next market open time */
  nextOpenTime?: Date;

  /** Next market close time */
  nextCloseTime?: Date;
}

export interface OrchestratorConfig {
  /** Scheduler configuration */
  schedule: ScheduleConfig;

  /** Enable position monitoring */
  enablePositionMonitoring: boolean;

  /** Enable entry scanning */
  enableEntryScanning: boolean;

  /** Enable roll management */
  enableRollManagement: boolean;

  /** Dry run mode (no actual trades) */
  dryRun: boolean;
}

export type SchedulerEventType =
  | "start"
  | "stop"
  | "task_start"
  | "task_complete"
  | "task_error"
  | "market_closed"
  | "error";

export interface SchedulerEvent {
  type: SchedulerEventType;
  timestamp: Date;
  data?: any;
}

export type SchedulerEventHandler = (event: SchedulerEvent) => void;
