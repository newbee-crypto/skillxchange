import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import { connectRedis } from './config/redis.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import bookingRoutes from './routes/bookings.js';
import aiRoutes from './routes/ai.js';
import paymentRoutes from './routes/payments.js';
import uploadRoutes from './routes/upload.js';
import messageRoutes from './routes/messages.js';
import { setupSocket } from './socket/index.js';

const app = express();
const httpServer = createServer(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('trust proxy', 1);

const getClientKey = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip;
};

const createLimiter = ({ max, message, skipSuccessfulRequests = false, skip }) => rateLimit({
  windowMs: 15 * 60 * 1000,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests,
  skip,
  keyGenerator: getClientKey,
  handler: (req, res) => {
    console.warn('[rate-limit]', {
      key: getClientKey(req),
      method: req.method,
      path: req.originalUrl,
      userAgent: req.get('user-agent'),
    });

    res.status(429).json({ error: message });
  },
});

// Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

// Rate limiting
const authLimiter = createLimiter({
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 100),
  skipSuccessfulRequests: true,
  skip: (req) => req.method !== 'POST',
  message: 'Too many auth attempts, please try again later',
});

const apiLimiter = createLimiter({
  max: Number(process.env.API_RATE_LIMIT_MAX || 500),
  skip: (req) => req.path === '/health' || req.path.startsWith('/auth'),
  message: 'Too many requests, please try again later',
});

app.use('/api/auth', authLimiter);
app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/messages', messageRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Setup socket handlers
setupSocket(io);

// Start
const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  connectRedis();
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

start();

export { io };
