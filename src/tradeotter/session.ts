import { BrowserContext, Page } from "playwright";
import * as fs from "fs";
import * as path from "path";

export type SessionDump = {
  cookies: Awaited<ReturnType<BrowserContext["cookies"]>>;
  localStorage: Record<string, string>;
};

async function ensureOutputDir(filePath: string) {
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
}

export async function saveSession(filePath: string, session: SessionDump) {
  await ensureOutputDir(filePath);
  await fs.promises.writeFile(filePath, JSON.stringify(session, null, 2));
  console.log(`Saved session to ${filePath}`);
}

export async function captureSession(
  filePath: string,
  context: BrowserContext,
  page: Page
) {
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

  await saveSession(filePath, { cookies, localStorage: localStorageData });
}

export async function loadSession(filePath: string): Promise<SessionDump> {
  const raw = await fs.promises.readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  return parsed as SessionDump;
}

export function loadSessionSync(filePath: string): SessionDump {
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  return parsed as SessionDump;
}

export async function applySessionToPage(
  context: BrowserContext,
  page: Page,
  session: SessionDump,
  origin: string
) {
  if (session.cookies?.length) {
    await context.addCookies(session.cookies);
  }
  // Seed localStorage for the origin.
  await page.goto(origin, { waitUntil: "domcontentloaded" });
  await page.evaluate((items) => {
    window.localStorage.clear();
    Object.entries(items).forEach(([k, v]) => window.localStorage.setItem(k, v));
  }, session.localStorage);
}
