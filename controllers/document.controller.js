const prisma = require('../config/prisma');
const path = require('path');
const fs = require('fs');
const { NotFoundError, ValidationError, handlePrismaError, validateRequiredFields } = require('../utils/errors');
const { serialize } = require('../utils/serializer');
const { createAuditLog } = require('../utils/audit');
const storageService = require('../utils/storage');

/**
 * Generate unique document reference number
 * Format: DOC-YYYYMM-CATEGORY-NNNNN
 */
const generateDocumentReference = async (category) => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  // Count documents created this month for this category
  const count = await prisma.document.count({
    where: {
      category,
      createdAt: {
        gte: new Date(`${year}-${month}-01`),
        lt: new Date(year, new Date().getMonth() + 1, 1) // Start of next month
      }
    }
  });
  
  // Category abbreviations
  const categoryAbbrev = {
    'APPLICANT': 'APP',
    'PARCEL': 'PRC',
    'RRR': 'RRR',
    'TRANSACTION': 'TXN',
    'SURVEY': 'SRV'
  };
  
  const abbrev = categoryAbbrev[category] || 'DOC';
  
  // Format: DOC-YEARMONTH-CATEGORY-SEQUENCE
  return `DOC-${year}${month}-${abbrev}-${String(count + 1).padStart(5, '0')}`;
};

exports.getByApplication = async (req, res, next) => {
  try {
    const documents = await prisma.document.findMany({
      where: { applicationId: req.params.applicationId },
      orderBy: { createdAt: 'asc' },
      include: {
        uploader: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    });
    
    // Convert BigInt to string for JSON serialization
    const documentsResponse = documents.map(doc => ({
      ...doc,
      fileSize: doc.fileSize?.toString() || '0'
    }));
    
    res.json(documentsResponse);
  } catch (err) {
    console.error('Get documents error:', err);
    next(err);
  }
};

exports.upload = async (req, res, next) => {
  let uploadedFilePath = null;
  
  try {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    uploadedFilePath = req.file.path;

    const { application_id, transaction_id, category, document_type, reference_number, description } = req.body;

    // Validate required fields
    validateRequiredFields(req.body, ['application_id', 'category', 'document_type']);

    // Validate category
    const validCategories = ['APPLICANT', 'PARCEL', 'RRR'];
    if (!validCategories.includes(category)) {
      throw new ValidationError(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (req.file.size > maxSize) {
      throw new ValidationError('File size must not exceed 10MB');
    }

    // Validate file type
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      throw new ValidationError('Invalid file type. Allowed types: PDF, JPG, PNG, DOC, DOCX');
    }

    // Verify application exists
    const application = await prisma.application.findUnique({
      where: { id: application_id }
    }).catch(err => {
      console.error('Error checking application:', err);
      throw handlePrismaError(err);
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    // Generate reference number if not provided
    let finalReferenceNumber = reference_number;
    if (!finalReferenceNumber || finalReferenceNumber.trim() === '') {
      finalReferenceNumber = await generateDocumentReference(category);
      console.log('Auto-generated document reference:', finalReferenceNumber);
    }

    const document = await prisma.document.create({
      data: {
        applicationId: application_id,
        transactionId: transaction_id || null,
        category,
        documentType: document_type,
        referenceNumber: finalReferenceNumber,
        description: description || null,
        filePath: req.file.path,
        fileName: req.file.originalname,
        fileSize: BigInt(req.file.size),
        mimeType: req.file.mimetype,
        uploadedBy: req.user.id
      },
      include: {
        uploader: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    }).catch(err => {
      console.error('Error creating document record:', err);
      throw handlePrismaError(err);
    });

    // Convert BigInt to string for JSON serialization
    const documentResponse = {
      ...document,
      fileSize: document.fileSize.toString()
    };

    await createAuditLog({
      userId: req.user.id,
      action: 'DOCUMENT_UPLOADED',
      entityType: 'DOCUMENT',
      entityId: document.id,
      newValue: {
        documentType: document.documentType,
        category: document.category,
        referenceNumber: document.referenceNumber,
        fileName: document.fileName,
        applicationId: document.applicationId,
        transactionId: document.transactionId
      },
      req
    });

    res.status(201).json(serialize(documentResponse));
  } catch (err) {
    // Clean up file if error occurs
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      try {
        fs.unlinkSync(uploadedFilePath);
        console.log('Cleaned up uploaded file after error:', uploadedFilePath);
      } catch (cleanupErr) {
        console.error('Failed to cleanup uploaded file:', cleanupErr);
      }
    }
    console.error('Upload document error:', err);
    next(err);
  }
};

const getAbsoluteFilePath = (docFilePath) => {
  return storageService.resolveLocalPath(docFilePath);
};

exports.archive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { physical_storage_location, region, city, wereda, block, shelf, cell, cabinet, box, folder } = req.body;
    
    let location = physical_storage_location;
    if (!location) {
      const parts = [];
      if (region) parts.push(`REG-${region}`);
      if (city) parts.push(`CITY-${city}`);
      if (wereda) parts.push(`WER-${wereda}`);
      if (block) parts.push(`BLK-${block}`);
      if (shelf) parts.push(`SH-${shelf}`);
      if (cell) parts.push(`CELL-${cell}`);
      if (cabinet) parts.push(`CAB-${cabinet}`);
      if (box) parts.push(`BX-${box}`);
      if (folder) parts.push(`FLD-${folder}`);
      if (parts.length > 0) location = parts.join('/');
    }

    const doc = await prisma.document.update({
      where: { id },
      data: {
        archived: true,
        archivedAt: new Date(),
        physicalStorageLocation: location || 'ARCHIVE'
      }
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'DOCUMENT_ARCHIVED',
      entityType: 'DOCUMENT',
      entityId: id,
      newValue: { physicalStorageLocation: doc.physicalStorageLocation },
      req
    });

    res.json(serialize({ ...doc, fileSize: doc.fileSize?.toString() || '0' }));
  } catch (err) { next(err); }
};

exports.checkout = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Document not found');
    if (existing.checkedOutBy) throw new ValidationError('Document already checked out');

    const doc = await prisma.document.update({
      where: { id },
      data: {
        checkedOutBy: req.user.id,
        checkedOutAt: new Date()
      }
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'DOCUMENT_CHECKED_OUT',
      entityType: 'DOCUMENT',
      entityId: id,
      req
    });

    res.json(serialize({ ...doc, fileSize: doc.fileSize?.toString() || '0' }));
  } catch (err) { next(err); }
};

exports.checkin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await prisma.document.update({
      where: { id },
      data: {
        checkedOutBy: null,
        checkedOutAt: null
      }
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'DOCUMENT_CHECKED_IN',
      entityType: 'DOCUMENT',
      entityId: id,
      req
    });

    res.json(serialize({ ...doc, fileSize: doc.fileSize?.toString() || '0' }));
  } catch (err) { next(err); }
};

exports.search = async (req, res, next) => {
  try {
    const { parcel_id, application_id, reference_number, checked_out, archived, q } = req.query;
    const where = {};
    if (application_id) where.applicationId = application_id;
    if (reference_number) where.referenceNumber = { contains: reference_number, mode: 'insensitive' };
    if (parcel_id) where.application = { parcelId: parcel_id };
    if (checked_out === 'true') where.checkedOutBy = { not: null };
    if (checked_out === 'false') where.checkedOutBy = null;
    if (archived === 'true') where.archived = true;
    if (archived === 'false') where.archived = false;
    if (q) {
      where.OR = [
        { referenceNumber: { contains: q, mode: 'insensitive' } },
        { fileName: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { physicalStorageLocation: { contains: q, mode: 'insensitive' } }
      ];
    }

    const docs = await prisma.document.findMany({
      where,
      include: {
        application: {
          select: {
            applicationNumber: true,
            applicantName: true,
            parcel: { select: { parcelCode: true } }
          }
        },
        uploader: {
          select: { id: true, fullName: true, username: true }
        },
        checkedOutUser: {
          select: { id: true, fullName: true, username: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const docsResponse = docs.map(doc => ({
      ...doc,
      fileSize: doc.fileSize?.toString() || '0'
    }));

    res.json(serialize(docsResponse));
  } catch (err) { next(err); }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundError('Document not found');

    if (doc.filePath) {
      storageService.deleteLocalFile(doc.filePath);
    }

    await prisma.document.delete({ where: { id } });

    await createAuditLog({
      userId: req.user.id,
      action: 'DOCUMENT_DELETED',
      entityType: 'DOCUMENT',
      entityId: id,
      previousValue: {
        referenceNumber: doc.referenceNumber,
        fileName: doc.fileName,
        documentType: doc.documentType
      },
      req
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (err) { next(err); }
};

exports.view = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundError('Document not found');

    const filePath = getAbsoluteFilePath(doc.filePath);
    if (!filePath) {
      throw new NotFoundError('Physical file not found on server storage');
    }

    const mime = doc.mimeType || 'application/pdf';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename="${doc.fileName || path.basename(filePath)}"`);
    res.sendFile(filePath);
  } catch (err) { next(err); }
};

exports.download = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundError('Document not found');

    const filePath = getAbsoluteFilePath(doc.filePath);
    if (!filePath) {
      throw new NotFoundError('Physical file not found on server storage');
    }

    res.download(filePath, doc.fileName || path.basename(filePath));
  } catch (err) { next(err); }
};

/**
 * GET /api/documents/:id/preview
 * Serves a fully browser-renderable preview for any file type:
 *  - Images      → served directly (browser renders them)
 *  - PDF         → served directly (browser PDF viewer)
 *  - .docx/.doc  → converted to HTML via mammoth
 *  - .xlsx/.xls  → basic HTML table via xlsx (if installed), else download prompt
 *  - .txt/.csv   → plain text wrapped in styled HTML
 *  - Others      → styled HTML download prompt
 */
exports.preview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundError('Document not found');

    const filePath = storageService.resolveLocalPath(doc.filePath);
    if (!filePath) throw new NotFoundError('File not found on server');

    const mime = (doc.mimeType || '').toLowerCase();
    const fileName = (doc.fileName || '').toLowerCase();
    const ext = path.extname(fileName).toLowerCase();

    // ── Images — serve directly ────────────────────────────────────────────
    if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(ext)) {
      res.setHeader('Content-Type', mime || 'image/jpeg');
      return res.sendFile(filePath);
    }

    // ── PDF — serve directly ───────────────────────────────────────────────
    if (mime === 'application/pdf' || ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);
      return res.sendFile(filePath);
    }

    // ── Word .docx / .doc → HTML via mammoth ──────────────────────────────
    if (ext === '.docx' || ext === '.doc' || mime.includes('msword') || mime.includes('wordprocessingml')) {
      const mammoth = require('mammoth');
      const result = await mammoth.convertToHtml({ path: filePath });
      const html = result.value;
      const warnings = result.messages.length
        ? `<!-- mammoth warnings: ${result.messages.map(m => m.message).join('; ')} -->`
        : '';

      return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${doc.fileName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; line-height: 1.7;
         color: #1e293b; background: #f8fafc; padding: 0; }
  .doc-wrapper { max-width: 820px; margin: 0 auto; background: #fff;
                 min-height: 100vh; padding: 48px 64px; box-shadow: 0 0 0 1px #e2e8f0; }
  h1,h2,h3,h4,h5,h6 { font-weight: 700; margin: 1.1em 0 0.4em; color: #0f172a; line-height: 1.3; }
  h1 { font-size: 1.7em; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }
  h2 { font-size: 1.35em; }
  h3 { font-size: 1.15em; }
  p  { margin-bottom: 0.75em; }
  ul,ol { padding-left: 1.5em; margin-bottom: 0.75em; }
  li { margin-bottom: 0.25em; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 1em; font-size: 0.92em; }
  th,td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
  th { background: #f1f5f9; font-weight: 600; }
  img { max-width: 100%; height: auto; display: block; margin: 0.5em auto; }
  strong,b { font-weight: 700; }
  em,i { font-style: italic; }
  a { color: #2563eb; text-decoration: underline; }
  pre,code { font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
</style>
</head>
<body>
<div class="doc-wrapper">
${warnings}
${html}
</div>
</body>
</html>`);
    }

    // ── Plain text / CSV / JSON / XML / Markdown ───────────────────────────
    if (mime === 'text/plain' || /\.(txt|csv|log|md|json|xml)$/.test(ext)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const escaped = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${doc.fileName}</title>
<style>
  body { margin: 0; background: #0f172a; color: #e2e8f0; font-family: 'Cascadia Code','Consolas',monospace; font-size: 13px; }
  pre  { padding: 2rem; white-space: pre-wrap; word-break: break-word; line-height: 1.6; }
</style>
</head>
<body><pre>${escaped}</pre></body>
</html>`);
    }

    // ── Fallback: styled download prompt ──────────────────────────────────
    const dispExt = ext.replace('.', '').toUpperCase() || 'FILE';
    return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${doc.fileName}</title>
<style>
  body { margin: 0; display: flex; align-items: center; justify-content: center;
         min-height: 100vh; background: #0f172a; font-family: 'Segoe UI', sans-serif; }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px;
          padding: 3rem 2.5rem; text-align: center; max-width: 400px; color: #f8fafc; }
  .ext  { font-size: 2rem; font-weight: 800; color: #7dd3fc; margin-bottom: 0.75rem; }
  .name { font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; word-break: break-all; }
  .sub  { font-size: 0.85rem; color: #94a3b8; margin-bottom: 1.75rem; line-height: 1.5; }
  a.btn { display: inline-block; padding: 0.6rem 1.4rem; background: #2563eb; color: #fff;
          border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.9rem; }
  a.btn:hover { background: #1d4ed8; }
</style>
</head>
<body>
<div class="card">
  <div class="ext">.${dispExt}</div>
  <div class="name">${doc.fileName}</div>
  <div class="sub">This format cannot be previewed inline.<br/>Download it to view with the correct application.</div>
  <a class="btn" href="/api/documents/${id}/download?token=${req.query.token || ''}">⬇ Download File</a>
</div>
</body>
</html>`);

  } catch (err) {
    console.error('Preview error:', err);
    next(err);
  }
};