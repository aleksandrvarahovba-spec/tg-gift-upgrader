import fastify from 'fastify';
import cors from '@fastify/cors';
import { CONFIG } from './config.js';
import { authRoutes } from './routes/auth.routes.js';
import { giftsRoutes } from './routes/gifts.routes.js';
import { inventoryRoutes } from './routes/inventory.routes.js';
import { upgradeRoutes } from './routes/upgrade.routes.js';
import { pvpRoutes } from './routes/pvp.routes.js';
import { bonusesRoutes } from './routes/bonuses.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { paymentRoutes } from './routes/payment.routes.js';

const app = fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  }
});

// Enable CORS for frontend Vite dev server and Telegram webview
await app.register(cors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// Allow empty JSON bodies without FST_ERR_CTP_EMPTY_JSON_BODY error
app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body: string, done) => {
  if (!body || body.trim() === '') {
    done(null, {});
    return;
  }
  try {
    const json = JSON.parse(body);
    done(null, json);
  } catch (err: any) {
    err.statusCode = 400;
    done(err, undefined);
  }
});

// Health check
app.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register API Routes
await app.register(authRoutes);
await app.register(giftsRoutes);
await app.register(inventoryRoutes);
await app.register(upgradeRoutes);
await app.register(pvpRoutes);
await app.register(bonusesRoutes);
await app.register(adminRoutes);
await app.register(paymentRoutes);

// Start listening
try {
  await app.listen({ port: CONFIG.PORT, host: CONFIG.HOST });
  console.log(`🚀 Upgrader Backend Server running at http://localhost:${CONFIG.PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
