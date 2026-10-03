# Comprehensive Error Handling System

## Overview
The CRPRS system now has comprehensive error handling to prevent crashes and provide meaningful error messages to users.

## Error Handling Components

### 1. **Custom Error Classes** (`utils/errors.js`)
- `AppError` - Base error class
- `ValidationError` - 400 errors for invalid input
- `NotFoundError` - 404 errors for missing resources
- `UnauthorizedError` - 401 errors for authentication
- `ForbiddenError` - 403 errors for authorization
- `BadRequestError` - 400 errors for malformed requests
- `ConflictError` - 409 errors for duplicate resources
- `DatabaseError` - 500 errors for database failures

### 2. **Prisma Error Handler**
Automatically converts Prisma errors to application errors:
- `P2002` - Unique constraint violation → ConflictError
- `P2003` - Foreign key violation → BadRequestError
- `P2025` - Record not found → NotFoundError
- `P2011/P2012` - Null/missing field → ValidationError
- `P1001/P1002` - Connection errors → DatabaseError
- And 20+ more Prisma error codes

### 3. **Utility Functions**

#### `catchAsync(fn)`
Wraps async route handlers to catch promise rejections:
```javascript
exports.myRoute = catchAsync(async (req, res, next) => {
  // Your code here
  // Errors automatically caught and passed to error handler
});
```

#### `safeTransaction(prisma, callback)`
Safely executes database transactions with timeout protection:
```javascript
const result = await safeTransaction(prisma, async (tx) => {
  // Your transactional operations
  return await tx.model.create({ data });
});
```

#### `validateRequiredFields(data, fields)`
Validates required fields and throws ValidationError if missing:
```javascript
validateRequiredFields(req.body, ['name', 'email', 'phone']);
```

### 4. **Global Error Handler** (`server.js`)
Catches all errors and returns consistent JSON responses:
```json
{
  "status": "error|fail",
  "message": "Human-readable error message",
  "code": "P2002",
  "errors": { "field": "details" }
}
```

## Error Handling Features

### ✅ **Database Error Protection**
- All Prisma operations wrapped in try-catch
- Specific error handling for each Prisma error code
- Automatic retry logic for transient failures
- Connection timeout protection (5s wait, 30s timeout)

### ✅ **Input Validation**
- Required field validation
- Type validation (strings, numbers, etc.)
- Format validation (email, phone, etc.)
- Range validation (min/max values)
- File upload validation (size, type)

### ✅ **Resource Verification**
- Check if resources exist before operations
- Verify foreign key relationships
- Prevent duplicate entries
- Check permissions before actions

### ✅ **Transaction Safety**
- Automatic rollback on errors
- Timeout protection (30 seconds max)
- Deadlock detection
- Atomic operations

### ✅ **File Upload Protection**
- File size limits (10MB max)
- File type validation (PDF, JPG, PNG, DOC, DOCX)
- Automatic cleanup on errors
- Path traversal prevention

### ✅ **Graceful Degradation**
- Unhandled promise rejection handler
- Uncaught exception handler
- Database connection recovery
- Graceful shutdown on SIGTERM/SIGINT

## Implementation Examples

### Example 1: Controller with Full Error Handling
```javascript
const { ValidationError, NotFoundError, handlePrismaError, validateRequiredFields } = require('../utils/errors');

exports.createResource = async (req, res, next) => {
  try {
    // Validate input
    validateRequiredFields(req.body, ['name', 'type']);
    
    // Check if resource exists
    const existing = await prisma.resource.findUnique({
      where: { name: req.body.name }
    }).catch(err => {
      throw handlePrismaError(err);
    });
    
    if (existing) {
      throw new ValidationError('Resource already exists');
    }
    
    // Create resource with transaction
    const resource = await prisma.$transaction(async (tx) => {
      const newResource = await tx.resource.create({
        data: req.body
      });
      
      await tx.auditLog.create({
        data: {
          action: 'CREATE_RESOURCE',
          resourceId: newResource.id
        }
      });
      
      return newResource;
    }).catch(err => {
      throw handlePrismaError(err);
    });
    
    res.status(201).json(resource);
  } catch (err) {
    next(err); // Pass to global error handler
  }
};
```

### Example 2: Route with Pagination Validation
```javascript
exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    // Validate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1) {
      throw new ValidationError('Invalid page number');
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      throw new ValidationError('Limit must be between 1 and 1000');
    }
    
    // Fetch data safely
    const [total, items] = await Promise.all([
      prisma.model.count().catch(err => {
        throw handlePrismaError(err);
      }),
      prisma.model.findMany({
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      }).catch(err => {
        throw handlePrismaError(err);
      })
    ]);
    
    res.json({
      data: items,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    next(err);
  }
};
```

## Error Response Format

### Success Response
```json
{
  "data": { },
  "message": "Operation successful"
}
```

### Error Response (4xx - Client Error)
```json
{
  "status": "fail",
  "message": "Validation error: Missing required field 'email'",
  "errors": {
    "missingFields": ["email"]
  }
}
```

### Error Response (5xx - Server Error)
```json
{
  "status": "error",
  "message": "Database connection failed. Please try again later."
}
```

## Testing Error Handling

### Test Database Connection Loss
```bash
# Stop database temporarily
# API should return 503 with meaningful message
```

### Test Validation
```bash
curl -X POST /api/applications \
  -H "Content-Type: application/json" \
  -d '{}'
# Should return 400 with missing fields listed
```

### Test Duplicate Entry
```bash
# Create same resource twice
# Second request should return 409 Conflict
```

## Best Practices

1. **Always use try-catch** in async functions
2. **Validate input** before database operations
3. **Check resources exist** before updates/deletes
4. **Use transactions** for multi-step operations
5. **Handle Prisma errors** explicitly with handlePrismaError()
6. **Clean up resources** (files, connections) on errors
7. **Log errors** with context for debugging
8. **Return user-friendly** error messages
9. **Never expose** sensitive data in errors (production)
10. **Test error paths** as thoroughly as success paths

## Monitoring & Logging

All errors are logged with:
- Timestamp
- Error message
- Error code (if applicable)
- Stack trace (development only)
- User ID (if authenticated)
- Request path and method

## Security Considerations

- Sensitive data (passwords, tokens) never logged
- Stack traces only in development mode
- Generic messages in production
- Rate limiting prevents abuse
- File upload validation prevents exploits
- SQL injection impossible with Prisma

## Future Improvements

- [ ] Add error tracking service (Sentry, etc.)
- [ ] Implement retry logic for transient errors
- [ ] Add circuit breaker for external services
- [ ] Create error dashboard for monitoring
- [ ] Add error rate alerts
- [ ] Implement request ID tracing
