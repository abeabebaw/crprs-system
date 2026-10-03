const db = require('../config/db');

exports.getTypes = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM lookup_types ORDER BY type_name');
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.getValues = async (req, res, next) => {
  try {
    const { typeId } = req.params;
    const result = await db.query('SELECT * FROM lookup_values WHERE lookup_type_id=$1 ORDER BY value', [typeId]);
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.addValue = async (req, res, next) => {
  try {
    const { lookup_type_id, code, value } = req.body;
    const result = await db.query(
      'INSERT INTO lookup_values (lookup_type_id, code, value) VALUES ($1,$2,$3) RETURNING *',
      [lookup_type_id, code, value]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.updateValue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, value, is_active } = req.body;
    const result = await db.query(
      'UPDATE lookup_values SET code=$1, value=$2, is_active=$3 WHERE id=$4 RETURNING *',
      [code, value, is_active, id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.deleteValue = async (req, res, next) => {
  try {
    await db.query('DELETE FROM lookup_values WHERE id=$1', [req.params.id]);
    res.json({ message: 'Lookup value deleted' });
  } catch (err) { next(err); }
};

// Required Documents
exports.getRequiredDocuments = async (req, res, next) => {
  try {
    const { applicationType } = req.query;
    let query = 'SELECT * FROM required_documents';
    const params = [];
    if (applicationType) { query += ' WHERE application_type=$1'; params.push(applicationType); }
    query += ' ORDER BY document_type';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.addRequiredDocument = async (req, res, next) => {
  try {
    const { application_type, document_type, document_category, is_mandatory } = req.body;
    const result = await db.query(
      'INSERT INTO required_documents (application_type, document_type, document_category, is_mandatory) VALUES ($1,$2,$3,$4) RETURNING *',
      [application_type, document_type, document_category, is_mandatory]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

// Business Rules
exports.getBusinessRules = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM business_rules WHERE is_active=TRUE ORDER BY rule_name');
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.addBusinessRule = async (req, res, next) => {
  try {
    const { rule_name, land_use, min_parcel_size_sqm, max_parcel_size_sqm, min_lease_period_years, max_lease_period_years } = req.body;
    const result = await db.query(
      `INSERT INTO business_rules (rule_name, land_use, min_parcel_size_sqm, max_parcel_size_sqm, min_lease_period_years, max_lease_period_years)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [rule_name, land_use, min_parcel_size_sqm, max_parcel_size_sqm, min_lease_period_years, max_lease_period_years]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};