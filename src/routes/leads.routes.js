const express = require('express');
const router = express.Router();
const leadsController = require('../controllers/leads.controller');
const { authenticate, authorizeSalesOps } = require('../middleware/auth.middleware');

// Specific routes MUST come before wildcard /:id routes

// GET /api/v1/leads/config
router.get('/config', authenticate, leadsController.getPipelineConfig);

// GET /api/v1/leads/columns
router.get('/columns', authenticate, leadsController.getColumns);

// POST /api/v1/leads/ingest
router.post('/ingest', authenticate, leadsController.ingestLead);

// POST /api/v1/leads/batch
router.post('/batch', authenticate, leadsController.batchExport);

// GET /api/v1/leads/active
router.get('/active', authenticate, leadsController.getActiveLeads);

// POST /api/v1/leads/bulk-action
router.post('/bulk-action', authenticate, leadsController.bulkUpdateLeads);

// GET /api/v1/leads/segments  <-- must be before /:id
router.get('/segments', authenticate, leadsController.getSegments);

// GET /api/v1/leads/cadence/stats
router.get('/cadence/stats', authenticate, leadsController.getUncadencedStats);

// POST /api/v1/leads/cadence/reset
router.post('/cadence/reset', authenticate, leadsController.resetLeadsToPending);

// POST /api/v1/leads/cadence/apply
router.post('/cadence/apply', authenticate, leadsController.applyCadenceBulk);

// POST /api/v1/leads/cadence/bulk-assign
router.post('/cadence/bulk-assign', authenticate, leadsController.bulkAssignWithCadence);

// GET /api/v1/leads/tags
router.get('/tags', authenticate, leadsController.getTags);

// GET /api/v1/leads/preview  (filter_type, filter_value, limit)
router.get('/preview', authenticate, leadsController.getLeadsPreview);

// GET /api/v1/leads/sdrs
router.get('/sdrs', authenticate, leadsController.getAllSDRs);

// POST /api/v1/leads/create-test  (SalesOps only)
router.post('/create-test', authenticate, authorizeSalesOps, leadsController.createTestLead);

// POST /api/v1/leads/:id/move
router.post('/:id/move', authenticate, leadsController.moveLead);

// POST /api/v1/leads/:id/call
router.post('/:id/call', authenticate, leadsController.initiateLeadCall);

// DELETE /api/v1/leads/clean
router.delete('/clean', authenticate, leadsController.deleteAllLeads);

// POST /api/v1/leads/pull-back
router.post('/pull-back', authenticate, leadsController.pullBackAllLeads);

// GET /api/v1/leads/:id
router.get('/:id', authenticate, leadsController.getLeadDetails);

// DELETE /api/v1/leads/:id
router.delete('/:id', authenticate, leadsController.deleteLead);

// POST /api/v1/leads/:id/assign
router.post('/:id/assign', authenticate, leadsController.assignLead);

// PATCH /api/v1/leads/:id
router.patch('/:id', authenticate, leadsController.updateLead);

// POST /api/v1/leads/:id/schedule
router.post('/:id/schedule', authenticate, leadsController.scheduleNextContact);

// POST /api/v1/leads/:id/complete-cadence
router.post('/:id/complete-cadence', authenticate, leadsController.completeCadence);
router.get('/:id/interactions', authenticate, leadsController.getInteractions);

module.exports = router;
