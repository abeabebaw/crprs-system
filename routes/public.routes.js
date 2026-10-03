
// public.routes.js (no auth required)
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/public.controller');

router.get('/announcements', ctrl.getAnnouncements);
router.get('/services', ctrl.getServices);
router.get('/documents', ctrl.getPublicDocuments);
router.get('/application-status', ctrl.checkApplicationStatus);
router.get('/application-status/:applicationId', (req, res, next) => {
  req.query.applicationId = req.params.applicationId;
  return ctrl.checkApplicationStatus(req, res, next);
});
router.get('/layers', ctrl.getLayers);
router.get('/maps', ctrl.getPredefinedMaps);

module.exports = router;
