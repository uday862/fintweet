const express = require('express');
const sentimentSimulator = require('../services/sentimentSimulator');
const router = express.Router();

// GET /api/sentiment - Get sentiment data
router.get('/', async (req, res) => {
  try {
    const { symbol } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol parameter is required.' });
    }
    
    // For demo purposes, generate simulated sentiment data
    const mockStockData = {
      priceChange: (Math.random() - 0.5) * 20, // Random price change
      priceChangePercent: (Math.random() - 0.5) * 10, // Random percentage
      volume: Math.floor(Math.random() * 1000000) + 100000,
      high: 100 + Math.random() * 50,
      low: 50 + Math.random() * 50
    };
    
    const sentimentData = sentimentSimulator.generateStockSentiment(symbol, mockStockData);
    
    res.json({
      symbol,
      sentiment: sentimentData.sentiment,
      percentages: sentimentData.percentages,
      tweets: sentimentData.tweets,
      confidence: sentimentData.confidence,
      generatedAt: sentimentData.generatedAt,
      dataSource: 'simulated'
    });
    
  } catch (error) {
    console.error('Sentiment error:', error);
    res.status(500).json({ error: 'Server error generating sentiment data.' });
  }
});

// GET /api/sentiment/market - Get market-wide sentiment
router.get('/market', async (req, res) => {
  try {
    // Generate mock market data
    const mockStocksData = Array.from({ length: 10 }, () => ({
      priceChange: (Math.random() - 0.5) * 20,
      priceChangePercent: (Math.random() - 0.5) * 10,
      volume: Math.floor(Math.random() * 1000000) + 100000,
      high: 100 + Math.random() * 50,
      low: 50 + Math.random() * 50
    }));
    
    const marketSentiment = sentimentSimulator.generateMarketSentiment(mockStocksData);
    
    res.json({
      market: marketSentiment,
      dataSource: 'simulated'
    });
    
  } catch (error) {
    console.error('Market sentiment error:', error);
    res.status(500).json({ error: 'Server error generating market sentiment.' });
  }
});

module.exports = router;