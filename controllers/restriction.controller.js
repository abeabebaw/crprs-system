const db = require('../config/db');
const { createAuditLog } = require('../utils/audit');

exports.getByParcel = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM general_restrictions WHERE parcel_id=$1 ORDER BY created_at', [req.params.parcelId]);
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.register = async (req, res, next) => {
  try {
    const { parcel_id, transaction_id, restriction_type, description, imposed_by, imposed_date } = req.body;
    const result = await db.query(`
      INSERT INTO general_restrictions (parcel_id, transaction_id, restriction_type, description, imposed_by, imposed_date)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [parcel_id, transaction_id, restriction_type, description, imposed_by, imposed_date]);
    
    const row = result.rows[0];
    await createAuditLog({
      userId: req.user ? req.user.id : null,
      action: 'RESTRICTION_REGISTERED',
      entityType: 'GENERAL_RESTRICTION',
      entityId: row.id,
      newValue: {
        parcelId: row.parcel_id,
        transactionId: row.transaction_id,
        restrictionType: row.restriction_type,
        description: row.description
      },
      req
    });

    res.status(201).json(row);
  } catch (err) { next(err); }
};

exports.cancel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cancellation_reference } = req.body;
    const result = await db.query(`
      UPDATE general_restrictions SET status='CANCELLED', cancelled_at=CURRENT_TIMESTAMP, cancellation_reference=$1
      WHERE id=$2 RETURNING *`, [cancellation_reference, id]);
    
    const row = result.rows[0];
    await createAuditLog({
      userId: req.user ? req.user.id : null,
      action: 'RESTRICTION_CANCELLED',
      entityType: 'GENERAL_RESTRICTION',
      entityId: id,
      newValue: {
        status: 'CANCELLED',
        cancellationReference: cancellation_reference
      },
      req
    });

    res.json(row);
  } catch (err) { next(err); }
};

exports.modify = async (req, res, next) => {
  try {
    const { restriction_type, description, imposed_by, imposed_date } = req.body;
    const result = await db.query(
      `UPDATE general_restrictions SET
         restriction_type = COALESCE($1, restriction_type),
         description = COALESCE($2, description),
         imposed_by = COALESCE($3, imposed_by),
         imposed_date = COALESCE($4, imposed_date)
       WHERE id = $5 RETURNING *`,
      [restriction_type || null, description || null, imposed_by || null, imposed_date || null, req.params.id]
    );
    const row = result.rows[0];
    await createAuditLog({
      userId: req.user ? req.user.id : null,
      action: 'RESTRICTION_MODIFIED',
      entityType: 'GENERAL_RESTRICTION',
      entityId: req.params.id,
      req
    });
    res.json(row);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM general_restrictions WHERE id=$1', [id]);
    await createAuditLog({
      userId: req.user ? req.user.id : null,
      action: 'RESTRICTION_DELETED',
      entityType: 'GENERAL_RESTRICTION',
      entityId: id,
      req
    });
    res.json({ message: 'General restriction deleted successfully' });
  } catch (err) { next(err); }
};