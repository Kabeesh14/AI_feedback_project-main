const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { pool, testConnection } = require('./config/db');

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - support local dev clients and configurable production FRONTEND_URL (supports comma-separated origins)
const configuredOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(u => u.trim().replace(/\/+$/, '')).filter(Boolean)
  : [];

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5000',
  ...configuredOrigins
].filter(Boolean);

const corsOptions = {
  origin: (process.env.NODE_ENV === 'production' && configuredOrigins.length > 0)
    ? (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} is not allowed by CORS policy`));
        }
      }
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Standard OWASP HTTP Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Serve static uploads directory for images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Basic request logging in development
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });
}

// Root Route
app.get('/', (req, res) => {
  res.json({
    name: 'FeedbackIQ Backend API',
    description: 'Institutional Feedback Theme & Root-Cause Analytics Platform',
    version: '1.0.0',
    status: 'running',
    healthCheck: '/api/health'
  });
});

// GET /api/health - Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();

  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    server: {
      port: PORT,
      status: 'active'
    },
    database: {
      status: dbStatus.connected ? 'connected' : 'disconnected',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      name: process.env.DB_NAME || 'feedbackiq_db',
      message: dbStatus.message,
      errorCode: dbStatus.code || null
    }
  });
});

// API Routes
const authRoutes = require('./routes/authRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const aiRoutes = require('./routes/aiRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const reportRoutes = require('./routes/reportRoutes');
const alertRoutes = require('./routes/alertRoutes');
const actionRoutes = require('./routes/actionRoutes');
const impactRoutes = require('./routes/impactRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const formRoutes = require('./routes/formRoutes');
const busRoutes = require('./routes/busRoutes');
const hostelRoutes = require('./routes/hostelRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/impact', impactRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/bus', busRoutes);
app.use('/api/hostel', hostelRoutes);

// 404 Handler for unregistered API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl} - Endpoint not found`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]:', err);
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, async () => {
    console.log(`====================================================`);
    console.log(`🚀 FeedbackIQ Backend running on http://localhost:${PORT}`);
    console.log(`🩺 Health check available at: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);

    // Initial database connection check
    const dbTest = await testConnection();
    if (dbTest.connected) {
      console.log(`✅ [MySQL]: ${dbTest.message}`);
    } else {
      console.warn(`⚠️ [MySQL]: ${dbTest.message}`);
      console.warn(`   Make sure your MySQL password in backend/.env is updated to match your local MySQL Server.`);
    }
  });

  // Graceful shutdown handling for container and process managers
  const gracefulShutdown = async (signal) => {
    console.log(`\n[SHUTDOWN]: Received ${signal}. Closing HTTP server gracefully...`);
    server.close(async () => {
      console.log('[SHUTDOWN]: HTTP server closed.');
      try {
        await pool.end();
        console.log('[SHUTDOWN]: MySQL connection pool ended.');
      } catch (dbErr) {
        console.error('[SHUTDOWN]: Error closing MySQL pool:', dbErr);
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

module.exports = app;
