const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const { authenticate } = require('../middleware/auth.middleware');

// GET /api/v1/stats
router.get('/', authenticate, statsController.getStats);

// POST /api/v1/stats/activity
router.post('/activity', authenticate, statsController.updateActivity);

// POST /api/v1/stats/reset
router.post('/reset', authenticate, statsController.resetStats);

// POST /api/v1/stats/complete
router.post('/complete', authenticate, statsController.incrementCompleted);

// Management Report Config
router.get('/config', authenticate, statsController.getReportConfig);
router.put('/config', authenticate, statsController.updateReportConfig);
router.get('/global', authenticate, statsController.getGlobalStats);
router.get('/history', authenticate, statsController.getStatsHistory);
router.get('/full', authenticate, statsController.getBIFullStats);
router.post('/report/manual', authenticate, statsController.sendManualReport);

module.exports = router;
