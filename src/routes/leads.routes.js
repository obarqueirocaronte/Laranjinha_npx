const express = require('express');
const router = express.Router();
const leadsController = require('../controllers/leads.controller');

// Specific routes MUST come before wildcard /:id routes

// GET /api/v1/leads/columns
router.get('/columns', leadsController.getColumns);

// POST /api/v1/leads/ingest
router.post('/ingest', leadsController.ingestLead);

// POST /api/v1/leads/batch
router.post('/batch', leadsController.batchExport);

// GET /api/v1/leads/active
router.get('/active', leadsController.getActiveLeads);

// POST /api/v1/leads/bulk-action
router.post('/bulk-action', leadsController.bulkUpdateLeads);

// GET /api/v1/leads/segments  <-- must be before /:id
router.get('/segments', leadsController.getSegments);

// GET /api/v1/leads/cadence/stats
router.get('/cadence/stats', leadsController.getUncadencedStats);

// POST /api/v1/leads/cadence/reset
router.post('/cadence/reset', leadsController.resetLeadsToPending);

// POST /api/v1/leads/cadence/apply
router.post('/cadence/apply', leadsController.applyCadenceBulk);

// POST /api/v1/leads/cadence/bulk-assign
router.post('/cadence/bulk-assign', leadsController.bulkAssignWithCadence);

// GET /api/v1/leads/tags
router.get('/tags', leadsController.getTags);

// GET /api/v1/leads/preview  (filter_type, filter_value, limit)
router.get('/preview', leadsController.getLeadsPreview);

// GET /api/v1/leads/sdrs
router.get('/sdrs', leadsController.getAllSDRs);

// POST /api/v1/leads/:id/move
router.post('/:id/move', leadsController.moveLead);

// DELETE /api/v1/leads/clean
router.delete('/clean', leadsController.deleteAllLeads);

// POST /api/v1/leads/pull-back
router.post('/pull-back', leadsController.pullBackAllLeads);

// GET /api/v1/leads/:id
router.get('/:id', leadsController.getLeadDetails);

// DELETE /api/v1/leads/:id
router.delete('/:id', leadsController.deleteLead);

// POST /api/v1/leads/:id/assign
router.post('/:id/assign', leadsController.assignLead);

// PATCH /api/v1/leads/:id
router.patch('/:id', leadsController.updateLead);

// POST /api/v1/leads/:id/schedule
router.post('/:id/schedule', leadsController.scheduleNextContact);

module.exports = router;
