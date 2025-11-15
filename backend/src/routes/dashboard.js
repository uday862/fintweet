const express = require('express');
const router = express.Router();

// GET /api/dashboard - aggregates
router.get('/', (req, res) => {
  // TODO: Replace with real aggregation logic
  res.json({
    gainers: ['TSLA', 'AAPL'],
    losers: ['ADANIENT.NS'],
    sentimentImpact: [
      { symbol: 'TSLA', impact: 'high' },
      { symbol: 'AAPL', impact: 'medium' },
      { symbol: 'ADANIENT.NS', impact: 'low' }
    ]
  });
});

module.exports = router; 