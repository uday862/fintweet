const express = require('express');
const router = express.Router();
const GlobalOrder = require('../models/GlobalOrder');
const User = require('../models/User');
const { verifyToken } = require('./auth');

// POST /api/global-orders - create a new global order (sell or buy intent)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { symbol, side, type, quantity, price } = req.body;

    if (!symbol || !side || !type || !quantity) {
      return res.status(400).json({ error: 'symbol, side, type, quantity are required' });
    }

    if (!['buy', 'sell'].includes(side)) {
      return res.status(400).json({ error: 'side must be buy or sell' });
    }

    if (!['market', 'limit', 'stop'].includes(type)) {
      return res.status(400).json({ error: 'type must be market, limit, or stop' });
    }

    // Lookup seller username
    const seller = await User.findById(req.userId).select('username');

    const order = await GlobalOrder.create({
      sellerId: req.userId,
      sellerUsername: seller?.username || 'user',
      symbol: symbol.toUpperCase(),
      side,
      type,
      quantity: parseInt(quantity, 10),
      price: type !== 'market' ? parseFloat(price) : undefined,
      status: 'active'
    });

    res.status(201).json({ message: 'Global order created', order });
  } catch (err) {
    console.error('Create global order error:', err);
    res.status(500).json({ error: 'Failed to create global order' });
  }
});

// GET /api/global-orders - list active global orders (optionally filter by symbol/side)
router.get('/', async (req, res) => {
  try {
    const { symbol, side } = req.query;
    const query = { status: 'active', expiresAt: { $gt: new Date() } };
    if (symbol) query.symbol = symbol.toUpperCase();
    if (side && ['buy', 'sell'].includes(side)) query.side = side;

    const orders = await GlobalOrder.find(query)
      .select('-__v')
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (err) {
    console.error('List global orders error:', err);
    res.status(500).json({ error: 'Failed to list global orders' });
  }
});

// GET /api/global-orders/search?symbol=TSLA - search active orders for a symbol
router.get('/search', async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'symbol is required' });

    const orders = await GlobalOrder.getActiveOrdersForSymbol(symbol);
    res.json({ orders });
  } catch (err) {
    console.error('Search global orders error:', err);
    res.status(500).json({ error: 'Failed to search global orders' });
  }
});

// GET /api/global-orders/mine?role=seller|buyer&status=active|filled|cancelled
router.get('/mine', verifyToken, async (req, res) => {
  try {
    const { role = 'seller', status } = req.query;
    const query = {};
    if (role === 'buyer') {
      query.buyerId = req.userId;
    } else {
      query.sellerId = req.userId;
    }
    if (status) query.status = status;
    const orders = await GlobalOrder.find(query).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    console.error('Mine global orders error:', err);
    res.status(500).json({ error: 'Failed to fetch user global orders' });
  }
});

// POST /api/global-orders/:orderId/buy - request to buy an active sell order
router.post('/:orderId/buy', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await GlobalOrder.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'active') return res.status(400).json({ error: 'Order is not active' });
    if (order.side !== 'sell') return res.status(400).json({ error: 'Only sell orders can be bought' });

    // Do not allow seller to buy own order
    if (String(order.sellerId) === String(req.userId)) {
      return res.status(400).json({ error: 'Cannot buy your own order' });
    }

    // Lookup buyer username
    const buyer = await User.findById(req.userId).select('username');

    // Mark as filled (MVP)
    await order.fillOrder(req.userId, buyer?.username || 'buyer');

    // Notify seller
    const seller = await User.findById(order.sellerId);
    if (seller) {
      seller.notifications = seller.notifications || [];
      seller.notifications.push({
        type: 'order_filled',
        message: `${buyer?.username || 'A buyer'} bought ${order.quantity} ${order.symbol}${order.price ? ` @ ${order.price}` : ''}`,
        meta: { orderId: order._id, symbol: order.symbol, quantity: order.quantity, price: order.price }
      });
      await seller.save();
    }

    // TODO: send notification to seller (MVP store meta in response)
    res.json({
      message: 'Order filled successfully',
      order
    });
  } catch (err) {
    console.error('Buy global order error:', err);
    res.status(500).json({ error: 'Failed to buy order' });
  }
});

// POST /api/global-orders/:orderId/cancel - seller cancels own order
router.post('/:orderId/cancel', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await GlobalOrder.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (String(order.sellerId) !== String(req.userId)) {
      return res.status(403).json({ error: 'Not authorized to cancel this order' });
    }
    if (order.status !== 'active') return res.status(400).json({ error: 'Only active orders can be cancelled' });

    order.status = 'cancelled';
    await order.save();
    res.json({ message: 'Order cancelled', order });
  } catch (err) {
    console.error('Cancel global order error:', err);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

module.exports = router;


