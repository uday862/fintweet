const express = require('express');
const { spawn } = require('child_process');
const router = express.Router();

// In-memory cache
let stockCache = { data: [], lastFetch: 0 };
const CACHE_TTL = 60 * 1000; // 1 minute

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

// GET /api/stocks - fetch/cached stock data
router.get('/', async (req, res) => {
  const now = Date.now();
  if (now - stockCache.lastFetch < CACHE_TTL && stockCache.data.length > 0) {
    return res.json({ 
      stocks: stockCache.data, 
      cached: true,
      message: 'Returning cached data',
      lastFetch: new Date(stockCache.lastFetch).toISOString()
    });
  }

  try {
    console.log('🔄 Fetching real-time stock data using yfinance...');
    console.log(`📈 Tracking ${TRACKED_STOCKS.length} stocks`);
    
    // Process stocks with retry logic for better reliability
const stockPromises = TRACKED_STOCKS.map(async (symbol) => {
  let attempts = 0;
  const maxAttempts = 2;
  
  while (attempts < maxAttempts) {
    try {
      attempts++;
      const result = await fetchStockDataWithYFinance(symbol);
      
      // If we got data successfully, return it
      if (!result.error) {
        return result;
      }
      
      // If it's a temporary error and we have attempts left, retry
      if (attempts < maxAttempts && result.error.includes('Temporary data issue')) {
        console.log(`🔄 Retrying ${symbol} (attempt ${attempts + 1}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        continue;
      }
      
      // If we get here, the error is permanent or we're out of attempts
      console.error(`❌ Failed to fetch ${symbol} after ${attempts} attempts:`, result.error);
      return {
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
      
    } catch (error) {
      attempts++;
      console.error(`❌ Exception fetching ${symbol} (attempt ${attempts}/${maxAttempts}):`, error.message);
      
      if (attempts >= maxAttempts) {
        return {
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
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
});
    
    const stocks = await Promise.all(stockPromises);
    
    if (stocks.length === 0) {
      return res.status(503).json({ 
        error: 'Unable to fetch stock data from yfinance',
        message: 'All stock data requests failed. Please check your Python environment.',
        stocks: [],
        cached: false
      });
    }

    stockCache = { data: stocks, lastFetch: now };
    
    console.log(`✅ Successfully fetched ${stocks.length}/${TRACKED_STOCKS.length} stocks using yfinance`);
    
    res.json({ 
      stocks, 
      cached: false,
      message: `Successfully fetched ${stocks.length}/${TRACKED_STOCKS.length} stocks using yfinance`,
      lastFetch: new Date(now).toISOString(),
      dataSource: 'yfinance'
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

// GET /api/stocks/status - check yfinance status
router.get('/status', async (req, res) => {
  try {
    const status = {
      dataSource: 'yfinance',
      configured: true,
      rateLimiting: 'None - unlimited requests',
      cache: {
        lastFetch: stockCache.lastFetch ? new Date(stockCache.lastFetch).toISOString() : 'Never',
        cachedStocks: stockCache.data.length,
        cacheTTL: CACHE_TTL / 1000
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
    
    const stockData = await fetchStockDataWithYFinance(symbol);
    
    if (stockData && !stockData.error) {
      res.json({
        ...stockData,
        dataSource: 'yfinance'
      });
    } else {
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

module.exports = router;
