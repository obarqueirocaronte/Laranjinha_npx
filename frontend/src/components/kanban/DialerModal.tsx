/**
 * DialerModal.tsx — Mini Modal de Seleção de Número
 *
 * Aparece quando um lead possui dois números (contato + empresa).
 * O SDR escolhe qual número discar e a chamada é iniciada via VoipContext.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Building2, User, X } from 'lucide-react';
import { useVoip } from '../../contexts/VoipContext';

interface PhoneOption {
    label: string;
    number: string;
    icon: 'contact' | 'company';
}

interface DialerModalProps {
    isOpen: boolean;
    onClose: () => void;
    leadId: string;
    leadName: string;
    phones: PhoneOption[];
    onCallInitiated?: (number: string) => void;
}

export const DialerModal: React.FC<DialerModalProps> = ({
    isOpen,
    onClose,
    leadId,
    leadName,
    phones,
    onCallInitiated,
}) => {
    const { initiateCall, isCallActive } = useVoip();

    const handleSelect = (phone: PhoneOption) => {
        initiateCall(phone.number, leadId, leadName, () => onCallInitiated?.(phone.number));
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/15 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="relative w-full max-w-sm bg-white/90 backdrop-blur-xl border border-white/60 shadow-[0_24px_60px_rgba(0,0,0,0.12)] rounded-[32px] overflow-hidden"
                    >
                        {/* Green glow top accent */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500" />

                        {/* Header */}
                        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                    Ligar para
                                </h3>
                                <p className="text-xs font-bold text-slate-500 mt-0.5" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                                    {leadName}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl transition-all text-slate-400 hover:text-slate-600"
                            >
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Phone Options */}
                        <div className="px-6 pb-6 space-y-3">
                            {isCallActive && (
                                <div className="px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl text-center">
                                    <span className="text-[11px] font-black text-amber-700 uppercase tracking-wider">
                                        ⚠️ Chamada em andamento
                                    </span>
                                </div>
                            )}

                            {phones.map((phone, idx) => (
                                <motion.button
                                    key={idx}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleSelect(phone)}
                                    disabled={isCallActive}
                                    className="w-full flex items-center gap-4 p-4 bg-slate-50/80 hover:bg-emerald-50 border border-slate-200/60 hover:border-emerald-300 rounded-2xl transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-50/80 disabled:hover:border-slate-200/60"
                                >
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm transition-colors ${phone.icon === 'contact'
                                        ? 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200'
                                        : 'bg-blue-100 text-blue-600 group-hover:bg-blue-200'
                                        }`}>
                                        {phone.icon === 'contact'
                                            ? <User size={18} strokeWidth={2} />
                                            : <Building2 size={18} strokeWidth={2} />
                                        }
                                    </div>
                                    <div className="flex-1 text-left">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] block" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                                            {phone.label}
                                        </span>
                                        <span className="text-sm font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                            {phone.number}
                                        </span>
                                    </div>
                                    <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Phone size={14} strokeWidth={2.5} />
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
