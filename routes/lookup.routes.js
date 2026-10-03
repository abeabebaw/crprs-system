// lookup.routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const ctrl = require('../controllers/lookup.controller');

router.get('/types', authenticate, ctrl.getTypes);
router.get('/types/:typeId/values', authenticate, ctrl.getValues);
router.post('/values', authenticate, authorize('ADMIN'), ctrl.addValue);
router.put('/values/:id', authenticate, authorize('ADMIN'), ctrl.updateValue);
router.delete('/values/:id', authenticate, authorize('ADMIN'), ctrl.deleteValue);
router.get('/required-documents', authenticate, ctrl.getRequiredDocuments);
router.post('/required-documents', authenticate, authorize('ADMIN'), ctrl.addRequiredDocument);
router.get('/business-rules', authenticate, ctrl.getBusinessRules);
router.post('/business-rules', authenticate, authorize('ADMIN'), ctrl.addBusinessRule);

module.exports = router;

