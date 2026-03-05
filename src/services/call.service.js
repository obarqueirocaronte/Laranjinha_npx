/**
 * VoIP / Call Integration Stub Service
 * Prepara terreno para click-to-call com Twilio, Zenvia, ou similar.
 */
class CallService {
    async initiateCall(sdrPhone, leadPhone) {
        console.log(`[CallService] Iniciando Click-To-Call bridging...`);
        console.log(`De SDR: ${sdrPhone} -> Para Lead: ${leadPhone}`);

        // TODO: Iniciar ligação via API Provider VoIP
        return { success: true, callId: `call-${Date.now()}` };
    }
}

module.exports = new CallService();
