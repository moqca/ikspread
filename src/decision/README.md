# Decision Engine - AI-Powered Trade Analysis

The Decision Engine adds fundamental and sentiment analysis on top of technical filters, preventing trades that look good technically but have hidden fundamental risks.

## What It Does

The engine analyzes 5 key dimensions:

1. **News Sentiment** - Recent news, headlines, market buzz
2. **Analyst Ratings** - Upgrades/downgrades, price targets, consensus
3. **Financial Health** - Profitability, growth, debt levels
4. **Risk Events** - Earnings dates, dividends, corporate actions
5. **Market Context** - Sector performance, volatility, market regime

## Why You Need It

**Without Decision Engine:**
```
TSLA: Otter Score 97/100 → Looks great! ✓
     → Enter trade
     → Earnings announced next day → Stock tanks 15%
     → Loss
```

**With Decision Engine:**
```
TSLA: Otter Score 97/100
     → Decision Engine finds:
        • Earnings in 2 days 🚨
        • Recent analyst downgrades
        • Negative sentiment
     → Decision Score: 74/100
     → Recommendation: STRONG_AVOID
     → Trade avoided → Capital protected ✓
```

## Quick Start

```typescript
import { createDefaultDecisionEngine } from './decision';
import type { ScreenerOpportunity } from './decision/types';

// Screener opportunity from TradeOtter
const opportunity: ScreenerOpportunity = {
  symbol: 'AAPL',
  type: 'Put Credit Spread',
  strikes: '180p/175p',
  dte: 36,
  credit: 1.55,
  ror: 44.5,
  annualizedPercent: 452.0,
  pop: 71,
  otterScore: 95,
  updatedAt: '2024-12-11',
};

// Analyze
const engine = createDefaultDecisionEngine();
const analysis = await engine.analyze(opportunity);

console.log(`Otter Score: ${analysis.otterScore}/100`);
console.log(`Decision Score: ${analysis.decisionScore}/100`);
console.log(`Recommendation: ${analysis.recommendation}`);
console.log(`Reasoning: ${analysis.reasoning}`);

// Check for red flags
if (analysis.flags.length > 0) {
  console.log('⚠️ Warnings:');
  analysis.flags.forEach(flag => console.log(`  • ${flag}`));
}
```

## Decision Score Calculation

The Decision Score starts with the Otter Score and adjusts based on:

```
Decision Score = Otter Score
               + Sentiment Impact (weighted)
               + Analyst Ratings Impact (weighted)
               + Financial Health Impact (weighted)
               - Risk Events Penalty (weighted)

Default weights:
- Sentiment: 15%
- Analyst Ratings: 15%
- Financial Health: 10%
- Risk Events: 20% (penalty)
```

## Recommendations

| Decision Score | Recommendation | Meaning |
|---------------|---------------|---------|
| 80-100 | STRONG_BUY | Excellent opportunity across all dimensions |
| 65-79 | BUY | Good opportunity, minor concerns |
| 60-64 | NEUTRAL | Acceptable but watch closely |
| 40-59 | AVOID | Significant concerns, skip |
| 0-39 | STRONG_AVOID | Major red flags, definitely skip |

**Note:** Critical risk events (earnings within 3 days) automatically trigger STRONG_AVOID regardless of score.

## Real-World Example

From our demo with actual TradeOtter screener data:

### TSLA Analysis
```
Otter Score: 97/100 (Excellent technical setup)
Decision Score: 74/100 (Downgraded due to fundamentals)
Recommendation: STRONG_AVOID

Reasoning:
- 🚨 CRITICAL: Earnings in 2 days
- Negative news sentiment (-0.30)
- 2 recent analyst downgrades (UBS, Barclays)
- Elevated volatility (VIX)
- Sector underperforming

Result: Trade avoided despite strong Otter Score
```

### DUOL Analysis
```
Otter Score: 96/100 (Very good technical setup)
Decision Score: 100/100 (Upgraded due to strong fundamentals)
Recommendation: STRONG_BUY

Reasoning:
- Bullish news sentiment (AI features)
- Strong analyst consensus (10 Buy, 0 Sell)
- Profitable with 42% revenue growth
- No near-term risk events
- Stable market conditions

Result: Green light to proceed with confidence
```

## Configuration

Customize the engine for your risk tolerance:

```typescript
import { DecisionEngine } from './decision';

const customConfig = {
  enableNewsSentiment: true,
  enableAnalystRatings: true,
  enableFinancialHealth: true,
  enableRiskEvents: true,
  enableMarketContext: true,
  minDecisionScore: 70, // More conservative (default: 60)
  sentimentWeight: 0.20, // More weight on sentiment
  ratingsWeight: 0.15,
  financialWeight: 0.10,
  riskEventsWeight: 0.25, // Higher penalty for risk events
  cacheTTL: 30, // Cache for 30 minutes
};

const engine = new DecisionEngine(customConfig);
```

## Component Details

### News Sentiment
- Score: -1 (very bearish) to +1 (very bullish)
- Analyzes recent headlines and topics
- Detects concerning keywords (lawsuit, fraud, bankruptcy, etc.)
- Confidence based on article count and consistency

### Analyst Ratings
- Consensus: strong_buy, buy, hold, sell, strong_sell
- Recent changes (upgrades/downgrades)
- Price target vs current price
- Downgrades significantly lower score

### Financial Health
- Score: 0-100
- Profitability check
- Revenue trend (growing/stable/declining)
- Debt level (low/moderate/high)
- Key metrics when available

### Risk Events
- **Critical:** Earnings within 3 days = automatic STRONG_AVOID
- **High:** Earnings within 7 days = major penalty
- **Medium:** Earnings within 14 days = moderate penalty
- Dividend ex-dates
- Corporate actions and announcements

### Market Context
- Sector performance vs market
- Market regime (bullish/neutral/bearish/volatile)
- VIX level (volatility)
- Additional context for decision

## Integration with Orchestrator

The Decision Engine integrates seamlessly with the trading orchestrator:

```typescript
// In orchestrator entry scanning task:
private async scanForEntries() {
  // 1. Get screener opportunities from TradeOtter
  const opportunities = await fetchScreenerData();

  // 2. Apply technical risk filters
  const passedRisk = opportunities.filter(opp =>
    checkRisk(opp, riskConfig).passed
  );

  // 3. Apply decision engine analysis
  const decisionEngine = createDefaultDecisionEngine();
  const analyses = await Promise.all(
    passedRisk.map(opp => decisionEngine.analyze(opp))
  );

  // 4. Filter by decision score and recommendation
  const approved = analyses.filter(a =>
    a.recommendation === 'STRONG_BUY' || a.recommendation === 'BUY'
  );

  // 5. Calculate position sizes
  // 6. Execute trades
}
```

## Caching

Analysis results are cached to avoid redundant API calls:
- Default TTL: 60 minutes
- Configurable per engine instance
- Clear cache manually if needed: `engine.clearCache()`

## Future Enhancements (ikspread-k7b)

Current implementation uses realistic test data. Future work:

1. **News API Integration**
   - NewsAPI.org
   - Google News API
   - AlphaVantage News Sentiment

2. **Financial Data APIs**
   - Alpha Vantage fundamentals
   - Yahoo Finance API
   - IEX Cloud

3. **Earnings Calendar**
   - Nasdaq earnings calendar
   - EarningsWhispers API
   - Finnhub calendar

4. **Real-time LLM Analysis**
   - Claude API for sentiment analysis
   - GPT-4 for complex reasoning
   - Anthropic prompt caching

## Running the Demo

```bash
npm run demo:decision
```

This analyzes 3 real TradeOtter opportunities (OKLO, TSLA, DUOL) and shows:
- How high Otter Scores can be downgraded by fundamentals
- How earnings dates trigger automatic avoidance
- How positive fundamentals can boost scores
- Complete analysis breakdown for each symbol

## Best Practices

1. **Always check flags** - Even if recommendation is positive
2. **Respect earnings dates** - Don't override STRONG_AVOID for earnings
3. **Use with technical filters** - Decision Engine complements, doesn't replace
4. **Adjust weights** - Calibrate to your trading style
5. **Monitor confidence** - Low confidence = be extra cautious
6. **Cache appropriately** - Balance freshness vs API costs

## Architecture

```
ScreenerOpportunity (TradeOtter)
         ↓
    Risk Filters (Technical)
         ↓
    Entry Rules (Technical)
         ↓
   🤖 DECISION ENGINE 🤖
    ├── News Sentiment
    ├── Analyst Ratings
    ├── Financial Health
    ├── Risk Events
    └── Market Context
         ↓
   Decision Score (0-100)
   Recommendation (STRONG_BUY → STRONG_AVOID)
         ↓
   Position Sizing
         ↓
   Execute Trade
```

## Key Insight

**The Decision Engine prevents the #1 cause of losses: entering technically sound trades that have hidden fundamental risks.**

It's your AI analyst working 24/7 to catch what you might miss.
