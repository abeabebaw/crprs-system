require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const prisma = require('./config/prisma');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const parcelRoutes = require('./routes/parcel.routes');
const applicationRoutes = require('./routes/application.routes');
const transactionRoutes = require('./routes/transaction.routes');
const partyRoutes = require('./routes/party.routes');
const rrrRoutes = require('./routes/rrr.routes');
const registrationRoutes = require('./routes/registration.routes');
const mortgageRoutes = require('./routes/mortgage.routes');
const injunctionRoutes = require('./routes/injunction.routes');
const restrictionRoutes = require('./routes/restriction.routes');
const documentRoutes = require('./routes/document.routes');
const lookupRoutes = require('./routes/lookup.routes');
const reportRoutes = require('./routes/report.routes');
const spatialRoutes = require('./routes/spatial.routes');
const businessRuleRoutes = require('./routes/businessRule.routes');
const configurationRoutes = require('./routes/configuration.routes');
const auditRoutes = require('./routes/audit.routes');
const publicRoutes = require('./routes/public.routes');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Test database connection on startup
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connected and query test successful');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('Please check your DATABASE_URL in .env file');
    
    // Don't exit in development - allow hot reload
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('⚠️  Running in development mode without database connection');
    }
  }
}

testDatabaseConnection();

// Security & utility middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request correlation ID middleware
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  res.setHeader('X-Correlation-ID', req.correlationId);
  next();
});

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
app.use('/api', limiter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', version: '2.2.0' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/parcels', parcelRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/rrr', rrrRoutes);
app.use('/api/registration', registrationRoutes);
app.use('/api/mortgages', mortgageRoutes);
app.use('/api/injunctions', injunctionRoutes);
app.use('/api/restrictions', restrictionRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/lookups', lookupRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api', spatialRoutes);
app.use('/api/business-rules', businessRuleRoutes);
app.use('/api/configurations', configurationRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error occurred:', {
    message: err.message,
    code: err.code,
    name: err.name,
    statusCode: err.statusCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Prisma errors
  if (err.code && err.code.startsWith('P')) {
    const { handlePrismaError } = require('./utils/errors');
    const appError = handlePrismaError(err);
    return res.status(appError.statusCode).json({
      status: 'error',
      message: appError.message,
      code: err.code,
      ...(process.env.NODE_ENV === 'development' && { 
        details: err.meta,
        stack: err.stack 
      })
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid authentication token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication token has expired'
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'fail',
      message: err.message || 'Validation error',
      errors: err.errors
    });
  }

  // Multer file upload errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      status: 'fail',
      message: err.message || 'File upload error'
    });
  }

  // Syntax errors (invalid JSON)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid JSON in request body'
    });
  }

  // Application errors (custom errors)
  if (err.isOperational) {
    return res.status(err.statusCode || 500).json({
      status: err.statusCode < 500 ? 'fail' : 'error',
      message: err.message,
      ...(err.errors && { errors: err.errors }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Database connection errors
  if (err.message && err.message.includes('connect')) {
    return res.status(503).json({
      status: 'error',
      message: 'Database connection failed. Please try again later.'
    });
  }

  // Unknown/unexpected errors (log full error but send generic message)
  console.error('Unexpected error:', err);
  
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred. Please contact support.'
      : err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err 
    })
  });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 CRPRS Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for: ${process.env.CORS_ORIGIN}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use by another process.`);
    console.error(`💡 Solution: Stop the existing node process running on port ${PORT} or change PORT in .env`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  try {
    await prisma.$disconnect();
    console.log('Database disconnected');
  } catch (err) {
    console.error('Error disconnecting database:', err);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  try {
    await prisma.$disconnect();
    console.log('Database disconnected');
  } catch (err) {
    console.error('Error disconnecting database:', err);
  }
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't crash in production, log and continue
  if (process.env.NODE_ENV === 'production') {
    console.error('Application will continue running...');
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // In production, attempt graceful shutdown
  if (process.env.NODE_ENV === 'production') {
    prisma.$disconnect().then(() => {
      console.error('Database disconnected after uncaught exception');
      process.exit(1);
    });
  }
});