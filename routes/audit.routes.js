const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const ctrl = require('../controllers/audit.controller');

// Audit logs are accessible to system administrators, managers, and officers
router.get('/', authenticate, authorize('ADMIN', 'FDO', 'SRO', 'RO', 'GO', 'SGO'), ctrl.getAll);
router.get('/stats', authenticate, authorize('ADMIN', 'SRO'), ctrl.getStats);
router.get('/:id', authenticate, authorize('ADMIN', 'FDO', 'SRO', 'RO'), ctrl.getById);

module.exports = router;
