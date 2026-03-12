/**
 * VoipContext.tsx — Estado Global de VoIP / Chamadas
 *
 * Gerencia o estado de chamada ativa e dispara ligações via 
 * API de Discagem NPX (HTTP Request).
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import api from '../lib/api';

export interface ActiveCall {
    leadId: string;
    leadName: string;
    phoneNumber: string;
    startedAt: Date;
}

interface VoipConfig {
    extension: string;
}

interface VoipContextType {
    activeCall: ActiveCall | null;
    isCallActive: boolean;
    callRequiresFeedback: ActiveCall | null;
    voiceConfig: VoipConfig;
    initiateCall: (phoneNumber: string, leadId: string, leadName: string, onCallSuccess?: () => void) => void;
    endCall: () => void;
    clearFeedback: () => void;
}

const DEFAULT_VOICE_CONFIG: VoipConfig = {
    extension: '11012',
};

const VoipContext = createContext<VoipContextType | undefined>(undefined);

/**
 * Limpa o número de telefone, mantendo apenas dígitos
 */
function cleanPhoneNumber(phone: string): string {
    return phone.replace(/\D/g, '');
}

export function VoipProvider({ children }: { children: ReactNode }) {
    const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
    const [callRequiresFeedback, setCallRequiresFeedback] = useState<ActiveCall | null>(null);
    const [voiceConfig, setVoiceConfig] = useState<VoipConfig>(DEFAULT_VOICE_CONFIG);

    // Load user's Voice config from backend on mount
    useEffect(() => {
        const loadVoiceConfig = async () => {
            try {
                // Get the current authenticated user's ID from auth context (or localStorage)
                const stored = localStorage.getItem('user');
                const user = stored ? JSON.parse(stored) : null;
                if (!user?.id) return;

                const res = await api.get(`/users/${user.id}/voice-config`);
                if (res.data?.success && res.data?.data?.enabled) {
                    const { extension } = res.data.data;
                    setVoiceConfig({
                        extension: extension || DEFAULT_VOICE_CONFIG.extension,
                    });
                    console.log('[VoIP] Voice config loaded from backend: Ramal', extension);
                }
            } catch (err) {
                // Silently fall back to defaults if backend unreachable
                console.warn('[VoIP] Could not load Voice config from backend, using defaults');
            }
        };
        loadVoiceConfig();
    }, []);

    const isCallActive = activeCall !== null;

    const initiateCall = useCallback((phoneNumber: string, leadId: string, leadName: string, onCallSuccess?: () => void) => {
        if (activeCall) {
            alert('Já existe uma chamada ativa.');
            return;
        }

        const cleanNumber = cleanPhoneNumber(phoneNumber);
        if (cleanNumber.length < 8) {
            alert('Número de telefone inválido.');
            return;
        }

        if (!voiceConfig.extension || !/^\d{4,5}$/.test(voiceConfig.extension)) {
            console.error('[VoIP] Ramal inválido:', voiceConfig.extension);
            alert('Seu ramal não está configurado corretamente. Verifique em Perfil.');
            return;
        }
        
        console.log(`[VoIP] 📞 Solicitando chamada ao Backend para Lead: ${leadId} (${cleanNumber})`);

        // Dispara a chamada via nosso Backend (que por sua vez chama a API do Discador da NPX via server-side)
        api.post(`/leads/${leadId}/call`, { phoneNumber: cleanNumber })
            .then(res => {
                if (res.data?.success) {
                    console.log('[VoIP] 📞 Chamada iniciada com sucesso pelo backend');
                    
                    setActiveCall({
                        leadId,
                        leadName,
                        phoneNumber,
                        startedAt: new Date(),
                    });

                    // Só executa o callback de sucesso se chegamos aqui
                    if (onCallSuccess) {
                        onCallSuccess();
                    }
                } else {
                    console.error('[VoIP] Erro na resposta da API:', res.data);
                    const errorMsg = res.data?.error || 'O backend não conseguiu disparar a chamada.';
                    
                    // Supress alert if it's the template bypass message (sometimes success=false is returned by mistake but msg is successful)
                    const errorStr = typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg);
                    if (errorStr.includes('Template Bypass') || errorStr.includes('iniciada com sucesso')) {
                        console.log('[VoIP] ⚠️ Suppression of alert for known template bypass.');
                        return;
                    }
                    
                    alert('Erro ao iniciar chamada: ' + errorStr);
                }
            })
            .catch(err => {
                console.error('[VoIP] Erro ao iniciar chamada via API:', err);
                const errorObj = err.response?.data?.error;
                const errorMsg = typeof errorObj === 'object' ? (errorObj.message || JSON.stringify(errorObj)) : (errorObj || err.message);
                
                // Final safety: check if the catch caught a template error string
                const errorStr = String(errorMsg);
                if (errorStr.includes('missing a template') || errorStr.includes('Template Bypass') || errorStr.includes('start_call')) {
                     console.log('[VoIP] ⚠️ Ignoring Rails template error in catch block.');
                     // We still consider it a "success" for the user experience if it reached this point
                     return;
                }

                alert('Erro ao iniciar chamada: ' + errorMsg);
            });
    }, [activeCall, voiceConfig]);


    const endCall = useCallback(() => {
        console.log('[VoIP] ☎️ Chamada encerrada. Aguardando feedback da ligação.');
        setCallRequiresFeedback(activeCall);
        setActiveCall(null);
    }, [activeCall]);

    const clearFeedback = useCallback(() => {
        setCallRequiresFeedback(null);
    }, []);

    const value: VoipContextType = {
        activeCall,
        isCallActive,
        callRequiresFeedback,
        voiceConfig,
        initiateCall,
        endCall,
        clearFeedback,
    };

    return <VoipContext.Provider value={value}>{children}</VoipContext.Provider>;
}

export function useVoip() {
    const context = useContext(VoipContext);
    if (context === undefined) {
        throw new Error('useVoip must be used within a VoipProvider');
    }
    return context;
}
