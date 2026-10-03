const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const ctrl = require('../controllers/registration.controller');

// ============================================
// REGISTRATION OFFICER ROUTES
// ============================================

// Transaction Management
// Get all transactions for RO view (with CREATED, INITIATED, IN_PROCESS statuses)
router.get('/transactions', authenticate, authorize('RO', 'ADMIN'), ctrl.getTransactionsForRO);

// Load transaction for registration (Load command)
router.get('/transactions/:id/load', authenticate, authorize('RO', 'ADMIN'), ctrl.loadTransaction);

// Finish transaction (mark as ready for approval)
router.post('/transactions/:id/finish', authenticate, authorize('RO', 'ADMIN'), ctrl.finishTransaction);

// ============================================
// HOLDER/PARTY MANAGEMENT
// ============================================

// Register Natural Party (Natural Person)
router.post('/parties/natural', authenticate, authorize('RO', 'ADMIN'), ctrl.registerNaturalParty);

// Register Legal Party (Organization/Company)
router.post('/parties/legal', authenticate, authorize('RO', 'ADMIN'), ctrl.registerLegalParty);

// Register Group Party (Family/Group)
router.post('/parties/group', authenticate, authorize('RO', 'ADMIN'), ctrl.registerGroupParty);

// Add member to Group Party
router.post('/parties/group/:groupPartyId/members', authenticate, authorize('RO', 'ADMIN'), ctrl.addGroupMember);

// Update Party (Natural, Legal, or Group)
router.put('/parties/:id', authenticate, authorize('RO', 'ADMIN'), ctrl.updateParty);

// Update Group Member
router.put('/parties/group/members/:id', authenticate, authorize('RO', 'ADMIN'), ctrl.updateGroupMember);

// Delete Party (only if not in finished transaction)
router.delete('/parties/:id', authenticate, authorize('RO', 'ADMIN'), ctrl.deleteParty);

// Delete Group Member
router.delete('/parties/group/members/:id', authenticate, authorize('RO', 'ADMIN'), ctrl.deleteGroupMember);

// Get all parties for a parcel
router.get('/parcels/:parcelId/parties', authenticate, authorize('RO', 'SRO', 'ADMIN'), ctrl.getPartiesByParcel);

// Get single party with details
router.get('/parties/:id', authenticate, authorize('RO', 'SRO', 'ADMIN'), ctrl.getPartyById);

// Search parties (for holder selection)
router.get('/parties/search', authenticate, authorize('RO', 'SRO', 'ADMIN'), ctrl.searchParties);

// ============================================
// RRR MANAGEMENT
// ============================================

// Register Right (RRR)
router.post('/rights', authenticate, authorize('RO', 'ADMIN'), ctrl.registerRight);

// Update Right
router.put('/rights/:id', authenticate, authorize('RO', 'ADMIN'), ctrl.updateRight);

// Get rights by parcel
router.get('/parcels/:parcelId/rights', authenticate, authorize('RO', 'SRO', 'ADMIN'), ctrl.getRightsByParcel);

// ============================================
// RESTRICTIONS MANAGEMENT
// ============================================

// Register Mortgage
router.post('/mortgages', authenticate, authorize('RO', 'ADMIN'), ctrl.registerMortgage);

// Register Court Injunction
router.post('/injunctions', authenticate, authorize('RO', 'ADMIN'), ctrl.registerCourtInjunction);

// Register General Restriction/Responsibility
router.post('/restrictions', authenticate, authorize('RO', 'ADMIN'), ctrl.registerRestriction);

module.exports = router;
