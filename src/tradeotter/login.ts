import { chromium, Page, BrowserContext } from "playwright";
import * as fs from "fs";
import * as path from "path";
import readline from "readline";
import dotenv from "dotenv";
import { captureSession, SessionDump } from "./session";

dotenv.config();

const LOGIN_URL =
  process.env.TRADEOTTER_LOGIN_URL ?? "https://www.tradeotter.com/login";
const TARGET_URL =
  process.env.TRADEOTTER_TARGET_URL ??
  "https://www.tradeotter.com/hub/otter-screener";

const HEADLESS = process.env.HEADLESS !== "false";
const MANUAL_LOGIN = process.env.MANUAL_LOGIN === "true";
const OUTPUT_PATH =
  process.env.TRADEOTTER_SESSION_PATH ??
  path.join(process.cwd(), "tmp", "tradeotter-session.json");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

async function waitForAuth(page: Page, label: string) {
  const started = Date.now();
  const timeoutMs = 90_000;
  const patterns = ["hub", "screener", "dashboard", "home"];

  while (Date.now() - started < timeoutMs) {
    const url = page.url();
    if (patterns.some((p) => url.includes(p))) {
      console.log(`[auth] ${label} reached authenticated URL: ${url}`);
      return;
    }
    // If the page is mid-navigation, give it a short breather.
    await page.waitForTimeout(500);
  }
  console.warn(`[auth] Timeout waiting for authenticated URL after ${timeoutMs / 1000}s (label=${label}). Continuing anyway.`);
}

async function ensureOutputDir(filePath: string) {
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
}

async function dumpSession(context: BrowserContext, page: Page) {
  const cookies = await context.cookies();
  const localStorageData = await page.evaluate(() => {
    const entries: Record<string, string> = {};
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key) {
        entries[key] = window.localStorage.getItem(key) ?? "";
      }
    }
    return entries;
  });

  const dump: SessionDump = { cookies, localStorage: localStorageData };
  await ensureOutputDir(OUTPUT_PATH);
  await fs.promises.writeFile(OUTPUT_PATH, JSON.stringify(dump, null, 2));
  console.log(`Saved session to ${OUTPUT_PATH}`);
}

async function promptEnter(message: string) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  await new Promise<void>((resolve) => {
    rl.question(message, () => resolve());
  });
  rl.close();
}

async function fillFirst(page: Page, selectors: string[], value: string) {
  for (const selector of selectors) {
    const handle = await page.$(selector);
    if (handle) {
      await page.fill(selector, value);
      return true;
    }
  }
  return false;
}

async function run() {
  const username = requireEnv("TRADEOTTER_USERNAME");
  const password = requireEnv("TRADEOTTER_PASSWORD");

  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });
  const page = await context.newPage();

  // Log key API traffic to help reverse-engineer the screener endpoints.
  page.on("response", (resp) => {
    const url = resp.url();
    if (url.includes("api") || url.includes("screener")) {
      console.log(`[api] ${resp.status()} ${url}`);
    }
  });

  console.log(`Navigating to login page: ${LOGIN_URL}`);
  await page.goto(LOGIN_URL, { waitUntil: "networkidle" });

  // Fill credentials. If selectors fail or MANUAL_LOGIN=true, allow manual login.
  if (!MANUAL_LOGIN) {
    const userFilled = await fillFirst(
      page,
      [
        'input[name="username"]',
        'input[id*="username"]',
        'input[type="text"]',
        'input[name="email"]',
        'input[type="email"]',
      ],
      username
    );
    if (!userFilled) {
      console.warn("Username field not found; switch to manual login.");
    } else {
      const passFilled = await fillFirst(
        page,
        ['input[name="password"]', 'input[type="password"]'],
        password
      );
      if (!passFilled) {
        console.warn("Password field not found; switch to manual login.");
      } else {
        const submitButton = await page.$(
          'button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")'
        );
        if (submitButton) {
          await Promise.all([
            submitButton.click(),
            page.waitForNavigation({ waitUntil: "networkidle", timeout: 60_000 }).catch(() => {}),
          ]);
        } else {
          console.warn("Submit button not found; switch to manual login.");
        }
      }
    }
  }

  if (MANUAL_LOGIN) {
    console.log("Manual login enabled. Complete login in the browser, then press Enter here.");
    await promptEnter("Press Enter after completing login in the browser...");
  } else if (page.url().includes("login")) {
    console.log("Still on login page. Complete login manually, then press Enter here.");
    await promptEnter("Press Enter after completing login in the browser...");
  }

  // Wait until the authenticated area loads.
  console.log("Waiting for authenticated page after login...");
  await waitForAuth(page, "post-login");

  // Navigate to the screener page so subsequent captures include its tokens/cookies.
  console.log(`Navigating to screener: ${TARGET_URL}`);
  await page.goto(TARGET_URL, { waitUntil: "networkidle" }).catch((err) => {
    console.warn("Navigation to screener hit an error, continuing to wait:", err);
  });
  await waitForAuth(page, "screener");

  await dumpSession(context, page);

  console.log("Done. Inspect tmp/tradeotter-session.json for cookies/localStorage.");
  await browser.close();
}

run().catch((err) => {
  console.error("Login spike failed:", err);
  process.exitCode = 1;
});
