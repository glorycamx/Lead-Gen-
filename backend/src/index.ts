import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

// Routes
import leadsRouter from './routes/leads.js';
import importsRouter from './routes/imports.js';
import exportsRouter from './routes/exports.js';
import statsRouter from './routes/stats.js';
import configRouter from './routes/config.js';
import pipelineRouter from './routes/pipeline.js';

// Services
import { logger } from './utils/logger.js';
import { initScheduler } from './services/scheduler.js';
import { loadConfig } from './utils/config.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Prisma
export const prisma = new PrismaClient();

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
});
app.use(limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for exports
app.use('/exports', express.static(path.join(__dirname, '../../exports')));

// API Routes
app.use('/api/leads', leadsRouter);
app.use('/api/imports', importsRouter);
app.use('/api/exports', exportsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/config', configRouter);
app.use('/api/pipeline', pipelineRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = parseInt(process.env.PORT || '3001');

async function main() {
  try {
    // Connect to database
    await prisma.$connect();
    logger.info('Connected to database');

    // Load configuration
    const config = loadConfig();
    logger.info('Configuration loaded');

    // Initialize scheduler if enabled
    if (config.scheduler?.enabled) {
      initScheduler(config);
      logger.info('Scheduler initialized');
    }

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

main();
