const prisma = require('../config/prisma');
const { canTransitionApplication } = require('../utils/workflow');
const { ValidationError, NotFoundError, BadRequestError, DatabaseError, handlePrismaError, safeTransaction, validateRequiredFields } = require('../utils/errors');
const { serialize } = require('../utils/serializer');
const { createAuditLog } = require('../utils/audit');

const generateAppNumber = async () => {
  const year = new Date().getFullYear();
  const count = await prisma.application.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`)
      }
    }
  });
  return `APP-${year}-${String(count + 1).padStart(6, '0')}`;
};

const generateParcelCode = async (region = null, city = null) => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  // Count parcels created this year
  const count = await prisma.parcel.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`)
      }
    }
  });
  
  // Build parcel code with regional prefix if available
  let prefix = 'PRC';
  
  // Add region code if provided (first 2 letters)
  if (region && typeof region === 'string' && region.length >= 2) {
    const regionCode = region.substring(0, 2).toUpperCase();
    prefix = `${prefix}-${regionCode}`;
  }
  
  // Add city code if provided (first 2 letters)
  if (city && typeof city === 'string' && city.length >= 2) {
    const cityCode = city.substring(0, 2).toUpperCase();
    // If we already added region, append city without dash, otherwise add dash
    if (prefix !== 'PRC') {
      prefix = `${prefix}${cityCode}`;
    } else {
      prefix = `${prefix}-${cityCode}`;
    }
  }
  
  // Format: PRC[-REGION][CITY]-YEARMONTH-SEQUENCE
  return `${prefix}-${year}${month}-${String(count + 1).padStart(5, '0')}`;
};

exports.getAll = async (req, res, next) => {
  try {
    const { status, type, search, page = 1, limit = 100 } = req.query;
    
    // Validate pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1) {
      throw new ValidationError('Invalid page number');
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      throw new ValidationError('Limit must be between 1 and 1000');
    }
    
    const skip = (pageNum - 1) * limitNum;
    const take = limitNum;

    // Build where clause
    const where = {};
    
    if (status) {
      // Handle multiple statuses (comma-separated) or single status
      const statuses = status.split(',').map(s => s.trim());
      if (statuses.length > 1) {
        where.status = { in: statuses };
      } else {
        where.status = statuses[0];
      }
    }
    
    if (type) {
      where.applicationType = type;
    }
    
    if (search) {
      where.OR = [
        { applicationNumber: { contains: search, mode: 'insensitive' } },
        { applicantName: { contains: search, mode: 'insensitive' } },
        { parcel: { parcelCode: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Get total count and applications in parallel for better performance
    const [total, applications] = await Promise.all([
      prisma.application.count({ where }).catch(err => {
        console.error('Error counting applications:', err);
        throw handlePrismaError(err);
      }),
      prisma.application.findMany({
        where,
        include: {
          _count: {
            select: {
              transactions: true
            }
          },
          parcel: {
            select: {
              id: true,
              parcelCode: true,
              areaSqm: true,
              landUse: true,
              region: true,
              city: true
            }
          },
          submitter: {
            select: {
              id: true,
              username: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take
      }).catch(err => {
        console.error('Error fetching applications:', err);
        throw handlePrismaError(err);
      })
    ]);

    // Serialize to snake_case for frontend compatibility and ensure root parcel_code
    const serializedApps = applications.map(app => {
      const s = serialize(app);
      if (app.parcel) {
        s.parcel_code = app.parcel.parcelCode;
        s.parcelCode = app.parcel.parcelCode;
      }
      return s;
    });

    res.json({
      data: serializedApps,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (err) {
    console.error('Get applications error:', err);
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        parcel: true,
        submitter: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            phone: true
          }
        },
        documents: {
          orderBy: { createdAt: 'asc' },
          include: {
            uploader: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        },
        transactions: {
          orderBy: { createdAt: 'asc' },
          include: {
            assignedUser: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        },
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
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    const serialized = serialize(application);
    if (application.parcel) {
      serialized.parcel_code = application.parcel.parcelCode;
      serialized.parcelCode = application.parcel.parcelCode;
      serialized.area_sqm = application.parcel.areaSqm;
      serialized.land_use = application.parcel.landUse;
      serialized.region = application.parcel.region;
      serialized.city = application.parcel.city;
    }
    if (!serialized.applicant_phone && application.applicantPhone) {
      serialized.applicant_phone = application.applicantPhone;
    }

    res.json(serialized);

  } catch (err) {
    console.error('Get application error:', err);
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { 
      application_type, 
      parcel_id, 
      // Parcel data for first registration
      parcel_code,
      area_sqm,
      land_use,
      region,
      city,
      sub_city,
      woreda,
      // Applicant data
      applicant_name, 
      applicant_type, 
      applicant_address,
      applicant_phone, 
      applicant_email, 
      applicant_id_number, 
      applicant_id_type, 
      description 
    } = req.body;

    // Validate required fields
    const cleanAppType = application_type || 'FIRST_REGISTRATION';
    const cleanApplicantName = (applicant_name || '').trim();

    if (!cleanApplicantName) {
      throw new ValidationError('Applicant name is required');
    }

    let finalParcelId = null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // 1. Check if parcel_id is passed as a valid UUID or code
    if (parcel_id && typeof parcel_id === 'string' && parcel_id.trim() !== '') {
      const cleanId = parcel_id.trim();
      if (uuidRegex.test(cleanId)) {
        const existing = await prisma.parcel.findUnique({ where: { id: cleanId } }).catch(() => null);
        if (existing) {
          finalParcelId = existing.id;
        }
      } else {
        const existing = await prisma.parcel.findUnique({ where: { parcelCode: cleanId } }).catch(() => null);
        if (existing) {
          finalParcelId = existing.id;
        }
      }
    }

    // 2. Check if parcel_code matches an existing parcel
    if (!finalParcelId && parcel_code && typeof parcel_code === 'string' && parcel_code.trim() !== '') {
      const cleanCode = parcel_code.trim();
      const existing = await prisma.parcel.findUnique({ where: { parcelCode: cleanCode } }).catch(() => null);
      if (existing) {
        finalParcelId = existing.id;
      }
    }

    // 3. If no existing parcel found:
    if (!finalParcelId) {
      if (cleanAppType === 'FIRST_REGISTRATION' || !parcel_id) {
        // Auto-create parcel for first registration
        const parcelRegion = (region && region.trim() !== '') ? region.trim() : 'Addis Ababa';
        const parcelCity = (city && city.trim() !== '') ? city.trim() : 'Addis Ababa';
        
        let parsedArea = 250.00;
        if (area_sqm !== undefined && area_sqm !== null && area_sqm !== '') {
          const num = parseFloat(area_sqm);
          if (!isNaN(num) && num > 0) {
            parsedArea = num;
          }
        }

        let targetParcelCode = (parcel_code && parcel_code.trim() !== '') ? parcel_code.trim() : null;
        if (!targetParcelCode) {
          targetParcelCode = await generateParcelCode(parcelRegion, parcelCity);
        }

        // Ensure parcel code uniqueness
        let uniqueCode = targetParcelCode;
        let attempts = 0;
        while (attempts < 10) {
          const exists = await prisma.parcel.findUnique({ where: { parcelCode: uniqueCode } }).catch(() => null);
          if (!exists) break;
          uniqueCode = `${targetParcelCode}-${Math.floor(1000 + Math.random() * 9000)}`;
          attempts++;
        }

        const newParcel = await prisma.parcel.create({
          data: {
            parcelCode: uniqueCode,
            areaSqm: parsedArea,
            landUse: land_use || 'Residential',
            region: parcelRegion,
            city: parcelCity,
            subCity: sub_city || null,
            woreda: woreda || null,
            isRegistered: false
          }
        });

        finalParcelId = newParcel.id;

        await createAuditLog({
          userId: req.user?.id || null,
          action: 'PARCEL_CREATED',
          entityType: 'PARCEL',
          entityId: newParcel.id,
          newValue: { parcelCode: newParcel.parcelCode, areaSqm: newParcel.areaSqm, landUse: newParcel.landUse },
          reason: 'Auto-created for First Registration Application',
          req
        }).catch(() => {});
      } else {
        // For other application types, fallback to first active parcel if available
        const fallbackParcel = await prisma.parcel.findFirst().catch(() => null);
        if (fallbackParcel) {
          finalParcelId = fallbackParcel.id;
        }
      }
    }

    // Generate unique application number
    const appNumber = await generateAppNumber();

    // Create application inside database transaction
    const application = await prisma.$transaction(async (tx) => {
      const newApp = await tx.application.create({
        data: {
          applicationNumber: appNumber,
          applicationType: cleanAppType,
          parcelId: finalParcelId || null,
          status: 'SUBMITTED',
          applicantName: cleanApplicantName,
          applicantType: applicant_type || 'LANDHOLDER',
          applicantAddress: applicant_address || null,
          applicantPhone: applicant_phone || null,
          applicantEmail: applicant_email || null,
          applicantIdNumber: applicant_id_number || null,
          applicantIdType: applicant_id_type || 'KEBELE_ID',
          description: description || null,
          submittedBy: req.user?.id || null
        },
        include: {
          parcel: true,
          submitter: {
            select: {
              id: true,
              username: true,
              fullName: true,
              email: true
            }
          }
        }
      });

      // Record status transition in application history
      await tx.applicationHistory.create({
        data: {
          applicationId: newApp.id,
          toStatus: 'SUBMITTED',
          changedBy: req.user?.id || null,
          reason: 'Application Intake Form Submission'
        }
      });

      return newApp;
    });

    await createAuditLog({
      userId: req.user?.id || null,
      action: 'APPLICATION_CREATED',
      entityType: 'APPLICATION',
      entityId: application.id,
      newValue: {
        applicationNumber: application.applicationNumber,
        applicationType: application.applicationType,
        applicantName: application.applicantName,
        parcelId: application.parcelId
      },
      req
    }).catch(() => {});

    res.status(201).json(serialize(application));

  } catch (err) {
    console.error('Create application error:', err);
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { applicant_name, applicant_type, applicant_address, applicant_phone,
            applicant_email, applicant_id_number, applicant_id_type, description } = req.body;
    
    // Check if application exists and is in SUBMITTED status
    const existingApp = await prisma.application.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!existingApp) {
      throw new NotFoundError('Application not found');
    }

    if (existingApp.status !== 'SUBMITTED') {
      return res.status(400).json({ message: 'Cannot update application in current status' });
    }

    const updatedApp = await prisma.application.update({
      where: { id },
      data: {
        applicantName: applicant_name,
        applicantType: applicant_type || null,
        applicantAddress: applicant_address || null,
        applicantPhone: applicant_phone || null,
        applicantEmail: applicant_email || null,
        applicantIdNumber: applicant_id_number || null,
        applicantIdType: applicant_id_type || null,
        description: description || null
      },
      include: {
        parcel: true,
        submitter: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'APPLICATION_UPDATED',
      entityType: 'APPLICATION',
      entityId: updatedApp.id,
      newValue: { applicantName: updatedApp.applicantName, applicantPhone: updatedApp.applicantPhone },
      req
    });

    res.json(serialize(updatedApp));
  } catch (err) {
    console.error('Update application error:', err);
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

    const app = await prisma.application.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!app) {
      throw new NotFoundError('Application not found');
    }

    if (!canTransitionApplication(app.status, 'WITHDRAWN')) {
      return res.status(400).json({ message: `Cannot reject application in ${app.status} status` });
    }
    
    const updatedApp = await prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id },
        data: {
          status: 'WITHDRAWN',
          withdrawnReason: reason,
          withdrawnAt: new Date()
        },
        include: {
          parcel: true
        }
      });

      await tx.applicationHistory.create({
        data: {
          applicationId: id,
          fromStatus: app.status,
          toStatus: 'WITHDRAWN',
          changedBy: req.user.id,
          reason
        }
      });

      return updated;
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'APPLICATION_REJECTED',
      entityType: 'APPLICATION',
      entityId: id,
      previousValue: { status: app.status },
      newValue: { status: 'WITHDRAWN' },
      reason,
      req
    });

    res.json(serialize(updatedApp));
  } catch (err) {
    console.error('Reject application error:', err);
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await prisma.application.deleteMany({
      where: {
        id,
        status: 'SUBMITTED'
      }
    });

    if (result.count === 0) {
      return res.status(400).json({ message: 'Cannot delete application (not found or not in SUBMITTED status)' });
    }

    await createAuditLog({
      userId: req.user.id,
      action: 'APPLICATION_DELETED',
      entityType: 'APPLICATION',
      entityId: id,
      reason: 'Deleted by user in SUBMITTED status',
      req
    });

    res.json({ message: 'Application deleted' });
  } catch (err) {
    console.error('Remove application error:', err);
    next(err);
  }
};

exports.changeStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newStatus, status, reason } = req.body;
    const targetStatus = newStatus || status;
    
    if (!targetStatus) {
      throw new ValidationError('New status is required');
    }

    const app = await prisma.application.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!app) {
      throw new NotFoundError('Application not found');
    }

    if (!canTransitionApplication(app.status, targetStatus)) {
      return res.status(400).json({ message: `Cannot transition from ${app.status} to ${targetStatus}` });
    }
    
    const updatedApp = await prisma.$transaction(async (tx) => {
      const updateData = {
        status: targetStatus
      };

      // Set timestamps based on new status
      if (targetStatus === 'FINISHED') {
        updateData.completedAt = new Date();
      } else if (targetStatus === 'COMPLETED') {
        updateData.deliveredAt = new Date();
      }

      const updated = await tx.application.update({
        where: { id },
        data: updateData,
        include: {
          parcel: true
        }
      });

      await tx.applicationHistory.create({
        data: {
          applicationId: id,
          fromStatus: app.status,
          toStatus: targetStatus,
          changedBy: req.user.id,
          reason: reason || null
        }
      });

      return updated;
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'APPLICATION_STATUS_CHANGED',
      entityType: 'APPLICATION',
      entityId: id,
      previousValue: { status: app.status },
      newValue: { status: targetStatus },
      reason,
      req
    });

    res.json(serialize(updatedApp));
  } catch (err) {
    console.error('Change status error:', err);
    next(err);
  }
};