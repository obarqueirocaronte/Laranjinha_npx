/**
 * ActiveCallBanner.tsx — Indicador Verde de Chamada Ativa
 *
 * Barra fixa no topo exibindo status da chamada em andamento,
 * nome do lead, número discado e botão de encerrar.
 */
import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff } from 'lucide-react';
import { useVoip } from '../../contexts/VoipContext';

const AUTO_END_CALL_SECONDS = 8 * 60; // 8 minutes max before auto-dismiss

export const ActiveCallBanner: React.FC = () => {
    const { activeCall, isCallActive, endCall } = useVoip();
    const autoEndRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!activeCall) {
            if (autoEndRef.current) clearTimeout(autoEndRef.current);
            return;
        }

        autoEndRef.current = setTimeout(() => {
            console.log('[VoIP] Auto-dismissing call banner after max time');
            endCall();
        }, AUTO_END_CALL_SECONDS * 1000);

        return () => {
            if (autoEndRef.current) clearTimeout(autoEndRef.current);
        };
    }, [activeCall, endCall]);

    return (
        <AnimatePresence>
            {isCallActive && activeCall && (
                <motion.div
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -60, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="fixed top-0 left-0 right-0 z-[200]"
                >
                    <div className="relative overflow-hidden">
                        {/* Animated gradient background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500" />
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.25),transparent_70%)]" />

                        {/* Pulse animation overlay */}
                        <motion.div
                            className="absolute inset-0 bg-white/10"
                            animate={{ opacity: [0, 0.15, 0] }}
                            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                        />

                        {/* Content */}
                        <div className="relative flex items-center justify-between px-6 py-2.5">
                            <div className="flex items-center gap-4">
                                {/* Pulsing phone icon */}
                                <div className="relative">
                                    <motion.div
                                        className="absolute inset-0 bg-white/30 rounded-full"
                                        animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                    />
                                    <div className="relative w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                                        <Phone size={14} className="text-white" strokeWidth={2.5} />
                                    </div>
                                </div>

                                {/* Call info */}
                                <div className="flex items-center gap-3">
                                    <span className="text-white/80 text-[10px] font-black uppercase tracking-[0.15em]" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                                        Em ligação
                                    </span>
                                    <div className="w-1 h-1 rounded-full bg-white/40" />
                                    <span className="text-white text-sm font-black tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                        {activeCall.leadName}
                                    </span>
                                    <div className="w-1 h-1 rounded-full bg-white/40" />
                                    <span className="text-white/80 text-xs font-bold" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                                        {activeCall.phoneNumber}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* End call button */}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={endCall}
                                    className="flex items-center gap-2 px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-red-500/30 transition-colors border border-red-400/50"
                                    style={{ fontFamily: 'Quicksand, sans-serif' }}
                                >
                                    <PhoneOff size={12} strokeWidth={2.5} />
                                    Encerrar
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
