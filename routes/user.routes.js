const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const ctrl = require('../controllers/user.controller');

router.get('/', authenticate, authorize('ADMIN'), ctrl.getAll);
router.get('/online', authenticate, authorize('ADMIN'), ctrl.getOnline);
router.post('/', authenticate, authorize('ADMIN'), ctrl.create);
router.put('/:id', authenticate, authorize('ADMIN'), ctrl.update);
router.patch('/:id/lock', authenticate, authorize('ADMIN'), ctrl.toggleLock);
router.patch('/:id/role', authenticate, authorize('ADMIN'), ctrl.assignRole);
router.delete('/:id', authenticate, authorize('ADMIN'), ctrl.remove);

module.exports = router;