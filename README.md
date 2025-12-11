# IK Spread Bot (Options Trading)

Early spike to automate TradeOtter login and capture session data for downstream scraping.

## Setup
1) Install deps (already in package.json): `npm install`
2) Copy env template and fill credentials (username, not email):
   ```bash
   cp .env.example .env
   # set TRADEOTTER_USERNAME / TRADEOTTER_PASSWORD
   ```
3) Run the login spike:
   ```bash
   npm run start:login-spike
   ```
   - `HEADLESS=false` to debug in a visible browser.
   - If the form changes, set `MANUAL_LOGIN=true` and log in manually, then hit Enter in the terminal to continue.
   - Output session dump: `tmp/tradeotter-session.json` (cookies + localStorage).

## Sniff the screener API calls (reuse session)
After you have a session JSON:
```bash
HEADLESS=true npm run start:sniff
```
- Reads cookies/localStorage from `tmp/tradeotter-session.json`.
- Navigates to the screener and logs requests/responses into SQLite at `tmp/tradeotter.db` (table: `network_log`).
- Adjust with `TRADEOTTER_SESSION_PATH`, `TRADEOTTER_DB_PATH`, `HEADLESS=false` to watch.

## Analyze sniffed traffic (summaries)
After running the sniff:
```bash
npm run analyze:sniff
```
- Reads `TRADEOTTER_DB_PATH` (default `tmp/tradeotter.db`), prints top URLs/methods/counts and recent responses with headers/body snippets.

## Fetch screener data directly (no browser)
Requires a valid session JSON (refresh via `npm run start:login-spike` if expired):
```bash
npm run start:fetch-screens
```
- Uses `TRADEOTTER_SESSION_PATH` cookies to call `https://api.tradeotter.com/screens`.
- Prints a quick summary of top-scoring screens.

## Notes
- Default login URL: `https://www.tradeotter.com/login`; override via `TRADEOTTER_LOGIN_URL`.
- Screener target URL: `https://www.tradeotter.com/hub/otter-screener`; override via `TRADEOTTER_TARGET_URL`.
- Script logs API/screener responses to help identify endpoints to replay without the browser.

Next steps after the spike: tune selectors if the login form differs, and instrument network sniffing to capture the screener API calls/headers needed for direct fetches.
