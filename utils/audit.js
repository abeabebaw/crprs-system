const prisma = require('../config/prisma');

/**
 * Enterprise Audit Logging Service for CRPRS
 * Ensures all sensitive operations are persisted with immutable audit trails.
 * Captures user, action, affected entity, changes, network context, and correlation IDs.
 */
async function createAuditLog({
  userId = null,
  action,
  entityType = null,
  entityId = null,
  previousValue = null,
  newValue = null,
  reason = null,
  ipAddress = null,
  userAgent = null,
  correlationId = null,
  req = null
}) {
  try {
    // If request object is passed, extract network info and user info if missing
    let finalIp = ipAddress;
    let finalUserAgent = userAgent;
    let finalCorrelationId = correlationId;
    let finalUserId = userId;

    if (req) {
      if (!finalIp) {
        finalIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || req.ip;
      }
      if (!finalUserAgent) {
        finalUserAgent = req.headers['user-agent'] || null;
      }
      if (!finalCorrelationId) {
        finalCorrelationId = req.headers['x-correlation-id'] || req.correlationId || null;
      }
      if (!finalUserId && req.user?.id) {
        finalUserId = req.user.id;
      }
    }

    const logEntry = await prisma.auditLog.create({
      data: {
        userId: finalUserId || null,
        action: action.toUpperCase(),
        entityType: entityType ? entityType.toUpperCase() : null,
        entityId: entityId ? String(entityId) : null,
        previousValue: previousValue ? (typeof previousValue === 'object' ? previousValue : { value: previousValue }) : undefined,
        newValue: newValue ? (typeof newValue === 'object' ? newValue : { value: newValue }) : undefined,
        reason: reason || null,
        ipAddress: finalIp || null,
        userAgent: finalUserAgent || null,
        correlationId: finalCorrelationId || null,
      }
    });

    return logEntry;
  } catch (error) {
    // Log audit error to stderr but don't crash primary user flow
    console.error('⚠️ [CRPRS-AUDIT-ERROR] Failed to record audit log:', error.message);
    return null;
  }
}

module.exports = {
  createAuditLog
};
