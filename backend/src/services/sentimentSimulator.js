// Sentiment Simulator Service
// Generates realistic sentiment data based on stock performance and market conditions

class SentimentSimulator {
  constructor() {
    this.sentimentKeywords = {
      positive: [
        'bullish', 'surge', 'rally', 'gains', 'breakthrough', 'momentum', 'strong', 'growth',
        'profit', 'earnings', 'beat', 'exceed', 'outperform', 'upgrade', 'buy', 'hold',
        'optimistic', 'confidence', 'recovery', 'rebound', 'breakout', 'support'
      ],
      negative: [
        'bearish', 'decline', 'drop', 'fall', 'crash', 'sell-off', 'weak', 'loss',
        'miss', 'disappoint', 'underperform', 'downgrade', 'sell', 'avoid', 'concern',
        'pessimistic', 'fear', 'volatility', 'risk', 'correction', 'resistance'
      ],
      neutral: [
        'stable', 'flat', 'unchanged', 'sideways', 'consolidation', 'range', 'wait',
        'monitor', 'observe', 'analysis', 'review', 'evaluate', 'assess', 'consider'
      ]
    };

    this.tweetTemplates = {
      positive: [
        "{symbol} showing strong momentum today! 📈",
        "Great earnings beat for {symbol}! 💪",
        "{symbol} breaking through resistance levels 🚀",
        "Bullish sentiment building for {symbol} 📊",
        "{symbol} rally continues with strong volume 📈",
        "Analysts upgrading {symbol} target price 🎯",
        "{symbol} leading the sector gains today 📈",
        "Strong fundamentals supporting {symbol} growth 💎"
      ],
      negative: [
        "{symbol} facing headwinds in today's session 📉",
        "Concerns over {symbol} earnings outlook 😰",
        "{symbol} selling pressure continues 📉",
        "Bearish sentiment growing for {symbol} 📊",
        "{symbol} breaking support levels 📉",
        "Analysts downgrading {symbol} outlook 📉",
        "{symbol} underperforming the market today 📉",
        "Volatility concerns for {symbol} investors ⚠️"
      ],
      neutral: [
        "{symbol} trading in a tight range today 📊",
        "Mixed signals for {symbol} investors 🤔",
        "{symbol} consolidating recent gains 📊",
        "Analysts remain neutral on {symbol} 📊",
        "{symbol} waiting for market direction 📊",
        "Sideways movement for {symbol} today 📊",
        "{symbol} holding key support levels 📊",
        "Range-bound trading for {symbol} 📊"
      ]
    };
  }

  // Generate sentiment based on stock performance
  generateSentiment(stockData) {
    const { priceChange, priceChangePercent, volume, high, low } = stockData;
    
    // Calculate sentiment score based on multiple factors
    let sentimentScore = 0;
    
    // Price change factor (most important)
    if (priceChangePercent > 5) sentimentScore += 3;
    else if (priceChangePercent > 2) sentimentScore += 2;
    else if (priceChangePercent > 0) sentimentScore += 1;
    else if (priceChangePercent < -5) sentimentScore -= 3;
    else if (priceChangePercent < -2) sentimentScore -= 2;
    else if (priceChangePercent < 0) sentimentScore -= 1;
    
    // Volume factor
    if (volume > 1000000) sentimentScore += 1; // High volume adds to sentiment
    else if (volume < 100000) sentimentScore -= 1; // Low volume reduces confidence
    
    // Price range factor
    const priceRange = ((high - low) / low) * 100;
    if (priceRange > 10) sentimentScore += 1; // High volatility
    else if (priceRange < 2) sentimentScore -= 1; // Low volatility
    
    // Determine sentiment category
    if (sentimentScore >= 2) return 'positive';
    else if (sentimentScore <= -2) return 'negative';
    else return 'neutral';
  }

  // Generate realistic sentiment percentages
  generateSentimentPercentages(sentiment) {
    const basePercentages = {
      positive: { positive: 0.6, neutral: 0.3, negative: 0.1 },
      negative: { positive: 0.1, neutral: 0.3, negative: 0.6 },
      neutral: { positive: 0.3, neutral: 0.5, negative: 0.2 }
    };
    
    const base = basePercentages[sentiment];
    
    // Add some randomness to make it more realistic
    const randomFactor = () => (Math.random() - 0.5) * 0.2; // ±10% variation
    
    const positive = Math.max(0, Math.min(1, base.positive + randomFactor()));
    const negative = Math.max(0, Math.min(1, base.negative + randomFactor()));
    const neutral = 1 - positive - negative;
    
    return {
      positive: Math.round(positive * 100),
      neutral: Math.round(neutral * 100),
      negative: Math.round(negative * 100)
    };
  }

  // Generate demo tweets for a stock
  generateTweets(symbol, sentiment, count = 5) {
    const templates = this.tweetTemplates[sentiment];
    const tweets = [];
    
    for (let i = 0; i < count; i++) {
      const template = templates[Math.floor(Math.random() * templates.length)];
      const tweet = template.replace('{symbol}', symbol);
      
      // Add some realistic timing
      const hoursAgo = Math.floor(Math.random() * 24);
      const minutesAgo = Math.floor(Math.random() * 60);
      const timestamp = new Date(Date.now() - (hoursAgo * 60 + minutesAgo) * 60 * 1000);
      
      tweets.push({
        id: `tweet_${symbol}_${i}_${Date.now()}`,
        text: tweet,
        author: this.generateRandomAuthor(),
        timestamp: timestamp.toISOString(),
        sentiment: sentiment,
        likes: Math.floor(Math.random() * 100),
        retweets: Math.floor(Math.random() * 50),
        hashtags: this.generateHashtags(symbol, sentiment)
      });
    }
    
    return tweets;
  }

  // Generate random author names
  generateRandomAuthor() {
    const authors = [
      'TraderMike', 'StockGuru', 'MarketWatcher', 'FinancePro', 'InvestorDaily',
      'TradingTips', 'MarketInsider', 'StockAnalyst', 'FinanceNews', 'TradingEdge',
      'MarketPulse', 'StockTracker', 'FinanceBuzz', 'TradingSignals', 'MarketTrends'
    ];
    return authors[Math.floor(Math.random() * authors.length)];
  }

  // Generate relevant hashtags
  generateHashtags(symbol, sentiment) {
    const baseHashtags = [`#${symbol}`, '#stocks', '#trading'];
    
    const sentimentHashtags = {
      positive: ['#bullish', '#gains', '#momentum', '#growth'],
      negative: ['#bearish', '#decline', '#volatility', '#risk'],
      neutral: ['#analysis', '#market', '#trading', '#finance']
    };
    
    const sentimentTags = sentimentHashtags[sentiment];
    const selectedTags = sentimentTags.slice(0, Math.floor(Math.random() * 3) + 1);
    
    return [...baseHashtags, ...selectedTags];
  }

  // Generate comprehensive sentiment data for a stock
  generateStockSentiment(symbol, stockData) {
    const sentiment = this.generateSentiment(stockData);
    const percentages = this.generateSentimentPercentages(sentiment);
    const tweets = this.generateTweets(symbol, sentiment, 8);
    
    return {
      symbol,
      sentiment,
      percentages,
      tweets,
      generatedAt: new Date().toISOString(),
      confidence: Math.floor(Math.random() * 30) + 70 // 70-100% confidence
    };
  }

  // Generate market-wide sentiment
  generateMarketSentiment(stocksData) {
    const sentiments = stocksData.map(stock => this.generateSentiment(stock));
    
    const positiveCount = sentiments.filter(s => s === 'positive').length;
    const negativeCount = sentiments.filter(s => s === 'negative').length;
    const neutralCount = sentiments.filter(s => s === 'neutral').length;
    const total = sentiments.length;
    
    return {
      overall: positiveCount > negativeCount ? 'positive' : negativeCount > positiveCount ? 'negative' : 'neutral',
      percentages: {
        positive: Math.round((positiveCount / total) * 100),
        neutral: Math.round((neutralCount / total) * 100),
        negative: Math.round((negativeCount / total) * 100)
      },
      totalStocks: total,
      generatedAt: new Date().toISOString()
    };
  }
}

module.exports = new SentimentSimulator();
