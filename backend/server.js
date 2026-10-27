require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { pool } = require('./config/db');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { initScheduler } = require('./jobs/membershipExpiryJob');

const app = express();
const PORT = process.env.PORT || 5000;

// --- CORS & Core middleware ------------------------------------------------
const allowedOrigins = process.env.CLIENT_URL || process.env.CORS_ORIGIN || '*';
app.use(
  cors({
    origin: allowedOrigins === '*' ? '*' : allowedOrigins.split(',').map((o) => o.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Health check ----------------------------------------------------------
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      success: true,
      service: 'Kurnool Fitness Centre Core API',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      data: { db: 'connected' },
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      service: 'Kurnool Fitness Centre Core API',
      status: 'unhealthy',
      message: 'Database connection failed',
      error: err.message,
    });
  }
});

// --- API routes ------------------------------------------------------------
app.use('/api', apiRoutes);

// --- 404 + error handling --------------------------------------------------
app.use(notFound);
app.use(errorHandler);

// --- Start Server & Background Cron Worker ---------------------------------
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Kurnool Fitness Centre Core API running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
  console.log(`   Environment:  ${process.env.NODE_ENV || 'development'}`);
  console.log(`======================================================\n`);

  // Initialize automated background worker
  try {
    initScheduler();
  } catch (schedulerErr) {
    console.error('Warning: Could not initialize background scheduler:', schedulerErr.message);
  }
});

module.exports = app;
