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
        this.dialerToken = (process.env.DIALER_TOKEN || 'gI9KhObfCsAGBrHHrVsrIwtt').trim();
        this.dialerBaseUrl = (process.env.DIALER_BASE_URL || 'https://app.npxtech.com.br/api/dialer/start_call').trim();
        this.defaultExtension = (process.env.VISITOR_EXTENSION || '11012').trim();
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
            const cleanPhone = String(leadPhone).replace(/\D/g, "").trim();
            const ramal = String(sdrExtension || this.defaultExtension).replace(/\D/g, "").trim();
            const token = this.dialerToken.trim();
            const baseUrl = this.dialerBaseUrl.trim();
            
            // Construção da URL conforme solicitado pelo usuário
            const url = `${baseUrl}?key=${token}&extension=${ramal}&number=${cleanPhone}`;

            console.log(`[VoiceService] 📞 URL gerada: ${url}`);
            
            return { 
                success: true, 
                url: url 
            };
        } catch (error) {
            console.error('❌ Dialer API Error:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new VoiceService();
