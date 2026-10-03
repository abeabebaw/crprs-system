const db = require('../config/db');
const { createAuditLog } = require('../utils/audit');

exports.getByParcel = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM court_injunctions WHERE parcel_id=$1 ORDER BY created_at', [req.params.parcelId]);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { parcel_id, transaction_id, court_name, case_number, injunction_date, issued_by, description } = req.body;
    const result = await db.query(
      `INSERT INTO court_injunctions (parcel_id, transaction_id, court_name, case_number, injunction_date, issued_by, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [parcel_id, transaction_id, court_name, case_number, injunction_date, issued_by, description]
    );
    const row = result.rows[0];

    await createAuditLog({
      userId: req.user ? req.user.id : null,
      action: 'INJUNCTION_REGISTERED',
      entityType: 'COURT_INJUNCTION',
      entityId: row.id,
      newValue: {
        parcelId: row.parcel_id,
        transactionId: row.transaction_id,
        courtName: row.court_name,
        caseNumber: row.case_number
      },
      req
    });

    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
};

exports.modify = async (req, res, next) => {
  try {
    const { court_name, case_number, injunction_date, issued_by, description } = req.body;
    const result = await db.query(
      `UPDATE court_injunctions SET court_name = COALESCE($1, court_name), case_number = COALESCE($2, case_number), injunction_date = COALESCE($3, injunction_date), issued_by = COALESCE($4, issued_by), description = COALESCE($5, description) WHERE id = $6 RETURNING *`,
      [court_name || null, case_number || null, injunction_date || null, issued_by || null, description || null, req.params.id]
    );
    const row = result.rows[0];

    await createAuditLog({
      userId: req.user ? req.user.id : null,
      action: 'INJUNCTION_MODIFIED',
      entityType: 'COURT_INJUNCTION',
      entityId: req.params.id,
      newValue: {
        courtName: row ? row.court_name : null,
        caseNumber: row ? row.case_number : null
      },
      req
    });

    res.json(row);
  } catch (err) {
    next(err);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const { cancellation_reference } = req.body;
    const result = await db.query(
      `UPDATE court_injunctions SET status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP, cancellation_reference = COALESCE($1, cancellation_reference) WHERE id = $2 RETURNING *`,
      [cancellation_reference || null, req.params.id]
    );
    const row = result.rows[0];

    await createAuditLog({
      userId: req.user ? req.user.id : null,
      action: 'INJUNCTION_CANCELLED',
      entityType: 'COURT_INJUNCTION',
      entityId: req.params.id,
      newValue: {
        status: 'CANCELLED',
        cancellationReference: cancellation_reference
      },
      req
    });

    res.json(row);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM court_injunctions WHERE id=$1', [id]);
    await createAuditLog({
      userId: req.user ? req.user.id : null,
      action: 'INJUNCTION_DELETED',
      entityType: 'COURT_INJUNCTION',
      entityId: id,
      req
    });
    res.json({ message: 'Court injunction deleted successfully' });
  } catch (err) {
    next(err);
  }
};
