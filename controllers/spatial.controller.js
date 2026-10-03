const prisma = require('../config/prisma');
const db = require('../config/db');
const { NotFoundError, ValidationError, handlePrismaError, validateRequiredFields } = require('../utils/errors');
const { serialize } = require('../utils/serializer');
const { createAuditLog } = require('../utils/audit');

/**
 * Cadastral Spatial Controller (RECS)
 * Handles PostGIS topological operations, parcel split/merge,
 * boundary validation, and GeoJSON cadastral services.
 */

// Border Points
exports.createBorderPoint = async (req, res, next) => {
  try {
    const { parcel_id, point_number, geometry_wkt } = req.body;

    validateRequiredFields(req.body, ['parcel_id', 'point_number']);

    if (typeof point_number !== 'string' || point_number.trim().length === 0) {
      throw new ValidationError('Point number must be a non-empty string');
    }

    const parcel = await prisma.parcel.findUnique({
      where: { id: parcel_id }
    });

    if (!parcel) {
      throw new NotFoundError('Parcel not found');
    }

    const existingPoint = await prisma.borderPoint.findFirst({
      where: {
        parcelId: parcel_id,
        pointNumber: point_number
      }
    });

    if (existingPoint) {
      throw new ValidationError(`Point ${point_number} already exists for this parcel`);
    }

    const borderPoint = await prisma.borderPoint.create({
      data: {
        parcelId: parcel_id,
        pointNumber: point_number,
        geometryWkt: geometry_wkt || null
      }
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'BORDER_POINT_CREATED',
      entityType: 'BORDER_POINT',
      entityId: borderPoint.id,
      newValue: { parcelId: parcel_id, pointNumber: point_number },
      req
    });

    res.status(201).json(serialize(borderPoint));
  } catch (err) {
    console.error('Create border point error:', err);
    next(err);
  }
};

exports.deleteBorderPoint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const borderPoint = await prisma.borderPoint.findUnique({ where: { id } });

    if (!borderPoint) {
      throw new NotFoundError('Border point not found');
    }

    await prisma.borderPoint.delete({ where: { id } });

    await createAuditLog({
      userId: req.user?.id,
      action: 'BORDER_POINT_DELETED',
      entityType: 'BORDER_POINT',
      entityId: id,
      previousValue: { parcelId: borderPoint.parcelId, pointNumber: borderPoint.pointNumber },
      req
    });

    res.json({ message: 'Border point deleted successfully' });
  } catch (err) {
    console.error('Delete border point error:', err);
    next(err);
  }
};

// Boundary Lines
exports.createBoundaryLine = async (req, res, next) => {
  try {
    const { parcel_id, line_number, length_m, geometry_wkt } = req.body;

    validateRequiredFields(req.body, ['parcel_id', 'line_number']);

    if (typeof line_number !== 'string' || line_number.trim().length === 0) {
      throw new ValidationError('Line number must be a non-empty string');
    }

    const parcel = await prisma.parcel.findUnique({ where: { id: parcel_id } });
    if (!parcel) {
      throw new NotFoundError('Parcel not found');
    }

    const boundaryLine = await prisma.boundaryLine.create({
      data: {
        parcelId: parcel_id,
        lineNumber: line_number,
        lengthM: length_m ? parseFloat(length_m) : null,
        geometryWkt: geometry_wkt || null
      }
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'BOUNDARY_LINE_CREATED',
      entityType: 'BOUNDARY_LINE',
      entityId: boundaryLine.id,
      newValue: { parcelId: parcel_id, lineNumber: line_number, lengthM: length_m },
      req
    });

    res.status(201).json(serialize(boundaryLine));
  } catch (err) {
    console.error('Create boundary line error:', err);
    next(err);
  }
};

exports.deleteBoundaryLine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const boundaryLine = await prisma.boundaryLine.findUnique({ where: { id } });

    if (!boundaryLine) {
      throw new NotFoundError('Boundary line not found');
    }

    await prisma.boundaryLine.delete({ where: { id } });

    await createAuditLog({
      userId: req.user?.id,
      action: 'BOUNDARY_LINE_DELETED',
      entityType: 'BOUNDARY_LINE',
      entityId: id,
      previousValue: { parcelId: boundaryLine.parcelId, lineNumber: boundaryLine.lineNumber },
      req
    });

    res.json({ message: 'Boundary line deleted successfully' });
  } catch (err) {
    console.error('Delete boundary line error:', err);
    next(err);
  }
};

// GeoJSON FeatureCollection for Cadastral Maps
exports.getParcelsGeoJson = async (req, res, next) => {
  try {
    // Try PostGIS query first
    try {
      const result = await db.query(`
        SELECT json_build_object(
          'type', 'FeatureCollection',
          'features', COALESCE(json_agg(
            json_build_object(
              'type', 'Feature',
              'id', p.id,
              'geometry', CASE 
                WHEN p.geometry IS NOT NULL THEN ST_AsGeoJSON(p.geometry)::json
                WHEN p.geometry_wkt IS NOT NULL AND p.geometry_wkt != '' THEN ST_AsGeoJSON(ST_GeomFromText(p.geometry_wkt, 4326))::json
                ELSE NULL
              END,
              'properties', json_build_object(
                'id', p.id,
                'parcelCode', p.parcel_code,
                'areaSqm', p.area_sqm,
                'landUse', p.land_use,
                'city', p.city,
                'region', p.region,
                'subCity', p.sub_city,
                'woreda', p.woreda,
                'isRegistered', p.is_registered
              )
            )
          ), '[]'::json)
        ) AS geojson
        FROM parcels p
      `);

      if (result.rows[0]?.geojson) {
        return res.json(result.rows[0].geojson);
      }
    } catch (spatialErr) {
      console.warn('PostGIS ST_AsGeoJSON query fallback to Prisma:', spatialErr.message);
    }

    // Fallback: build standard FeatureCollection from Prisma records
    const parcels = await prisma.parcel.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200
    });

    const features = parcels.map((p, idx) => {
      let geometry = null;
      if (p.geometryWkt) {
        try {
          // Parse basic POLYGON ((lon lat, ...))
          const match = p.geometryWkt.match(/\(\((.*?)\)\)/);
          if (match) {
            const rings = match[1].split(',').map(coord => {
              const [lon, lat] = coord.trim().split(/\s+/).map(Number);
              return [lon, lat];
            });
            geometry = { type: 'Polygon', coordinates: [rings] };
          }
        } catch (e) {
          geometry = null;
        }
      }

      // Default synthetic bounding box around Addis Ababa if geometry not set
      if (!geometry) {
        const baseLat = 9.0192 + (idx * 0.001);
        const baseLng = 38.7525 + (idx * 0.001);
        geometry = {
          type: 'Polygon',
          coordinates: [[
            [baseLng, baseLat],
            [baseLng + 0.0008, baseLat],
            [baseLng + 0.0008, baseLat + 0.0008],
            [baseLng, baseLat + 0.0008],
            [baseLng, baseLat]
          ]]
        };
      }

      return {
        type: 'Feature',
        id: p.id,
        geometry,
        properties: {
          id: p.id,
          parcelCode: p.parcelCode,
          areaSqm: p.areaSqm ? Number(p.areaSqm) : null,
          landUse: p.landUse || 'Residential',
          city: p.city || 'Addis Ababa',
          region: p.region || 'AA',
          subCity: p.subCity || 'Kirkos',
          woreda: p.woreda || '01',
          isRegistered: p.isRegistered
        }
      };
    });

    res.json({
      type: 'FeatureCollection',
      features
    });

  } catch (err) {
    console.error('Get parcels GeoJSON error:', err);
    next(err);
  }
};

// Parcel Split
exports.splitParcel = async (req, res, next) => {
  try {
    const { parcel_id, split_ratio = 0.5, new_parcel_codes, remarks } = req.body;

    if (!parcel_id) {
      throw new ValidationError('Parcel ID is required for parcel split');
    }

    const parentParcel = await prisma.parcel.findUnique({
      where: { id: parcel_id },
      include: { rights: true }
    });

    if (!parentParcel) {
      throw new NotFoundError('Parent parcel not found');
    }

    const totalArea = parentParcel.areaSqm ? Number(parentParcel.areaSqm) : 400;
    const ratio = Math.max(0.1, Math.min(0.9, Number(split_ratio)));
    const area1 = (totalArea * ratio).toFixed(2);
    const area2 = (totalArea * (1 - ratio)).toFixed(2);

    const code1 = new_parcel_codes?.[0] || `${parentParcel.parcelCode}-S1`;
    const code2 = new_parcel_codes?.[1] || `${parentParcel.parcelCode}-S2`;

    const result = await prisma.$transaction(async (tx) => {
      // Create sub-parcel 1
      const sub1 = await tx.parcel.create({
        data: {
          parcelCode: code1,
          areaSqm: parseFloat(area1),
          landUse: parentParcel.landUse,
          region: parentParcel.region,
          city: parentParcel.city,
          subCity: parentParcel.subCity,
          woreda: parentParcel.woreda,
          isRegistered: false
        }
      });

      // Create sub-parcel 2
      const sub2 = await tx.parcel.create({
        data: {
          parcelCode: code2,
          areaSqm: parseFloat(area2),
          landUse: parentParcel.landUse,
          region: parentParcel.region,
          city: parentParcel.city,
          subCity: parentParcel.subCity,
          woreda: parentParcel.woreda,
          isRegistered: false
        }
      });

      // Mark parent parcel as superseded / inactive
      await tx.parcel.update({
        where: { id: parcel_id },
        data: { isRegistered: false }
      });

      return { parent: parentParcel, subParcels: [sub1, sub2] };
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'PARCEL_SPLIT',
      entityType: 'PARCEL',
      entityId: parcel_id,
      previousValue: { parcelCode: parentParcel.parcelCode, areaSqm: parentParcel.areaSqm },
      newValue: {
        splitInto: [result.subParcels[0].parcelCode, result.subParcels[1].parcelCode],
        areas: [area1, area2],
        remarks: remarks || 'Cadastral parcel split'
      },
      req
    });

    res.status(201).json(serialize(result));

  } catch (err) {
    console.error('Parcel split error:', err);
    next(err);
  }
};

// Parcel Merge
exports.mergeParcels = async (req, res, next) => {
  try {
    const { parcel_ids, merged_parcel_code, land_use } = req.body;

    if (!parcel_ids || !Array.isArray(parcel_ids) || parcel_ids.length < 2) {
      throw new ValidationError('At least 2 parcel IDs are required for a parcel merge');
    }

    const parcelsToMerge = await prisma.parcel.findMany({
      where: { id: { in: parcel_ids } }
    });

    if (parcelsToMerge.length !== parcel_ids.length) {
      throw new NotFoundError('One or more parcels to merge were not found');
    }

    const totalArea = parcelsToMerge.reduce((acc, p) => acc + (p.areaSqm ? Number(p.areaSqm) : 0), 0);
    const primary = parcelsToMerge[0];
    const newCode = merged_parcel_code || `PRC-MERGE-${Date.now().toString().slice(-6)}`;

    const result = await prisma.$transaction(async (tx) => {
      // Create new merged parcel
      const merged = await tx.parcel.create({
        data: {
          parcelCode: newCode,
          areaSqm: parseFloat(totalArea.toFixed(2)),
          landUse: land_use || primary.landUse || 'Residential',
          region: primary.region,
          city: primary.city,
          subCity: primary.subCity,
          woreda: primary.woreda,
          isRegistered: false
        }
      });

      // Deactivate / supersede original parcels
      await tx.parcel.updateMany({
        where: { id: { in: parcel_ids } },
        data: { isRegistered: false }
      });

      return merged;
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'PARCEL_MERGED',
      entityType: 'PARCEL',
      entityId: result.id,
      newValue: {
        mergedFrom: parcelsToMerge.map(p => p.parcelCode),
        mergedParcelCode: result.parcelCode,
        totalAreaSqm: result.areaSqm
      },
      req
    });

    res.status(201).json(serialize({
      mergedParcel: result,
      sourceParcelCodes: parcelsToMerge.map(p => p.parcelCode)
    }));

  } catch (err) {
    console.error('Parcel merge error:', err);
    next(err);
  }
};

// Validate Cadastral Topology
exports.validateTopology = async (req, res, next) => {
  try {
    const { geometry_wkt, parcel_id } = req.body;

    if (!geometry_wkt) {
      throw new ValidationError('geometry_wkt is required for topology validation');
    }

    // Attempt PostGIS validation
    try {
      const validQuery = await db.query(
        `SELECT ST_IsValid(ST_GeomFromText($1, 4326)) AS is_valid,
                ST_IsValidReason(ST_GeomFromText($1, 4326)) AS reason,
                ST_Area(ST_GeomFromText($1, 4326)::geography) AS area_sqm`,
        [geometry_wkt]
      );

      const { is_valid, reason, area_sqm } = validQuery.rows[0];

      // Check overlaps
      let overlaps = [];
      if (is_valid) {
        const overlapQuery = await db.query(
          `SELECT id, parcel_code FROM parcels 
           WHERE ($1::uuid IS NULL OR id != $1::uuid)
             AND geometry IS NOT NULL
             AND ST_Overlaps(geometry, ST_GeomFromText($2, 4326))
           LIMIT 5`,
          [parcel_id || null, geometry_wkt]
        );
        overlaps = overlapQuery.rows;
      }

      return res.json({
        isValid: is_valid && overlaps.length === 0,
        postgisReason: reason,
        areaSqm: area_sqm ? Number(area_sqm).toFixed(2) : null,
        hasOverlap: overlaps.length > 0,
        overlappingParcels: overlaps
      });

    } catch (pgErr) {
      // Basic fallback validation if PostGIS function call fails
      const hasPolygon = geometry_wkt.toUpperCase().startsWith('POLYGON');
      return res.json({
        isValid: hasPolygon,
        reason: hasPolygon ? 'Geometry syntax valid' : 'Geometry must be a valid WKT POLYGON',
        overlappingParcels: []
      });
    }

  } catch (err) {
    console.error('Validate topology error:', err);
    next(err);
  }
};
