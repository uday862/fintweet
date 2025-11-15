const mongoose = require('mongoose');

const globalOrderSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerUsername: {
    type: String,
    required: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  side: {
    type: String,
    enum: ['buy', 'sell'],
    required: true
  },
  type: {
    type: String,
    enum: ['market', 'limit', 'stop'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: function() {
      return this.type !== 'market';
    }
  },
  status: {
    type: String,
    enum: ['active', 'filled', 'cancelled', 'expired'],
    default: 'active'
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  buyerUsername: {
    type: String
  },
  filledAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Orders expire after 24 hours
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for efficient searching
globalOrderSchema.index({ symbol: 1, status: 1, side: 1 });
globalOrderSchema.index({ sellerId: 1, status: 1 });
globalOrderSchema.index({ buyerId: 1, status: 1 });
globalOrderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to get active orders for a symbol
globalOrderSchema.statics.getActiveOrdersForSymbol = function(symbol, side = null) {
  const query = { 
    symbol: symbol.toUpperCase(), 
    status: 'active',
    expiresAt: { $gt: new Date() }
  };
  
  if (side) {
    query.side = side;
  }
  
  return this.find(query)
    .populate('sellerId', 'username')
    .sort({ createdAt: -1 });
};

// Static method to get orders by user
globalOrderSchema.statics.getOrdersByUser = function(userId, status = 'active') {
  return this.find({
    $or: [
      { sellerId: userId },
      { buyerId: userId }
    ],
    status: status
  })
  .populate('sellerId', 'username')
  .populate('buyerId', 'username')
  .sort({ createdAt: -1 });
};

// Method to fill an order
globalOrderSchema.methods.fillOrder = function(buyerId, buyerUsername) {
  this.buyerId = buyerId;
  this.buyerUsername = buyerUsername;
  this.status = 'filled';
  this.filledAt = new Date();
  return this.save();
};

// Method to check if order is expired
globalOrderSchema.methods.isExpired = function() {
  return this.expiresAt < new Date();
};

module.exports = mongoose.model('GlobalOrder', globalOrderSchema);
