const express = require('express');
const axios = require('axios');
const router = express.Router();
const store = require('../store');

// POST /api/tweets - store classified tweet
router.post('/', async (req, res) => {
  try {
    // 1. Call classifier agent
    const classifyRes = await axios.post('http://tweet-classifier-agent:8002/classify', req.body);
    const classification = classifyRes.data;
    // 2. Store tweet + classification (mock)
    const tweet = { ...req.body, ...classification, created_at: req.body.created_at || new Date().toISOString() };
    store.tweets.push(tweet);
    res.json({ message: 'Tweet stored', tweet });
  } catch (err) {
    res.status(500).json({ error: 'Classifier agent error', details: err.message });
  }
});

// GET /api/tweets - list all stored tweets (for testing)
router.get('/', (req, res) => {
  res.json({ tweets: store.tweets });
});

// GET /api/tweets/fetch - fetch tweets from tweet-agent
router.get('/fetch', async (req, res) => {
  try {
    const agentRes = await axios.get('http://tweet-agent:8001/fetch-tweets');
    const fetched = agentRes.data?.tweets || [];
    // Optionally auto-classify and store
    const classified = [];
    for (const t of fetched) {
      try {
        const classifyRes = await axios.post('http://tweet-classifier-agent:8002/classify', t);
        const enriched = { ...t, ...classifyRes.data };
        store.tweets.push(enriched);
        classified.push(enriched);
      } catch (_) {
        // If classifier unavailable, still push raw with neutral sentiment
        const enriched = { ...t, sentiment: 'neutral', relevance: true, impact: 'low' };
        store.tweets.push(enriched);
        classified.push(enriched);
      }
    }
    res.json({ tweets: classified });
  } catch (err) {
    res.status(500).json({ error: 'Tweet agent error', details: err.message });
  }
});

module.exports = router; 