const prisma = require('../config/prisma');
const { serialize } = require('../utils/serializer');
const { ValidationError, handlePrismaError } = require('../utils/errors');

/**
 * Controller to view audit trail logs with granular filters
 */
exports.getAll = async (req, res, next) => {
  try {
    const { action, entity_type, entity_id, user_id, search, from_date, to_date, page = 1, limit = 50 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (isNaN(pageNum) || pageNum < 1) {
      throw new ValidationError('Invalid page number');
    }
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 500) {
      throw new ValidationError('Limit must be between 1 and 500');
    }

    const skip = (pageNum - 1) * limitNum;
    const take = limitNum;

    const where = {};

    if (action) {
      where.action = { contains: action, mode: 'insensitive' };
    }

    if (entity_type) {
      where.entityType = entity_type.toUpperCase();
    }

    if (entity_id) {
      where.entityId = entity_id;
    }

    if (user_id) {
      where.userId = user_id;
    }

    if (from_date || to_date) {
      where.createdAt = {};
      if (from_date) {
        where.createdAt.gte = new Date(from_date);
      }
      if (to_date) {
        where.createdAt.lte = new Date(to_date);
      }
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entityType: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
        { reason: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      })
    ]);

    res.json({
      data: serialize(logs),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Get audit logs error:', err);
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            role: true,
            email: true
          }
        }
      }
    });

    if (!log) {
      return res.status(404).json({ message: 'Audit log entry not found' });
    }

    res.json(serialize(log));
  } catch (err) {
    console.error('Get audit log by id error:', err);
    next(err);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const totalLogs = await prisma.auditLog.count();
    const actionCounts = await prisma.auditLog.groupBy({
      by: ['action'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    res.json({
      totalLogs,
      topActions: actionCounts.map(item => ({
        action: item.action,
        count: item._count.id
      }))
    });
  } catch (err) {
    console.error('Get audit stats error:', err);
    next(err);
  }
};
