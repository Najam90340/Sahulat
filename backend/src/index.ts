import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import router from './routes/index';
import { errorHandler } from './middleware/errorHandler';
import { runMigrations, runSeed } from './db/migrate';
import { expireOpenPools } from './services/poolService';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api', router);

// Global error handler
app.use(errorHandler);

const startServer = async (): Promise<void> => {
  // Apply DB schema
  await runMigrations();

  // Seed sample data (only inserts if not already present due to ON CONFLICT DO NOTHING)
  if (process.env.SEED_DB === 'true') {
    await runSeed();
  }

  // Expire any pools whose deadline has already passed
  await expireOpenPools();

  // Schedule periodic expiry check every 5 minutes
  setInterval(expireOpenPools, 5 * 60 * 1000);

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
