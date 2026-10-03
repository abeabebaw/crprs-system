/**
 * Utility functions to serialize Prisma responses for frontend compatibility
 * Converts camelCase to snake_case and handles BigInt serialization
 */

/**
 * Convert camelCase string to snake_case
 */
const toSnakeCase = (str) => {
  // Handle non-string inputs
  if (typeof str !== 'string' || !str) {
    return str;
  }
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

/**
 * Convert BigInt values to strings for JSON serialization
 */
const serializeBigInt = (value) => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
};

/**
 * Transform object keys from camelCase to snake_case
 * Also handles BigInt serialization
 */
const toSnakeCaseObject = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCaseObject(item));
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const transformed = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = toSnakeCase(key);
      
      // Handle nested objects and arrays
      if (value && typeof value === 'object') {
        transformed[snakeKey] = toSnakeCaseObject(value);
      } else {
        transformed[snakeKey] = serializeBigInt(value);
      }
    }
    
    return transformed;
  }

  return serializeBigInt(obj);
};

/**
 * Serialize single or array of objects for API response
 */
const serialize = (data) => {
  if (Array.isArray(data)) {
    return data.map(item => toSnakeCaseObject(item));
  }
  return toSnakeCaseObject(data);
};

module.exports = {
  serialize,
  toSnakeCase,
  toSnakeCaseObject,
  serializeBigInt
};
