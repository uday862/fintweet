const express = require('express');
const axios = require('axios');
const { spawn } = require('child_process');
const router = express.Router();

// Import cache service
const stockCacheService = require('../services/stockCacheService');

// Cache configuration
const CACHE_TTL_MINUTES = 5; // 5 minutes cache validity

// YFinance configuration (no API key needed!)
const DATA_SOURCE = 'yfinance';
const RATE_LIMIT = {
  callsPerMinute: 50, // Much higher with yfinance
  callsPerDay: 1000,  // No real limit with yfinance
  retryDelay: 1000,   // 1 second between calls (much faster)
};

// Popular stocks to track (US + Indian NSE stocks)
const TRACKED_STOCKS = [
  // US Stocks
  'TSLA', 'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'NVDA', 'META', 'NFLX',
  // US ETFs
  'SPY', 'QQQ', 'IWM', 'VTI', 'VOO',
  // Indian NSE Stocks (much more reliable than BSE)
  'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ADANIENT.NS',
  'ICICIBANK.NS', 'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS'
];



// Python script to fetch stock data using yfinance
function fetchStockDataWithYFinance(symbol) {
  return new Promise((resolve, reject) => {
    const pythonScript = `
import yfinance as yf
import json
import sys
import time

def get_stock_data(symbol):
    try:
        # Add small delay to avoid cookie schema issues
        time.sleep(0.1)
        
        # Get stock info with error handling
        stock = yf.Ticker(symbol)
        
        # Get historical data for change calculation (use 5 days to be safe)
        hist = stock.history(period="5d")
        
        if hist.empty:
            return {"error": f"No data available for {symbol}"}
        
        # Current data
        current_price = hist['Close'].iloc[-1]
        previous_price = hist['Close'].iloc[-2] if len(hist) > 1 else current_price
        
        # Calculate change
        change = current_price - previous_price
        change_percent = ((change / previous_price) * 100) if previous_price > 0 else 0
        
        # Get latest volume and high/low
        latest_data = hist.iloc[-1]
        
        # Determine currency based on symbol
        currency = "INR" if ".NS" in symbol else "USD"
        
        stock_data = {
            "symbol": symbol,
            "price": round(current_price, 2),
            "change": round(change, 2),
            "changePercent": round(change_percent, 2),
            "volume": int(latest_data['Volume']) if 'Volume' in latest_data else 0,
            "high": round(latest_data['High'], 2) if 'High' in latest_data else current_price,
            "low": round(latest_data['Low'], 2) if 'Low' in latest_data else current_price,
            "lastUpdated": latest_data.name.strftime('%Y-%m-%d'),
            "currency": currency,
            "exchange": "NSE" if ".NS" in symbol else "NASDAQ/NYSE",
            "method": "yfinance"
        }
        
        return stock_data
        
    except Exception as e:
        error_msg = str(e)
        # Handle specific cookie schema error
        if "UNIQUE constraint failed: _cookieschema.strategy" in error_msg:
            return {"error": f"Temporary data issue for {symbol}, please try again"}
        elif "No data found" in error_msg:
            return {"error": f"No data available for {symbol}"}
        elif "HTTP Error 404" in error_msg:
            return {"error": f"Symbol {symbol} not found on Yahoo Finance"}
        else:
            return {"error": f"Error fetching data for {symbol}: {error_msg}"}

if __name__ == "__main__":
    symbol = sys.argv[1]
    result = get_stock_data(symbol)
    print(json.dumps(result))
`;

    const pythonProcess = spawn('python', ['-c', pythonScript, symbol]);
    
    let dataString = '';
    let errorString = '';
    
    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process failed with code ${code}: ${errorString}`));
        return;
      }
      
      try {
        const result = JSON.parse(dataString.trim());
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      } catch (parseError) {
        reject(new Error(`Failed to parse Python output: ${parseError.message}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
}

async function fetchStockData(symbol, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Fetching stock data for ${symbol} (attempt ${attempt}/${retries})`);
      
      const result = await fetchStockDataWithYFinance(symbol);
      
      // If we got data successfully, return it
      if (!result.error) {
        return result;
      }
      
      // If it's a temporary error and we have attempts left, retry
      if (attempt < retries && result.error.includes('Temporary data issue')) {
        console.log(`🔄 Retrying ${symbol} (attempt ${attempt + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          continue;
        }
      
      // If we get here, the error is permanent or we're out of attempts
      throw new Error(result.error);


      
    } catch (error) {
      console.error(`Error fetching data for ${symbol} (attempt ${attempt}/${retries}):`, error.message);
      
      if (attempt === retries) {
        throw error; // Re-throw on final attempt
      }
      
      // Wait before retrying with exponential backoff
      const waitTime = Math.min(attempt * 2000, RATE_LIMIT.retryDelay);
      console.log(`⏳ Waiting ${waitTime/1000}s before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// GET /api/stocks - fetch/cached stock data
router.get('/', async (req, res) => {
  try {
    console.log('🔄 Fetching stock data with database cache...');
    console.log(`📈 Tracking ${TRACKED_STOCKS.length} stocks`);
    
    // First, try to get cached data for all symbols
    const cachedStocks = await stockCacheService.getCachedStocks(TRACKED_STOCKS, CACHE_TTL_MINUTES);
    const cachedSymbols = new Set(cachedStocks.map(stock => stock.symbol));
    const uncachedSymbols = TRACKED_STOCKS.filter(symbol => !cachedSymbols.has(symbol));
    
    console.log(`📋 Cache results: ${cachedStocks.length} cached, ${uncachedSymbols.length} need fresh data`);
    
    let freshStocks = [];
    
    // Fetch fresh data only for uncached symbols
    if (uncachedSymbols.length > 0) {
      console.log(`🔄 Fetching fresh data for: ${uncachedSymbols.join(', ')}`);
      
      const freshStockPromises = uncachedSymbols.map(async (symbol) => {
        let attempts = 0;
        const maxAttempts = 2;
        
        while (attempts < maxAttempts) {
          try {
            attempts++;
            const result = await fetchStockDataWithYFinance(symbol);
            
            // If we got data successfully, cache it and return
            if (!result.error) {
              await stockCacheService.cacheStock(symbol, result);
              return { ...result, cached: false };
            }
            
            // If it's a temporary error and we have attempts left, retry
            if (attempts < maxAttempts && result.error.includes('Temporary data issue')) {
              console.log(`🔄 Retrying ${symbol} (attempt ${attempts + 1}/${maxAttempts})...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
            
            // If we get here, the error is permanent or we're out of attempts
            console.error(`❌ Failed to fetch ${symbol} after ${attempts} attempts:`, result.error);
            const failedStock = {
              symbol,
              price: 0,
              change: 0,
              changePercent: 0,
              volume: 0,
              high: 0,
              low: 0,
              lastUpdated: new Date().toISOString().split('T')[0],
              error: result.error,
              status: 'failed'
            };
            
            await stockCacheService.cacheFailedStock(symbol, result.error);
            return failedStock;
            
      } catch (error) {
            attempts++;
            console.error(`❌ Exception fetching ${symbol} (attempt ${attempts}/${maxAttempts}):`, error.message);
            
            if (attempts >= maxAttempts) {
              const failedStock = {
                symbol,
                price: 0,
                change: 0,
                changePercent: 0,
                volume: 0,
                high: 0,
                low: 0,
                lastUpdated: new Date().toISOString().split('T')[0],
                error: error.message,
                status: 'failed'
              };
              
              await stockCacheService.cacheFailedStock(symbol, error.message);
              return failedStock;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      });
      
      freshStocks = await Promise.all(freshStockPromises);
    }
    
    // Combine cached and fresh stocks
    const allStocks = [...cachedStocks, ...freshStocks];
    
    if (allStocks.length === 0) {
      return res.status(503).json({ 
        error: 'Unable to fetch stock data from yfinance',
        message: 'All stock data requests failed. Please check your Python environment.',
        stocks: [],
        cached: false
      });
    }

    // Calculate cache statistics
    const cachedCount = cachedStocks.length;
    const freshCount = freshStocks.length;
    const totalCount = allStocks.length;
    const cacheHitRate = totalCount > 0 ? ((cachedCount / totalCount) * 100).toFixed(1) : 0;
    
    console.log(`✅ Successfully fetched ${totalCount}/${TRACKED_STOCKS.length} stocks`);
    console.log(`📊 Cache performance: ${cachedCount} cached, ${freshCount} fresh (${cacheHitRate}% hit rate)`);
    
    res.json({ 
      stocks: allStocks, 
      cached: cachedCount > 0,
      message: `Successfully fetched ${totalCount}/${TRACKED_STOCKS.length} stocks using yfinance`,
      lastFetch: new Date().toISOString(),
      dataSource: 'yfinance',
      cacheStats: {
        cached: cachedCount,
        fresh: freshCount,
        total: totalCount,
        hitRate: cacheHitRate
      }
    });
    
  } catch (err) {
    console.error('❌ Stock API error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch stock data from yfinance',
      message: err.message,
      stocks: [],
      cached: false
    });
  }
});

// GET /api/stocks/status - check API key and rate limiting status
router.get('/status', async (req, res) => {
  try {
    // Get cache statistics
    const cacheStats = await stockCacheService.getCacheStats();
    const cacheHitRate = await stockCacheService.getCacheHitRate(1); // Last hour
    
    const status = {
      dataSource: 'yfinance',
      configured: true,
      rateLimiting: 'None - unlimited requests',
      cache: {
        totalCached: cacheStats.totalCached || 0,
        activeCached: cacheStats.activeCached || 0,
        failedCached: cacheStats.failedCached || 0,
        totalHits: cacheStats.totalHits || 0,
        avgAgeMinutes: Math.round(cacheStats.avgAgeMinutes || 0),
        hitRate: cacheHitRate,
        defaultCacheAgeMinutes: CACHE_TTL_MINUTES,
        mostAccessed: cacheStats.mostAccessed || []
      },
      trackedStocks: TRACKED_STOCKS,
      timestamp: new Date().toISOString()
    };
    
    res.json(status);
  } catch (err) {
    console.error('❌ Status check error:', err);
    res.status(500).json({ 
      error: 'Failed to get status information',
      message: err.message
    });
  }
});

// GET /api/stocks/:symbol - get specific stock data
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // Check if symbol is in tracked stocks
    if (!TRACKED_STOCKS.includes(symbol)) {
      return res.status(400).json({
        error: 'Invalid symbol',
        message: `Symbol '${symbol}' is not in the tracked stocks list`,
        trackedStocks: TRACKED_STOCKS
      });
    }
    
    // First, try to get cached data
    const cachedStock = await stockCacheService.getCachedStock(symbol, CACHE_TTL_MINUTES);
    
    if (cachedStock) {
      console.log(`📋 Returning cached data for ${symbol}`);
      return res.json({
        ...cachedStock,
        dataSource: 'yfinance'
      });
    }
    
    // If no cache, fetch fresh data
    console.log(`🔄 Fetching fresh data for ${symbol}`);
    const stockData = await fetchStockDataWithYFinance(symbol);
    
    if (stockData && !stockData.error) {
      // Cache the successful result
      await stockCacheService.cacheStock(symbol, stockData);
      
      res.json({
        ...stockData,
        dataSource: 'yfinance',
        cached: false
      });
    } else {
      // Cache the failed result
      await stockCacheService.cacheFailedStock(symbol, stockData?.error || 'Unknown error');
      
      res.status(404).json({ 
        error: 'Stock not found',
        message: stockData?.error || 'The requested stock symbol could not be found or has no data available'
      });
    }
  } catch (err) {
    console.error(`❌ Error fetching stock data for ${req.params.symbol}:`, err.message);
    res.status(500).json({ 
      error: 'Error fetching stock data from yfinance',
      message: err.message
    });
  }
});

// POST /api/stocks/cache/clear - clear all cache
router.post('/cache/clear', async (req, res) => {
  try {
    const result = await stockCacheService.cleanOldCache(0); // Clear all cache
    res.json({
      message: 'Cache cleared successfully',
      deletedCount: result.deletedCount,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Cache clear error:', err);
    res.status(500).json({
      error: 'Failed to clear cache',
      message: err.message
    });
  }
});

// POST /api/stocks/cache/invalidate/:symbol - invalidate cache for specific symbol
router.post('/cache/invalidate/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const result = await stockCacheService.invalidateCache(symbol);
    res.json({
      message: `Cache invalidated for ${symbol}`,
      modifiedCount: result.modifiedCount,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(`❌ Cache invalidation error for ${req.params.symbol}:`, err);
    res.status(500).json({
      error: 'Failed to invalidate cache',
      message: err.message
    });
  }
});

// GET /api/stocks/cache/stats - get detailed cache statistics
router.get('/cache/stats', async (req, res) => {
  try {
    const cacheStats = await stockCacheService.getCacheStats();
    const cacheHitRate = await stockCacheService.getCacheHitRate(1);
    
    res.json({
      ...cacheStats,
      hitRate: cacheHitRate,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Cache stats error:', err);
    res.status(500).json({
      error: 'Failed to get cache statistics',
      message: err.message
    });
  }
});

// POST /api/stocks/cache/warmup - warm up cache for all tracked stocks
router.post('/cache/warmup', async (req, res) => {
  try {
    console.log('🔥 Starting cache warm-up...');
    
    const results = await stockCacheService.warmUpCache(TRACKED_STOCKS, fetchStockDataWithYFinance);
    
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    res.json({
      message: 'Cache warm-up completed',
      results: {
        total: results.length,
        success: successCount,
        failed: failedCount,
        error: errorCount
      },
      details: results,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Cache warm-up error:', err);
    res.status(500).json({ 
      error: 'Failed to warm up cache',
      message: err.message
    });
  }
});

module.exports = router; 