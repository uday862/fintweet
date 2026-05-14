const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    const allowed = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080',
      'https://fintweet-frontend.onrender.com',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    // Allow requests with no origin (Render health checks, Postman, etc.)
    if (!origin || allowed.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fintweet';

// MongoDB connection with better error handling
mongoose.connect(MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
  console.log(`📊 Database: ${MONGO_URI.split('/').pop()}`);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.log('⚠️  Running without database - using in-memory storage');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memory: process.memoryUsage(),
    version: process.version
  };
  
  res.json(health);
});

// Test YFinance API endpoint
app.get('/api/test-yfinance', async (req, res) => {
  try {
    const { symbol = 'AAPL' } = req.query;
    
    console.log(`🧪 Testing YFinance API for ${symbol}`);
    
    const { spawn } = require('child_process');
    const pythonProcess = spawn('python', ['scripts/fetch_stock_data.py', symbol]);
    
    let output = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const data = JSON.parse(output);
          res.json({
            success: true,
            symbol,
            data,
            timestamp: new Date().toISOString()
          });
        } catch (parseError) {
          res.status(500).json({
            success: false,
            error: 'Failed to parse Python output',
            output,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        res.status(500).json({
          success: false,
          error: errorOutput || 'Python process failed',
          code,
          timestamp: new Date().toISOString()
        });
      }
    });
    
  } catch (error) {
    console.error('❌ YFinance test failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.use('/api/tweets', require('./routes/tweets'));
app.use('/api/stocks', require('./routes/stocks'));
app.use('/api/stocks-yfinance', require('./routes/stocks-yfinance'));
app.use('/api/company', require('./routes/company'));
app.use('/api/sentiment', require('./routes/sentiment'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/auth', require('./routes/auth').router);
app.use('/api/user', require('./routes/user'));
app.use('/api/global-orders', require('./routes/globalOrders'));
app.use('/api/news', require('./routes/news'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  
  // Don't leak error details in production
  const error = process.env.NODE_ENV === 'production' 
    ? { message: 'Internal server error' }
    : { message: err.message, stack: err.stack };
  
  res.status(err.status || 500).json({
    error: error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${req.originalUrl} does not exist`,
    availableRoutes: [
      '/api/health',
      '/api/test-yfinance',
      '/api/tweets',
      '/api/stocks',
      '/api/stocks/status',
      '/api/stocks/cache/stats',
      '/api/stocks/cache/clear',
      '/api/stocks/cache/warmup',
      '/api/stocks/cache/invalidate/:symbol',
      '/api/stocks-yfinance',
      '/api/stocks-yfinance/status',
      '/api/company',
      '/api/company/status',
      '/api/company/clear-cache',
      '/api/sentiment',
      '/api/dashboard',
      // News routes
      '/api/news/market',
    ]
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('📊 MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('📊 MongoDB connection closed');
    process.exit(0);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 YFinance test: http://localhost:${PORT}/api/test-yfinance?symbol=AAPL`);
  console.log(`🔗 API base: http://localhost:${PORT}/api`);
}); 