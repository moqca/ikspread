import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
import { applySessionToPage, loadSession, SessionDump } from "./session";
import { openDb, insertNetworkLog } from "./db";

dotenv.config();

const TARGET_URL =
  process.env.TRADEOTTER_TARGET_URL ??
  "https://www.tradeotter.com/hub/otter-screener";
const LOGIN_URL =
  process.env.TRADEOTTER_LOGIN_URL ?? "https://www.tradeotter.com/login";
const SESSION_PATH =
  process.env.TRADEOTTER_SESSION_PATH ??
  path.join(process.cwd(), "tmp", "tradeotter-session.json");
const DB_PATH =
  process.env.TRADEOTTER_DB_PATH ??
  path.join(process.cwd(), "tmp", "tradeotter.db");
const HEADLESS = process.env.HEADLESS !== "false";

async function main() {
  if (!fs.existsSync(SESSION_PATH)) {
    throw new Error(
      `Session file not found at ${SESSION_PATH}. Run the login spike first.`
    );
  }

  const session: SessionDump = await loadSession(SESSION_PATH);
  console.log(
    `Loaded session from ${SESSION_PATH} (cookies=${session.cookies.length}, localStorage=${Object.keys(session.localStorage).length})`
  );
  const db = openDb(DB_PATH);

  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });
  const page = await context.newPage();

  let reqCount = 0;
  let respCount = 0;

  // Network logging
  page.on("request", async (req) => {
    reqCount += 1;
    insertNetworkLog(db, {
      ts: new Date().toISOString(),
      direction: "request",
      method: req.method(),
      url: req.url(),
      headers: JSON.stringify(req.headers()),
    });
  });

  page.on("response", async (resp) => {
    respCount += 1;
    const ct = resp.headers()["content-type"] || "";
    let bodySnippet: string | undefined;
    if (ct.includes("application/json")) {
      try {
        const text = await resp.text();
        bodySnippet = text.slice(0, 4000); // limit size
      } catch (err) {
        bodySnippet = `<<body read error: ${String(err)}>>`;
      }
    }
    insertNetworkLog(db, {
      ts: new Date().toISOString(),
      direction: "response",
      url: resp.url(),
      status: resp.status(),
      headers: JSON.stringify(resp.headers()),
      body_snippet: bodySnippet,
    });
  });

  const origin = new URL(LOGIN_URL).origin;
  await applySessionToPage(context, page, session, origin);

  console.log(`Navigating to screener to sniff network: ${TARGET_URL}`);
  await page.goto(TARGET_URL, { waitUntil: "networkidle" });
  console.log("Letting network settle for 15s to capture calls...");
  await page.waitForTimeout(15_000);

  console.log(
    `Done. Captured req=${reqCount}, resp=${respCount}. Network log stored in SQLite at ${DB_PATH} (table: network_log)`
  );
  await browser.close();
}

main().catch((err) => {
  console.error("Sniff failed:", err);
  process.exitCode = 1;
});
