const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');

// List all users
router.get('/', usersController.getUsers);

// Get user voice/SIP config
router.get('/:id/voice-config', usersController.getUserVoiceConfig);

// Save user integration config
router.post('/:id/integrations', usersController.saveUserIntegration);

// Update user role
router.put('/:id/role', usersController.updateUserRole);

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
