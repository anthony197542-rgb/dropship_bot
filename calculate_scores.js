const { createClient } = require('redis');

const WEIGHTS = {
  view: 1,
  cart: 5,
  purchase: 10
};

const GRAVITY = 1.8;

async function updateScores() {
  const redis = createClient();
  await redis.connect();

  const events = await redis.xRange('product_events', '-', '+', { COUNT: 1000 });
  const productStats = {};

  const now = Date.now();

  for (const item of events) {
    const { productId, eventType, timestamp } = item.message;
    const points = WEIGHTS[eventType] || 1;
    const hoursOld = (now - parseInt(timestamp)) / (1000 * 60 * 60);

    if (!productStats[productId]) {
      productStats[productId] = { points: 0, newestHoursOld: hoursOld };
    }

    productStats[productId].points += points;
    productStats[productId].newestHoursOld = Math.min(productStats[productId].newestHoursOld, hoursOld);
  }

  for (const [productId, stats] of Object.entries(productStats)) {
    const score = stats.points / Math.pow(stats.newestHoursOld + 2, GRAVITY);
    await redis.zAdd('hottest_products', [{ score, value: productId }]);
  }

  console.log(`[${new Date().toISOString()}] Updated scores for ${Object.keys(productStats).length} products.`);
  await redis.disconnect();
}

updateScores().catch(console.error);
