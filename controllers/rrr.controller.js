const db = require('../config/db');
const { ValidationError } = require('../utils/errors');

const RIGHT_TYPES = new Set([
  'LEASEHOLD', 'OLD_POSSESSION', 'SUB_LEASE', 'URBAN_FARM',
  'GOVERNMENT_OWNED', 'CONDOMINIUM', 'WITHOUT_USE_RIGHT'
]);

exports.getRightsByParcel = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT r.*, p.first_name, p.father_name, p.grandfather_name, p.organization_name
      FROM rights r LEFT JOIN parties p ON r.holder_party_id = p.id
      WHERE r.parcel_id=$1 ORDER BY r.created_at`, [req.params.parcelId]);
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.registerRight = async (req, res, next) => {
  try {
    const { parcel_id, transaction_id, right_type, holder_party_id, acquisition_type,
            acquisition_date, start_date, end_date, lease_period_years, lease_start_date,
            lease_end_date, ground_rent, description } = req.body;
    if (!RIGHT_TYPES.has(right_type)) {
      throw new ValidationError(`Invalid right_type. Expected one of: ${[...RIGHT_TYPES].join(', ')}`);
    }
    const result = await db.query(`
      INSERT INTO rights (parcel_id, transaction_id, right_type, holder_party_id, acquisition_type,
        acquisition_date, start_date, end_date, lease_period_years, lease_start_date,
        lease_end_date, ground_rent, description)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [parcel_id, transaction_id, right_type, holder_party_id, acquisition_type, acquisition_date,
       start_date, end_date, lease_period_years, lease_start_date, lease_end_date, ground_rent, description]);
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.modifyRight = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { right_type, acquisition_type, start_date, end_date, lease_period_years, ground_rent, description } = req.body;
    if (right_type !== undefined && right_type !== null && !RIGHT_TYPES.has(right_type)) {
      throw new ValidationError(`Invalid right_type. Expected one of: ${[...RIGHT_TYPES].join(', ')}`);
    }
    const result = await db.query(`
      UPDATE rights SET
        right_type = COALESCE($1, right_type),
        acquisition_type = COALESCE($2, acquisition_type),
        start_date = COALESCE($3, start_date),
        end_date = COALESCE($4, end_date),
        lease_period_years = COALESCE($5, lease_period_years),
        ground_rent = COALESCE($6, ground_rent),
        description = COALESCE($7, description),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 RETURNING *`,
      [right_type || null, acquisition_type || null, start_date || null, end_date || null,
       lease_period_years || null, ground_rent || null, description || null, id]);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.deleteRight = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM rights WHERE id=$1', [id]);
    res.json({ message: 'Right deleted successfully' });
  } catch (err) { next(err); }
};