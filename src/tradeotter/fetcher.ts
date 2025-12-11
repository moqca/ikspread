import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
import { loadSessionSync } from "./session";

dotenv.config();

const API_BASE = process.env.TRADEOTTER_API_BASE ?? "https://api.tradeotter.com";
const SESSION_PATH =
  process.env.TRADEOTTER_SESSION_PATH ??
  path.join(process.cwd(), "tmp", "tradeotter-session.json");

export type ScreenScoreDetails = {
  ivScore: number;
  otmScore: number;
  popScore: number;
  rorScore: number;
  liquidityScore: number;
};

export type ScreenItem = {
  id: string;
  score: number;
  scoreDetails: ScreenScoreDetails;
  pop: number;
  dte: number;
  ror: string;
  annualized_ror: string;
  symbol: string;
  type: string;
  credit: string;
  strikes: string;
  short_call_1: string | null;
  short_call_2: string | null;
  short_put_1: string | null;
  short_put_2: string | null;
  long_call_1: string | null;
  long_call_2: string | null;
  long_put_1: string | null;
  long_put_2: string | null;
  cost: string;
  earnings: boolean;
  expired_at: string;
  last_updated: string;
  created_at: string;
  updated_at: string;
};

export type ScreensResponse = {
  ok: boolean;
  data: {
    screens: ScreenItem[];
  };
};

function buildCookieHeader(): string {
  const session = loadSessionSync(SESSION_PATH);
  const cookiePairs = session.cookies.map((c) => `${c.name}=${c.value}`);
  return cookiePairs.join("; ");
}

async function fetchJson<T>(url: string, cookies: string): Promise<T> {
  const resp = await fetch(url, {
    headers: {
      cookie: cookies,
      referer: "https://www.tradeotter.com/",
      "user-agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      accept: "application/json",
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Fetch failed ${resp.status} ${resp.statusText}: ${text}`);
  }
  return (await resp.json()) as T;
}

export async function fetchScreens(): Promise<ScreensResponse> {
  if (!fs.existsSync(SESSION_PATH)) {
    throw new Error(
      `Session file not found at ${SESSION_PATH}. Run login spike to refresh.`
    );
  }
  const cookies = buildCookieHeader();
  const url = `${API_BASE}/screens`;
  return fetchJson<ScreensResponse>(url, cookies);
}

// CLI entry to test fetching screens.
async function main() {
  try {
    const data = await fetchScreens();
    console.log(
      `Fetched ${data.data.screens.length} screens. Top 5 by score:`
    );
    const top = data.data.screens
      .slice(0, 5)
      .map((s) => `${s.symbol} score=${s.score} type=${s.type} credit=${s.credit} ror=${s.ror}% pop=${s.pop}`);
    console.log(top.join("\n"));
  } catch (err) {
    console.error("Fetch error:", err);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}
