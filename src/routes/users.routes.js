const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');

// List all users
router.get('/', usersController.getUsers);

// Get user voice/SIP config
router.get('/:id/voice-config', usersController.getUserVoiceConfig);

// Save user integration config
router.post('/:id/integrations', usersController.saveUserIntegration);

module.exports = router;
