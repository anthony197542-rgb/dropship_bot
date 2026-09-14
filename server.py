
const express = require('express');
const { createClient } = require('redis');

const app = express();
app.use(express.json());

const redis = createClient();
redis.connect().catch(console.error);

// 1. Endpoint to track user events (views, add-to-cart, purchases)
app.post('/api/event', async (req, res) => {
  const { productId, eventType } = req.body;
  if (!productId || !eventType) {
    return res.status(400).json({ error: 'productId and eventType required' });
  }

  const timestamp = Date.now();
  // Store raw event in a Redis Stream or Hash for background scoring
  await redis.xAdd('product_events', '*', {
    productId,
    eventType,
    timestamp: timestamp.toString()
  });

  res.json({ success: true, message: 'Event logged' });
});

// 2. Endpoint to fetch top N hottest products (served fast from Redis cache)
app.get('/api/hottest', async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  // Get top items ordered by highest score in Redis sorted set
  const hottest = await redis.zRangeWithScores('hottest_products', 0, limit - 1, {
    REV: true
  });

  res.json({ data: hottest });
});

app.listen(3000, () => console.log('API running on http://localhost:3000'));
EOF
