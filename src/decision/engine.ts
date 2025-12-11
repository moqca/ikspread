import {
  DecisionAnalysis,
  DecisionEngineConfig,
  ScreenerOpportunity,
  DecisionCache,
} from "./types";
import { analyzeNewsSentiment, calculateSentimentImpact, extractSentimentFlags, getSentimentRecommendationModifier } from "./sentiment";
import { analyzeAnalystRatings, analyzeFinancialHealth, calculateRatingsImpact, calculateFinancialImpact, extractRatingFlags, extractFinancialFlags } from "./financials";
import { detectRiskEvents, analyzeMarketContext, calculateRiskEventsImpact, extractRiskEventFlags, getRiskEventRecommendationModifier, extractMarketContextFlags } from "./risk-events";

/**
 * Main decision engine - orchestrates all analysis components
 */
export class DecisionEngine {
  private config: DecisionEngineConfig;
  private cache: Map<string, { analysis: DecisionAnalysis; timestamp: Date }> = new Map();

  constructor(config: DecisionEngineConfig) {
    this.config = config;
  }

  /**
   * Analyze a screener opportunity and provide decision recommendation
   */
  async analyze(opportunity: ScreenerOpportunity): Promise<DecisionAnalysis> {
    console.log(`\n🤖 Decision Engine analyzing ${opportunity.symbol}...`);
    console.log(`   Otter Score: ${opportunity.otterScore}/100`);

    // Check cache
    const cached = this.getFromCache(opportunity.symbol);
    if (cached) {
      console.log(`   ✓ Using cached analysis`);
      return cached;
    }

    const startTime = Date.now();

    // Run all analyses in parallel
    const [sentiment, ratings, financial, riskEvents, marketContext] = await Promise.all([
      this.config.enableNewsSentiment ? analyzeNewsSentiment(opportunity.symbol) : Promise.resolve(null),
      this.config.enableAnalystRatings ? analyzeAnalystRatings(opportunity.symbol) : Promise.resolve(null),
      this.config.enableFinancialHealth ? analyzeFinancialHealth(opportunity.symbol) : Promise.resolve(null),
      this.config.enableRiskEvents ? detectRiskEvents(opportunity.symbol) : Promise.resolve(null),
      this.config.enableMarketContext ? analyzeMarketContext(opportunity.symbol) : Promise.resolve(null),
    ]);

    // Calculate decision score
    const { decisionScore, componentScores } = this.calculateDecisionScore(
      opportunity.otterScore,
      sentiment,
      ratings,
      financial,
      riskEvents
    );

    // Determine recommendation
    const recommendation = this.determineRecommendation(
      decisionScore,
      sentiment,
      riskEvents
    );

    // Extract all flags
    const flags = this.extractAllFlags(sentiment, ratings, financial, riskEvents, marketContext);

    // Generate reasoning
    const reasoning = this.generateReasoning(
      opportunity,
      decisionScore,
      componentScores,
      recommendation,
      flags
    );

    // Calculate confidence
    const confidence = this.calculateConfidence(sentiment, ratings, financial);

    const analysis: DecisionAnalysis = {
      symbol: opportunity.symbol,
      otterScore: opportunity.otterScore,
      sentiment: sentiment || {
        score: 0,
        label: "neutral",
        articleCount: 0,
        topics: [],
        headlines: [],
        summary: "Sentiment analysis disabled",
        confidence: 0,
      },
      ratings: ratings || {
        consensus: "unknown",
        buyCount: 0,
        holdCount: 0,
        sellCount: 0,
        recentChanges: [],
        summary: "Analyst ratings disabled",
      },
      financial: financial || {
        score: 50,
        isProfitable: false,
        revenueTrend: "unknown",
        debtLevel: "unknown",
        summary: "Financial health analysis disabled",
      },
      riskEvents: riskEvents || {
        hasEarnings: false,
        hasDividend: false,
        events: [],
        summary: "Risk events detection disabled",
      },
      marketContext: marketContext || {
        sectorTrend: "unknown",
        marketRegime: "unknown",
        vixLevel: "unknown",
        summary: "Market context analysis disabled",
      },
      decisionScore,
      recommendation,
      reasoning,
      flags,
      confidence,
      analyzedAt: new Date(),
    };

    // Cache the result
    this.addToCache(opportunity.symbol, analysis);

    const duration = Date.now() - startTime;
    console.log(`   ✓ Analysis complete in ${duration}ms`);
    console.log(`   Decision Score: ${decisionScore}/100`);
    console.log(`   Recommendation: ${recommendation}`);

    return analysis;
  }

  /**
   * Calculate overall decision score
   */
  private calculateDecisionScore(
    otterScore: number,
    sentiment: any,
    ratings: any,
    financial: any,
    riskEvents: any
  ): { decisionScore: number; componentScores: Record<string, number> } {
    const componentScores: Record<string, number> = {};

    // Start with Otter Score (it's already 0-100)
    let totalScore = otterScore;
    componentScores.otterScore = otterScore;

    // Add sentiment impact
    if (sentiment && this.config.enableNewsSentiment) {
      const sentimentImpact = calculateSentimentImpact(sentiment, this.config.sentimentWeight);
      totalScore += sentimentImpact - 50 * this.config.sentimentWeight; // Adjust from baseline 50
      componentScores.sentiment = sentimentImpact;
    }

    // Add analyst ratings impact
    if (ratings && this.config.enableAnalystRatings) {
      const ratingsImpact = calculateRatingsImpact(ratings, this.config.ratingsWeight);
      totalScore += ratingsImpact - 50 * this.config.ratingsWeight; // Adjust from baseline 50
      componentScores.ratings = ratingsImpact;
    }

    // Add financial health impact
    if (financial && this.config.enableFinancialHealth) {
      const financialImpact = calculateFinancialImpact(financial, this.config.financialWeight);
      totalScore += financialImpact - 50 * this.config.financialWeight; // Adjust from baseline 50
      componentScores.financial = financialImpact;
    }

    // Subtract risk events impact (negative)
    if (riskEvents && this.config.enableRiskEvents) {
      const riskImpact = calculateRiskEventsImpact(riskEvents, this.config.riskEventsWeight);
      totalScore += riskImpact; // Already negative
      componentScores.riskEvents = riskImpact;
    }

    // Clamp to 0-100
    const decisionScore = Math.max(0, Math.min(100, totalScore));

    return { decisionScore, componentScores };
  }

  /**
   * Determine recommendation based on score and modifiers
   */
  private determineRecommendation(
    decisionScore: number,
    sentiment: any,
    riskEvents: any
  ): DecisionAnalysis["recommendation"] {
    // Check for critical risk events first
    if (riskEvents) {
      const riskModifier = getRiskEventRecommendationModifier(riskEvents);
      if (riskModifier === "DOWNGRADE") {
        return "STRONG_AVOID"; // Override score - too risky
      }
    }

    // Check for extreme sentiment
    if (sentiment) {
      const sentimentModifier = getSentimentRecommendationModifier(sentiment);
      if (sentimentModifier === "DOWNGRADE" && decisionScore < 70) {
        return "AVOID";
      }
      if (sentimentModifier === "UPGRADE" && decisionScore >= 70) {
        return "STRONG_BUY";
      }
    }

    // Base recommendation on score
    if (decisionScore >= this.config.minDecisionScore) {
      if (decisionScore >= 80) return "STRONG_BUY";
      if (decisionScore >= 65) return "BUY";
      return "NEUTRAL";
    }

    // Below minimum threshold
    if (decisionScore < 40) return "STRONG_AVOID";
    return "AVOID";
  }

  /**
   * Extract all flags from analyses
   */
  private extractAllFlags(
    sentiment: any,
    ratings: any,
    financial: any,
    riskEvents: any,
    marketContext: any
  ): string[] {
    const flags: string[] = [];

    if (sentiment) flags.push(...extractSentimentFlags(sentiment));
    if (ratings) flags.push(...extractRatingFlags(ratings));
    if (financial) flags.push(...extractFinancialFlags(financial));
    if (riskEvents) flags.push(...extractRiskEventFlags(riskEvents));
    if (marketContext) flags.push(...extractMarketContextFlags(marketContext));

    return flags;
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    opportunity: ScreenerOpportunity,
    decisionScore: number,
    componentScores: Record<string, number>,
    recommendation: DecisionAnalysis["recommendation"],
    flags: string[]
  ): string {
    const parts: string[] = [];

    // Start with recommendation
    parts.push(
      `${recommendation.replace("_", " ")} recommendation for ${opportunity.symbol}.`
    );

    // Add score context
    parts.push(
      `Decision score: ${decisionScore}/100 (Otter: ${opportunity.otterScore}).`
    );

    // Add key insights from components
    if (componentScores.sentiment !== undefined) {
      const sentimentAdj = componentScores.sentiment - 50;
      if (Math.abs(sentimentAdj) > 10) {
        parts.push(
          `Sentiment ${sentimentAdj > 0 ? "positive" : "negative"} (${sentimentAdj > 0 ? "+" : ""}${sentimentAdj.toFixed(0)} points).`
        );
      }
    }

    if (componentScores.riskEvents !== undefined && componentScores.riskEvents < -20) {
      parts.push(`Significant risk events detected (${componentScores.riskEvents.toFixed(0)} points penalty).`);
    }

    // Add critical flags
    if (flags.length > 0) {
      const criticalFlags = flags.filter((f) => f.includes("🚨") || f.includes("⚠️"));
      if (criticalFlags.length > 0) {
        parts.push(`WARNINGS: ${criticalFlags.join("; ")}.`);
      }
    }

    return parts.join(" ");
  }

  /**
   * Calculate confidence in the analysis
   */
  private calculateConfidence(sentiment: any, ratings: any, financial: any): number {
    let totalConfidence = 0;
    let count = 0;

    if (sentiment) {
      totalConfidence += sentiment.confidence;
      count++;
    }

    // Ratings confidence based on coverage
    if (ratings && ratings.consensus !== "unknown") {
      const totalAnalysts = ratings.buyCount + ratings.holdCount + ratings.sellCount;
      const ratingsConfidence = Math.min(totalAnalysts / 10, 1); // Max confidence at 10+ analysts
      totalConfidence += ratingsConfidence;
      count++;
    }

    // Financial confidence based on data availability
    if (financial && financial.revenueTrend !== "unknown") {
      totalConfidence += 0.8; // High confidence if we have data
      count++;
    }

    return count > 0 ? totalConfidence / count : 0.5;
  }

  /**
   * Get from cache if still valid
   */
  private getFromCache(symbol: string): DecisionAnalysis | null {
    const cached = this.cache.get(symbol);
    if (!cached) return null;

    const ttlMs = (this.config.cacheTTL ?? 60) * 60 * 1000;
    const age = Date.now() - cached.timestamp.getTime();

    if (age > ttlMs) {
      this.cache.delete(symbol);
      return null;
    }

    return cached.analysis;
  }

  /**
   * Add to cache
   */
  private addToCache(symbol: string, analysis: DecisionAnalysis): void {
    this.cache.set(symbol, {
      analysis,
      timestamp: new Date(),
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Create default decision engine configuration
 */
export function createDefaultDecisionEngine(): DecisionEngine {
  const config: DecisionEngineConfig = {
    enableNewsSentiment: true,
    enableAnalystRatings: true,
    enableFinancialHealth: true,
    enableRiskEvents: true,
    enableMarketContext: true,
    minDecisionScore: 60,
    sentimentWeight: 0.15,
    ratingsWeight: 0.15,
    financialWeight: 0.10,
    riskEventsWeight: 0.20,
    model: "sonnet",
    cacheTTL: 60, // 1 hour
  };

  return new DecisionEngine(config);
}
