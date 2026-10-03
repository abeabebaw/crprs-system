const prisma = require('../config/prisma');
const { ValidationError, NotFoundError, handlePrismaError } = require('../utils/errors');
const { serialize } = require('../utils/serializer');
const { canTransitionTransaction } = require('../utils/workflow');

const generateTxnNumber = async () => {
  const year = new Date().getFullYear();
  const count = await prisma.transaction.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`)
      }
    }
  }).catch(err => {
    console.error('Error counting transactions:', err);
    throw handlePrismaError(err);
  });
  return `TXN-${year}-${String(count + 1).padStart(6, '0')}`;
};

exports.getAll = async (req, res, next) => {
  try {
    const { status, applicationId, parcelId, search, assignedTo } = req.query;
    
    const where = {};

    // Status filter
    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        where.status = statuses[0];
      } else if (statuses.length > 1) {
        where.status = { in: statuses };
      }
    }

    // Application filter (by ID or application number)
    if (applicationId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(applicationId)) {
        where.applicationId = applicationId;
      } else {
        where.application = {
          applicationNumber: applicationId
        };
      }
    }

    // Parcel filter (by ID or parcel code)
    if (parcelId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(parcelId)) {
        where.parcelId = parcelId;
      } else {
        where.parcel = {
          parcelCode: parcelId
        };
      }
    }

    // Assigned to filter
    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    // Search filter
    if (search) {
      where.OR = [
        { transactionNumber: { contains: search, mode: 'insensitive' } },
        { application: { applicationNumber: { contains: search, mode: 'insensitive' } } },
        { parcel: { parcelCode: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        application: {
          select: {
            id: true,
            applicationNumber: true,
            applicationType: true,
            applicantName: true
          }
        },
        parcel: {
          select: {
            id: true,
            parcelCode: true,
            areaSqm: true,
            landUse: true
          }
        },
        assignedUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        creator: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }).catch(err => {
      console.error('Error fetching transactions:', err);
      throw handlePrismaError(err);
    });

    res.json(serialize(transactions));

  } catch (err) {
    console.error('Get transactions error:', err);
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            submitter: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true
              }
            }
          }
        },
        parcel: {
          include: {
            rights: {
              include: {
                holder: true
              }
            },
            mortgages: true,
            courtInjunctions: true,
            restrictions: true,
            parties: true
          }
        },
        assignedUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        documents: {
          include: {
            uploader: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        },
        rights: {
          include: {
            holder: true
          }
        },
        mortgages: true,
        courtInjunctions: true,
        generalRestrictions: true,
        history: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        }
      }
    }).catch(err => {
      console.error('Error fetching transaction:', err);
      throw handlePrismaError(err);
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    res.json(serialize(transaction));

  } catch (err) {
    console.error('Get transaction by ID error:', err);
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { application_id, transaction_type, parcel_id } = req.body;

    if (!application_id || !transaction_type) {
      throw new ValidationError('Application ID and Transaction Type are required');
    }

    // Check application exists
    const application = await prisma.application.findUnique({
      where: { id: application_id },
      select: { id: true, parcelId: true, status: true }
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    if (application.status === 'WITHDRAWN') {
      throw new ValidationError('Cannot create transaction on withdrawn application');
    }

    const txnNumber = await generateTxnNumber();

    const result = await prisma.$transaction(async (tx) => {
      // Create transaction
      const transaction = await tx.transaction.create({
        data: {
          transactionNumber: txnNumber,
          applicationId: application_id,
          parcelId: parcel_id || application.parcelId,
          transactionType: transaction_type,
          status: 'CREATED',
          createdBy: req.user.id
        }
      });

      // Update application status if needed
      if (['SUBMITTED', 'FILE_ATTACHMENT_FINISHED'].includes(application.status)) {
        await tx.application.update({
          where: { id: application_id },
          data: { status: 'IN_PROGRESS' }
        });

        await tx.applicationHistory.create({
          data: {
            applicationId: application_id,
            fromStatus: application.status,
            toStatus: 'IN_PROGRESS',
            changedBy: req.user.id
          }
        });
      }

      // Create transaction history
      await tx.transactionHistory.create({
        data: {
          transactionId: transaction.id,
          toStatus: 'CREATED',
          changedBy: req.user.id
        }
      });

      return transaction;
    });

    res.status(201).json(serialize(result));

  } catch (err) {
    console.error('Create transaction error:', err);
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { transaction_type, parcel_id } = req.body;

    if (!transaction_type) {
      throw new ValidationError('Transaction type is required');
    }

    const existing = await prisma.transaction.findUnique({
      where: { id },
      select: { status: true, applicationId: true }
    });

    if (!existing) {
      throw new NotFoundError('Transaction not found');
    }

    if (existing.status !== 'CREATED') {
      throw new ValidationError('Only CREATED transactions can be updated');
    }

    let finalParcelId = parcel_id;
    if (!finalParcelId) {
      const app = await prisma.application.findUnique({
        where: { id: existing.applicationId },
        select: { parcelId: true }
      });
      finalParcelId = app?.parcelId || null;
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        transactionType: transaction_type,
        parcelId: finalParcelId
      }
    }).catch(err => {
      console.error('Error updating transaction:', err);
      throw handlePrismaError(err);
    });

    res.json(serialize(updated));

  } catch (err) {
    console.error('Update transaction error:', err);
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.transaction.findUnique({
      where: { id },
      select: { status: true, applicationId: true }
    });

    if (!existing) {
      throw new NotFoundError('Transaction not found');
    }

    if (existing.status !== 'CREATED') {
      throw new ValidationError('Only CREATED transactions can be deleted');
    }

    await prisma.$transaction(async (tx) => {
      // Delete transaction
      await tx.transaction.delete({
        where: { id }
      });

      // Check if application has any remaining transactions
      const remainingTxns = await tx.transaction.count({
        where: { applicationId: existing.applicationId }
      });

      // Revert application to SUBMITTED if no transactions left
      if (remainingTxns === 0) {
        const app = await tx.application.findUnique({
          where: { id: existing.applicationId },
          select: { status: true }
        });

        if (app?.status === 'IN_PROGRESS') {
          await tx.application.update({
            where: { id: existing.applicationId },
            data: { status: 'SUBMITTED' }
          });

          await tx.applicationHistory.create({
            data: {
              applicationId: existing.applicationId,
              fromStatus: 'IN_PROGRESS',
              toStatus: 'SUBMITTED',
              changedBy: req.user.id,
              reason: 'Reverted after deleting all CREATED transactions'
            }
          });
        }
      }
    });

    res.json({ message: 'Transaction deleted' });

  } catch (err) {
    console.error('Remove transaction error:', err);
    next(err);
  }
};

exports.initiate = async (req, res, next) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (!canTransitionTransaction(transaction.status, 'INITIATED')) {
      throw new ValidationError('Cannot initiate transaction in current status');
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { id },
        data: {
          status: 'INITIATED',
          initiatedAt: new Date(),
          assignedTo: req.user.id
        }
      });

      await tx.transactionHistory.create({
        data: {
          transactionId: id,
          fromStatus: transaction.status,
          toStatus: 'INITIATED',
          changedBy: req.user.id
        }
      });

      return updated;
    });

    res.json(serialize(result));

  } catch (err) {
    console.error('Initiate transaction error:', err);
    next(err);
  }
};

exports.load = async (req, res, next) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (!canTransitionTransaction(transaction.status, 'IN_PROCESS')) {
      throw new ValidationError('Cannot load transaction in current status');
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { id },
        data: {
          status: 'IN_PROCESS',
          inProcessAt: new Date()
        }
      });

      await tx.transactionHistory.create({
        data: {
          transactionId: id,
          fromStatus: transaction.status,
          toStatus: 'IN_PROCESS',
          changedBy: req.user.id
        }
      });

      return updated;
    });

    res.json(serialize(result));

  } catch (err) {
    console.error('Load transaction error:', err);
    next(err);
  }
};

exports.finish = async (req, res, next) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (!canTransitionTransaction(transaction.status, 'READY_FOR_APPROVAL')) {
      throw new ValidationError('Cannot finish transaction in current status');
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { id },
        data: {
          status: 'READY_FOR_APPROVAL',
          readyForApprovalAt: new Date()
        }
      });

      await tx.transactionHistory.create({
        data: {
          transactionId: id,
          fromStatus: transaction.status,
          toStatus: 'READY_FOR_APPROVAL',
          changedBy: req.user.id
        }
      });

      return updated;
    });

    res.json(serialize(result));

  } catch (err) {
    console.error('Finish transaction error:', err);
    next(err);
  }
};

exports.approve = async (req, res, next) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      select: { status: true, parcelId: true, applicationId: true }
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (!canTransitionTransaction(transaction.status, 'APPROVED')) {
      throw new ValidationError('Cannot approve transaction in current status');
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update transaction
      const updated = await tx.transaction.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date()
        }
      });

      await tx.transactionHistory.create({
        data: {
          transactionId: id,
          fromStatus: transaction.status,
          toStatus: 'APPROVED',
          changedBy: req.user.id
        }
      });

      // Mark parcel as registered
      if (transaction.parcelId) {
        await tx.parcel.update({
          where: { id: transaction.parcelId },
          data: {
            isRegistered: true,
            registrationDate: new Date()
          }
        });
      }

      // Check if all application transactions are approved
      const appTxns = await tx.transaction.findMany({
        where: { applicationId: transaction.applicationId },
        select: { status: true }
      });

      const allApproved = appTxns.every(t => 
        ['APPROVED', 'NOT_IN_TASK', 'DELIVERED'].includes(t.status)
      );

      if (allApproved) {
        await tx.application.update({
          where: { id: transaction.applicationId },
          data: {
            status: 'FINISHED',
            completedAt: new Date()
          }
        });
      }

      return updated;
    });

    res.json(serialize(result));

  } catch (err) {
    console.error('Approve transaction error:', err);
    next(err);
  }
};

exports.reject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      throw new ValidationError('Rejection reason is required');
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (!canTransitionTransaction(transaction.status, 'REJECTED')) {
      throw new ValidationError('Cannot reject transaction in current status');
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectionReason: reason
        }
      });

      await tx.transactionHistory.create({
        data: {
          transactionId: id,
          fromStatus: transaction.status,
          toStatus: 'REJECTED',
          changedBy: req.user.id,
          reason
        }
      });

      return updated;
    });

    res.json(serialize(result));

  } catch (err) {
    console.error('Reject transaction error:', err);
    next(err);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      throw new ValidationError('Cancellation reason is required');
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (!canTransitionTransaction(transaction.status, 'CANCELLED')) {
      throw new ValidationError('Cannot cancel transaction in current status');
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: reason
        }
      });

      await tx.transactionHistory.create({
        data: {
          transactionId: id,
          fromStatus: transaction.status,
          toStatus: 'CANCELLED',
          changedBy: req.user.id,
          reason
        }
      });

      return updated;
    });

    res.json(serialize(result));

  } catch (err) {
    console.error('Cancel transaction error:', err);
    next(err);
  }
};

exports.deliver = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { certificateNumber } = req.body;

    if (!certificateNumber || !String(certificateNumber).trim()) {
      throw new ValidationError('Certificate number is required');
    }

    const normalizedCertificateNumber = String(certificateNumber).trim();

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      select: { status: true, applicationId: true }
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    const canDeliver = canTransitionTransaction(transaction.status, 'NOT_IN_TASK') || 
                       canTransitionTransaction(transaction.status, 'DELIVERED');

    if (!canDeliver) {
      throw new ValidationError('Cannot deliver transaction in current status');
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { id },
        data: {
          status: 'NOT_IN_TASK',
          deliveredAt: new Date()
        }
      });

      await tx.transactionHistory.create({
        data: {
          transactionId: id,
          fromStatus: transaction.status,
          toStatus: 'NOT_IN_TASK',
          changedBy: req.user.id
        }
      });

      // Mark application as completed
      await tx.application.update({
        where: { id: transaction.applicationId },
        data: {
          status: 'COMPLETED',
          deliveredAt: new Date()
        }
      });

      return updated;
    });

    res.json({ 
      ...serialize(result), 
      certificateNumber: normalizedCertificateNumber 
    });

  } catch (err) {
    console.error('Deliver transaction error:', err);
    next(err);
  }
};

module.exports = exports;
