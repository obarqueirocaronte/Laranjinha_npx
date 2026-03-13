const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const { authenticate } = require('../middleware/auth.middleware');

// List all users
router.get('/', usersController.getUsers);

// Get user voice config
router.get('/:id/voice-config', usersController.getUserVoiceConfig);

// Save user integration config
router.post('/:id/integrations', usersController.saveUserIntegration);

// Test settings
router.get('/test-config', authenticate, usersController.getTestSettings);
router.post('/test-config', authenticate, usersController.saveTestSettings);

// Update user role
router.put('/:id/role', usersController.updateUserRole);

// Update user profile
router.put('/:id/profile', authenticate, usersController.updateUserProfile);

// Delete user
router.delete('/:id', usersController.deleteUser);

// ==========================================
// INVITE MANAGEMENT
// ==========================================
router.post('/invites', usersController.createInvite);
router.get('/invites', usersController.listInvites);
router.delete('/invites/clean', usersController.deleteAllInvites);
router.delete('/invites/:id', usersController.revokeInvite);

module.exports = router;
