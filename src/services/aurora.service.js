const axios = require('axios');

class AuroraService {
    constructor() {
        this.baseURL = process.env.AURORA_API_URL || 'https://api.aurorachat.com.br';
        this.token = process.env.AURORA_ACCESS_TOKEN;
    }

    get headers() {
        return {
            'access-token': this.token,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Busca a lista de Campanhas/Templates do Aurora Chat.
     * Como a documentação oficial recebida não especificou a rota de listagem (GET),
     * estamos tentando acessar a rota base de campaigns. Se falhar, retornamos um mock.
     * Na API V3, a listagem pode ocorrer em /v3/campaigns ou /v3/templates.
     */
    async getTemplates(limit = 10) {
        if (!this.token) {
            console.warn('[AuroraService] AURORA_ACCESS_TOKEN não configurado. Retornando dados mockados.');
            return this.getMockTemplates(limit);
        }

        try {
            // Tenta buscar as campanhas ativas
            const response = await axios.get(`${this.baseURL}/v3/campaigns`, {
                headers: this.headers,
                params: { per_page: limit, page: 1 }
            });

            // Caso a API retorne campanhas com sucesso
            return response.data;

        } catch (error) {
            console.error(`[AuroraService] Erro ao buscar templates/campaigns: ${error.message}`);
            // Fallback para mock se a rota não existir ou dar 401/404/etc.
            return this.getMockTemplates(limit);
        }
    }

    /**
     * Retorna templates simulados para possibilitar o desenvolvimento da interface
     * enquanto a rota de listagem oficial não é definida.
     */
    getMockTemplates(limit) {
        const mocks = [
            { id: '1a2b3c', name: 'Primeiro Contato - Outbound', content: 'Olá {{name}}, tudo bem? Somos da NPX...', type: 'WHATSAPP' },
            { id: '4d5e6f', name: 'Follow-up 1 (Sem Resposta)', content: 'Oi {{name}}, conseguiu ler a mensagem anterior?', type: 'WHATSAPP' },
            { id: '7g8h9i', name: 'Agendamento de Call', content: 'Podemos marcar uma reunião rápida na próxima semana?', type: 'WHATSAPP' },
            { id: '0j1k2l', name: 'Campanha de Reengajamento', content: 'Notamos que faz um tempo desde nosso último contato.', type: 'WHATSAPP' }
        ];

        return {
            campaigns: mocks.slice(0, limit),
            _meta: { source: 'mock', note: 'A rota GET de Campanhas do AuroraChat não foi documentada no Postman.' }
        };
    }

    /**
     * Busca detalhes de um template específico por ID.
     */
    async getTemplateById(id) {
        if (!this.token) {
            const mock = this.getMockTemplates(10).campaigns.find(t => t.id === id);
            return mock || { id, name: 'Template Desconhecido', content: 'Conteúdo não encontrado no mock.', type: 'WHATSAPP' };
        }

        try {
            const response = await axios.get(`${this.baseURL}/v3/campaigns/${id}`, {
                headers: this.headers
            });
            return response.data;
        } catch (error) {
            console.error(`[AuroraService] Erro ao buscar template ${id}: ${error.message}`);
            // Fallback para mock
            const mock = this.getMockTemplates(10).campaigns.find(t => t.id === id);
            return mock || { id, name: 'Template Desconhecido', content: 'Erro ao buscar via API.', type: 'WHATSAPP' };
        }
    }

    /**
     * Dispara uma campanha/mensagem para um usuário específico.
     * Baseado na documentação: POST /v3/campaigns/:id/messages
     */
    async sendCampaignMessage(campaignId, phoneNumber, auroraUserId, clientData) {
        try {
            const payload = {
                messages: [
                    {
                        identifier: phoneNumber,
                        internal_code: clientData.internalCode || `SEND_${Date.now()}`,
                        name: clientData.name || 'Cliente',
                        parameters: `${clientData.name}|Olá|${Date.now()}` // Exemplo base da documentação
                    }
                ]
            };

            const response = await axios.post(`${this.baseURL}/v3/campaigns/${campaignId}/messages`, payload, {
                headers: this.headers
            });

            return response.data;
        } catch (error) {
            console.error(`[AuroraService] Erro ao enviar mensagem da campanha:`, error.response?.data || error.message);
            throw error;
        }
    }
}

module.exports = new AuroraService();
