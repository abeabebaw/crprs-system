const db = require('../config/db');
const { createAuditLog } = require('../utils/audit');

exports.getByParcel = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM mortgages WHERE parcel_id=$1 ORDER BY created_at', [req.params.parcelId]);
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.register = async (req, res, next) => {
  try {
    const { parcel_id, transaction_id, mortgagee_name, mortgagee_type, mortgage_amount,
            currency, mortgage_date, loan_agreement_number, description } = req.body;
    const result = await db.query(`
      INSERT INTO mortgages (parcel_id, transaction_id, mortgagee_name, mortgagee_type,
        mortgage_amount, currency, mortgage_date, loan_agreement_number, description)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [parcel_id, transaction_id, mortgagee_name, mortgagee_type, mortgage_amount,
       currency || 'ETB', mortgage_date, loan_agreement_number, description]);
    
    const row = result.rows[0];
    await createAuditLog({
      userId: req.user ? req.user.id : null,
      action: 'MORTGAGE_REGISTERED',
      entityType: 'MORTGAGE',
      entityId: row.id,
      newValue: {
        parcelId: row.parcel_id,
        transactionId: row.transaction_id,
        mortgageeName: row.mortgagee_name,
        mortgageAmount: row.mortgage_amount
      },
      req
    });

    res.status(201).json(row);
  } catch (err) { next(err); }
};

exports.modify = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { mortgagee_name, mortgage_amount, mortgage_date, loan_agreement_number, description } = req.body;
    const result = await db.query(`
      UPDATE mortgages SET mortgagee_name=$1, mortgage_amount=$2, mortgage_date=$3,
        loan_agreement_number=$4, description=$5 WHERE id=$6 RETURNING *`,
      [mortgagee_name, mortgage_amount, mortgage_date, loan_agreement_number, description, id]);
    
    const row = result.rows[0];
    await createAuditLog({
      userId: req.user ? req.user.id : null,
      action: 'MORTGAGE_MODIFIED',
      entityType: 'MORTGAGE',
      entityId: id,
      newValue: {
        mortgageeName: row ? row.mortgagee_name : null,
        mortgageAmount: row ? row.mortgage_amount : null
      },
      req
    });

    res.json(row);
  } catch (err) { next(err); }
};

exports.cancel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cancellation_reference } = req.body;
    const result = await db.query(`
      UPDATE mortgages SET status='CANCELLED', cancelled_at=CURRENT_TIMESTAMP, cancellation_reference=$1
      WHERE id=$2 RETURNING *`, [cancellation_reference, id]);
    
    const row = result.rows[0];
    await createAuditLog({
      userId: req.user ? req.user.id : null,
      action: 'MORTGAGE_CANCELLED',
      entityType: 'MORTGAGE',
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

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM mortgages WHERE id=$1', [id]);
    await createAuditLog({
      userId: req.user ? req.user.id : null,
      action: 'MORTGAGE_DELETED',
      entityType: 'MORTGAGE',
      entityId: id,
      req
    });
    res.json({ message: 'Mortgage deleted successfully' });
  } catch (err) { next(err); }
};