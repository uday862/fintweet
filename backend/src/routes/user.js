const express = require('express');
const User = require('../models/User');
const { verifyToken } = require('./auth');
const router = express.Router();

// GET /api/user/watchlist - Get user's watchlist
router.get('/watchlist', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    res.json({
      watchlist: user.watchlist,
      count: user.watchlist.length
    });
    
  } catch (error) {
    console.error('Get watchlist error:', error);
    res.status(500).json({ error: 'Server error getting watchlist.' });
  }
});

// POST /api/user/watchlist - Add stock to watchlist
router.post('/watchlist', verifyToken, async (req, res) => {
  try {
    const { symbol, notes = '' } = req.body;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Stock symbol is required.' });
    }
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    await user.addToWatchlist(symbol, notes);
    
    res.json({
      message: 'Stock added to watchlist',
      watchlist: user.watchlist
    });
    
  } catch (error) {
    console.error('Add to watchlist error:', error);
    res.status(500).json({ error: 'Server error adding to watchlist.' });
  }
});

// DELETE /api/user/watchlist/:symbol - Remove stock from watchlist
router.delete('/watchlist/:symbol', verifyToken, async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    await user.removeFromWatchlist(symbol);
    
    res.json({
      message: 'Stock removed from watchlist',
      watchlist: user.watchlist
    });
    
  } catch (error) {
    console.error('Remove from watchlist error:', error);
    res.status(500).json({ error: 'Server error removing from watchlist.' });
  }
});

// GET /api/user/orders - Get user's orders
router.get('/orders', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    res.json({
      orders: user.orders,
      count: user.orders.length
    });
    
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Server error getting orders.' });
  }
});

// GET /api/user/notifications - Get user notifications
router.get('/notifications', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ notifications: user.notifications || [] });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Server error getting notifications.' });
  }
});

// POST /api/user/notifications/read - Mark notifications as read
router.post('/notifications/read', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    (user.notifications || []).forEach(n => { n.isRead = true; });
    await user.save();
    res.json({ message: 'Notifications marked as read', notifications: user.notifications || [] });
  } catch (error) {
    console.error('Mark notifications read error:', error);
    res.status(500).json({ error: 'Server error updating notifications.' });
  }
});

// POST /api/user/orders - Place new order
router.post('/orders', verifyToken, async (req, res) => {
  try {
    const { symbol, side, type, quantity, price } = req.body;
    
    if (!symbol || !side || !type || !quantity) {
      return res.status(400).json({ error: 'Symbol, side, type, and quantity are required.' });
    }
    
    if (!['buy', 'sell'].includes(side)) {
      return res.status(400).json({ error: 'Side must be buy or sell.' });
    }
    
    if (!['market', 'limit', 'stop'].includes(type)) {
      return res.status(400).json({ error: 'Type must be market, limit, or stop.' });
    }
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    const orderData = {
      symbol,
      side,
      type,
      quantity: parseInt(quantity),
      price: type !== 'market' ? parseFloat(price) : undefined,
      status: 'pending'
    };
    
    await user.addOrder(orderData);
    
    // Get the newly created order with its ID
    const newOrder = user.orders[user.orders.length - 1];
    
    res.status(201).json({
      message: 'Order placed successfully',
      order: newOrder,
      orders: user.orders
    });
    
  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({ error: 'Server error placing order.' });
  }
});

// DELETE /api/user/orders/:orderId - Cancel an order
router.delete('/orders/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('🔄 Backend: Cancelling order with ID:', orderId);
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    console.log('📋 Backend: User orders before cancellation:', user.orders.map(o => ({ id: o._id, symbol: o.symbol, status: o.status })));
    
    const order = user.orders.id(orderId);
    if (!order) {
      console.log('❌ Backend: Order not found with ID:', orderId);
      return res.status(404).json({ error: 'Order not found.' });
    }
    
    console.log('🎯 Backend: Found order to cancel:', { id: order._id, symbol: order.symbol, status: order.status });
    
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending orders can be cancelled.' });
    }
    
    // Update order status to cancelled
    const originalStatus = order.status;
    order.status = 'cancelled';
    await user.save();
    
    console.log('✅ Backend: Order cancelled successfully');
    console.log('📋 Backend: User orders after cancellation:', user.orders.map(o => ({ id: o._id, symbol: o.symbol, status: o.status })));
    
    // Verify only one order was cancelled
    const cancelledOrders = user.orders.filter(o => o.status === 'cancelled');
    const pendingOrders = user.orders.filter(o => o.status === 'pending');
    console.log(`📊 Backend: Cancelled orders: ${cancelledOrders.length}, Pending orders: ${pendingOrders.length}`);
    
    // Ensure we return all orders, not just pending ones
    const response = {
      message: 'Order cancelled successfully',
      order: order,
      orders: user.orders,
      cancelledOrderId: orderId,
      totalOrders: user.orders.length,
      pendingOrders: user.orders.filter(o => o.status === 'pending').length,
      cancelledOrders: user.orders.filter(o => o.status === 'cancelled').length
    };
    
    console.log('📤 Backend: Sending response:', response);
    res.json(response);
    
  } catch (error) {
    console.error('❌ Backend: Cancel order error:', error);
    res.status(500).json({ error: 'Server error cancelling order.' });
  }
});

// PUT /api/user/preferences - Update user preferences
router.put('/preferences', verifyToken, async (req, res) => {
  try {
    const { defaultCurrency, theme, notifications } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    if (defaultCurrency) user.preferences.defaultCurrency = defaultCurrency;
    if (theme) user.preferences.theme = theme;
    if (notifications !== undefined) user.preferences.notifications = notifications;
    
    await user.save();
    
    res.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });
    
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Server error updating preferences.' });
  }
});

module.exports = router;
