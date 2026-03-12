/**
 * VoipContext.tsx — Estado Global de VoIP / Chamadas
 *
 * Gerencia o estado de chamada ativa, bloqueia chamadas simultâneas,
 * e dispara ligações via protocolo sip: (abrindo no Linphone/Zoiper).
 * 
 * O SIP config (domínio + ramal) é carregado do backend na inicialização
 * e pode ser editado pelo Manager em Gestão > Usuários > VoIP.
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
    sipDomain: string;
    extension: string;
}

interface VoipContextType {
    activeCall: ActiveCall | null;
    isCallActive: boolean;
    callRequiresFeedback: ActiveCall | null;
    sipConfig: VoipConfig;
    initiateCall: (phoneNumber: string, leadId: string, leadName: string, onCallSuccess?: () => void) => void;
    endCall: () => void;
    clearFeedback: () => void;
}

const DEFAULT_SIP_CONFIG: VoipConfig = {
    sipDomain: 'tip2.npx.com.br',
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
    const [sipConfig, setSipConfig] = useState<VoipConfig>(DEFAULT_SIP_CONFIG);

    // Load user's SIP config from backend on mount
    useEffect(() => {
        const loadSipConfig = async () => {
            try {
                // Get the current authenticated user's ID from auth context (or localStorage)
                const stored = localStorage.getItem('user');
                const user = stored ? JSON.parse(stored) : null;
                if (!user?.id) return;

                const res = await api.get(`/users/${user.id}/voice-config`);
                if (res.data?.success && res.data?.data?.enabled) {
                    const { sipDomain, extension } = res.data.data;
                    setSipConfig({
                        sipDomain: sipDomain || DEFAULT_SIP_CONFIG.sipDomain,
                        extension: extension || DEFAULT_SIP_CONFIG.extension,
                    });
                    console.log(`[VoIP] Config loaded from backend: sip:${extension}@${sipDomain}`);
                }
            } catch (err) {
                // Silently fall back to defaults if backend unreachable
                console.warn('[VoIP] Could not load SIP config from backend, using defaults');
            }
        };
        loadSipConfig();
    }, []);

    const isCallActive = activeCall !== null;

    const initiateCall = useCallback((phoneNumber: string, leadId: string, leadName: string, onCallSuccess?: () => void) => {
        if (activeCall) {
            console.warn('[VoIP] Chamada em andamento — bloqueando nova chamada.');
            return;
        }

        // Validação básica do ramal (deve ter 4 ou 5 dígitos)
        if (!sipConfig.extension || !/^\d{4,5}$/.test(sipConfig.extension)) {
            console.error('[VoIP] Ramal inválido:', sipConfig.extension);
            alert('Erro: Ramal de VoIP não configurado corretamente. Configure em Gestão > Usuários > VoIP.');
            return;
        }

        const cleanNumber = cleanPhoneNumber(phoneNumber);
        
        console.log(`[VoIP] 📞 Iniciando chamada via Backend para Lead: ${leadId} (${cleanNumber})`);

        // Dispara a chamada via nosso Backend (que por sua vez chama a API do Discador da NPX)
        api.post(`/leads/${leadId}/call`).catch(err => {
            console.error('[VoIP] Erro ao iniciar chamada via API:', err);
        });

        setActiveCall({
            leadId,
            leadName,
            phoneNumber,
            startedAt: new Date(),
        });

        // Só executa o callback de sucesso se chegamos aqui (chamada disparada)
        if (onCallSuccess) {
            onCallSuccess();
        }
    }, [activeCall, sipConfig]);

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
        sipConfig,
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
