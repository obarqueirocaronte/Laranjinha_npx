const express = require('express');
const router = express.Router();
const controller = require('../controllers/system.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Protect system routes
router.use(authMiddleware.authenticate);
router.use(authMiddleware.authorizeSalesOps);

/** Test all system connections */
router.get('/test-connections', controller.testConnections);

/** Validate database schema before migration */
router.get('/validate-schema', controller.getSchemaValidation);

/** Report configuration */
const statsController = require('../controllers/stats.controller');
router.get('/report-config', statsController.getReportConfig);
router.put('/report-config', statsController.updateReportConfig);

/** Manual report trigger */
router.post('/report/manual', controller.sendManualReport);

module.exports = router;
