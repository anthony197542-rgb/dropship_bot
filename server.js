const express = require('express');
const { createClient } = require('redis');

const app = express();
app.use(express.json());
app.use(express.static('.'));

const redis = createClient();
redis.connect().catch(console.error);

app.post('/api/event', async (req, res) => {
  const { productId, eventType } = req.body;
  if (!productId || !eventType) {
    return res.status(400).json({ error: 'productId and eventType required' });
  }

  await redis.xAdd('product_events', '*', {
    productId: productId.toString(),
    eventType,
    timestamp: Date.now().toString()
  });

  res.json({ success: true, message: 'Event logged' });
});

app.post('/api/shopify/order', async (req, res) => {
  const lineItems = req.body.line_items || [];
  for (const item of lineItems) {
    await redis.xAdd('product_events', '*', {
      productId: item.product_id ? item.product_id.toString() : item.title,
      eventType: 'purchase',
      timestamp: Date.now().toString()
    });
  }
  res.status(200).send('Webhook Received');
});
app.get('/api/hottest', async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const hottest = await redis.zRangeWithScores('hottest_products', 0, limit - 1, {
    REV: true
  });
  res.json({ data: hottest });
});

app.listen(3000, () => console.log('API running on http://localhost:3000'));
