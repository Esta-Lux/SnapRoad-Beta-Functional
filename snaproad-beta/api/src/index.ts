import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import tripsRoutes from './routes/trips.routes';
import incidentsRoutes from './routes/incidents.routes';
import rewardsRoutes from './routes/rewards.routes';
import offersRoutes from './routes/offers.routes';
import vehiclesRoutes from './routes/vehicles.routes';
import partnersRoutes from './routes/partners.routes';
import adminRoutes from './routes/admin.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/notFound.middleware';

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'snaproad-api',
    version: process.env.API_VERSION || 'v1',
    timestamp: new Date().toISOString()
  });
});

// API Routes
const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`;

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/trips`, tripsRoutes);
app.use(`${API_PREFIX}/incidents`, incidentsRoutes);
app.use(`${API_PREFIX}/rewards`, rewardsRoutes);
app.use(`${API_PREFIX}/offers`, offersRoutes);
app.use(`${API_PREFIX}/vehicles`, vehiclesRoutes);
app.use(`${API_PREFIX}/partners`, partnersRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚗 SnapRoad API running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });
}

export default app;
