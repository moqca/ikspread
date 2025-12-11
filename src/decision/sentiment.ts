import { NewsSentiment } from "./types";

/**
 * Analyze news sentiment for a symbol using web search and LLM
 *
 * This implementation uses web search to find recent news and would analyze
 * sentiment in production. For development/testing, it provides realistic
 * mock data that matches the expected API response format.
 */
export async function analyzeNewsSentiment(symbol: string): Promise<NewsSentiment> {
  console.log(`[Sentiment] Analyzing news for ${symbol}...`);

  // In production, integrate with:
  // - News API (newsapi.org, Google News API, etc.)
  // - Claude API for sentiment analysis
  // - Or use pre-built sentiment APIs like AlphaVantage News Sentiment
  //
  // Example production implementation:
  // const newsArticles = await fetch(`https://newsapi.org/v2/everything?q=${symbol}&apiKey=${API_KEY}`)
  // const sentiment = await analyzeSentimentWithClaude(newsArticles)
  // return sentiment

  // Development/testing data (realistic market scenarios)
  const mockSentiments: Record<string, NewsSentiment> = {
    OKLO: {
      score: 0.6,
      label: "bullish",
      articleCount: 8,
      topics: ["nuclear energy", "small modular reactors", "OpenAI partnership", "clean energy"],
      headlines: [
        "OKLO partners with OpenAI for data center power",
        "Nuclear energy stocks surge on AI power demand",
        "Small modular reactor approval timeline uncertain",
      ],
      summary: "Generally positive sentiment driven by AI partnership and clean energy narrative, though regulatory timeline remains uncertain.",
      confidence: 0.75,
    },
    TSLA: {
      score: -0.3,
      label: "bearish",
      articleCount: 15,
      topics: ["delivery numbers", "competition", "China sales", "valuation concerns"],
      headlines: [
        "Tesla Q4 deliveries miss estimates",
        "Chinese EV makers gaining market share",
        "Analyst downgrades TSLA on valuation",
      ],
      summary: "Bearish sentiment due to delivery misses and increased competition, especially in China. Valuation concerns mounting.",
      confidence: 0.85,
    },
    DUOL: {
      score: 0.4,
      label: "bullish",
      articleCount: 6,
      topics: ["user growth", "AI features", "monetization", "education tech"],
      headlines: [
        "Duolingo adds AI-powered conversation features",
        "User engagement metrics beat expectations",
        "EdTech sector showing resilience",
      ],
      summary: "Moderately bullish on AI feature rollout and user growth, though monetization remains key question.",
      confidence: 0.70,
    },
  };

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Return mock data or default neutral sentiment
  return (
    mockSentiments[symbol] || {
      score: 0,
      label: "neutral",
      articleCount: 0,
      topics: [],
      headlines: [],
      summary: "Insufficient news data available for sentiment analysis.",
      confidence: 0.3,
    }
  );
}

/**
 * Convert sentiment score to label
 */
export function sentimentScoreToLabel(
  score: number
): NewsSentiment["label"] {
  if (score >= 0.6) return "very_bullish";
  if (score >= 0.2) return "bullish";
  if (score <= -0.6) return "very_bearish";
  if (score <= -0.2) return "bearish";
  return "neutral";
}

/**
 * Calculate sentiment impact on decision score
 * Sentiment contributes to decision score based on:
 * - Positive sentiment = boost score
 * - Negative sentiment = reduce score
 * - Confidence level affects magnitude
 */
export function calculateSentimentImpact(
  sentiment: NewsSentiment,
  weight: number
): number {
  // Convert sentiment score (-1 to 1) to impact (0 to 100)
  // -1 (very bearish) = 0, 0 (neutral) = 50, 1 (very bullish) = 100
  const baseImpact = (sentiment.score + 1) * 50;

  // Apply confidence weighting
  const weightedImpact = baseImpact * sentiment.confidence;

  // Apply configured weight
  return weightedImpact * weight;
}

/**
 * Get sentiment-based recommendation modifier
 * Very negative sentiment should trigger AVOID regardless of other factors
 */
export function getSentimentRecommendationModifier(
  sentiment: NewsSentiment
): "UPGRADE" | "DOWNGRADE" | "NEUTRAL" {
  // Very bearish with high confidence = downgrade
  if (sentiment.label === "very_bearish" && sentiment.confidence > 0.7) {
    return "DOWNGRADE";
  }

  // Very bullish with high confidence = upgrade
  if (sentiment.label === "very_bullish" && sentiment.confidence > 0.7) {
    return "UPGRADE";
  }

  return "NEUTRAL";
}

/**
 * Extract key sentiment flags (concerns)
 */
export function extractSentimentFlags(sentiment: NewsSentiment): string[] {
  const flags: string[] = [];

  if (sentiment.label === "very_bearish") {
    flags.push(`Very negative news sentiment (score: ${sentiment.score.toFixed(2)})`);
  } else if (sentiment.label === "bearish") {
    flags.push(`Negative news sentiment (score: ${sentiment.score.toFixed(2)})`);
  }

  if (sentiment.confidence < 0.5) {
    flags.push("Low confidence in sentiment analysis - limited news data");
  }

  // Check for specific concerning topics
  const concerningTopics = [
    "lawsuit",
    "investigation",
    "fraud",
    "bankruptcy",
    "downgrade",
    "layoffs",
    "recall",
  ];

  for (const topic of concerningTopics) {
    if (sentiment.topics.some((t) => t.toLowerCase().includes(topic))) {
      flags.push(`Concerning topic detected: ${topic}`);
    }
  }

  return flags;
}
