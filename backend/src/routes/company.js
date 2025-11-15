const express = require('express');
const axios = require('axios');
const { spawn } = require('child_process');
const router = express.Router();

// In-memory cache for company data
let companyDataCache = new Map();
const COMPANY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper: get cached data
function getCachedCompanyData(symbol, timeframe) {
	const cacheKey = `${symbol}-${timeframe}`;
	const cached = companyDataCache.get(cacheKey);
	if (cached && Date.now() - cached.timestamp < COMPANY_CACHE_TTL) {
		console.log(`📋 Using cached data for ${symbol} (${timeframe})`);
		return cached.data;
	}
	return null;
}

// Helper: set cache
function cacheCompanyData(symbol, timeframe, data) {
	const cacheKey = `${symbol}-${timeframe}`;
	companyDataCache.set(cacheKey, {
		data,
		timestamp: Date.now()
	});
	console.log(`💾 Cached data for ${symbol} (${timeframe})`);
}

// Python yfinance fetcher for historical data
function fetchHistoricalWithYFinance(symbol, timeframe) {
	return new Promise((resolve, reject) => {
		const pythonScript = `
import yfinance as yf
import json
import sys
import time

# timeframe mapping
TF_TO_PARAMS = {
    '1D': {'period': '1d', 'interval': '15m'},
    '1W': {'period': '7d', 'interval': '90m'},
    '1M': {'period': '1mo', 'interval': '1d'},
    '1Y': {'period': '1y', 'interval': '1d'},
}

def fetch(symbol, timeframe):
    try:
        time.sleep(0.1)
        stock = yf.Ticker(symbol)
        params = TF_TO_PARAMS.get(timeframe, TF_TO_PARAMS['1W'])
        hist = stock.history(period=params['period'], interval=params['interval'])
        if hist is None or hist.empty:
            return {'error': f'No data available for {symbol} ({timeframe})'}

        # build datapoints
        data_points = []
        for idx, row in hist.iterrows():
            data_points.append({
                'date': idx.strftime('%Y-%m-%d %H:%M:%S'),
                'timestamp': int(idx.timestamp() * 1000),
                'open': float(row.get('Open', 0) or 0),
                'high': float(row.get('High', 0) or 0),
                'low': float(row.get('Low', 0) or 0),
                'close': float(row.get('Close', 0) or 0),
                'volume': int(row.get('Volume', 0) or 0)
            })

        if len(data_points) == 0:
            return {'error': f'No data points after processing for {symbol}'}

        # compute current/previous
        last = data_points[-1]
        prev = data_points[-2] if len(data_points) > 1 else last
        current_price = last['close']
        previous_price = prev['close'] if prev['close'] else current_price
        change = current_price - previous_price
        change_percent = (change / previous_price * 100) if previous_price else 0

        currency = 'INR' if '.NS' in symbol else 'USD'
        exchange = 'NSE' if '.NS' in symbol else 'NASDAQ/NYSE'

        result = {
            'symbol': symbol,
            'currentPrice': round(current_price, 2),
            'priceChange': round(change, 2),
            'priceChangePercent': round(change_percent, 2),
            'priceHistory': [p['close'] for p in data_points],
            'dates': [p['date'] for p in data_points],
            'timeframe': timeframe,
            'volume': last.get('volume', 0),
            'high': round(max(p['high'] for p in data_points), 2),
            'low': round(min(p['low'] for p in data_points), 2),
            'dataPoints': data_points,
            'dataSource': 'yfinance',
            'currency': currency,
            'exchange': exchange
        }
        return result
    except Exception as e:
        msg = str(e)
        if 'UNIQUE constraint failed: _cookieschema.strategy' in msg:
            return {'error': 'Temporary data issue, please try again'}
        return {'error': f'Error fetching: {msg}'}

if __name__ == '__main__':
    sym = sys.argv[1]
    tf = sys.argv[2] if len(sys.argv) > 2 else '1W'
    print(json.dumps(fetch(sym, tf)))
`;

		const python = spawn('python', ['-c', pythonScript, symbol, timeframe]);
		let out = '';
		let err = '';

		python.stdout.on('data', d => { out += d.toString(); });
		python.stderr.on('data', d => { err += d.toString(); });
		python.on('close', code => {
			if (code !== 0) {
				return reject(new Error(`Python exit ${code}: ${err}`));
			}
			try {
				const parsed = JSON.parse(out.trim());
				if (parsed.error) return reject(new Error(parsed.error));
				return resolve(parsed);
			} catch (e) {
				return reject(new Error(`Parse error: ${e.message}`));
			}
		});
		python.on('error', e => reject(new Error(`Failed to start Python: ${e.message}`)));
	});
}

// GET /api/company/status - data source and cache info
router.get('/status', async (req, res) => {
	try {
		const status = {
			dataSource: 'yfinance',
			configured: true,
			rateLimiting: 'None - unlimited',
			cache: {
				cacheSize: companyDataCache.size,
				cacheTTLSeconds: COMPANY_CACHE_TTL / 1000,
				cachedKeys: Array.from(companyDataCache.keys())
			},
			timestamp: new Date().toISOString()
		};
		res.json(status);
	} catch (err) {
		console.error('❌ Company route status check error:', err);
		res.status(500).json({ 
			error: 'Failed to get status information',
			message: err.message
		});
	}
});

// POST /api/company/clear-cache - clear company data cache
router.post('/clear-cache', async (req, res) => {
	try {
		const cacheSize = companyDataCache.size;
		companyDataCache.clear();
		console.log(`🗑️  Cleared company data cache (${cacheSize} entries)`);
		res.json({
			message: 'Company data cache cleared successfully',
			clearedEntries: cacheSize,
			timestamp: new Date().toISOString()
		});
	} catch (err) {
		console.error('❌ Error clearing company cache:', err);
		res.status(500).json({ 
			error: 'Failed to clear cache',
			message: err.message
		});
	}
});

// GET /api/company/:symbol - company price/timeframe chart
router.get('/:symbol', async (req, res) => {
	const { symbol } = req.params;
	const { timeframe = '1D' } = req.query;
	console.log(`🚀 Company route (yfinance) for ${symbol} - ${timeframe}`);
	try {
		// Cache first
		const cached = getCachedCompanyData(symbol, timeframe);
		if (cached) {
			return res.json(cached);
		}

		// Fetch via yfinance
		let attempts = 0;
		const maxAttempts = 2;
		while (attempts < maxAttempts) {
			try {
				attempts++;
				const data = await fetchHistoricalWithYFinance(symbol, timeframe);
				// add sentiment trend like before
				const sentimentTrend = data.dataPoints.map((p, i, arr) => {
					if (i === 0) return 'neutral';
					const delta = arr[i].close - arr[i-1].close;
					return delta > 0 ? 'positive' : (delta < 0 ? 'negative' : 'neutral');
				});
				const response = {
					...data,
					sentimentTrend
				};
				cacheCompanyData(symbol, timeframe, response);
				return res.json(response);
			} catch (e) {
				console.error(`❌ yfinance fetch failed for ${symbol}:`, e.message);
				if (attempts >= maxAttempts) break;
				await new Promise(r => setTimeout(r, 1000));
			}
		}

		return res.status(503).json({
			error: 'Failed to fetch company data from yfinance',
			message: 'Please try again shortly',
			dataSource: 'yfinance'
		});
	} catch (error) {
		console.error(`❌ Error in company route for ${symbol}:`, error);
		res.status(500).json({ 
			error: 'Failed to fetch company data from yfinance',
			message: error.message
		});
	}
});

module.exports = router; 