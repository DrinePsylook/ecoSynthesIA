import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
if (fs.existsSync(path.resolve(__dirname, '../.env'))) {
  console.info('Loading .env file');
  dotenv.config();
}

import { connectToDatabase, pgPool } from './database/database';
import { runMigrations } from './database/migrations/migrationRunner';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware configuration
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('combined')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Basic routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'EcoSynthesIA Backend API', 
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: pgPool ? 'connected' : 'disconnected'
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Immediately invoked async function
(async () => {
  try {
    // 1. First, create database and run migrations (this will create the DB if needed)
    await runMigrations(null); // Pass null since we don't have a pool yet
    
    // 2. Then connect to the database
    await connectToDatabase();
    
    // 3. Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📊 Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server and DB pool');
  
  if (pgPool) {
    await pgPool.end();
    console.log('Database pool closed');
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server and DB pool');
  
  if (pgPool) {
    await pgPool.end();
    console.log('Database pool closed');
  }
  
  process.exit(0);
});

export default app;