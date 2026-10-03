/**
 * Base Application Error Class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error - 400
 */
class ValidationError extends AppError {
  constructor(message, errors = null) {
    super(message, 400, errors);
    this.name = 'ValidationError';
  }
}

/**
 * Not Found Error - 404
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Unauthorized Error - 401
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden Error - 403
 */
class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Conflict Error - 409
 */
class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Bad Request Error - 400
 */
class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400);
    this.name = 'BadRequestError';
  }
}

/**
 * Database Error - 500
 */
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500);
    this.name = 'DatabaseError';
  }
}

/**
 * Handle Prisma Errors
 */
function handlePrismaError(error) {
  const prismaErrorMap = {
    P2000: { message: 'Value too long for column', status: 400 },
    P2001: { message: 'Record not found', status: 404 },
    P2002: { message: 'Unique constraint violation - Record already exists', status: 409 },
    P2003: { message: 'Foreign key constraint failed', status: 400 },
    P2004: { message: 'Database constraint failed', status: 400 },
    P2005: { message: 'Invalid value for field', status: 400 },
    P2006: { message: 'Invalid value provided', status: 400 },
    P2007: { message: 'Data validation error', status: 400 },
    P2008: { message: 'Query parsing failed', status: 400 },
    P2009: { message: 'Query validation failed', status: 400 },
    P2010: { message: 'Raw query failed', status: 500 },
    P2011: { message: 'Null constraint violation', status: 400 },
    P2012: { message: 'Missing required value', status: 400 },
    P2013: { message: 'Missing required argument', status: 400 },
    P2014: { message: 'Relation violation', status: 400 },
    P2015: { message: 'Related record not found', status: 404 },
    P2016: { message: 'Query interpretation error', status: 400 },
    P2017: { message: 'Records not connected', status: 400 },
    P2018: { message: 'Required connected records not found', status: 404 },
    P2019: { message: 'Input error', status: 400 },
    P2020: { message: 'Value out of range', status: 400 },
    P2021: { message: 'Table does not exist', status: 500 },
    P2022: { message: 'Column does not exist', status: 500 },
    P2023: { message: 'Inconsistent column data', status: 500 },
    P2024: { message: 'Connection timed out', status: 504 },
    P2025: { message: 'Record to update/delete not found', status: 404 },
    P2026: { message: 'Unsupported database feature', status: 400 },
    P2027: { message: 'Multiple database errors occurred', status: 500 },
  };

  const errorInfo = prismaErrorMap[error.code] || { 
    message: 'Database error occurred', 
    status: 500 
  };

  // Extract field information if available
  let details = errorInfo.message;
  if (error.meta?.target) {
    details += ` (Field: ${error.meta.target})`;
  }

  return new AppError(details, errorInfo.status, error.meta);
}

/**
 * Async error wrapper to catch errors in async route handlers
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Safe database transaction wrapper
 */
const safeTransaction = async (prisma, callback) => {
  try {
    return await prisma.$transaction(callback, {
      maxWait: 5000, // Maximum time to wait for a transaction slot (5s)
      timeout: 30000, // Maximum time the transaction can run (30s)
    });
  } catch (error) {
    console.error('Transaction error:', error);
    if (error.code && error.code.startsWith('P')) {
      throw handlePrismaError(error);
    }
    throw error;
  }
};

/**
 * Validate required fields
 */
const validateRequiredFields = (data, requiredFields) => {
  const missingFields = [];
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missingFields.push(field);
    }
  }
  
  if (missingFields.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missingFields.join(', ')}`,
      { missingFields }
    );
  }
};

/**
 * Safe JSON parse with error handling
 */
const safeJsonParse = (str, defaultValue = null) => {
  try {
    return JSON.parse(str);
  } catch (error) {
    console.error('JSON parse error:', error);
    return defaultValue;
  }
};

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
  DatabaseError,
  handlePrismaError,
  catchAsync,
  safeTransaction,
  validateRequiredFields,
  safeJsonParse
};
