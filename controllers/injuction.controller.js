const db = require('../config/db');

exports.getByParcel = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM court_injunctions WHERE parcel_id=$1 ORDER BY created_at', [req.params.parcelId]);
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.register = async (req, res, next) => {
  try {
    const { parcel_id, transaction_id, court_name, case_number, injunction_date, issued_by, description } = req.body;
    const result = await db.query(`
      INSERT INTO court_injunctions (parcel_id, transaction_id, court_name, case_number, injunction_date, issued_by, description)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [parcel_id, transaction_id, court_name, case_number, injunction_date, issued_by, description]);
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.modify = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { court_name, case_number, injunction_date, issued_by, description } = req.body;
    const result = await db.query(`
      UPDATE court_injunctions SET court_name=$1, case_number=$2, injunction_date=$3, issued_by=$4, description=$5
      WHERE id=$6 RETURNING *`, [court_name, case_number, injunction_date, issued_by, description, id]);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.cancel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cancellation_reference } = req.body;
    const result = await db.query(`
      UPDATE court_injunctions SET status='CANCELLED', cancelled_at=CURRENT_TIMESTAMP, cancellation_reference=$1
      WHERE id=$2 RETURNING *`, [cancellation_reference, id]);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};