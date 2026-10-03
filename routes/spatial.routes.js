const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const ctrl = require('../controllers/spatial.controller');

// Cadastral Spatial Services (GeoJSON & Topology)
router.get('/spatial/parcels-geojson', authenticate, ctrl.getParcelsGeoJson);
router.post('/spatial/split-parcel', authenticate, authorize('DO','ADMIN'), ctrl.splitParcel);
router.post('/spatial/merge-parcels', authenticate, authorize('DO','ADMIN'), ctrl.mergeParcels);
router.post('/spatial/validate-topology', authenticate, authorize('DO','ADMIN'), ctrl.validateTopology);

// Border Points
router.post('/border-points', authenticate, authorize('DO','ADMIN'), ctrl.createBorderPoint);
router.delete('/border-points/:id', authenticate, authorize('DO','ADMIN'), ctrl.deleteBorderPoint);

// Boundary Lines
router.post('/boundary-lines', authenticate, authorize('DO','ADMIN'), ctrl.createBoundaryLine);
router.delete('/boundary-lines/:id', authenticate, authorize('DO','ADMIN'), ctrl.deleteBoundaryLine);

module.exports = router;
