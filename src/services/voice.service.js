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
        this.sipDomain = process.env.SIP_DOMAIN || 'tip3.npxtech.com.br';
        this.apiUrl = process.env.VOIP_API_URL;
        this.apiKey = process.env.VOIP_API_KEY;
        this.defaultExtension = process.env.VISITOR_EXTENSION || '11012';
    }

    /**
     * Retorna a configuração SIP para o frontend montar os links sip:
     * @param {string} userExtension - Ramal configurado do usuário (ou usa o padrão)
     */
    getSipConfig(userExtension) {
        return {
            sipDomain: this.sipDomain,
            extension: userExtension || this.defaultExtension,
        };
    }

    /**
     * Dispara uma chamada entre o Ramal do SDR e o Lead
     * @param {string} sdrExtension - Ramal do SDR logado
     * @param {string} leadPhone - Telefone do lead
     */
    async initiateCall(sdrExtension, leadPhone) {
        if (!this.apiUrl || !this.apiKey) {
            console.error('❌ VoIP Credentials missing in .env (PBX API mode not configured)');
            return { success: false, error: 'VoIP Auth missing — using sip: protocol instead' };
        }

        try {
            // Este modelo assume uma integração Click-to-Call padrão (AMI ou Rest API do PBX)
            const response = await axios.post(this.apiUrl, {
                extension: sdrExtension,
                destination: leadPhone.replace(/\D/g, ""),
                context: process.env.VOIP_CONTEXT || "from-internal",
                priority: 1
            }, {
                headers: { 'X-API-KEY': this.apiKey }
            });

            console.log(`📞 Call initiated: ${sdrExtension} -> ${leadPhone}`);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('❌ VoIP Call Error:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new VoiceService();
