import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X } from 'lucide-react';
const ICON = { strokeWidth: 1.5 };
import confetti from 'canvas-confetti';
import type { Lead } from '../../types';

interface CycleCompleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead | null;
    onResult?: (result: 'connected' | 'rejected' | 'not_connected' | 'opportunity', notes?: string) => void;
}

export const CycleCompleteModal: React.FC<CycleCompleteModalProps> = ({ isOpen, onClose, lead, onResult }) => {
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

    const [notes, setNotes] = React.useState('');
    const [isOpportunitySelected, setIsOpportunitySelected] = React.useState(false);

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
                        className="relative w-full max-w-sm bg-gradient-soft border border-orange-100 shadow-glass border border-white/60 shadow-2xl rounded-[30px] overflow-hidden p-8 text-center"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
                        >
                            <X size={20} {...ICON} />
                        </button>

                        <div className="flex flex-col items-center gap-2">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-2">
                                <CheckCircle size={32} className="text-indigo-600" {...ICON} />
                            </div>

                            <h2 className="text-xl font-black text-slate-900 leading-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>{isOpportunitySelected ? '🚀 Nova Oportunidade' : 'Ciclo Concluído!'}</h2>

                            <p className="text-xs text-slate-600 font-medium" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                                As tentativas para {lead.full_name} foram finalizadas. Qual o resultado final?
                            </p>

                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Notas/Comentários da oportunidade ou motivo do descarte..."
                                className="w-full mt-4 h-24 p-3 bg-white/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 transition-all font-[Quicksand]"
                            />

                            <div className="w-full space-y-2 mt-4">
                                {isOpportunitySelected ? (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                        <button
                                            onClick={() => handleResult('opportunity')}
                                            className="w-full py-4 bg-emerald-500 text-white rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                                        >
                                            Confirmar e Enviar Relatório
                                        </button>
                                        <button onClick={() => setIsOpportunitySelected(false)} className="text-xs font-bold text-slate-400 uppercase tracking-widest">Voltar</button>
                                    </motion.div>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleResult('opportunity')}
                                            className="w-full p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-full flex items-center justify-between group transition-all hover:shadow-[0_0_14px_rgba(16,185,129,0.25)]"
                                        >
                                            <div className="text-left pl-2">
                                                <span className="block text-sm font-bold text-emerald-900" style={{ fontFamily: 'Quicksand, sans-serif' }}>Nova Oportunidade</span>
                                                <span className="block text-[10px] text-emerald-600 font-medium italic" style={{ fontFamily: 'Quicksand, sans-serif' }}>Enviar para Novos Negócios</span>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-gradient-soft border border-orange-100 shadow-glass flex items-center justify-center text-emerald-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                <CheckCircle size={16} {...ICON} />
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => handleResult('connected')}
                                            className="w-full p-4 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-full flex items-center justify-between group transition-all"
                                        >
                                            <div className="text-left pl-2">
                                                <span className="block text-sm font-bold text-blue-900" style={{ fontFamily: 'Quicksand, sans-serif' }}>Sucesso / Conectou</span>
                                                <span className="block text-[10px] text-blue-600 font-medium italic" style={{ fontFamily: 'Quicksand, sans-serif' }}>Lead qualificado</span>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-gradient-soft border border-orange-100 shadow-glass flex items-center justify-center text-blue-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                <CheckCircle size={16} {...ICON} />
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => handleResult('not_connected')}
                                            className="w-full p-4 bg-amber-50 hover:bg-amber-100 border border-amber-100 rounded-full flex items-center justify-between group transition-all"
                                        >
                                            <div className="text-left pl-2">
                                                <span className="block text-sm font-bold text-amber-900" style={{ fontFamily: 'Quicksand, sans-serif' }}>Não Conectou</span>
                                                <span className="block text-[10px] text-amber-600 font-medium italic" style={{ fontFamily: 'Quicksand, sans-serif' }}>Tentativas esgotadas</span>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-gradient-soft border border-orange-100 shadow-glass flex items-center justify-center text-amber-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                <CheckCircle size={16} {...ICON} />
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => handleResult('rejected')}
                                            className="w-full p-4 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-full flex items-center justify-between group transition-all"
                                        >
                                            <div className="text-left pl-2">
                                                <span className="block text-sm font-bold text-slate-900" style={{ fontFamily: 'Quicksand, sans-serif' }}>Descartado / Spam</span>
                                                <span className="block text-[10px] text-slate-600 font-medium italic" style={{ fontFamily: 'Quicksand, sans-serif' }}>Lead sem perfil</span>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-gradient-soft border border-orange-100 shadow-glass flex items-center justify-center text-slate-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                <X size={16} {...ICON} />
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
