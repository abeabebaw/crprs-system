const express = require('express');
const router = express.Router();
const { authenticate, } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const ctrl = require('../controllers/application.controller');

router.get('/', authenticate, authorize('FDO','DO','RO','SRO','ADMIN'), ctrl.getAll);
router.get('/:id', authenticate, authorize('FDO','DO','RO','SRO','ADMIN'), ctrl.getById);
router.post('/', authenticate, authorize('FDO','ADMIN'), ctrl.create);
router.put('/:id', authenticate, authorize('FDO','DO','ADMIN'), ctrl.update);
router.post('/:id/reject', authenticate, authorize('FDO','ADMIN'), ctrl.reject);
router.delete('/:id', authenticate, authorize('FDO','ADMIN'), ctrl.remove);
router.patch('/:id/status', authenticate, authorize('FDO','DO','RO','SRO','ADMIN'), ctrl.changeStatus);
router.post('/:id/transition', authenticate, authorize('FDO','DO','RO','SRO','ADMIN'), ctrl.changeStatus);

module.exports = router;