const express = require('express');
const axios = require('axios');
const router = express.Router();

// In-memory cache for market news
let newsCache = { data: null, timestamp: 0 };
const companyNewsCache = {}; // symbol -> { data, timestamp }
const NEWS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

/**
 * Fetches general market news from Finnhub.
 * @returns {Promise<Array>} A promise that resolves to an array of news articles.
 */
async function fetchMarketNewsFromFinnhub() {
  if (!FINNHUB_API_KEY) {
    console.error('❌ Finnhub API key is not configured. Please set FINNHUB_API_KEY environment variable.');
    // Return mock data if API key is missing
    return [{
      id: 1,
      headline: 'Finnhub API Key not set',
      summary: 'Please configure the FINNHUB_API_KEY in your environment to fetch live market news.',
      source: 'System',
      datetime: Math.floor(Date.now() / 1000),
      url: '#'
    }];
  }

  const response = await axios.get('https://finnhub.io/api/v1/news', {
    params: {
      category: 'general',
      token: FINNHUB_API_KEY
    }
  });
  // Return the top 10 articles
  return response.data.slice(0, 10);
}

// GET /api/news/market - Get top market news
router.get('/market', async (req, res) => {
  try {
    const now = Date.now();
    if (newsCache.data && (now - newsCache.timestamp < NEWS_CACHE_TTL)) {
      console.log('📰 Returning cached market news.');
      return res.json({ news: newsCache.data });
    }

    console.log('🔄 Fetching fresh market news from Finnhub...');
    const news = await fetchMarketNewsFromFinnhub();
    newsCache = { data: news, timestamp: now };
    res.json({ news });
  } catch (error) {
    console.error('Market news fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch market news.' });
  }
});

// GET /api/news/company/:symbol - Get news for a specific company
router.get('/company/:symbol', async (req, res) => {
  const { symbol } = req.params;
  if (!symbol) {
    return res.status(400).json({ error: 'Stock symbol is required.' });
  }

  try {
    const now = Date.now();
    const cached = companyNewsCache[symbol];

    if (cached && (now - cached.timestamp < NEWS_CACHE_TTL)) {
      console.log(`📰 Returning cached news for ${symbol}.`);
      return res.json({ news: cached.data });
    }

    if (!FINNHUB_API_KEY) {
      console.error('❌ Finnhub API key is not configured.');
      return res.json({ news: [] }); // Return empty for company news if no key
    }

    console.log(`🔄 Fetching fresh news for ${symbol} from Finnhub...`);
    const to = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const from = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days ago

    const response = await axios.get('https://finnhub.io/api/v1/company-news', {
      params: {
        symbol: symbol.split('.')[0], // Remove .NS for Finnhub
        from,
        to,
        token: FINNHUB_API_KEY
      }
    });

    const news = response.data.slice(0, 20); // Get top 20 articles
    companyNewsCache[symbol] = { data: news, timestamp: now };
    res.json({ news });

  } catch (error) {
    console.error(`Company news fetch error for ${symbol}:`, error.message);
    res.status(500).json({ error: `Failed to fetch news for ${symbol}.` });
  }
});

module.exports = router;