const db = require('../config/db');

exports.getByParcel = async (req, res, next) => {
  try {
    const { parcelId } = req.params;
    const result = await db.query('SELECT * FROM parties WHERE parcel_id=$1', [parcelId]);
    for (let p of result.rows) {
      if (p.party_type === 'GROUP') {
        p.members = (await db.query('SELECT * FROM group_party_members WHERE group_party_id=$1', [p.id])).rows;
      }
    }
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  let client;
  try {
    client = await db.getClient();
    await client.query('BEGIN');
    const { parcel_id, party_type, first_name, father_name, grandfather_name, sex, date_of_birth,
            national_id, organization_name, organization_type, registration_number,
            phone, email, address, is_under_tutorship, tutor_name, members } = req.body;
    
    const result = await client.query(`
      INSERT INTO parties (parcel_id, party_type, first_name, father_name, grandfather_name,
        sex, date_of_birth, national_id, organization_name, organization_type, registration_number,
        phone, email, address, is_under_tutorship, tutor_name)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *`,
      [parcel_id, party_type, first_name, father_name, grandfather_name, sex, date_of_birth,
       national_id, organization_name, organization_type, registration_number,
       phone, email, address, is_under_tutorship, tutor_name]);
    
    if (party_type === 'GROUP' && members && members.length) {
      for (const m of members) {
        await client.query(`
          INSERT INTO group_party_members (group_party_id, first_name, father_name, grandfather_name, sex, national_id, share_percentage, phone)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [result.rows[0].id, m.first_name, m.father_name, m.grandfather_name, m.sex, m.national_id, m.share_percentage, m.phone]);
      }
    }
    
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (rbErr) { console.error('Rollback error:', rbErr); }
    }
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.update = async (req, res, next) => {
  let client;
  try {
    client = await db.getClient();
    await client.query('BEGIN');
    const { id } = req.params;
    const { first_name, father_name, grandfather_name, sex, date_of_birth,
            national_id, organization_name, organization_type, registration_number,
            phone, email, address, is_under_tutorship, tutor_name, members } = req.body;

    const result = await client.query(`
      UPDATE parties SET
        first_name = COALESCE($1, first_name),
        father_name = COALESCE($2, father_name),
        grandfather_name = COALESCE($3, grandfather_name),
        sex = COALESCE($4, sex),
        date_of_birth = COALESCE($5, date_of_birth),
        national_id = COALESCE($6, national_id),
        organization_name = COALESCE($7, organization_name),
        organization_type = COALESCE($8, organization_type),
        registration_number = COALESCE($9, registration_number),
        phone = COALESCE($10, phone),
        email = COALESCE($11, email),
        address = COALESCE($12, address),
        is_under_tutorship = COALESCE($13, is_under_tutorship),
        tutor_name = COALESCE($14, tutor_name),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *`,
      [first_name, father_name, grandfather_name, sex, date_of_birth,
       national_id, organization_name, organization_type, registration_number,
       phone, email, address, is_under_tutorship, tutor_name, id]);

    if (members && Array.isArray(members)) {
      await client.query('DELETE FROM group_party_members WHERE group_party_id = $1', [id]);
      for (const m of members) {
        await client.query(`
          INSERT INTO group_party_members (group_party_id, first_name, father_name, grandfather_name, sex, national_id, share_percentage, phone)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, m.first_name, m.father_name, m.grandfather_name, m.sex, m.national_id, m.share_percentage, m.phone]);
      }
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (rbErr) { console.error('Rollback error:', rbErr); }
    }
    next(err);
  } finally {
    if (client) client.release();
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM parties WHERE id=$1', [id]);
    res.json({ message: 'Party deleted' });
  } catch (err) { next(err); }
};