import express from 'express';
import { Pool } from 'pg';
import { createNonConformityRouter } from './infrastructure/express/nonconformity-router.js';
import { createErrorMiddleware } from './infrastructure/express/error-middleware.js';

// 1. Initialize environment configurations
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('CRITICAL ERROR: DATABASE_URL variable is not defined in the .env file.');
  process.exit(1);
}

// 2. Initialize PostgreSQL connection pool
const pgPool = new Pool({
  connectionString: DATABASE_URL,
});

// Test database connection on startup
pgPool.connect((err, client, release) => {
  if (err) {
    console.error('CRITICAL ERROR: Could not connect to PostgreSQL in Docker:', err.message);
    process.exit(1);
  }
  console.log('📦 PostgreSQL database successfully connected in Docker.');
  release();
});

// 3. Initialize Express application
const app = express();
app.use(express.json()); // Enable JSON parsing for request bodies

// Mock authentication middleware for development 
// (Simulates a logged-in Quality Leader for maritime operations)
app.use((req: any, _res, next) => {
  req.user = {
    id: '8d28e2e0-8a55-4d83-a6dd-f8d16d3d42f0', // Mock Actor ID
    roles: ['quality leader'],
    permissions: ['evidence review']
  };
  next();
});

// 4. Inject dependencies into Routers
// We mock an Express factory object matching the contract expected by the router
const expressFactoryMock = {
  Router: () => express.Router()
};

const nonConformityRouter = createNonConformityRouter(expressFactoryMock as any, pgPool as any);
app.use('/api/v1', nonConformityRouter);

// 5. Inject Global Technical Error Middleware
const structuredLoggerMock = {
  error: (event: any) => {
    console.error(`[TECHNICAL LOG] [${event.correlation_id}] Request failed with error: ${event.error_name}`);
  }
};
app.use(createErrorMiddleware(structuredLoggerMock));

// 6. Start Web Server
app.listen(PORT, () => {
  console.log(`🚢 QMS Maritime Web Service running 24/7/365 on port ${PORT}`);
});