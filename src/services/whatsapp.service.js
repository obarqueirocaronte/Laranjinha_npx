/**
 * WhatsApp Integration Stub Service
 * Prepara conectores para Z-API, Evolution API ou WhatsApp Business Oficial.
 */
class WhatsAppService {
    async sendMessage(phone, message, templateId = null) {
        console.log(`[WhatsAppService] Simulando disparo WPP para ${phone}`);
        if (templateId) {
            console.log(`Usando template: ${templateId}`);
        }

        // TODO: Implementar integração com provedor WhatsApp
        return { success: true, wamid: `wamid-${Date.now()}` };
    }

    // Webhook receiver base (para callbacks de leitura/recebimento)
    async handleWebhook(payload) {
        console.log(`[WhatsAppService] Webhook payload recebido`, payload);
        // Processar retornos...
        return { status: 'processed' };
    }
}

module.exports = new WhatsAppService();
