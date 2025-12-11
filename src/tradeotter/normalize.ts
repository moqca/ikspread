import * as path from "path";
import dotenv from "dotenv";
import { fetchScreens, ScreenItem } from "./fetcher";
import {
  createSnapshot,
  insertNormalizedScreens,
  openDb,
  NormalizedScreenRow,
} from "./db";

dotenv.config();

const DB_PATH =
  process.env.TRADEOTTER_DB_PATH ??
  path.join(process.cwd(), "tmp", "tradeotter.db");

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeScreens(
  snapshotId: number,
  screens: ScreenItem[]
): NormalizedScreenRow[] {
  return screens.map((s) => ({
    snapshot_id: snapshotId,
    screen_id: s.id,
    symbol: s.symbol,
    type: s.type,
    score: s.score,
    pop: s.pop,
    dte: s.dte,
    ror: toNumber(s.ror),
    annualized_ror: toNumber(s.annualized_ror),
    credit: toNumber(s.credit),
    cost: toNumber(s.cost),
    strikes: s.strikes,
    earnings: s.earnings,
    expires_at: s.expired_at,
    iv_score: s.scoreDetails?.ivScore,
    otm_score: s.scoreDetails?.otmScore,
    pop_score: s.scoreDetails?.popScore,
    ror_score: s.scoreDetails?.rorScore,
    liquidity_score: s.scoreDetails?.liquidityScore,
    raw_json: JSON.stringify(s),
  }));
}

async function main() {
  const db = openDb(DB_PATH);
  const snapshotId = createSnapshot(db, "screens");

  const res = await fetchScreens();
  const rows = normalizeScreens(snapshotId, res.data.screens);
  insertNormalizedScreens(db, rows);

  console.log(
    `Saved ${rows.length} screens into snapshot ${snapshotId} (db: ${DB_PATH}).`
  );
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Normalization failed:", err);
    process.exitCode = 1;
  });
}
