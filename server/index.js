import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

import express    from 'express';
import cors       from 'cors';
import helmet     from 'helmet';
import rateLimit  from 'express-rate-limit';
import { connectDB }      from './config/db.js';
import productsRouter     from './routes/products.js';
import authRouter         from './routes/auth.js';
import ordersRouter       from './routes/orders.js';
import labRouter          from './routes/lab.js';

const app  = express();
const port = Number(process.env.PORT || 5050);

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────────────
const defaultAllowedOrigins = [
  'https://peekyowl.com',
  'https://www.peekyowl.com',
  'http://localhost:3000',
];

const allowedOrigins = [
  ...defaultAllowedOrigins,
  ...(process.env.CLIENT_URL || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean),
];

const corsOptions = {
  origin(origin, callback) {
    // Allow server-to-server / Postman (no origin header)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── Rate limiting (auth endpoints only) ──────────────────────────────────────
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

// ── API routes ───────────────────────────────────────────────────────────────
app.use('/api/products', productsRouter);
app.use('/api/auth',     authRouter);
app.use('/api/orders',   ordersRouter);
app.use('/api/lab',      labRouter);

// ── 404 for unmatched /api routes ────────────────────────────────────────────
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
try {
  await connectDB();
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port} [${process.env.NODE_ENV || 'development'}]`);
  });
} catch (error) {
  console.error('Startup failed — MongoDB unreachable.');
  console.error(`MONGODB_URI = ${process.env.MONGODB_URI || '<missing>'}`);
  console.error(error.message);
  process.exit(1);
}
