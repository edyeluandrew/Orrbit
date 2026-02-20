import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';

import { db, testConnection } from './db/index.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import creatorRoutes from './routes/creators.js';
import subscriptionRoutes from './routes/subscriptions.js';
import transactionRoutes from './routes/transactions.js';
import webhookRoutes from './routes/webhooks.js';
import adminRoutes from './routes/admin.js';
import websocketRoutes from './websocket/index.js';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    transport: process.env.NODE_ENV !== 'production' ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    } : undefined,
  },
  trustProxy: process.env.TRUST_PROXY === 'true',
});

// Register plugins
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  credentials: true,
});

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'dev-secret-change-me',
  sign: {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
});

await fastify.register(rateLimit, {
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
});

await fastify.register(websocket);

// Decorate with db
fastify.decorate('db', db);

// Auth decorator
fastify.decorate('authenticate', async function (request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
});

// Optional auth (doesn't fail if no token)
fastify.decorate('optionalAuth', async function (request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    // No token or invalid - that's fine for optional auth
    request.user = null;
  }
});

// Health check - verifies DB connection
fastify.get('/health', async () => {
  try {
    await db.query('SELECT 1');
    return { status: 'ok', db: 'connected', timestamp: new Date().toISOString() };
  } catch (err) {
    return { status: 'degraded', db: 'disconnected', timestamp: new Date().toISOString() };
  }
});

// API info
fastify.get('/', async () => {
  return {
    name: 'Orbit API',
    version: '1.0.0',
    description: 'Creator Subscription Platform on Stellar',
    docs: '/docs',
  };
});

// Register routes
fastify.register(authRoutes, { prefix: '/api/auth' });
fastify.register(userRoutes, { prefix: '/api/users' });
fastify.register(creatorRoutes, { prefix: '/api/creators' });
fastify.register(subscriptionRoutes, { prefix: '/api/subscriptions' });
fastify.register(transactionRoutes, { prefix: '/api/transactions' });
fastify.register(webhookRoutes, { prefix: '/api/webhooks' });
fastify.register(adminRoutes, { prefix: '/api/admin' });

// WebSocket setup
fastify.register(websocketRoutes);

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  
  // Validation errors
  if (error.validation) {
    return reply.code(400).send({
      error: 'Validation Error',
      message: error.message,
      details: error.validation,
    });
  }
  
  // Known errors
  if (error.statusCode) {
    return reply.code(error.statusCode).send({
      error: error.name || 'Error',
      message: error.message,
    });
  }
  
  // Unknown errors
  return reply.code(500).send({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : error.message,
  });
});

// Start server
const start = async () => {
  try {
    // Test database connection
    await testConnection();
    fastify.log.info('✅ Database connected');
    
    const port = parseInt(process.env.PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    fastify.log.info(`🚀 Orbit API running at http://${host}:${port}`);
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

export default fastify;
