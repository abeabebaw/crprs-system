const { ValidationError } = require('./errors');

/**
 * Validate required fields
 */
function validateRequired(data, fields) {
  const errors = {};
  const missing = [];

  fields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      errors[field] = `${field} is required`;
      missing.push(field);
    }
  });

  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      errors
    );
  }
}

/**
 * Validate email format
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }
}

/**
 * Validate UUID format
 */
function validateUUID(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new ValidationError('Invalid ID format');
  }
}

/**
 * Validate password strength
 */
function validatePassword(password, minLength = 6) {
  if (password.length < minLength) {
    throw new ValidationError(`Password must be at least ${minLength} characters long`);
  }
}

/**
 * Sanitize string input
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str.trim();
}

module.exports = {
  validateRequired,
  validateEmail,
  validateUUID,
  validatePassword,
  sanitizeString
};
