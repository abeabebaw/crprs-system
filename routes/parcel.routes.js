
// parcel.routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const ctrl = require('../controllers/parcel.controller');

router.get('/', authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, authorize('FDO','DO','ADMIN','GO'), ctrl.create);
router.put('/:id', authenticate, authorize('FDO','DO','ADMIN','GO'), ctrl.update);
router.get('/search/:code', authenticate, ctrl.searchByCode);

module.exports = router;

// party.routes.js, rrr.routes.js, mortgage.routes.js, injunction.routes.js, restriction.routes.js follow same pattern