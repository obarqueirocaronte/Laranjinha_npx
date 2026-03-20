const express = require('express');
const router = express.Router();

// Authentication Routes
router.use('/auth', require('./auth.routes'));

// User Management Routes
router.use('/users', require('./users.routes'));

// Lead Routes
router.use('/leads', require('./leads.routes'));

// Pipeline Routes
// router.use('/pipeline', require('./pipeline.routes'));

// Integration Routes
// router.use('/integrations', require('./integrations.routes'));

// Stats Routes
router.use('/stats', require('./stats.routes'));

// Notification Routes
router.use('/notifications', require('./notifications.routes'));

// Cadences Routes (reconstrução do sistema de cadências)
router.use('/cadences', require('./cadences.routes'));

// Aurora Chat Routes
router.use('/aurora', require('./aurora.routes'));

// AI Routes
router.use('/ai', require('./ai.routes'));

module.exports = router;
