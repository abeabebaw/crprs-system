const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const ctrl = require('../controllers/transaction.controller');

router.get('/', authenticate, authorize('FDO','RO','SRO','GO','SGO','ADMIN'), ctrl.getAll);
router.get('/:id', authenticate, authorize('FDO','RO','SRO','GO','SGO','ADMIN'), ctrl.getById);
router.post('/', authenticate, authorize('FDO','ADMIN'), ctrl.create);
router.put('/:id', authenticate, authorize('FDO','ADMIN'), ctrl.update);
router.delete('/:id', authenticate, authorize('FDO','ADMIN'), ctrl.remove);
router.post('/:id/initiate', authenticate, authorize('RO','GO','ADMIN'), ctrl.initiate);
router.post('/:id/load', authenticate, authorize('RO','GO','ADMIN'), ctrl.load);
router.post('/:id/finish', authenticate, authorize('RO','GO','ADMIN'), ctrl.finish);
router.post('/:id/approve', authenticate, authorize('SRO','SGO','ADMIN'), ctrl.approve);
router.post('/:id/reject', authenticate, authorize('SRO','SGO','ADMIN'), ctrl.reject);
router.post('/:id/cancel', authenticate, authorize('SRO','SGO','ADMIN'), ctrl.cancel);
router.post('/:id/deliver', authenticate, authorize('FDO','ADMIN'), ctrl.deliver);

module.exports = router;