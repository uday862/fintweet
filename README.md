# FinTweet - AI-Powered Financial Sentiment Tracking Platform

A comprehensive financial sentiment tracking platform that combines real-time stock data, AI-powered tweet analysis, and professional trading dashboard interface.

## 🚀 Features

### ✅ Implemented Features

- **Real-Time Stock Data**: Integration with Alpha Vantage API for live stock prices and historical data
- **Professional Line Charts**: Interactive charts with hover effects, tooltips, and timeframe switching (1D, 1W, 1M, 1Y)
- **AI Tweet Analysis**: Sentiment classification using FinBERT model with fallback to rule-based analysis
- **Dynamic Data**: Charts update based on company selection and timeframe without changing size
- **Search Functionality**: Real-time stock search with autocomplete
- **Watchlist**: Real-time stock prices with change indicators
- **Market News**: AI-analyzed tweets with sentiment badges
- **Trading Panel**: Mock trading interface for buy/sell orders
- **Responsive Design**: Professional dark theme similar to TradingView/Zerodha
- **Microservices Architecture**: Modular design with separate services for different functionalities

### 📊 Chart Features

- **Interactive Line Charts**: Professional charts with hover tooltips showing exact price, date, and time
- **Timeframe Switching**: Seamless switching between 1D, 1W, 1M, 1Y views
- **Fixed Chart Size**: Charts maintain consistent size when switching timeframes
- **Real Data Integration**: Fetches actual historical data from Alpha Vantage API
- **Fallback System**: Uses realistic mock data when API is unavailable
- **Grid Lines**: Professional grid with price and time labels
- **Gradient Fill**: Beautiful gradient fill under the price line



## 🛠️ Quick Start

### Prerequisites

- Node.js 16+ (for local development)
- Python 3.8+ (for local development)
- MongoDB (for local development)





1. **Install dependencies**:
   ```bash
   # Backend
   cd fin-tweet-backend && npm install
   
   # Frontend
   cd ../fin-tweet-frontend && npm install
   
  
   
   # Flask services
   cd ../flask cd flask_for_stock_prediction_Sentimental_Analysis && pip install -r requirements.txt


2. **Set up environment variables**:
   Create a `.env` file in the backend directory:
   MONGO_URI=mongodb://localhost:27017/fintweet
   PORT=5000
   NODE=development



4. **Start services** (in separate terminals):
   ```bash
   # Backend
   cd fin-tweet-backend && npm strt
   
   # Frontend
   cd fin-tweet-frontend && npm start
   
   # Flask
    cd flask 
    cd flask_for_stock_prediction_Sentimental_Analysis && python app.py
   
  



### Backend API (Port 5000)

- `GET /api/stocks` - Get real-time stock data
- `GET /api/company/:symbol?timeframe=1D` - Get company data with historical prices
- `GET /api/tweets` - Get classified tweets
- `GET /api/dashboard` - Get dashboard summary
- `GET /api/sentiment` - Get sentiment trends



## 🎯 Key Features Explained

### Real-Time Stock Data
- Fetches live data from Alpha Vantage API
- Supports multiple timeframes (1D, 1W, 1M, 1Y)
- Automatic fallback to realistic mock data
- Caches data to reduce API calls

### Professional Charts
- Canvas-based line charts with smooth animations
- Interactive hover effects with tooltips
- Professional grid lines and labels
- Gradient fill under price lines
- Fixed chart size for consistent UX

### AI Tweet Analysis
- Uses FinBERT model for financial sentiment analysis
- Rule-based fallback when model is unavailable
- Classifies sentiment (positive/negative/neutral)
- Determines relevance and potential impact
- Confidence scoring for classifications

### Search and Navigation
- Real-time stock search with autocomplete
- Click to select companies and update charts
- Watchlist with live price updates
- Professional trading interface

## 🔧 Configuration

### Environment Variables



# Twitter API Keys (optional - uses mock data if not provided)
TWITTER_API_KEY=your_twitter_api_key_here
TWITTER_API_SECRET=your_twitter_api_secret_here
TWITTER_ACCESS_TOKEN=your_twitter_access_token_here
TWITTER_ACCESS_SECRET=your_twitter_access_secret_here
```

### API Keys Setup

1. **Alpha Vantage** (Recommended):
   - Visit [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
   - Sign up for a free API key
   - Add to `.env` file for real stock data

2. **Twitter API** (Optional):
   - Apply for Twitter API access
   - Add keys to `.env` file for real tweet data
   - System works with mock data if not provided

## 🎨 UI/UX Features

- **Dark Theme**: Professional dark interface similar to TradingView
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Interactive Elements**: Hover effects, smooth transitions
- **Real-Time Updates**: Live price updates and data refresh
- **Professional Layout**: Clean, organized interface for trading

## 🚀 Next Steps

- [ ] Implement WebSocket for real-time updates
- [ ] Add user authentication and portfolios
- [ ] Implement actual trading functionality
- [ ] Add more technical indicators
- [ ] Enhance AI model with reinforcement learning
- [ ] Add news sentiment analysis
- [ ] Implement alerts and notifications

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:

1. Check the console for error messages
2. Ensure all services are running
3. Verify API keys are correctly set
4. Check Docker logs: `docker-compose logs`

For real stock data, make sure to set up your Alpha Vantage API key! 