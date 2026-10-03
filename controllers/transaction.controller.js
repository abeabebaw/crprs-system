const db = require('../config/db');
const { canTransitionTransaction } = require('../utils/workflow');
const { DatabaseError } = require('../utils/errors');
const { createAuditLog } = require('../utils/audit');

const generateTxnNumber = async () => {
  try {
    const year = new Date().getFullYear();
    const result = await db.query(
      'SELECT COUNT(*) FROM transactions WHERE EXTRACT(YEAR FROM created_at) = $1',
      [year]
    );
    return `TXN-${year}-${String(parseInt(result.rows[0].count) + 1).padStart(6, '0')}`;
  } catch (err) {
    console.error('Error generating transaction number:', err);
    throw new DatabaseError('Failed to generate transaction number');
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const { status, applicationId, parcelId, search, assignedTo } = req.query;
    let query = `
      SELECT t.*, a.application_number, a.application_type, p.parcel_code,
             u.full_name as assignee_name, u2.full_name as creator_name
      FROM transactions t
      JOIN applications a ON t.application_id = a.id
      LEFT JOIN parcels p ON t.parcel_id = p.id
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (status) {
      const statusArray = status.split(',').map((s) => s.trim()).filter(Boolean);
      if (statusArray.length === 1) {
        query += ` AND t.status = $${idx++}`;
        params.push(statusArray[0]);
      } else if (statusArray.length > 1) {
        const placeholders = statusArray.map(() => `$${idx++}`).join(', ');
        query += ` AND t.status IN (${placeholders})`;
        params.push(...statusArray);
      }
    }

    if (applicationId) {
      // Check if it's a UUID or application number
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(applicationId)) {
        query += ` AND t.application_id = $${idx++}`;
        params.push(applicationId);
      } else {
        // It's an application number, search by that
        query += ` AND a.application_number = $${idx++}`;
        params.push(applicationId);
      }
    }

    if (parcelId) {
      // Check if it's a UUID or parcel code
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(parcelId)) {
        query += ` AND t.parcel_id = $${idx++}`;
        params.push(parcelId);
      } else {
        // It's a parcel code, search by that
        query += ` AND p.parcel_code = $${idx++}`;
        params.push(parcelId);
      }
    }

    if (assignedTo) {
      query += ` AND t.assigned_to = $${idx++}`;
      params.push(assignedTo);
    }

    if (search) {
      query += ` AND (t.transaction_number ILIKE $${idx} OR a.application_number ILIKE $${idx} OR p.parcel_code ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    query += ' ORDER BY t.created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get transactions error:', err);
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const txnResult = await db.query(
      `
      SELECT t.*, a.application_number, a.application_type, a.applicant_name,
             p.parcel_code, p.area_sqm, p.land_use, p.region, p.city,
             u.full_name as assignee_name
      FROM transactions t
      JOIN applications a ON t.application_id = a.id
      LEFT JOIN parcels p ON t.parcel_id = p.id
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.id = $1`,
      [id]
    );

    if (txnResult.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const txn = txnResult.rows[0];
    txn.history = (await db.query('SELECT * FROM transaction_history WHERE transaction_id=$1 ORDER BY created_at', [id])).rows;
    txn.documents = (await db.query('SELECT * FROM documents WHERE transaction_id=$1', [id])).rows;

    if (txn.parcel_id) {
      txn.rights = (await db.query('SELECT r.*, p.first_name, p.father_name, p.grandfather_name, p.organization_name FROM rights r LEFT JOIN parties p ON r.holder_party_id = p.id WHERE r.parcel_id=$1', [txn.parcel_id])).rows;
      txn.mortgages = (await db.query('SELECT * FROM mortgages WHERE parcel_id=$1', [txn.parcel_id])).rows;
      txn.injunctions = (await db.query('SELECT * FROM court_injunctions WHERE parcel_id=$1', [txn.parcel_id])).rows;
      txn.restrictions = (await db.query('SELECT * FROM general_restrictions WHERE parcel_id=$1', [txn.parcel_id])).rows;
      txn.parties = (await db.query('SELECT * FROM parties WHERE parcel_id=$1', [txn.parcel_id])).rows;
    }

    res.json(txn);
  } catch (err) {
    console.error('Get transaction by ID error:', err);
    next(err);
  }
};

exports.create = async (req, res, next) => {
  let client;
  try {
    client = await db.getClient();
    await client.query('BEGIN');

    const { application_id, transaction_type, parcel_id } = req.body;
    const app = await client.query('SELECT id, parcel_id, status FROM applications WHERE id=$1', [application_id]);

    if (app.rows.length === 0) {
      throw { status: 404, message: 'Application not found' };
    }

    if (app.rows[0].status === 'WITHDRAWN') {
      throw { status: 400, message: 'Cannot create transaction on withdrawn application' };
    }

    const txnNumber = await generateTxnNumber();
    const result = await client.query(
      `INSERT INTO transactions (transaction_number, application_id, parcel_id, transaction_type, status, created_by)
       VALUES ($1, $2, $3, $4, 'CREATED', $5) RETURNING *`,
      [txnNumber, application_id, parcel_id || app.rows[0].parcel_id, transaction_type, req.user.id]
    );

    if (app.rows[0].status === 'SUBMITTED' || app.rows[0].status === 'FILE_ATTACHMENT_FINISHED') {
      await client.query("UPDATE applications SET status='IN_PROGRESS' WHERE id=$1", [application_id]);
      await client.query(
        `INSERT INTO application_history (application_id, from_status, to_status, changed_by)
         VALUES ($1, $2, 'IN_PROGRESS', $3)`,
        [application_id, app.rows[0].status, req.user.id]
      );
    }

    await client.query(
      `INSERT INTO transaction_history (transaction_id, to_status, changed_by)
       VALUES ($1, 'CREATED', $2)`,
      [result.rows[0].id, req.user.id]
    );

    await client.query('COMMIT');

    await createAuditLog({
      userId: req.user.id,
      action: 'TRANSACTION_CREATED',
      entityType: 'TRANSACTION',
      entityId: result.rows[0].id,
      newValue: {
        transactionNumber: result.rows[0].transaction_number,
        transactionType: result.rows[0].transaction_type,
        applicationId: result.rows[0].application_id,
        parcelId: result.rows[0].parcel_id
      },
      req
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rbErr) {
        console.error('Rollback error:', rbErr);
      }
    }
    next(err);
  } finally {
    if (client) {
      client.release();
    }
  }
};

exports.update = async (req, res, next) => {
  let client;
  try {
    const { id } = req.params;
    const { transaction_type, parcel_id, parcel_code } = req.body;

    if (!transaction_type) {
      return res.status(400).json({ message: 'Transaction type is required' });
    }

    client = await db.getClient();
    await client.query('BEGIN');

    const existing = await client.query('SELECT id, status, application_id, parcel_id FROM transactions WHERE id=$1', [id]);

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (existing.rows[0].status !== 'CREATED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Only CREATED transactions can be updated' });
    }

    let nextParcelId = parcel_id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Check if passed identifier is a parcel_code
    if (nextParcelId && !uuidRegex.test(nextParcelId)) {
      const pRes = await client.query('SELECT id FROM parcels WHERE parcel_code=$1', [nextParcelId]);
      if (pRes.rows.length > 0) {
        nextParcelId = pRes.rows[0].id;
      } else {
        nextParcelId = null;
      }
    } else if (!nextParcelId && parcel_code) {
      const pRes = await client.query('SELECT id FROM parcels WHERE parcel_code=$1', [parcel_code]);
      if (pRes.rows.length > 0) {
        nextParcelId = pRes.rows[0].id;
      }
    }

    if (!nextParcelId) {
      const app = await client.query('SELECT parcel_id FROM applications WHERE id=$1', [existing.rows[0].application_id]);
      nextParcelId = app.rows[0]?.parcel_id || existing.rows[0].parcel_id || null;
    }

    await client.query(
      `UPDATE transactions
       SET transaction_type=$1,
           parcel_id=$2,
           updated_at=CURRENT_TIMESTAMP
       WHERE id=$3`,
      [transaction_type, nextParcelId, id]
    );

    const fullTxn = await client.query(
      `SELECT t.*, a.application_number, a.application_type, p.parcel_code
       FROM transactions t
       JOIN applications a ON t.application_id = a.id
       LEFT JOIN parcels p ON t.parcel_id = p.id
       WHERE t.id = $1`,
      [id]
    );

    await client.query('COMMIT');
    res.json(fullTxn.rows[0]);
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rbErr) {
        console.error('Rollback error:', rbErr);
      }
    }
    next(err);
  } finally {
    if (client) {
      client.release();
    }
  }
};

exports.remove = async (req, res, next) => {
  let client;
  try {
    const { id } = req.params;
    client = await db.getClient();
    await client.query('BEGIN');

    const existing = await client.query('SELECT id, status, application_id FROM transactions WHERE id=$1', [id]);

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (existing.rows[0].status !== 'CREATED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Only CREATED transactions can be deleted' });
    }

    await client.query('DELETE FROM transactions WHERE id=$1', [id]);

    const appTxns = await client.query('SELECT status FROM transactions WHERE application_id=$1', [existing.rows[0].application_id]);

    if (appTxns.rows.length === 0) {
      await client.query(
        `UPDATE applications
         SET status='SUBMITTED', updated_at=CURRENT_TIMESTAMP
         WHERE id=$1 AND status='IN_PROGRESS'`,
        [existing.rows[0].application_id]
      );

      await client.query(
        `INSERT INTO application_history (application_id, from_status, to_status, changed_by, reason)
         VALUES ($1, 'IN_PROGRESS', 'SUBMITTED', $2, $3)`,
        [existing.rows[0].application_id, req.user.id, 'Reverted after deleting all CREATED transactions']
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rbErr) {
        console.error('Rollback error:', rbErr);
      }
    }
    next(err);
  } finally {
    if (client) {
      client.release();
    }
  }
};

exports.initiate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const txn = await db.query('SELECT status FROM transactions WHERE id=$1', [id]);
    if (txn.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    if (!canTransitionTransaction(txn.rows[0].status, 'INITIATED')) {
      return res.status(400).json({ message: 'Cannot initiate transaction in current status' });
    }

    const result = await db.query(
      `UPDATE transactions SET status='INITIATED', initiated_at=CURRENT_TIMESTAMP, assigned_to=$1
       WHERE id=$2 RETURNING *`,
      [req.user.id, id]
    );
    await db.query(
      `INSERT INTO transaction_history (transaction_id, from_status, to_status, changed_by)
       VALUES ($1, $2, 'INITIATED', $3)`,
      [id, txn.rows[0].status, req.user.id]
    );

    await createAuditLog({
      userId: req.user.id,
      action: 'TRANSACTION_INITIATED',
      entityType: 'TRANSACTION',
      entityId: id,
      previousValue: { status: txn.rows[0].status },
      newValue: { status: 'INITIATED', assignedTo: req.user.id },
      req
    });

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.load = async (req, res, next) => {
  try {
    const { id } = req.params;
    const txn = await db.query('SELECT status FROM transactions WHERE id=$1', [id]);
    if (txn.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    if (!canTransitionTransaction(txn.rows[0].status, 'IN_PROCESS')) {
      return res.status(400).json({ message: 'Cannot load transaction in current status' });
    }

    const result = await db.query(
      `UPDATE transactions SET status='IN_PROCESS', in_process_at=CURRENT_TIMESTAMP
       WHERE id=$1 RETURNING *`,
      [id]
    );
    await db.query(
      `INSERT INTO transaction_history (transaction_id, from_status, to_status, changed_by)
       VALUES ($1, $2, 'IN_PROCESS', $3)`,
      [id, txn.rows[0].status, req.user.id]
    );

    await createAuditLog({
      userId: req.user.id,
      action: 'TRANSACTION_LOADED',
      entityType: 'TRANSACTION',
      entityId: id,
      previousValue: { status: txn.rows[0].status },
      newValue: { status: 'IN_PROCESS' },
      req
    });

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.finish = async (req, res, next) => {
  try {
    const { id } = req.params;
    const txn = await db.query('SELECT status FROM transactions WHERE id=$1', [id]);
    if (txn.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    if (!canTransitionTransaction(txn.rows[0].status, 'READY_FOR_APPROVAL')) {
      return res.status(400).json({ message: 'Cannot finish transaction in current status' });
    }

    const result = await db.query(
      `UPDATE transactions SET status='READY_FOR_APPROVAL', ready_for_approval_at=CURRENT_TIMESTAMP
       WHERE id=$1 RETURNING *`,
      [id]
    );
    await db.query(
      `INSERT INTO transaction_history (transaction_id, from_status, to_status, changed_by)
       VALUES ($1, $2, 'READY_FOR_APPROVAL', $3)`,
      [id, txn.rows[0].status, req.user.id]
    );

    await createAuditLog({
      userId: req.user.id,
      action: 'TRANSACTION_FINISHED',
      entityType: 'TRANSACTION',
      entityId: id,
      previousValue: { status: txn.rows[0].status },
      newValue: { status: 'READY_FOR_APPROVAL' },
      req
    });

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.approve = async (req, res, next) => {
  try {
    const { id } = req.params;
    const txn = await db.query('SELECT status, parcel_id FROM transactions WHERE id=$1', [id]);
    if (txn.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    if (!canTransitionTransaction(txn.rows[0].status, 'APPROVED')) {
      return res.status(400).json({ message: 'Cannot approve transaction in current status' });
    }

    const result = await db.query(
      `UPDATE transactions SET status='APPROVED', approved_at=CURRENT_TIMESTAMP
       WHERE id=$1 RETURNING *`,
      [id]
    );
    await db.query(
      `INSERT INTO transaction_history (transaction_id, from_status, to_status, changed_by)
       VALUES ($1, $2, 'APPROVED', $3)`,
      [id, txn.rows[0].status, req.user.id]
    );

    if (txn.rows[0].parcel_id) {
      await db.query('UPDATE parcels SET is_registered=TRUE, registration_date=CURRENT_TIMESTAMP WHERE id=$1', [txn.rows[0].parcel_id]);
    }

    const appTxns = await db.query('SELECT status FROM transactions WHERE application_id=(SELECT application_id FROM transactions WHERE id=$1)', [id]);
    if (appTxns.rows.every((t) => t.status === 'APPROVED' || t.status === 'NOT_IN_TASK' || t.status === 'DELIVERED')) {
      await db.query(
        `UPDATE applications SET status='FINISHED', completed_at=CURRENT_TIMESTAMP
         WHERE id=(SELECT application_id FROM transactions WHERE id=$1)`,
        [id]
      );
    }

    await createAuditLog({
      userId: req.user.id,
      action: 'TRANSACTION_APPROVED',
      entityType: 'TRANSACTION',
      entityId: id,
      previousValue: { status: txn.rows[0].status },
      newValue: { status: 'APPROVED' },
      req
    });

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.reject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const txn = await db.query('SELECT status FROM transactions WHERE id=$1', [id]);
    if (txn.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    if (!canTransitionTransaction(txn.rows[0].status, 'REJECTED')) {
      return res.status(400).json({ message: 'Cannot reject transaction in current status' });
    }

    const result = await db.query(
      `UPDATE transactions SET status='REJECTED', rejected_at=CURRENT_TIMESTAMP, rejection_reason=$1
       WHERE id=$2 RETURNING *`,
      [reason, id]
    );
    await db.query(
      `INSERT INTO transaction_history (transaction_id, from_status, to_status, changed_by, reason)
       VALUES ($1, $2, 'REJECTED', $3, $4)`,
      [id, txn.rows[0].status, req.user.id, reason]
    );

    await createAuditLog({
      userId: req.user.id,
      action: 'TRANSACTION_REJECTED',
      entityType: 'TRANSACTION',
      entityId: id,
      previousValue: { status: txn.rows[0].status },
      newValue: { status: 'REJECTED' },
      reason,
      req
    });

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const txn = await db.query('SELECT status FROM transactions WHERE id=$1', [id]);
    if (txn.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    if (!canTransitionTransaction(txn.rows[0].status, 'CANCELLED')) {
      return res.status(400).json({ message: 'Cannot cancel transaction in current status' });
    }

    const result = await db.query(
      `UPDATE transactions SET status='CANCELLED', cancelled_at=CURRENT_TIMESTAMP, cancellation_reason=$1
       WHERE id=$2 RETURNING *`,
      [reason, id]
    );
    await db.query(
      `INSERT INTO transaction_history (transaction_id, from_status, to_status, changed_by, reason)
       VALUES ($1, $2, 'CANCELLED', $3, $4)`,
      [id, txn.rows[0].status, req.user.id, reason]
    );

    await createAuditLog({
      userId: req.user.id,
      action: 'TRANSACTION_CANCELLED',
      entityType: 'TRANSACTION',
      entityId: id,
      previousValue: { status: txn.rows[0].status },
      newValue: { status: 'CANCELLED' },
      reason,
      req
    });

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.deliver = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { certificateNumber } = req.body;
    if (!certificateNumber || !String(certificateNumber).trim()) {
      return res.status(400).json({ message: 'Certificate number is required' });
    }
    const normalizedCertificateNumber = String(certificateNumber).trim();
    const txn = await db.query('SELECT status FROM transactions WHERE id=$1', [id]);

    if (txn.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (!canTransitionTransaction(txn.rows[0].status, 'NOT_IN_TASK') && !canTransitionTransaction(txn.rows[0].status, 'DELIVERED')) {
      return res.status(400).json({ message: 'Cannot deliver transaction in current status' });
    }

    const result = await db.query(
      `UPDATE transactions SET status='NOT_IN_TASK', delivered_at=CURRENT_TIMESTAMP
       WHERE id=$1 RETURNING *`,
      [id]
    );
    await db.query(
      `INSERT INTO transaction_history (transaction_id, from_status, to_status, changed_by)
       VALUES ($1, $2, 'NOT_IN_TASK', $3)`,
      [id, txn.rows[0].status, req.user.id]
    );

    await db.query(
      `UPDATE applications SET status='COMPLETED', delivered_at=CURRENT_TIMESTAMP
       WHERE id=(SELECT application_id FROM transactions WHERE id=$1)`,
      [id]
    );

    await createAuditLog({
      userId: req.user.id,
      action: 'TRANSACTION_DELIVERED',
      entityType: 'TRANSACTION',
      entityId: id,
      previousValue: { status: txn.rows[0].status },
      newValue: { status: 'NOT_IN_TASK', certificateNumber: normalizedCertificateNumber },
      req
    });

    res.json({ ...result.rows[0], certificateNumber: normalizedCertificateNumber });
  } catch (err) {
    next(err);
  }
};
