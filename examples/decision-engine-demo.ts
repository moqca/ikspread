/**
 * Demo script showing AI-powered decision engine
 * Run with: ts-node examples/decision-engine-demo.ts
 */

import { createDefaultDecisionEngine } from "../src/decision";
import type { ScreenerOpportunity } from "../src/decision/types";

function runDemo() {
  console.log("=== AI-Powered Decision Engine Demo ===\n");
  console.log("This demo shows how the decision engine adds fundamental and");
  console.log("sentiment analysis on top of TradeOtter's technical Otter Score.\n");

  // Example screener opportunities from TradeOtter
  const opportunities: ScreenerOpportunity[] = [
    {
      symbol: "OKLO",
      type: "Put Credit Spread",
      strikes: "90p/85p",
      dte: 36,
      credit: 1.71,
      ror: 51.8,
      annualizedPercent: 525.5,
      pop: 72,
      otterScore: 98,
      updatedAt: "2024-12-11 11:21 AM",
    },
    {
      symbol: "TSLA",
      type: "Put Credit Spread",
      strikes: "420p/415p",
      dte: 36,
      credit: 1.55,
      ror: 44.9,
      annualizedPercent: 455.4,
      pop: 71,
      otterScore: 97,
      updatedAt: "2024-12-11 9:05 AM",
    },
    {
      symbol: "DUOL",
      type: "Put Credit Spread",
      strikes: "185p/180p",
      dte: 36,
      credit: 1.66,
      ror: 49.7,
      annualizedPercent: 504.0,
      pop: 70,
      otterScore: 96,
      updatedAt: "2024-12-11 11:21 AM",
    },
  ];

  const engine = createDefaultDecisionEngine();

  console.log("📊 Screener Opportunities from TradeOtter:\n");
  opportunities.forEach((opp, idx) => {
    console.log(`${idx + 1}. ${opp.symbol} - Otter Score: ${opp.otterScore}/100`);
    console.log(`   ${opp.type} ${opp.strikes}`);
    console.log(`   Credit: $${opp.credit} | ROR: ${opp.ror}% | POP: ${opp.pop}%\n`);
  });

  console.log("🤖 Running Decision Engine Analysis...\n");
  console.log("=" .repeat(80));

  // Analyze each opportunity
  Promise.all(opportunities.map((opp) => engine.analyze(opp)))
    .then((analyses) => {
      console.log("\n" + "=".repeat(80));
      console.log("\n📋 DECISION ENGINE RESULTS\n");

      analyses.forEach((analysis, idx) => {
        console.log(`\n${"─".repeat(80)}`);
        console.log(`\n${idx + 1}. ${analysis.symbol}`);
        console.log("─".repeat(80));

        // Scores
        console.log(`\n📊 Scores:`);
        console.log(`   Otter Score:    ${analysis.otterScore}/100 (Technical)`);
        console.log(`   Decision Score: ${analysis.decisionScore}/100 (Fundamental + Technical)`);
        console.log(`   Confidence:     ${(analysis.confidence * 100).toFixed(0)}%`);

        // Recommendation
        const recEmoji = {
          STRONG_BUY: "🟢",
          BUY: "🟢",
          NEUTRAL: "🟡",
          AVOID: "🔴",
          STRONG_AVOID: "🔴",
        }[analysis.recommendation];

        console.log(`\n${recEmoji} Recommendation: ${analysis.recommendation}`);

        // News Sentiment
        console.log(`\n📰 News Sentiment:`);
        console.log(`   Score: ${analysis.sentiment.score.toFixed(2)} (${analysis.sentiment.label})`);
        console.log(`   Articles: ${analysis.sentiment.articleCount}`);
        console.log(`   Topics: ${analysis.sentiment.topics.slice(0, 3).join(", ")}`);
        if (analysis.sentiment.headlines.length > 0) {
          console.log(`   Recent Headlines:`);
          analysis.sentiment.headlines.slice(0, 2).forEach((h) => {
            console.log(`     • ${h}`);
          });
        }

        // Analyst Ratings
        console.log(`\n📈 Analyst Ratings:`);
        console.log(`   Consensus: ${analysis.ratings.consensus.toUpperCase()}`);
        console.log(
          `   Buy/Hold/Sell: ${analysis.ratings.buyCount}/${analysis.ratings.holdCount}/${analysis.ratings.sellCount}`
        );
        if (analysis.ratings.priceTarget) {
          console.log(`   Price Target: $${analysis.ratings.priceTarget}`);
        }
        if (analysis.ratings.recentChanges.length > 0) {
          console.log(`   Recent Changes:`);
          analysis.ratings.recentChanges.slice(0, 2).forEach((change) => {
            console.log(
              `     • ${change.firm}: ${change.action} to ${change.rating} (${change.date})`
            );
          });
        }

        // Financial Health
        console.log(`\n💰 Financial Health:`);
        console.log(`   Score: ${analysis.financial.score}/100`);
        console.log(`   Profitable: ${analysis.financial.isProfitable ? "Yes" : "No"}`);
        console.log(`   Revenue Trend: ${analysis.financial.revenueTrend}`);
        console.log(`   Debt Level: ${analysis.financial.debtLevel}`);

        // Risk Events
        console.log(`\n⚠️  Risk Events:`);
        if (analysis.riskEvents.hasEarnings) {
          console.log(
            `   Earnings: ${analysis.riskEvents.daysUntilEarnings} days away ${analysis.riskEvents.daysUntilEarnings! <= 3 ? "🚨 CRITICAL" : ""}`
          );
        } else {
          console.log(`   Earnings: None imminent`);
        }
        if (analysis.riskEvents.events.length > 0) {
          console.log(`   Upcoming Events:`);
          analysis.riskEvents.events.forEach((event) => {
            console.log(`     • ${event.description} (${event.date}) - ${event.impact} impact`);
          });
        }

        // Market Context
        console.log(`\n🌐 Market Context:`);
        console.log(`   Sector: ${analysis.marketContext.sectorTrend}`);
        console.log(`   Market Regime: ${analysis.marketContext.marketRegime}`);
        console.log(`   VIX Level: ${analysis.marketContext.vixLevel}`);

        // Flags (Warnings)
        if (analysis.flags.length > 0) {
          console.log(`\n⚡ Key Flags:`);
          analysis.flags.forEach((flag) => {
            console.log(`   • ${flag}`);
          });
        }

        // Reasoning
        console.log(`\n💡 Reasoning:`);
        console.log(`   ${analysis.reasoning}`);
      });

      // Summary comparison
      console.log(`\n${"=".repeat(80)}`);
      console.log(`\n📊 SUMMARY COMPARISON\n`);
      console.log(`Symbol | Otter | Decision | Rec          | Key Issue`);
      console.log(`${"-".repeat(80)}`);

      analyses.forEach((a) => {
        const keyIssue = a.flags[0] || "None";
        const truncatedIssue = keyIssue.length > 35 ? keyIssue.substring(0, 32) + "..." : keyIssue;

        console.log(
          `${a.symbol.padEnd(6)} | ${a.otterScore.toString().padStart(5)} | ${a.decisionScore
            .toFixed(0)
            .padStart(8)} | ${a.recommendation.padEnd(12)} | ${truncatedIssue}`
        );
      });

      console.log(`\n${"=".repeat(80)}`);
      console.log(`\n🎯 KEY INSIGHTS:\n`);

      const sorted = [...analyses].sort((a, b) => b.decisionScore - a.decisionScore);
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];

      console.log(`✓ Best Opportunity: ${best.symbol}`);
      console.log(`  - Decision Score: ${best.decisionScore}/100`);
      console.log(`  - Recommendation: ${best.recommendation}`);
      console.log(`  - Why: ${best.reasoning.split(".")[0]}.`);

      console.log(`\n✗ Highest Risk: ${worst.symbol}`);
      console.log(`  - Decision Score: ${worst.decisionScore}/100`);
      console.log(`  - Recommendation: ${worst.recommendation}`);
      console.log(`  - Why: ${worst.reasoning.split(".")[0]}.`);

      // Show how decision engine caught risks
      console.log(`\n${"=".repeat(80)}`);
      console.log(`\n🛡️  HOW DECISION ENGINE PROTECTS YOU:\n`);

      const tsla = analyses.find((a) => a.symbol === "TSLA");
      if (tsla && tsla.recommendation.includes("AVOID")) {
        console.log(`Example: TSLA had Otter Score ${tsla.otterScore}/100 (Excellent!)`);
        console.log(`But Decision Engine found:`);
        tsla.flags.forEach((flag) => {
          console.log(`  • ${flag}`);
        });
        console.log(`\nResult: ${tsla.recommendation} - Protected from risky trade!`);
      }

      console.log(`\n${"=".repeat(80)}`);
      console.log(`\n✅ Demo Complete!\n`);
      console.log(`The Decision Engine adds critical context that technical analysis alone misses:`);
      console.log(`  1. News sentiment (catch negative catalysts)`);
      console.log(`  2. Analyst downgrades (institutional sentiment)`);
      console.log(`  3. Financial health (avoid weak companies)`);
      console.log(`  4. Risk events (earnings surprises)`);
      console.log(`  5. Market context (sector rotation)\n`);
    })
    .catch((error) => {
      console.error("Demo failed:", error);
      process.exitCode = 1;
    });
}

// Run demo if executed directly
if (require.main === module) {
  runDemo();
}
