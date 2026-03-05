const express = require('express');
const router = express.Router();
const auroraService = require('../services/aurora.service');

// GET /api/v1/aurora/templates
// Busca as campanhas/templates no AuroraChat (ou retorna mock temporário)
router.get('/templates', async (req, res) => {
    try {
        const templates = await auroraService.getTemplates(10);
        res.json({ success: true, data: templates });
    } catch (error) {
        console.error('Erro na rota de templates Aurora:', error);
        res.status(500).json({ success: false, message: 'Falha ao buscar templates do Aurora.' });
    }
});

// GET /api/v1/aurora/templates/:id
router.get('/templates/:id', async (req, res) => {
    try {
        const template = await auroraService.getTemplateById(req.params.id);
        res.json({ success: true, data: template });
    } catch (error) {
        console.error(`Erro ao buscar template ${req.params.id}:`, error);
        res.status(500).json({ success: false, message: 'Falha ao buscar detalhes do template.' });
    }
});

// POST /api/v1/aurora/send
// Envia uma mensagem via template de campanha do AuroraChat
router.post('/send', async (req, res) => {
    try {
        const { campaignId, phoneNumber, auroraUserId, clientData } = req.body;

        if (!campaignId || !phoneNumber) {
            return res.status(400).json({ success: false, message: 'campaignId e phoneNumber são obrigatórios' });
        }

        const result = await auroraService.sendCampaignMessage(campaignId, phoneNumber, auroraUserId, clientData || {});
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Erro na rota de envio Aurora:', error);
        res.status(500).json({ success: false, message: 'Falha ao processar envio de campanha.' });
    }
});

module.exports = router;
