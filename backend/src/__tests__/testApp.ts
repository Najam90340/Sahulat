/**
 * testApp.ts
 *
 * Creates a lightweight Express app for testing without starting
 * the database or Redis. All DB calls are intercepted by Jest mocks
 * declared in individual test files.
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import router from '../routes/index';
import { errorHandler } from '../middleware/errorHandler';

export function createTestApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', router);
  app.use(errorHandler);
  return app;
}
