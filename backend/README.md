# FinTweet Backend

Node.js + Express + MongoDB backend for FinTweet.

## Features
- REST API for tweets, stocks, sentiment, dashboard
- MongoDB with Mongoose
- WebSocket for real-time updates
- Rate limiting, cron jobs
- **Smart Alpha Vantage API integration with rate limiting**

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy the example environment file and configure your API key:
```bash
cp env.example .env
```

Edit `.env` and add your Alpha Vantage API key:
```bash
ALPHA_VANTAGE_API_KEY=your_actual_api_key_here
```

**Get your free API key from:** [Alpha Vantage](https://www.alphavantage.co/support/#api-key)

### 3. Start Development Server
```bash
npm run dev
```

## API Endpoints

### Stocks
- `GET /api/stocks` - Fetch/cached stock data with rate limiting
- `GET /api/stocks/status` - Check API key and rate limiting status
- `GET /api/stocks/:symbol` - Get specific stock data

### Other Endpoints
- `POST /api/tweets` - Store classified tweets
- `GET /api/company/:symbol` - Company price/sentiment
- `GET /api/sentiment` - Daily mood trends
- `GET /api/dashboard` - Aggregates

## Rate Limiting

The application automatically handles Alpha Vantage's rate limits:
- **5 API calls per minute** (free tier)
- **500 API calls per day** (free tier)
- Automatic retry with exponential backoff
- Batch processing to minimize API calls
- Smart caching to reduce redundant requests

## Troubleshooting

### API Key Issues
1. Ensure your `.env` file exists and contains a valid API key
2. Check `/api/stocks/status` endpoint for API key validation
3. Verify your API key is active at Alpha Vantage

### Rate Limiting
- The app automatically respects rate limits
- Check the status endpoint for current usage
- Consider upgrading to a paid Alpha Vantage plan for higher limits

--- 