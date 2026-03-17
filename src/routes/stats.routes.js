const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');

// GET /api/v1/stats
router.get('/', statsController.getStats);

// POST /api/v1/stats/activity
router.post('/activity', statsController.updateActivity);

// POST /api/v1/stats/reset
router.post('/reset', statsController.resetStats);

// POST /api/v1/stats/complete
router.post('/complete', statsController.incrementCompleted);

// Management Report Config
router.get('/config', statsController.getReportConfig);
router.put('/config', statsController.updateReportConfig);
router.get('/global', statsController.getGlobalStats);
router.get('/history', statsController.getStatsHistory);

module.exports = router;
