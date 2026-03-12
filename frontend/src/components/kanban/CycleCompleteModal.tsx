import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X } from 'lucide-react';

import confetti from 'canvas-confetti';
import type { Lead } from '../../types';

interface CycleCompleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead | null;
    onResult?: (result: 'connected' | 'rejected' | 'not_connected' | 'opportunity', notes?: string) => void;
}

export const CycleCompleteModal: React.FC<CycleCompleteModalProps> = ({ isOpen, onClose, lead, onResult }) => {
    const [notes, setNotes] = React.useState('');
    const [isOpportunitySelected, setIsOpportunitySelected] = React.useState(false);

    useEffect(() => {
        if (isOpen) {
            try {
                if (typeof confetti === 'function') {
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#f97316', '#fbbf24', '#3b82f6'],
                    });
                } else if (confetti && typeof (confetti as any).default === 'function') {
                    (confetti as any).default({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#f97316', '#fbbf24', '#3b82f6'],
                    });
                }
            } catch (e) {
                console.error('Confetti error:', e);
            }
        }
    }, [isOpen]);

    if (!lead) return null;

    const handleResult = (result: 'connected' | 'rejected' | 'not_connected' | 'opportunity') => {
        if (result === 'opportunity' && !isOpportunitySelected) {
            setIsOpportunitySelected(true);
            return;
        }

        if (onResult) {
            // @ts-ignore - explicitly passing notes if it's an opportunity
            onResult(result, notes);
        }
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 text-left">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        className="relative w-full max-w-sm bg-white/40 border border-white/60 shadow-glass rounded-[40px] overflow-hidden p-8 text-center backdrop-blur-2xl"
                    >
                        {/* Soft Nude Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/80 via-white/40 to-orange-100/60 pointer-events-none" />
                        
                        {/* Premium Reflections */}
                        <div className="absolute -top-32 -left-32 w-64 h-64 bg-emerald-100/30 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-orange-200/40 rounded-full blur-3xl pointer-events-none" />

                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 bg-black/5 hover:bg-black/10 rounded-full transition-colors text-slate-400 shadow-sm border border-white/40 z-10"
                        >
                            <X size={18} strokeWidth={2.5} />
                        </button>

                        <div className="relative z-10 flex flex-col items-center gap-2">
                            <div className="w-16 h-16 rounded-[28px] bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center mb-3 shadow-[0_12px_24px_rgba(249,115,22,0.3)] border border-white/40">
                                <CheckCircle size={28} className="text-white drop-shadow-md" strokeWidth={2.5} />
                            </div>

                            <h2 className="text-2xl font-black text-slate-800 leading-tight mt-1" style={{ fontFamily: 'Comfortaa, cursive' }}>{isOpportunitySelected ? '🚀 Nova Oportunidade' : 'Ciclo Concluído!'}</h2>

                            <p className="text-sm text-slate-500 font-medium px-4 mb-2" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                                As tentativas para {lead.full_name} foram finalizadas. Qual o resultado final?
                            </p>

                            <div className="w-full relative group">
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Notas da oportunidade ou motivo do descarte..."
                                    className="w-full mt-4 h-24 p-4 bg-white/60 border border-white/80 rounded-2xl text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-100 transition-all font-[Quicksand] resize-none"
                                />
                            </div>

                            <div className="w-full space-y-3 mt-5">
                                {isOpportunitySelected ? (
                                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                                        <button
                                            onClick={() => handleResult('opportunity')}
                                            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-600 transition-all"
                                        >
                                            Confirmar e Enviar Relatório
                                        </button>
                                        <button onClick={() => setIsOpportunitySelected(false)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-orange-500 transition-colors">Voltar</button>
                                    </motion.div>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleResult('opportunity')}
                                            className="w-full p-4 bg-gradient-to-r from-emerald-50 to-white/60 hover:from-emerald-100 hover:to-white/90 border border-emerald-200 rounded-[28px] flex items-center justify-between group transition-all"
                                        >
                                            <div className="text-left pl-2">
                                                <span className="block text-sm font-black text-emerald-800" style={{ fontFamily: 'Comfortaa, cursive' }}>Nova Oportunidade</span>
                                                <span className="block text-[10px] text-emerald-600 font-bold uppercase tracking-widest" style={{ fontFamily: 'Quicksand, sans-serif' }}>Enviar p/ Novos Negócios</span>
                                            </div>
                                            <div className="w-9 h-9 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110">
                                                <CheckCircle size={18} strokeWidth={2.5} />
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => handleResult('connected')}
                                            className="w-full p-4 bg-white/60 hover:bg-white/90 border border-white/80 rounded-[28px] flex items-center justify-between group transition-all"
                                        >
                                            <div className="text-left pl-2">
                                                <span className="block text-sm font-black text-slate-800" style={{ fontFamily: 'Comfortaa, cursive' }}>Sucesso / Conectou</span>
                                                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest" style={{ fontFamily: 'Quicksand, sans-serif' }}>Lead qualificado</span>
                                            </div>
                                            <div className="w-9 h-9 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110">
                                                <CheckCircle size={18} strokeWidth={2.5} />
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => handleResult('not_connected')}
                                            className="w-full p-4 bg-white/60 hover:bg-white/90 border border-white/80 rounded-[28px] flex items-center justify-between group transition-all"
                                        >
                                            <div className="text-left pl-2">
                                                <span className="block text-sm font-black text-slate-800" style={{ fontFamily: 'Comfortaa, cursive' }}>Não Conectou</span>
                                                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest" style={{ fontFamily: 'Quicksand, sans-serif' }}>Tentativas esgotadas</span>
                                            </div>
                                            <div className="w-9 h-9 rounded-2xl bg-slate-400 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110">
                                                <X size={18} strokeWidth={2.5} />
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => handleResult('rejected')}
                                            className="w-full p-4 bg-rose-50/50 hover:bg-rose-100/80 border border-rose-200/60 rounded-[28px] flex items-center justify-between group transition-all"
                                        >
                                            <div className="text-left pl-2">
                                                <span className="block text-sm font-black text-rose-800" style={{ fontFamily: 'Comfortaa, cursive' }}>Descartado / Spam</span>
                                                <span className="block text-[10px] text-rose-600 font-bold uppercase tracking-widest" style={{ fontFamily: 'Quicksand, sans-serif' }}>Lead sem perfil</span>
                                            </div>
                                            <div className="w-9 h-9 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110">
                                                <X size={18} strokeWidth={2.5} />
                                            </div>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
