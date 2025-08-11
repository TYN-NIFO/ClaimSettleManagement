import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

// Import routes
import authRoutes from './routes/authRoutes.js';
import claimRoutes from './routes/claimRoutes.js';
import policyRoutes from './routes/policyRoutes.js';
import userRoutes from './routes/userRoutes.js';

// Import middleware
import { auth } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables based on environment, but only if the file exists.
// On platforms like Render/Heroku, environment variables are injected and no file is present.
const envFilename = process.env.NODE_ENV === 'production' ? 'config.production.env' : 'config.env';
const envPath = path.join(__dirname, envFilename);
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

// Initialize Application Insights in production
let appInsights;
if (process.env.NODE_ENV === 'production' && process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  try {
    const appInsightsModule = await import('applicationinsights');
    appInsights = appInsightsModule.default;
    appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING);
    appInsights.start();
    console.log('Application Insights initialized');
  } catch (error) {
    console.warn('Failed to initialize Application Insights:', error.message);
  }
}

const app = express();

// Behind proxies (e.g., Vercel, Nginx) trust X-Forwarded-* for secure cookies and IPs
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const allowedOrigins = (() => {
  if (process.env.NODE_ENV === 'production') {
    const list = [process.env.FRONTEND_URL, process.env.CORS_ORIGIN]
      .filter(Boolean)
      .flatMap((v) => (v.includes(',') ? v.split(',') : v))
      .map((v) => v.trim())
      .filter(Boolean);
    return list.length ? list : [];
  }
  return [process.env.FRONTEND_URL || 'http://localhost:3000'];
})();

// Optional: regex-based origins for flexible environments (e.g., Vercel previews)
const allowedOriginRegexes = (() => {
  const raw = process.env.CORS_ALLOWED_ORIGINS_REGEX || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pattern) => {
      try {
        return new RegExp(pattern);
      } catch {
        console.warn(`Invalid CORS regex pattern ignored: ${pattern}`);
        return null;
      }
    })
    .filter(Boolean);
})();

const isOriginAllowed = (origin) => {
  if (allowedOrigins.includes(origin)) return true;
  for (const rx of allowedOriginRegexes) {
    if (rx.test(origin)) return true;
  }
  return false;
};

if (process.env.NODE_ENV !== 'test') {
  console.log('CORS allowed origins:', allowedOrigins);
  if (allowedOriginRegexes.length) {
    console.log('CORS allowed regexes:', allowedOriginRegexes.map((r) => r.toString()));
  }
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow non-browser clients
    if (isOriginAllowed(origin)) return callback(null, true);
    console.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Explicitly enable preflight across all routes
app.options('*', cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (isOriginAllowed(origin)) return callback(null, true);
    console.warn(`CORS (preflight) blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ 
  limit: process.env.MAX_FILE_SIZE || '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_FILE_SIZE || '50mb' 
}));

// Cookie parser
app.use(cookieParser(process.env.COOKIE_SECRET || 'default-secret'));

// Logging middleware
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check with detailed information
app.get('/health', (req, res) => {
  const healthInfo = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  };
  
  res.json(healthInfo);
});

// API Health check endpoint (for deployment monitoring)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/policy', policyRoutes);
app.use('/api/users', userRoutes);

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  // Track error in Application Insights if available
  if (appInsights && process.env.NODE_ENV === 'production') {
    appInsights.defaultClient.trackException({ exception: err });
  }
  
  // Determine error status
  const statusCode = err.statusCode || err.status || 500;
  
  // Prepare error response
  const errorResponse = {
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.message
    })
  };
  
  res.status(statusCode).json(errorResponse);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Database connection with retry logic
const connectDB = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/claims', {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`Database connection attempt ${i + 1} failed:`, error.message);
      if (i === retries - 1) {
        console.error('All database connection attempts failed');
        process.exit(1);
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  // Close server
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
      
      // Close database connection
      mongoose.connection.close(false, () => {
        console.log('MongoDB connection closed');
        
        // Stop Application Insights
        if (appInsights) {
          appInsights.defaultClient.flush();
        }
        
        process.exit(0);
      });
    });
  }
};

// Start server
const PORT = process.env.PORT || 5000;
let server;

const startServer = async () => {
  try {
    await connectDB();
    
    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 Application Insights: ${appInsights ? 'Enabled' : 'Disabled'}`);
      console.log(`🔒 Rate Limiting: ${process.env.RATE_LIMIT_MAX_REQUESTS || 100} requests per ${process.env.RATE_LIMIT_WINDOW_MS || 900000}ms`);
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
