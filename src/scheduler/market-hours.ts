import { MarketHoursConfig, MarketStatus } from "./types";

/**
 * Check if market is currently open
 */
export function isMarketOpen(
  config: MarketHoursConfig,
  currentTime: Date = new Date()
): MarketStatus {
  // Check if today is a market day
  const dayOfWeek = currentTime.getDay();
  if (!config.openDays.includes(dayOfWeek)) {
    return {
      isOpen: false,
      currentTime,
      closedReason: `Market closed on ${getDayName(dayOfWeek)}`,
      nextOpenTime: getNextOpenTime(config, currentTime),
    };
  }

  // Check if today is a holiday
  const dateStr = formatDate(currentTime);
  if (config.holidays?.includes(dateStr)) {
    return {
      isOpen: false,
      currentTime,
      closedReason: `Market closed for holiday (${dateStr})`,
      nextOpenTime: getNextOpenTime(config, currentTime),
    };
  }

  // Check if within market hours
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const [openHour, openMin] = config.openTime.split(":").map(Number);
  const [closeHour, closeMin] = config.closeTime.split(":").map(Number);

  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;

  // Apply grace periods
  const graceAfter = config.graceAfterOpen ?? 0;
  const graceBefore = config.graceBeforeClose ?? 0;

  const effectiveOpenMinutes = openMinutes + graceAfter;
  const effectiveCloseMinutes = closeMinutes - graceBefore;

  if (currentMinutes < effectiveOpenMinutes) {
    return {
      isOpen: false,
      currentTime,
      closedReason: `Before market open (opens at ${config.openTime})`,
      nextOpenTime: getNextOpenTime(config, currentTime),
    };
  }

  if (currentMinutes >= effectiveCloseMinutes) {
    return {
      isOpen: false,
      currentTime,
      closedReason: `After market close (closed at ${config.closeTime})`,
      nextOpenTime: getNextOpenTime(config, currentTime),
    };
  }

  // Market is open
  return {
    isOpen: true,
    currentTime,
    nextCloseTime: getNextCloseTime(config, currentTime),
  };
}

/**
 * Get next market open time
 */
function getNextOpenTime(config: MarketHoursConfig, from: Date): Date {
  const next = new Date(from);
  const [openHour, openMin] = config.openTime.split(":").map(Number);

  // Start checking from tomorrow
  next.setDate(next.getDate() + 1);
  next.setHours(openHour, openMin, 0, 0);

  // Find next open day
  while (!config.openDays.includes(next.getDay())) {
    next.setDate(next.getDate() + 1);
  }

  // Check if it's a holiday
  while (config.holidays?.includes(formatDate(next))) {
    next.setDate(next.getDate() + 1);
    // Make sure we're still on an open day
    while (!config.openDays.includes(next.getDay())) {
      next.setDate(next.getDate() + 1);
    }
  }

  return next;
}

/**
 * Get next market close time
 */
function getNextCloseTime(config: MarketHoursConfig, from: Date): Date {
  const [closeHour, closeMin] = config.closeTime.split(":").map(Number);
  const close = new Date(from);
  close.setHours(closeHour, closeMin, 0, 0);

  return close;
}

/**
 * Get day name from day number
 */
function getDayName(day: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[day];
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get standard US market hours configuration
 */
export function getUSMarketHoursConfig(): MarketHoursConfig {
  return {
    openTime: "09:30",
    closeTime: "16:00",
    openDays: [1, 2, 3, 4, 5], // Monday-Friday
    holidays: [
      // 2025 US market holidays
      "2025-01-01", // New Year's Day
      "2025-01-20", // MLK Day
      "2025-02-17", // Presidents Day
      "2025-04-18", // Good Friday
      "2025-05-26", // Memorial Day
      "2025-07-04", // Independence Day
      "2025-09-01", // Labor Day
      "2025-11-27", // Thanksgiving
      "2025-12-25", // Christmas
    ],
    graceAfterOpen: 15, // Wait 15 min after open
    graceBeforeClose: 15, // Stop 15 min before close
  };
}

/**
 * Calculate minutes until market opens
 */
export function minutesUntilMarketOpen(
  config: MarketHoursConfig,
  currentTime: Date = new Date()
): number {
  const status = isMarketOpen(config, currentTime);
  if (status.isOpen) return 0;
  if (!status.nextOpenTime) return Infinity;

  const diff = status.nextOpenTime.getTime() - currentTime.getTime();
  return Math.floor(diff / (1000 * 60));
}

/**
 * Calculate minutes until market closes
 */
export function minutesUntilMarketClose(
  config: MarketHoursConfig,
  currentTime: Date = new Date()
): number {
  const status = isMarketOpen(config, currentTime);
  if (!status.isOpen) return 0;
  if (!status.nextCloseTime) return 0;

  const diff = status.nextCloseTime.getTime() - currentTime.getTime();
  return Math.floor(diff / (1000 * 60));
}
