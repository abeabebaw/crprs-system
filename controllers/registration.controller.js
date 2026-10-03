const prisma = require('../config/prisma');
const { ValidationError, NotFoundError, handlePrismaError } = require('../utils/errors');
const { serialize } = require('../utils/serializer');
const { createAuditLog } = require('../utils/audit');

/**
 * Registration Officer Controller
 * Handles RRR (Rights, Restrictions, and Responsibilities) registration
 * for initiated transactions
 */

// Get transaction details for registration (Load command)
exports.loadTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check transaction exists and is initiated
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
            mortgages: {
              where: {
                status: 'ACTIVE'
              }
            },
            courtInjunctions: {
              where: {
                status: 'ACTIVE'
              }
            },
            restrictions: {
              where: {
                status: 'ACTIVE'
              }
            },
            parties: true,
            buildings: true,
            borderPoints: true,
            boundaryLines: true
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
      console.error('Error loading transaction:', err);
      throw handlePrismaError(err);
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    // Verify transaction is initiated or in process
    if (!['INITIATED', 'IN_PROCESS'].includes(transaction.status)) {
      throw new ValidationError(`Transaction must be INITIATED or IN_PROCESS to load. Current status: ${transaction.status}`);
    }

    res.json(serialize(transaction));

  } catch (err) {
    console.error('Load transaction error:', err);
    next(err);
  }
};

// Register Right (RRR) information
exports.registerRight = async (req, res, next) => {
  try {
    const {
      transaction_id,
      parcel_id,
      right_type,
      holder_party_id,
      // Holder information (if new holder)
      holder_first_name,
      holder_father_name,
      holder_grandfather_name,
      holder_sex,
      holder_date_of_birth,
      holder_national_id,
      holder_phone,
      holder_email,
      holder_address,
      // For group or legal entity
      holder_organization_name,
      holder_organization_type,
      holder_registration_number,
      holder_party_type,
      // Right details
      acquisition_type,
      acquisition_date,
      start_date,
      end_date,
      lease_period_years,
      lease_start_date,
      lease_end_date,
      ground_rent,
      description
    } = req.body;

    // Validate required fields
    if (!transaction_id || !parcel_id || !right_type) {
      throw new ValidationError('Transaction ID, Parcel ID, and Right Type are required');
    }

    // Verify transaction exists and is in correct status
    const transaction = await prisma.transaction.findUnique({
      where: { id: transaction_id },
      select: { status: true, parcelId: true }
    }).catch(err => {
      throw handlePrismaError(err);
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (!['INITIATED', 'IN_PROCESS'].includes(transaction.status)) {
      throw new ValidationError(`Cannot register rights on transaction with status: ${transaction.status}`);
    }

    // Verify parcel exists
    const parcel = await prisma.parcel.findUnique({
      where: { id: parcel_id }
    });

    if (!parcel) {
      throw new NotFoundError('Parcel not found');
    }

    // Create right registration with transaction
    const result = await prisma.$transaction(async (tx) => {
      let finalHolderPartyId = holder_party_id;

      // Create new holder party if not provided
      if (!holder_party_id && (holder_first_name || holder_organization_name)) {
        const partyData = {
          parcelId: parcel_id,
          partyType: holder_party_type || (holder_organization_name ? 'LEGAL' : 'NATURAL')
        };

        // Natural person fields
        if (holder_first_name) {
          Object.assign(partyData, {
            firstName: holder_first_name,
            fatherName: holder_father_name || null,
            grandfatherName: holder_grandfather_name || null,
            sex: holder_sex || null,
            dateOfBirth: holder_date_of_birth ? new Date(holder_date_of_birth) : null,
            nationalId: holder_national_id || null,
            phone: holder_phone || null,
            email: holder_email || null,
            address: holder_address || null
          });
        }

        // Legal entity fields
        if (holder_organization_name) {
          Object.assign(partyData, {
            organizationName: holder_organization_name,
            organizationType: holder_organization_type || null,
            registrationNumber: holder_registration_number || null,
            phone: holder_phone || null,
            email: holder_email || null,
            address: holder_address || null
          });
        }

        const newParty = await tx.party.create({
          data: partyData
        });

        finalHolderPartyId = newParty.id;
      }

      // Create the right
      const rightData = {
        parcelId: parcel_id,
        transactionId: transaction_id,
        rightType: right_type,
        holderPartyId: finalHolderPartyId,
        acquisitionType: acquisition_type || null,
        acquisitionDate: acquisition_date ? new Date(acquisition_date) : null,
        startDate: start_date ? new Date(start_date) : null,
        endDate: end_date ? new Date(end_date) : null,
        leasePeriodYears: lease_period_years ? parseInt(lease_period_years) : null,
        leaseStartDate: lease_start_date ? new Date(lease_start_date) : null,
        leaseEndDate: lease_end_date ? new Date(lease_end_date) : null,
        groundRent: ground_rent ? parseFloat(ground_rent) : null,
        description: description || null,
        status: 'ACTIVE'
      };

      const right = await tx.right.create({
        data: rightData,
        include: {
          holder: true,
          parcel: true,
          transaction: true
        }
      });

      // Update transaction status to IN_PROCESS if it was INITIATED
      if (transaction.status === 'INITIATED') {
        await tx.transaction.update({
          where: { id: transaction_id },
          data: {
            status: 'IN_PROCESS',
            inProcessAt: new Date()
          }
        });

        await tx.transactionHistory.create({
          data: {
            transactionId: transaction_id,
            fromStatus: 'INITIATED',
            toStatus: 'IN_PROCESS',
            changedBy: req.user.id,
            reason: 'Right registration started'
          }
        });
      }

      return right;
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'RIGHT_REGISTERED',
      entityType: 'RIGHT',
      entityId: result.id,
      newValue: {
        rightType: result.rightType,
        parcelId: result.parcelId,
        holderPartyId: result.holderPartyId,
        transactionId: result.transactionId
      },
      req
    });

    res.status(201).json(serialize(result));

  } catch (err) {
    console.error('Register right error:', err);
    next(err);
  }
};

// Update registered right information
exports.updateRight = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      acquisition_type,
      acquisition_date,
      start_date,
      end_date,
      lease_period_years,
      lease_start_date,
      lease_end_date,
      ground_rent,
      description
    } = req.body;

    // Check if right exists
    const existingRight = await prisma.right.findUnique({
      where: { id },
      include: {
        transaction: {
          select: { status: true }
        }
      }
    });

    if (!existingRight) {
      throw new NotFoundError('Right not found');
    }

    // Verify transaction is not finished
    if (existingRight.transaction && ['READY_FOR_APPROVAL', 'APPROVED', 'DELIVERED'].includes(existingRight.transaction.status)) {
      throw new ValidationError('Cannot update right for finished transaction');
    }

    const updateData = {};
    if (acquisition_type !== undefined) updateData.acquisitionType = acquisition_type;
    if (acquisition_date !== undefined) updateData.acquisitionDate = acquisition_date ? new Date(acquisition_date) : null;
    if (start_date !== undefined) updateData.startDate = start_date ? new Date(start_date) : null;
    if (end_date !== undefined) updateData.endDate = end_date ? new Date(end_date) : null;
    if (lease_period_years !== undefined) updateData.leasePeriodYears = lease_period_years ? parseInt(lease_period_years) : null;
    if (lease_start_date !== undefined) updateData.leaseStartDate = lease_start_date ? new Date(lease_start_date) : null;
    if (lease_end_date !== undefined) updateData.leaseEndDate = lease_end_date ? new Date(lease_end_date) : null;
    if (ground_rent !== undefined) updateData.groundRent = ground_rent ? parseFloat(ground_rent) : null;
    if (description !== undefined) updateData.description = description;

    const updatedRight = await prisma.right.update({
      where: { id },
      data: updateData,
      include: {
        holder: true,
        parcel: true,
        transaction: true
      }
    }).catch(err => {
      console.error('Error updating right:', err);
      throw handlePrismaError(err);
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'RIGHT_UPDATED',
      entityType: 'RIGHT',
      entityId: updatedRight.id,
      previousValue: { acquisitionType: existingRight.acquisitionType, description: existingRight.description },
      newValue: { acquisitionType: updatedRight.acquisitionType, description: updatedRight.description },
      req
    });

    res.json(serialize(updatedRight));

  } catch (err) {
    console.error('Update right error:', err);
    next(err);
  }
};

// Get rights for a parcel
exports.getRightsByParcel = async (req, res, next) => {
  try {
    const { parcelId } = req.params;

    const rights = await prisma.right.findMany({
      where: { parcelId },
      include: {
        holder: true,
        transaction: {
          select: {
            id: true,
            transactionNumber: true,
            transactionType: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }).catch(err => {
      console.error('Error getting rights:', err);
      throw handlePrismaError(err);
    });

    res.json(serialize(rights));

  } catch (err) {
    console.error('Get rights error:', err);
    next(err);
  }
};

// Register Mortgage
exports.registerMortgage = async (req, res, next) => {
  try {
    const {
      transaction_id,
      parcel_id,
      mortgagee_name,
      mortgagee_type,
      mortgage_amount,
      currency,
      mortgage_date,
      loan_agreement_number,
      description
    } = req.body;

    if (!transaction_id || !parcel_id || !mortgagee_name || !mortgage_amount) {
      throw new ValidationError('Transaction ID, Parcel ID, Mortgagee Name, and Amount are required');
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transaction_id },
      select: { status: true }
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (!['INITIATED', 'IN_PROCESS'].includes(transaction.status)) {
      throw new ValidationError(`Cannot register mortgage on transaction with status: ${transaction.status}`);
    }

    const mortgage = await prisma.mortgage.create({
      data: {
        parcelId: parcel_id,
        transactionId: transaction_id,
        mortgageeName: mortgagee_name,
        mortgageeType: mortgagee_type || null,
        mortgageAmount: parseFloat(mortgage_amount),
        currency: currency || 'ETB',
        mortgageDate: mortgage_date ? new Date(mortgage_date) : new Date(),
        loanAgreementNumber: loan_agreement_number || null,
        description: description || null,
        status: 'ACTIVE'
      }
    }).catch(err => {
      console.error('Error registering mortgage:', err);
      throw handlePrismaError(err);
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'MORTGAGE_REGISTERED',
      entityType: 'MORTGAGE',
      entityId: mortgage.id,
      newValue: {
        parcelId: mortgage.parcelId,
        transactionId: mortgage.transactionId,
        mortgageeName: mortgage.mortgageeName,
        mortgageAmount: mortgage.mortgageAmount
      },
      req
    });

    res.status(201).json(serialize(mortgage));

  } catch (err) {
    console.error('Register mortgage error:', err);
    next(err);
  }
};

// Register Court Injunction
exports.registerCourtInjunction = async (req, res, next) => {
  try {
    const {
      transaction_id,
      parcel_id,
      court_name,
      case_number,
      injunction_date,
      issued_by,
      description
    } = req.body;

    if (!transaction_id || !parcel_id || !court_name || !case_number) {
      throw new ValidationError('Transaction ID, Parcel ID, Court Name, and Case Number are required');
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transaction_id },
      select: { status: true }
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (!['INITIATED', 'IN_PROCESS'].includes(transaction.status)) {
      throw new ValidationError(`Cannot register court injunction on transaction with status: ${transaction.status}`);
    }

    const injunction = await prisma.courtInjunction.create({
      data: {
        parcelId: parcel_id,
        transactionId: transaction_id,
        courtName: court_name,
        caseNumber: case_number,
        injunctionDate: injunction_date ? new Date(injunction_date) : new Date(),
        issuedBy: issued_by || null,
        description: description || null,
        status: 'ACTIVE'
      }
    }).catch(err => {
      console.error('Error registering court injunction:', err);
      throw handlePrismaError(err);
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'INJUNCTION_REGISTERED',
      entityType: 'COURT_INJUNCTION',
      entityId: injunction.id,
      newValue: {
        parcelId: injunction.parcelId,
        transactionId: injunction.transactionId,
        courtName: injunction.courtName,
        caseNumber: injunction.caseNumber
      },
      req
    });

    res.status(201).json(serialize(injunction));

  } catch (err) {
    console.error('Register court injunction error:', err);
    next(err);
  }
};

// Register General Restriction/Responsibility
exports.registerRestriction = async (req, res, next) => {
  try {
    const {
      transaction_id,
      parcel_id,
      restriction_type,
      description,
      imposed_by,
      imposed_date
    } = req.body;

    if (!transaction_id || !parcel_id || !restriction_type || !description) {
      throw new ValidationError('Transaction ID, Parcel ID, Restriction Type, and Description are required');
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transaction_id },
      select: { status: true }
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (!['INITIATED', 'IN_PROCESS'].includes(transaction.status)) {
      throw new ValidationError(`Cannot register restriction on transaction with status: ${transaction.status}`);
    }

    const restriction = await prisma.generalRestriction.create({
      data: {
        parcelId: parcel_id,
        transactionId: transaction_id,
        restrictionType: restriction_type,
        description,
        imposedBy: imposed_by || null,
        imposedDate: imposed_date ? new Date(imposed_date) : new Date(),
        status: 'ACTIVE'
      }
    }).catch(err => {
      console.error('Error registering restriction:', err);
      throw handlePrismaError(err);
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'RESTRICTION_REGISTERED',
      entityType: 'GENERAL_RESTRICTION',
      entityId: restriction.id,
      newValue: {
        parcelId: restriction.parcelId,
        transactionId: restriction.transactionId,
        restrictionType: restriction.restrictionType
      },
      req
    });

    res.status(201).json(serialize(restriction));

  } catch (err) {
    console.error('Register restriction error:', err);
    next(err);
  }
};

// Finish transaction (mark as ready for approval)
exports.finishTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      select: { status: true, transactionType: true, parcelId: true }
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (transaction.status !== 'IN_PROCESS') {
      throw new ValidationError(`Cannot finish transaction with status: ${transaction.status}. Must be IN_PROCESS.`);
    }

    // Verify at least one right is registered for registration transactions
    if (transaction.transactionType.includes('REGISTRATION_OF')) {
      const rightsCount = await prisma.right.count({
        where: {
          transactionId: id,
          status: 'ACTIVE'
        }
      });

      if (rightsCount === 0) {
        throw new ValidationError('At least one right must be registered before finishing the transaction');
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { id },
        data: {
          status: 'READY_FOR_APPROVAL',
          readyForApprovalAt: new Date()
        },
        include: {
          application: true,
          parcel: true,
          rights: {
            include: {
              holder: true
            }
          }
        }
      });

      await tx.transactionHistory.create({
        data: {
          transactionId: id,
          fromStatus: 'IN_PROCESS',
          toStatus: 'READY_FOR_APPROVAL',
          changedBy: req.user.id,
          reason: 'Registration completed by RO'
        }
      });

      return updated;
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'TRANSACTION_FINISHED',
      entityType: 'TRANSACTION',
      entityId: id,
      previousValue: { status: 'IN_PROCESS' },
      newValue: { status: 'READY_FOR_APPROVAL' },
      req
    });

    res.json(serialize(result));

  } catch (err) {
    console.error('Finish transaction error:', err);
    next(err);
  }
};

// Get all transactions for Registration Officer view
exports.getTransactionsForRO = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 100 } = req.query;

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

    const where = {};

    // Filter by status
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      if (statuses.length > 1) {
        where.status = { in: statuses };
      } else {
        where.status = statuses[0];
      }
    } else {
      // Default: show transactions that RO can work on
      where.status = { in: ['CREATED', 'INITIATED', 'IN_PROCESS', 'READY_FOR_APPROVAL', 'APPROVED'] };
    }

    // Search filter
    if (search) {
      where.OR = [
        { transactionNumber: { contains: search, mode: 'insensitive' } },
        { application: { applicationNumber: { contains: search, mode: 'insensitive' } } },
        { parcel: { parcelCode: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [total, transactions] = await Promise.all([
      prisma.transaction.count({ where }).catch(err => {
        console.error('Error counting transactions:', err);
        throw handlePrismaError(err);
      }),
      prisma.transaction.findMany({
        where,
        include: {
          application: {
            select: {
              id: true,
              applicationNumber: true,
              applicationType: true,
              applicantName: true,
              status: true
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
          assignedUser: {
            select: {
              id: true,
              fullName: true,
              username: true
            }
          },
          _count: {
            select: {
              rights: true,
              mortgages: true,
              courtInjunctions: true,
              generalRestrictions: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }).catch(err => {
        console.error('Error fetching transactions:', err);
        throw handlePrismaError(err);
      })
    ]);

    res.json({
      data: serialize(transactions),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (err) {
    console.error('Get transactions for RO error:', err);
    next(err);
  }
};

// ============================================
// HOLDER/PARTY MANAGEMENT
// ============================================

/**
 * Register Natural Party (Natural Person)
 * A natural person is an authorized person who has a right to use land
 */
exports.registerNaturalParty = async (req, res, next) => {
  try {
    const {
      parcel_id,
      first_name,
      father_name,
      grandfather_name,
      mother_name,
      sex,
      date_of_birth,
      birth_place,
      marital_status,
      national_id,
      personal_id_type,
      phone,
      email,
      address,
      is_under_tutorship,
      tutor_name,
      tutor_first_name,
      tutor_father_name,
      tutor_grandfather_name
    } = req.body;

    // Validate required fields
    if (!parcel_id || !first_name || !father_name) {
      throw new ValidationError('Parcel ID, First Name, and Father Name are required');
    }

    // Verify parcel exists
    const parcel = await prisma.parcel.findUnique({
      where: { id: parcel_id }
    });

    if (!parcel) {
      throw new NotFoundError('Parcel not found');
    }

    const party = await prisma.party.create({
      data: {
        parcelId: parcel_id,
        partyType: 'NATURAL',
        firstName: first_name,
        fatherName: father_name,
        grandfatherName: grandfather_name || null,
        sex: sex || null,
        dateOfBirth: date_of_birth ? new Date(date_of_birth) : null,
        nationalId: national_id || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        isUnderTutorship: is_under_tutorship || false,
        tutorName: is_under_tutorship ? (tutor_name || `${tutor_first_name} ${tutor_father_name} ${tutor_grandfather_name}`.trim()) : null
      }
    }).catch(err => {
      console.error('Error registering natural party:', err);
      throw handlePrismaError(err);
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'PARTY_REGISTERED',
      entityType: 'PARTY',
      entityId: party.id,
      newValue: {
        partyType: party.partyType,
        parcelId: party.parcelId,
        firstName: party.firstName,
        fatherName: party.fatherName,
        nationalId: party.nationalId
      },
      req
    });

    res.status(201).json(serialize(party));

  } catch (err) {
    console.error('Register natural party error:', err);
    next(err);
  }
};

/**
 * Register Legal Party (Legal Person/Organization)
 * Organizations such as company, association, condominium, public body, or embassy
 */
exports.registerLegalParty = async (req, res, next) => {
  try {
    const {
      parcel_id,
      organization_name,
      organization_type,
      registration_number,
      tin_number,
      phone,
      email,
      address,
      // Legal representative information
      representative_first_name,
      representative_father_name,
      representative_grandfather_name,
      representative_sex,
      representative_personal_id_type,
      representative_personal_id
    } = req.body;

    // Validate required fields
    if (!parcel_id || !organization_name || !organization_type) {
      throw new ValidationError('Parcel ID, Organization Name, and Organization Type are required');
    }

    // Verify parcel exists
    const parcel = await prisma.parcel.findUnique({
      where: { id: parcel_id }
    });

    if (!parcel) {
      throw new NotFoundError('Parcel not found');
    }

    const party = await prisma.party.create({
      data: {
        parcelId: parcel_id,
        partyType: 'LEGAL',
        organizationName: organization_name,
        organizationType: organization_type,
        registrationNumber: registration_number || tin_number || null,
        phone: phone || null,
        email: email || null,
        address: address || null
      }
    }).catch(err => {
      console.error('Error registering legal party:', err);
      throw handlePrismaError(err);
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'PARTY_REGISTERED',
      entityType: 'PARTY',
      entityId: party.id,
      newValue: {
        partyType: party.partyType,
        parcelId: party.parcelId,
        organizationName: party.organizationName,
        organizationType: party.organizationType,
        registrationNumber: party.registrationNumber
      },
      req
    });

    res.status(201).json(serialize(party));

  } catch (err) {
    console.error('Register legal party error:', err);
    next(err);
  }
};

/**
 * Register Group Party
 * Authorized users (such as family) requesting landholding through a representative
 */
exports.registerGroupParty = async (req, res, next) => {
  try {
    const {
      parcel_id,
      group_party_name,
      group_party_type,
      phone,
      email,
      address,
      is_under_tutorship,
      tutor_name,
      members // Array of group members
    } = req.body;

    // Validate required fields
    if (!parcel_id || !group_party_name) {
      throw new ValidationError('Parcel ID and Group Party Name are required');
    }

    // Verify parcel exists
    const parcel = await prisma.parcel.findUnique({
      where: { id: parcel_id }
    });

    if (!parcel) {
      throw new NotFoundError('Parcel not found');
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create group party
      const party = await tx.party.create({
        data: {
          parcelId: parcel_id,
          partyType: 'GROUP',
          organizationName: group_party_name, // Using organizationName for group name
          organizationType: group_party_type || 'Family Group',
          phone: phone || null,
          email: email || null,
          address: address || null,
          isUnderTutorship: is_under_tutorship || false,
          tutorName: is_under_tutorship ? tutor_name : null
        }
      });

      // Create group members if provided
      if (members && Array.isArray(members) && members.length > 0) {
        const memberData = members.map(member => ({
          groupPartyId: party.id,
          firstName: member.first_name,
          fatherName: member.father_name || null,
          grandfatherName: member.grandfather_name || null,
          sex: member.sex || null,
          nationalId: member.national_id || null,
          sharePercentage: member.share_percentage ? parseFloat(member.share_percentage) : null,
          phone: member.phone || null
        }));

        await tx.groupPartyMember.createMany({
          data: memberData
        });
      }

      // Return party with members
      return await tx.party.findUnique({
        where: { id: party.id },
        include: {
          groupMembers: true
        }
      });
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'PARTY_REGISTERED',
      entityType: 'PARTY',
      entityId: result.id,
      newValue: {
        partyType: result.partyType,
        parcelId: result.parcelId,
        organizationName: result.organizationName,
        membersCount: result.groupMembers ? result.groupMembers.length : 0
      },
      req
    });

    res.status(201).json(serialize(result));

  } catch (err) {
    console.error('Register group party error:', err);
    next(err);
  }
};

/**
 * Add member to existing Group Party
 */
exports.addGroupMember = async (req, res, next) => {
  try {
    const { groupPartyId } = req.params;
    const {
      first_name,
      father_name,
      grandfather_name,
      sex,
      national_id,
      share_percentage,
      phone
    } = req.body;

    // Validate required fields
    if (!first_name || !father_name) {
      throw new ValidationError('First Name and Father Name are required');
    }

    // Verify group party exists
    const groupParty = await prisma.party.findUnique({
      where: { id: groupPartyId },
      select: { partyType: true }
    });

    if (!groupParty) {
      throw new NotFoundError('Group party not found');
    }

    if (groupParty.partyType !== 'GROUP') {
      throw new ValidationError('Party is not a group type');
    }

    const member = await prisma.groupPartyMember.create({
      data: {
        groupPartyId,
        firstName: first_name,
        fatherName: father_name,
        grandfatherName: grandfather_name || null,
        sex: sex || null,
        nationalId: national_id || null,
        sharePercentage: share_percentage ? parseFloat(share_percentage) : null,
        phone: phone || null
      }
    }).catch(err => {
      console.error('Error adding group member:', err);
      throw handlePrismaError(err);
    });

    res.status(201).json(serialize(member));

  } catch (err) {
    console.error('Add group member error:', err);
    next(err);
  }
};

/**
 * Update Party (Natural, Legal, or Group)
 */
exports.updateParty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = {};

    // Check if party exists and get its type
    const existingParty = await prisma.party.findUnique({
      where: { id },
      include: {
        rights: {
          include: {
            transaction: {
              select: { status: true }
            }
          }
        }
      }
    });

    if (!existingParty) {
      throw new NotFoundError('Party not found');
    }

    // Check if any associated transaction is finished
    const hasFinishedTransaction = existingParty.rights.some(
      right => right.transaction && ['READY_FOR_APPROVAL', 'APPROVED', 'DELIVERED'].includes(right.transaction.status)
    );

    if (hasFinishedTransaction) {
      throw new ValidationError('Cannot update party associated with finished transaction');
    }

    // Build update data based on party type
    if (existingParty.partyType === 'NATURAL') {
      const {
        first_name,
        father_name,
        grandfather_name,
        sex,
        date_of_birth,
        national_id,
        phone,
        email,
        address,
        is_under_tutorship,
        tutor_name
      } = req.body;

      if (first_name !== undefined) updateData.firstName = first_name;
      if (father_name !== undefined) updateData.fatherName = father_name;
      if (grandfather_name !== undefined) updateData.grandfatherName = grandfather_name;
      if (sex !== undefined) updateData.sex = sex;
      if (date_of_birth !== undefined) updateData.dateOfBirth = date_of_birth ? new Date(date_of_birth) : null;
      if (national_id !== undefined) updateData.nationalId = national_id;
      if (phone !== undefined) updateData.phone = phone;
      if (email !== undefined) updateData.email = email;
      if (address !== undefined) updateData.address = address;
      if (is_under_tutorship !== undefined) updateData.isUnderTutorship = is_under_tutorship;
      if (tutor_name !== undefined) updateData.tutorName = tutor_name;

    } else if (existingParty.partyType === 'LEGAL') {
      const {
        organization_name,
        organization_type,
        registration_number,
        phone,
        email,
        address
      } = req.body;

      if (organization_name !== undefined) updateData.organizationName = organization_name;
      if (organization_type !== undefined) updateData.organizationType = organization_type;
      if (registration_number !== undefined) updateData.registrationNumber = registration_number;
      if (phone !== undefined) updateData.phone = phone;
      if (email !== undefined) updateData.email = email;
      if (address !== undefined) updateData.address = address;

    } else if (existingParty.partyType === 'GROUP') {
      const {
        group_party_name,
        group_party_type,
        phone,
        email,
        address,
        is_under_tutorship,
        tutor_name
      } = req.body;

      if (group_party_name !== undefined) updateData.organizationName = group_party_name;
      if (group_party_type !== undefined) updateData.organizationType = group_party_type;
      if (phone !== undefined) updateData.phone = phone;
      if (email !== undefined) updateData.email = email;
      if (address !== undefined) updateData.address = address;
      if (is_under_tutorship !== undefined) updateData.isUnderTutorship = is_under_tutorship;
      if (tutor_name !== undefined) updateData.tutorName = tutor_name;
    }

    const updatedParty = await prisma.party.update({
      where: { id },
      data: updateData,
      include: {
        groupMembers: true
      }
    }).catch(err => {
      console.error('Error updating party:', err);
      throw handlePrismaError(err);
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'PARTY_UPDATED',
      entityType: 'PARTY',
      entityId: id,
      previousValue: {
        partyType: existingParty.partyType,
        parcelId: existingParty.parcelId,
        firstName: existingParty.firstName,
        organizationName: existingParty.organizationName
      },
      newValue: {
        partyType: updatedParty.partyType,
        parcelId: updatedParty.parcelId,
        firstName: updatedParty.firstName,
        organizationName: updatedParty.organizationName
      },
      req
    });

    res.json(serialize(updatedParty));

  } catch (err) {
    console.error('Update party error:', err);
    next(err);
  }
};

/**
 * Update Group Member
 */
exports.updateGroupMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      father_name,
      grandfather_name,
      sex,
      national_id,
      share_percentage,
      phone
    } = req.body;

    const existingMember = await prisma.groupPartyMember.findUnique({
      where: { id }
    });

    if (!existingMember) {
      throw new NotFoundError('Group member not found');
    }

    const updateData = {};
    if (first_name !== undefined) updateData.firstName = first_name;
    if (father_name !== undefined) updateData.fatherName = father_name;
    if (grandfather_name !== undefined) updateData.grandfatherName = grandfather_name;
    if (sex !== undefined) updateData.sex = sex;
    if (national_id !== undefined) updateData.nationalId = national_id;
    if (share_percentage !== undefined) updateData.sharePercentage = share_percentage ? parseFloat(share_percentage) : null;
    if (phone !== undefined) updateData.phone = phone;

    const updatedMember = await prisma.groupPartyMember.update({
      where: { id },
      data: updateData
    }).catch(err => {
      console.error('Error updating group member:', err);
      throw handlePrismaError(err);
    });

    res.json(serialize(updatedMember));

  } catch (err) {
    console.error('Update group member error:', err);
    next(err);
  }
};

/**
 * Delete Party
 * Can only delete if no associated transaction is finished
 */
exports.deleteParty = async (req, res, next) => {
  try {
    const { id } = req.params;

    const party = await prisma.party.findUnique({
      where: { id },
      include: {
        rights: {
          include: {
            transaction: {
              select: { status: true }
            }
          }
        }
      }
    });

    if (!party) {
      throw new NotFoundError('Party not found');
    }

    // Check if any associated transaction is finished
    const hasFinishedTransaction = party.rights.some(
      right => right.transaction && ['READY_FOR_APPROVAL', 'APPROVED', 'DELIVERED'].includes(right.transaction.status)
    );

    if (hasFinishedTransaction) {
      throw new ValidationError('Cannot delete party associated with finished transaction');
    }

    await prisma.party.delete({
      where: { id }
    }).catch(err => {
      console.error('Error deleting party:', err);
      throw handlePrismaError(err);
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'PARTY_DELETED',
      entityType: 'PARTY',
      entityId: id,
      previousValue: {
        partyType: party.partyType,
        parcelId: party.parcelId,
        firstName: party.firstName,
        organizationName: party.organizationName
      },
      req
    });

    res.json({ message: 'Party deleted successfully' });

  } catch (err) {
    console.error('Delete party error:', err);
    next(err);
  }
};

/**
 * Delete Group Member
 */
exports.deleteGroupMember = async (req, res, next) => {
  try {
    const { id } = req.params;

    const member = await prisma.groupPartyMember.findUnique({
      where: { id }
    });

    if (!member) {
      throw new NotFoundError('Group member not found');
    }

    await prisma.groupPartyMember.delete({
      where: { id }
    }).catch(err => {
      console.error('Error deleting group member:', err);
      throw handlePrismaError(err);
    });

    res.json({ message: 'Group member deleted successfully' });

  } catch (err) {
    console.error('Delete group member error:', err);
    next(err);
  }
};

/**
 * Get all parties for a parcel
 */
exports.getPartiesByParcel = async (req, res, next) => {
  try {
    const { parcelId } = req.params;

    const parties = await prisma.party.findMany({
      where: { parcelId },
      include: {
        groupMembers: true,
        rights: {
          select: {
            id: true,
            rightType: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }).catch(err => {
      console.error('Error getting parties:', err);
      throw handlePrismaError(err);
    });

    res.json(serialize(parties));

  } catch (err) {
    console.error('Get parties error:', err);
    next(err);
  }
};

/**
 * Get single party with all details
 */
exports.getPartyById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const party = await prisma.party.findUnique({
      where: { id },
      include: {
        groupMembers: true,
        parcel: {
          select: {
            id: true,
            parcelCode: true,
            areaSqm: true,
            landUse: true
          }
        },
        rights: {
          include: {
            transaction: {
              select: {
                id: true,
                transactionNumber: true,
                status: true
              }
            }
          }
        }
      }
    }).catch(err => {
      console.error('Error getting party:', err);
      throw handlePrismaError(err);
    });

    if (!party) {
      throw new NotFoundError('Party not found');
    }

    res.json(serialize(party));

  } catch (err) {
    console.error('Get party error:', err);
    next(err);
  }
};

/**
 * Search parties (for holder selection during right registration)
 */
exports.searchParties = async (req, res, next) => {
  try {
    const { search, parcel_id, party_type } = req.query;

    const where = {};

    if (parcel_id) {
      where.parcelId = parcel_id;
    }

    if (party_type) {
      where.partyType = party_type;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { fatherName: { contains: search, mode: 'insensitive' } },
        { grandfatherName: { contains: search, mode: 'insensitive' } },
        { organizationName: { contains: search, mode: 'insensitive' } },
        { nationalId: { contains: search, mode: 'insensitive' } },
        { registrationNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    const parties = await prisma.party.findMany({
      where,
      include: {
        groupMembers: true,
        parcel: {
          select: {
            parcelCode: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit search results
    }).catch(err => {
      console.error('Error searching parties:', err);
      throw handlePrismaError(err);
    });

    res.json(serialize(parties));

  } catch (err) {
    console.error('Search parties error:', err);
    next(err);
  }
};

module.exports = exports;
