const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const ctrl = require('../controllers/party.controller');

// Get all parties for a specific parcel
router.get('/parcel/:parcelId', authenticate, ctrl.getByParcel);

// Register a new party (Natural, Legal, or Group)
router.post('/', authenticate, authorize('RO', 'ADMIN'), ctrl.create);

// Modify registered party info
router.put('/:id', authenticate, authorize('RO', 'ADMIN'), ctrl.update);

// Delete a party
router.delete('/:id', authenticate, authorize('RO', 'ADMIN'), ctrl.remove);

module.exports = router;