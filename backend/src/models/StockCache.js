const mongoose = require('mongoose');

// Stock Cache Schema for storing cached stock price data
const stockCacheSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    index: true, // For faster queries
    uppercase: true
  },
  price: {
    type: Number,
    required: true
  },
  change: {
    type: Number,
    required: true
  },
  changePercent: {
    type: Number,
    required: true
  },
  volume: {
    type: Number,
    required: true
  },
  high: {
    type: Number,
    required: true
  },
  low: {
    type: Number,
    required: true
  },
  lastUpdated: {
    type: Date,
    required: true,
    index: true // For cache invalidation queries
  },
  currency: {
    type: String,
    enum: ['USD', 'INR'],
    required: true
  },
  exchange: {
    type: String,
    required: true
  },
  dataSource: {
    type: String,
    default: 'yfinance'
  },
  cacheHitCount: {
    type: Number,
    default: 0
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  error: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success'
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  collection: 'stock_cache' // Explicit collection name
});

// Indexes for better query performance
stockCacheSchema.index({ symbol: 1, lastUpdated: -1 });
stockCacheSchema.index({ lastUpdated: -1 });
stockCacheSchema.index({ isActive: 1, lastUpdated: -1 });
stockCacheSchema.index({ status: 1, lastUpdated: -1 });

// Compound index for cache invalidation
stockCacheSchema.index({ symbol: 1, isActive: 1, lastUpdated: -1 });

// Virtual for cache age in minutes
stockCacheSchema.virtual('cacheAgeMinutes').get(function() {
  return Math.floor((Date.now() - this.lastUpdated.getTime()) / (1000 * 60));
});

// Virtual for cache age in hours
stockCacheSchema.virtual('cacheAgeHours').get(function() {
  return Math.floor((Date.now() - this.lastUpdated.getTime()) / (1000 * 60 * 60));
});

// Instance method to check if cache is still valid
stockCacheSchema.methods.isValid = function(maxAgeMinutes = 5) {
  const ageMinutes = this.cacheAgeMinutes;
  return this.isActive && this.status === 'success' && ageMinutes <= maxAgeMinutes;
};

// Instance method to increment cache hit count
stockCacheSchema.methods.incrementHitCount = function() {
  this.cacheHitCount += 1;
  this.lastAccessed = new Date();
  return this.save();
};

// Static method to find valid cache for a symbol
stockCacheSchema.statics.findValidCache = function(symbol, maxAgeMinutes = 5) {
  return this.findOne({
    symbol: symbol.toUpperCase(),
    isActive: true,
    status: 'success',
    lastUpdated: { $gte: new Date(Date.now() - maxAgeMinutes * 60 * 1000) }
  }).sort({ lastUpdated: -1 });
};

// Static method to get cache statistics
stockCacheSchema.statics.getCacheStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalCached: { $sum: 1 },
        activeCached: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
        failedCached: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        totalHits: { $sum: '$cacheHitCount' },
        avgAgeMinutes: { $avg: { $divide: [{ $subtract: [new Date(), '$lastUpdated'] }, 60000] } }
      }
    }
  ]);
};

// Static method to clean old cache entries
stockCacheSchema.statics.cleanOldCache = function(maxAgeHours = 24) {
  const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  return this.deleteMany({
    lastUpdated: { $lt: cutoffDate }
  });
};

// Static method to get most accessed symbols
stockCacheSchema.statics.getMostAccessed = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ cacheHitCount: -1, lastAccessed: -1 })
    .limit(limit)
    .select('symbol cacheHitCount lastAccessed lastUpdated');
};

// Pre-save middleware to ensure symbol is uppercase
stockCacheSchema.pre('save', function(next) {
  if (this.symbol) {
    this.symbol = this.symbol.toUpperCase();
  }
  next();
});

module.exports = mongoose.model('StockCache', stockCacheSchema);
