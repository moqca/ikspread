import Database from "better-sqlite3";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();

const DB_PATH =
  process.env.TRADEOTTER_DB_PATH ??
  path.join(process.cwd(), "tmp", "tradeotter.db");

type Row = {
  url: string;
  count: number;
  last_status?: number;
  methods: string;
};

type SampleRow = {
  url: string;
  status?: number;
  headers?: string;
  body_snippet?: string;
};

function main() {
  const db = new Database(DB_PATH, { readonly: true });

  const rows = db
    .prepare(
      `
        SELECT
          url,
          COUNT(*) as count,
          MAX(status) as last_status,
          GROUP_CONCAT(DISTINCT method) as methods
        FROM network_log
        GROUP BY url
        ORDER BY count DESC
        LIMIT 50;
      `
    )
    .all() as Row[];

  console.log("Top URLs (by count):");
  for (const row of rows) {
    console.log(
      `${row.count}x [${row.methods || "n/a"}] ${row.url} (last status=${row.last_status ?? "?"})`
    );
  }

  const sample = db
    .prepare(
      `
        SELECT url, status, headers, body_snippet
        FROM network_log
        WHERE direction = 'response'
        ORDER BY ts DESC
        LIMIT 5;
      `
    )
    .all() as SampleRow[];

  console.log("\nRecent responses (truncated bodies):");
  for (const row of sample) {
    console.log(`\nURL: ${row.url}`);
    console.log(`Status: ${row.status}`);
    console.log(`Headers: ${row.headers}`);
    if (row.body_snippet) {
      console.log(`Body snippet: ${row.body_snippet.slice(0, 500)}`);
    }
  }
}

main();
