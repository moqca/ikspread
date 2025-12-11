import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";

export type NetworkDirection = "request" | "response";

export type NetworkLogRow = {
  id?: number;
  ts: string;
  direction: NetworkDirection;
  method?: string;
  url: string;
  status?: number;
  headers?: string;
  body_snippet?: string;
};

export function openDb(dbPath: string) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  ensureNetworkTable(db);
  ensureScreensTables(db);
  return db;
}

function ensureNetworkTable(db: Database.Database) {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS network_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      direction TEXT NOT NULL,
      method TEXT,
      url TEXT NOT NULL,
      status INTEGER,
      headers TEXT,
      body_snippet TEXT
    );`
  ).run();

  db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_network_log_ts ON network_log(ts);`
  ).run();
  db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_network_log_url ON network_log(url);`
  ).run();
}

export function insertNetworkLog(
  db: Database.Database,
  row: NetworkLogRow
): void {
  db.prepare(
    `INSERT INTO network_log (ts, direction, method, url, status, headers, body_snippet)
     VALUES (@ts, @direction, @method, @url, @status, @headers, @body_snippet);`
  ).run({
    ts: row.ts,
    direction: row.direction,
    method: row.method ?? null,
    url: row.url,
    status: row.status ?? null,
    headers: row.headers ?? null,
    body_snippet: row.body_snippet ?? null,
  });
}

export function ensureScreensTables(db: Database.Database) {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS screen_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      captured_at TEXT NOT NULL,
      source TEXT
    );`
  ).run();

  db.prepare(
    `CREATE TABLE IF NOT EXISTS normalized_screens (
      snapshot_id INTEGER NOT NULL,
      screen_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      type TEXT,
      score REAL,
      pop REAL,
      dte INTEGER,
      ror REAL,
      annualized_ror REAL,
      credit REAL,
      cost REAL,
      strikes TEXT,
      earnings INTEGER,
      expires_at TEXT,
      iv_score REAL,
      otm_score REAL,
      pop_score REAL,
      ror_score REAL,
      liquidity_score REAL,
      raw_json TEXT,
      PRIMARY KEY (snapshot_id, screen_id)
    );`
  ).run();

  db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_normalized_screens_symbol ON normalized_screens(symbol);`
  ).run();
  db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_normalized_screens_score ON normalized_screens(score);`
  ).run();
}

export function createSnapshot(
  db: Database.Database,
  source: string
): number {
  const info = db
    .prepare(
      `INSERT INTO screen_snapshots (captured_at, source) VALUES (?, ?);`
    )
    .run(new Date().toISOString(), source);
  return Number(info.lastInsertRowid);
}

export type NormalizedScreenRow = {
  snapshot_id: number;
  screen_id: string;
  symbol: string;
  type?: string | null;
  score?: number | null;
  pop?: number | null;
  dte?: number | null;
  ror?: number | null;
  annualized_ror?: number | null;
  credit?: number | null;
  cost?: number | null;
  strikes?: string | null;
  earnings?: boolean | null;
  expires_at?: string | null;
  iv_score?: number | null;
  otm_score?: number | null;
  pop_score?: number | null;
  ror_score?: number | null;
  liquidity_score?: number | null;
  raw_json: string;
};

export function insertNormalizedScreens(
  db: Database.Database,
  rows: NormalizedScreenRow[]
) {
  const insert = db.prepare(
    `INSERT OR REPLACE INTO normalized_screens
    (snapshot_id, screen_id, symbol, type, score, pop, dte, ror, annualized_ror, credit, cost, strikes, earnings, expires_at,
     iv_score, otm_score, pop_score, ror_score, liquidity_score, raw_json)
     VALUES (@snapshot_id, @screen_id, @symbol, @type, @score, @pop, @dte, @ror, @annualized_ror, @credit, @cost, @strikes, @earnings,
             @expires_at, @iv_score, @otm_score, @pop_score, @ror_score, @liquidity_score, @raw_json);`
  );
  const tx = db.transaction((batch: NormalizedScreenRow[]) => {
    for (const row of batch) {
      insert.run({
        snapshot_id: row.snapshot_id,
        screen_id: row.screen_id,
        symbol: row.symbol,
        type: row.type ?? null,
        score: row.score ?? null,
        pop: row.pop ?? null,
        dte: row.dte ?? null,
        ror: row.ror ?? null,
        annualized_ror: row.annualized_ror ?? null,
        credit: row.credit ?? null,
        cost: row.cost ?? null,
        strikes: row.strikes ?? null,
        earnings: row.earnings === undefined ? null : row.earnings ? 1 : 0,
        expires_at: row.expires_at ?? null,
        iv_score: row.iv_score ?? null,
        otm_score: row.otm_score ?? null,
        pop_score: row.pop_score ?? null,
        ror_score: row.ror_score ?? null,
        liquidity_score: row.liquidity_score ?? null,
        raw_json: row.raw_json,
      });
    }
  });
  tx(rows);
}
