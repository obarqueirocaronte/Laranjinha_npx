const axios = require('axios');
require('dotenv').config();

/**
 * Voice Service - VoIP Online Integration (Zoiper / SIP)
 * 
 * SIP Domain: tip3.npxtech.com.br
 * Protocol: sip: URI scheme (handled by Zoiper on the client)
 * 
 * This service supports both:
 *   A) Frontend sip: protocol (Zoiper opens directly) - primary approach
 *   B) Backend Click-to-Call via PBX API (optional, for future use)
 */
class VoiceService {
    constructor() {
        this.dialerToken = process.env.DIALER_TOKEN || 'gI9KhObfCsAGBrHHrVsrIwtt';
        this.dialerBaseUrl = process.env.DIALER_BASE_URL || 'https://app.npxtech.com.br/api/dialer/start_call';
        this.defaultExtension = process.env.VISITOR_EXTENSION || '11012';
    }

    /**
     * Retorna a configuração SIP para o frontend (pode ser usado para exibir ramal)
     */
    getSipConfig(userExtension) {
        return {
            sipDomain: 'app.npxtech.com.br',
            extension: userExtension || this.defaultExtension,
        };
    }

    /**
     * Dispara uma chamada utilizando a API do discador da NPX
     * URL: https://app.npxtech.com.br/api/dialer/start_call?token=(TOKEN)&extension=(RAMAL)&number=(TELEFONE)
     * @param {string} sdrExtension - Ramal do SDR logado
     * @param {string} leadPhone - Telefone do lead
     */
    async initiateCall(sdrExtension, leadPhone) {
        try {
            const cleanPhone = leadPhone.replace(/\D/g, "");
            const ramal = sdrExtension || this.defaultExtension;
            
            // Construção da URL conforme solicitado pelo usuário
            const url = `${this.dialerBaseUrl}?token=${this.dialerToken}&extension=${ramal}&number=${cleanPhone}`;

            console.log(`[VoiceService] 📞 Iniciando chamada via API: ${url}`);
            
            const response = await axios.get(url);

            return { 
                success: true, 
                data: response.data,
                url: url // para debug se necessário
            };
        } catch (error) {
            console.error('❌ Dialer API Error:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new VoiceService();
