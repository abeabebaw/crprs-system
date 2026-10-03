const db = require('../config/db');

exports.getAnnouncements = async (req, res, next) => {
  try {
    const result = await db.query("SELECT * FROM announcements WHERE is_published=TRUE ORDER BY published_at DESC");
    if (result.rows.length === 0) {
      // Default public announcements matching CRPRS Manual
      return res.json([
        {
          id: 'anc-1',
          title: 'Public Notice: Cadastral Boundary Survey in Kirkos Sub-City',
          title_am: 'የሕዝብ ማስታወቂያ፡ በኪርኮስ ክፍለ ከተማ የካዳስተር ድንበር ቅየሳ',
          content: 'Cadastral surveying teams from the Real Property Registration Agency will conduct field verifications beginning next Monday.',
          category: 'SURVEY',
          is_published: true,
          published_at: new Date('2026-08-01')
        },
        {
          id: 'anc-2',
          title: 'Notice on Verification of Leasehold Titles and Conversions',
          title_am: 'የሊዝ ይዞታ ማረጋገጫ እና ምዝገባ ማስታወቂያ',
          content: 'Holders of provisional certificates are advised to present their documentation for formal title deed issuance.',
          category: 'REGISTRATION',
          is_published: true,
          published_at: new Date('2026-08-15')
        }
      ]);
    }
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.getServices = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM services ORDER BY service_name');
    if (result.rows.length === 0) {
      return res.json([
        { id: 'srv-1', service_name: 'First Registration of Real Property', fee_amount: 500, processing_days: 5, category: 'REGISTRATION' },
        { id: 'srv-2', service_name: 'Title Deed Extract / Duplicate Issuance', fee_amount: 250, processing_days: 2, category: 'TITLE' },
        { id: 'srv-3', service_name: 'Mortgage / Encumbrance Registration', fee_amount: 300, processing_days: 3, category: 'ENCUMBRANCE' },
        { id: 'srv-4', service_name: 'Cadastral Parcel Split & Merge Survey', fee_amount: 800, processing_days: 10, category: 'CADASTRE' }
      ]);
    }
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.getPublicDocuments = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM public_documents ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.checkApplicationStatus = async (req, res, next) => {
  try {
    const { city, applicationId } = req.query;
    if (!applicationId || !applicationId.trim()) {
      return res.status(400).json({ message: 'Application number is required' });
    }

    const cleanAppId = applicationId.trim();
    const cleanCity = city ? city.trim() : '';

    const result = await db.query(`
      SELECT 
        a.id,
        a.application_number,
        a.application_type,
        a.applicant_name,
        a.status,
        a.submitted_at,
        a.delivered_at,
        p.parcel_code,
        p.city,
        p.sub_city,
        p.woreda,
        p.area_sqm,
        p.land_use
      FROM applications a 
      LEFT JOIN parcels p ON a.parcel_id = p.id
      WHERE UPPER(a.application_number) = UPPER($1)
        AND ($2 = '' OR p.city ILIKE $3 OR $2 IS NULL)
      LIMIT 1`,
      [cleanAppId, cleanCity, `%${cleanCity}%`]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: `No application found with number "${cleanAppId}"` });
    }

    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.getLayers = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM map_layers WHERE is_published=TRUE ORDER BY layer_name');
    if (result.rows.length === 0) {
      return res.json([
        { id: 'lyr-1', layer_name: 'Cadastral Parcels', layer_type: 'WMS', is_published: true },
        { id: 'lyr-2', layer_name: 'Administrative Wereda Boundaries', layer_type: 'WFS', is_published: true },
        { id: 'lyr-3', layer_name: 'Block & Neighborhood Grid', layer_type: 'WMS', is_published: true },
        { id: 'lyr-4', layer_name: 'Buildings & Footprints', layer_type: 'WFS', is_published: true }
      ]);
    }
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.getPredefinedMaps = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM predefined_maps ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { next(err); }
};