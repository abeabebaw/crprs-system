const prisma = require('../config/prisma');
const { NotFoundError, ConflictError, ValidationError } = require('../utils/errors');

exports.getAll = async (req, res, next) => {
  try {
    const { search, is_registered, city, limit = 100 } = req.query;
    
    const where = {};
    
    if (search) {
      where.OR = [
        { parcelCode: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { region: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (is_registered !== undefined) {
      where.isRegistered = is_registered === 'true';
    }
    
    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    const parcels = await prisma.parcel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    res.json(parcels);
  } catch (err) {
    console.error('Get parcels error:', err);
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const parcel = await prisma.parcel.findUnique({
      where: { id: req.params.id },
      include: {
        applications: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        rights: {
          include: {
            holder: true
          }
        }
      }
    });

    if (!parcel) {
      throw new NotFoundError('Parcel not found');
    }

    res.json(parcel);
  } catch (err) {
    console.error('Get parcel error:', err);
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { 
      parcel_code, 
      area_sqm, 
      land_use, 
      region, 
      city, 
      sub_city, 
      woreda, 
      geometry_wkt,
      is_registered 
    } = req.body;

    if (!parcel_code) {
      throw new ValidationError('Parcel code is required');
    }

    // Check if parcel code already exists
    const exists = await prisma.parcel.findUnique({
      where: { parcelCode: parcel_code }
    });

    if (exists) {
      throw new ConflictError(`Parcel with code ${parcel_code} already exists`);
    }

    const parcel = await prisma.parcel.create({
      data: {
        parcelCode: parcel_code,
        areaSqm: area_sqm ? parseFloat(area_sqm) : null,
        landUse: land_use || null,
        region: region || null,
        city: city || null,
        subCity: sub_city || null,
        woreda: woreda || null,
        geometryWkt: geometry_wkt || null,
        isRegistered: is_registered || false
      }
    });

    res.status(201).json(parcel);
  } catch (err) {
    console.error('Create parcel error:', err);
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { 
      parcel_code, 
      area_sqm, 
      land_use, 
      region, 
      city, 
      sub_city, 
      woreda, 
      geometry_wkt,
      is_registered 
    } = req.body;

    // Check if parcel exists
    const existing = await prisma.parcel.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      throw new NotFoundError('Parcel not found');
    }

    // Build update data (only include provided fields)
    const updateData = {};
    if (parcel_code !== undefined) updateData.parcelCode = parcel_code;
    if (area_sqm !== undefined) updateData.areaSqm = parseFloat(area_sqm);
    if (land_use !== undefined) updateData.landUse = land_use;
    if (region !== undefined) updateData.region = region;
    if (city !== undefined) updateData.city = city;
    if (sub_city !== undefined) updateData.subCity = sub_city;
    if (woreda !== undefined) updateData.woreda = woreda;
    if (geometry_wkt !== undefined) updateData.geometryWkt = geometry_wkt;
    if (is_registered !== undefined) updateData.isRegistered = is_registered;

    const parcel = await prisma.parcel.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json(parcel);
  } catch (err) {
    console.error('Update parcel error:', err);
    next(err);
  }
};

exports.searchByCode = async (req, res, next) => {
  try {
    const parcels = await prisma.parcel.findMany({
      where: {
        parcelCode: {
          contains: req.params.code,
          mode: 'insensitive'
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    res.json(parcels);
  } catch (err) {
    console.error('Search parcel error:', err);
    next(err);
  }
};
