const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All notification routes require authentication
router.use(authenticate);

// GET /api/v1/notifications
router.get('/', notificationsController.getNotifications);

// POST /api/v1/notifications/:id/read
router.post('/:id/read', notificationsController.markAsRead);

module.exports = router;
