const express = require('express');
const router = express.Router();
const aiService = require('../services/ai.service');

// POST /api/v1/ai/structure-leads
router.post('/structure-leads', async (req, res) => {
    try {
        const { leads } = req.body;
        if (!leads || !Array.isArray(leads)) {
            return res.status(400).json({ success: false, message: 'Leads data is required' });
        }
        const structured = await aiService.structureLeads(leads);
        res.json({ success: true, data: structured });
    } catch (error) {
        console.error('AI Structure Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/v1/ai/analyze
router.post('/analyze', async (req, res) => {
    try {
        const { data, query } = req.body;
        const analysis = await aiService.analyzeSales(data, query);
        res.json({ success: true, data: analysis });
    } catch (error) {
        console.error('AI Analyze Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/v1/ai/export/mattermost
router.post('/export/mattermost', async (req, res) => {
    try {
        const { content } = req.body;
        const result = await aiService.exportToMattermost(content);
        res.json(result);
    } catch (error) {
        console.error('Mattermost Export Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/v1/ai/normalize-phone
router.post('/normalize-phone', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ success: false, message: 'phone is required' });
        }
        const result = await aiService.normalizePhone(phone);
        res.json(result);
    } catch (error) {
        console.error('AI Normalize Phone Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/v1/ai/export/opportunity
router.post('/export/opportunity', async (req, res) => {
    try {
        const { lead, notes } = req.body;
        if (!lead) {
            return res.status(400).json({ success: false, message: 'Lead data is required' });
        }
        const result = await aiService.exportOpportunity(lead, notes);
        res.json(result);
    } catch (error) {
        console.error('Opportunity Export Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
