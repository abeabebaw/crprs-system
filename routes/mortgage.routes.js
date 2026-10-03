const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const ctrl = require('../controllers/mortgage.controller');

// Get all mortgages on a specific parcel
router.get('/parcel/:parcelId', authenticate, ctrl.getByParcel);

// Register a new mortgage
router.post('/', authenticate, authorize('RO', 'ADMIN'), ctrl.register);

// Modify a registered mortgage
router.put('/:id', authenticate, authorize('RO', 'ADMIN'), ctrl.modify);

// Cancel a registered mortgage
router.post('/:id/cancel', authenticate, authorize('RO', 'ADMIN'), ctrl.cancel);

// Delete an incorrect mortgage before transaction finish
router.delete('/:id', authenticate, authorize('RO', 'ADMIN'), ctrl.remove);

module.exports = router;