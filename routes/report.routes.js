// report.routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const ctrl = require('../controllers/report.controller');

router.get('/dashboard', authenticate, authorize('FDO','DO','RO','SRO','GO','SGO','ADMIN'), ctrl.dashboard);
router.get('/lead-time', authenticate, authorize('FDO','DO','RO','SRO','GO','SGO','ADMIN'), ctrl.leadTime);
router.get('/waiting-time', authenticate, authorize('FDO','DO','RO','SRO','GO','SGO','ADMIN'), ctrl.waitingTime);
router.get('/employee-performance', authenticate, authorize('FDO','DO','RO','SRO','GO','SGO','ADMIN'), ctrl.employeePerformance);
router.get('/property-right', authenticate, authorize('FDO','DO','RO','SRO','GO','SGO','ADMIN'), ctrl.propertyRightReport);
router.get('/property-owner', authenticate, authorize('FDO','DO','RO','SRO','GO','SGO','ADMIN'), ctrl.propertyOwnerReport);

module.exports = router;
