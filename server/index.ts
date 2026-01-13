import express from 'express';
import { createServer } from 'http';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes';
import { wsManager } from './websocket';
import { initializeDatabase, seedDatabase } from './storage';
import { testEmailConnection } from './integrations/email-service';
import { testSMSConnection } from './integrations/sms-service';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api', routes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, '../public');
  app.use(express.static(publicPath));
  
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message 
  });
});

// Initialize WebSocket
wsManager.initialize(server);

// Initialize database and start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('🚀 Starting StockSage AI Inventory Management System...\n');
    
    // Initialize database
    console.log('📊 Initializing database...');
    await initializeDatabase();
    
    // Seed database if empty
    console.log('🌱 Checking database seed...');
    await seedDatabase();
    
    // Test integrations
    console.log('\n🔌 Testing integrations...');
    await testEmailConnection();
    await testSMSConnection();
    
    // Start server
    server.listen(PORT, () => {
      console.log('\n✅ StockSage Server Started Successfully!\n');
      console.log('═══════════════════════════════════════');
      console.log(`🌐 Server:          http://localhost:${PORT}`);
      console.log(`📡 API Endpoint:    http://localhost:${PORT}/api`);
      console.log(`🔌 WebSocket:       ws://localhost:${PORT}/ws`);
      console.log(`📊 Health Check:    http://localhost:${PORT}/api/health`);
      console.log('═══════════════════════════════════════\n');
      console.log('🤖 AI Agents Ready:');
      console.log('   • Demand Forecasting Agent');
      console.log('   • Inventory Optimization Agent');
      console.log('   • Supplier Coordination Agent');
      console.log('   • Risk Analysis Agent');
      console.log('   • Agent Orchestrator\n');
      console.log('💡 Next Steps:');
      console.log('   1. Open http://localhost:5173 for development UI');
      console.log('   2. Run POST /api/admin/init-db to reinitialize database');
      console.log('   3. Run POST /api/analysis/run with productId and locationId');
      console.log('\n📝 Environment:', process.env.NODE_ENV || 'development');
      console.log('🔑 OpenAI Model:', process.env.OPENAI_MODEL || 'gpt-4o');
      console.log('\n✨ Ready to optimize your inventory!\n');
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { app, server };
