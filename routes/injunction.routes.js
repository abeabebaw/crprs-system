const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const ctrl = require('../controllers/injunction.controller');

// Get all court injunctions on a specific parcel
router.get('/parcel/:parcelId', authenticate, ctrl.getByParcel);

// Register a new court injunction
router.post('/', authenticate, authorize('RO', 'ADMIN'), ctrl.register);

// Modify a registered court injunction
router.put('/:id', authenticate, authorize('RO', 'ADMIN'), ctrl.modify);

// Cancel a registered court injunction
router.post('/:id/cancel', authenticate, authorize('RO', 'ADMIN'), ctrl.cancel);

// Delete an incorrect court injunction before finish
router.delete('/:id', authenticate, authorize('RO', 'ADMIN'), ctrl.remove);

module.exports = router;