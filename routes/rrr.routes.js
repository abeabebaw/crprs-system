const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const ctrl = require('../controllers/rrr.controller');

// Get all rights registered on a specific parcel
router.get('/rights/parcel/:parcelId', authenticate, ctrl.getRightsByParcel);

// Register a new right (Leasehold, Old Possession, etc.)
router.post('/rights', authenticate, authorize('RO', 'ADMIN'), ctrl.registerRight);

// Modify a registered right
router.put('/rights/:id', authenticate, authorize('RO', 'ADMIN'), ctrl.modifyRight);

// Delete an incorrect registered right before finish
router.delete('/rights/:id', authenticate, authorize('RO', 'ADMIN'), ctrl.deleteRight);

module.exports = router;