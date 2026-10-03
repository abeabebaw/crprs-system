const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const ctrl = require('../controllers/restriction.controller');

// Get all general restrictions on a specific parcel
router.get('/parcel/:parcelId', authenticate, ctrl.getByParcel);

// Register a new general restriction
router.post('/', authenticate, authorize('RO', 'ADMIN'), ctrl.register);

// Modify a registered general restriction
router.put('/:id', authenticate, authorize('RO', 'ADMIN'), ctrl.modify);

// Cancel a registered general restriction
router.post('/:id/cancel', authenticate, authorize('RO', 'ADMIN'), ctrl.cancel);

// Delete an incorrect general restriction before finish
router.delete('/:id', authenticate, authorize('RO', 'ADMIN'), ctrl.remove);

module.exports = router;