const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const ctrl = require('../controllers/document.controller');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!require('fs').existsSync(dir)) require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

router.get('/search', authenticate, authorize('FDO','DO','RO','SRO','ADMIN'), ctrl.search);
router.get('/application/:applicationId', authenticate, ctrl.getByApplication);
router.post('/upload', authenticate, authorize('FDO','DO','ADMIN'), upload.single('file'), ctrl.upload);
router.post('/:id/archive', authenticate, authorize('DO','ADMIN'), ctrl.archive);
router.post('/:id/checkout', authenticate, authorize('FDO','DO','RO','ADMIN'), ctrl.checkout);
router.post('/:id/checkin', authenticate, authorize('FDO','DO','RO','ADMIN'), ctrl.checkin);
router.get('/:id/preview', authenticate, ctrl.preview);
router.get('/:id/view', authenticate, ctrl.view);
router.get('/:id/download', authenticate, ctrl.download);
router.delete('/:id', authenticate, authorize('DO','ADMIN'), ctrl.deleteDocument);

module.exports = router;