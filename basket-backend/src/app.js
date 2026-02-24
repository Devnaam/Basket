const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Route imports
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const riderRoutes = require('./routes/rider');
const adminRoutes = require('./routes/admin');
const darkStoreRoutes = require('./routes/darkStores');
const paymentRoutes = require('./routes/payments');

const app = express();

// ── Security Headers (Helmet) ─────────────────────────────────────────
app.use(
  helmet({
    // Allow Cloudinary image CDN cross-origin
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // Disable CSP in dev (Vite HMR needs inline scripts)
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
  })
);

// ── CORS ──────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173', // Vite dev server
  'http://localhost:4173', // Vite preview
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow Postman, curl (no origin header), or whitelisted domains
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} not permitted`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// ── Response Compression ──────────────────────────────────────────────
app.use(compression());

// ── Body Parsers ──────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── HTTP Request Logger ───────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.info(msg.trim()) },
      skip: (req) => req.url === '/health',
    })
  );
}

// ── Global Rate Limiter ───────────────────────────────────────────────
app.use('/api', apiLimiter);

// ── Health Check ──────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: '🛒 Basket API is healthy',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
  });
});

// ── API Routes ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/rider', riderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dark-stores', darkStoreRoutes);
app.use('/api/payments', paymentRoutes);

// ── 404 → Error Handler ───────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
