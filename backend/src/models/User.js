const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  watchlist: [{
    symbol: { type: String, required: true },
    addedAt: { type: Date, default: Date.now },
    notes: { type: String, default: '' }
  }],
  orders: [{
    symbol: { type: String, required: true },
    side: { type: String, enum: ['buy', 'sell'], required: true },
    type: { type: String, enum: ['market', 'limit', 'stop'], required: true },
    quantity: { type: Number, required: true },
    price: { type: Number },
    status: { type: String, enum: ['pending', 'filled', 'cancelled'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    filledAt: { type: Date }
  }],
  preferences: {
    defaultCurrency: { type: String, enum: ['USD', 'INR'], default: 'USD' },
    theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
    notifications: { type: Boolean, default: true }
  },
  notifications: [{
    type: {
      type: String,
      enum: ['order_filled', 'order_buy_request', 'info'],
      default: 'order_buy_request'
    },
    message: { type: String, required: true },
    meta: { type: Object, default: {} },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Add to watchlist
userSchema.methods.addToWatchlist = function(symbol, notes = '') {
  const existingItem = this.watchlist.find(item => item.symbol === symbol);
  if (!existingItem) {
    this.watchlist.push({ symbol, notes });
    return this.save();
  }
  return Promise.resolve(this);
};

// Remove from watchlist
userSchema.methods.removeFromWatchlist = function(symbol) {
  this.watchlist = this.watchlist.filter(item => item.symbol !== symbol);
  return this.save();
};

// Add order
userSchema.methods.addOrder = function(orderData) {
  this.orders.push(orderData);
  return this.save();
};

// Get user's watchlist symbols
userSchema.methods.getWatchlistSymbols = function() {
  return this.watchlist.map(item => item.symbol);
};

module.exports = mongoose.model('User', userSchema);
