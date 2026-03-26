import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, MessageSquare, Target, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import clsx from 'clsx';
import type { Lead } from '../../types';

interface CycleCompleteModalProps {
    isOpen: boolean;
    lead: Lead | null;
    onComplete: (outcome: 'opportunity' | 'finished', notes?: string) => void;
    onClose: () => void;
}

export const CycleCompleteModal: React.FC<CycleCompleteModalProps> = ({ isOpen, lead, onComplete, onClose }) => {
    const [step, setStep] = useState<'outcome' | 'opportunity_flow' | 'notes'>('outcome');
    const [notes, setNotes] = useState('');
    const [addNotes, setAddNotes] = useState(false);
    const [selectedOutcome, setSelectedOutcome] = useState<'opportunity' | 'finished' | null>(null);

    useEffect(() => {
        if (isOpen) {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#F97316', '#FB923C', '#FDBA74', '#FFFFFF'],
                zIndex: 200
            });
        }
    }, [isOpen]);

    const handleOutcomeClick = (outcome: 'opportunity' | 'finished') => {
        if (addNotes || outcome === 'opportunity') {
            setSelectedOutcome(outcome);
            setStep(outcome === 'opportunity' ? 'opportunity_flow' : 'notes');
        } else {
            onComplete(outcome, '');
            onClose();
            setTimeout(() => {
                setStep('outcome');
                setNotes('');
                setSelectedOutcome(null);
                setAddNotes(false);
            }, 300);
        }
    };

    const handleFinish = () => {
        if (selectedOutcome) {
            onComplete(selectedOutcome, notes);
            handleClose();
        }
    };

    const handleClose = () => {
        onClose();
        setTimeout(() => {
            setStep('outcome');
            setNotes('');
            setSelectedOutcome(null);
            setAddNotes(false);
        }, 300);
    };

    if (!isOpen || !lead) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        onClick={handleClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-sm bg-white/40 border border-white/60 shadow-glass rounded-[40px] overflow-hidden p-8 text-center backdrop-blur-2xl"
                    >
                        {/* Premium Background Elements */}
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/80 via-white/40 to-orange-100/60 pointer-events-none" />
                        <div className="absolute -top-32 -left-32 w-64 h-64 bg-orange-200/30 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-rose-200/20 rounded-full blur-3xl pointer-events-none" />

                        <button
                            onClick={handleClose}
                            className="absolute top-6 right-6 p-2 bg-black/5 hover:bg-black/10 rounded-full transition-colors text-slate-400 z-10"
                        >
                            <X size={18} strokeWidth={2.5} />
                        </button>

                        <div className="relative z-10">
                            <div className="w-16 h-16 rounded-[28px] bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center mx-auto mb-4 shadow-[0_12px_24px_rgba(249,115,22,0.3)] border border-white/40">
                                <Trophy size={28} className="text-white drop-shadow-md" strokeWidth={2.5} />
                            </div>

                            <h2 className="text-2xl font-black text-slate-800 leading-tight mb-2" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                Ciclo Finalizado!
                            </h2>
                            <p className="text-sm text-slate-500 font-medium mb-8 px-4" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                                {step === 'outcome' ? (
                                    <>A cadência de <strong className="text-orange-600 font-black">{lead.full_name}</strong> chegou ao fim. Qual o resultado final?</>
                                ) : step === 'opportunity_flow' ? (
                                    <>Confirmar <strong className="text-emerald-600 font-black">Negócio Ganho</strong>? Isso enviará a notificação para Novos Negócios.</>
                                ) : (
                                    <>Alguma observação final sobre <strong className="text-slate-700 font-black">{lead.full_name}</strong>?</>
                                )}
                            </p>

                            <AnimatePresence mode="wait">
                                {step === 'outcome' ? (
                                    <motion.div
                                        key="outcome"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="grid grid-cols-1 gap-4 mt-2"
                                    >
                                        {[
                                            { id: 'opportunity', label: 'Negócio Ganho', sub: 'Enviar Oportunidade / CRM', icon: <Target size={24} strokeWidth={2.5} />, color: 'emerald' },
                                            { id: 'finished', label: 'Encerrar Ciclo', sub: 'Sem Negócio / Perdido', icon: <CheckCircle2 size={24} strokeWidth={2.5} />, color: 'blue' },
                                        ].map((item) => (
                                            <div key={item.id} className="relative group">
                                                <button
                                                    onClick={() => handleOutcomeClick(item.id as any)}
                                                    className={clsx(
                                                        "w-full py-6 rounded-[28px] border-2 flex flex-col items-center justify-center gap-2 transition-all duration-300 shadow-sm",
                                                        item.color === 'emerald' && "bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400/30 hover:bg-emerald-700 hover:shadow-lg",
                                                        item.color === 'blue' && "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-400/30 hover:bg-blue-700 hover:shadow-lg"
                                                    )}
                                                >
                                                    <div className="transition-transform group-hover:scale-110 duration-500">
                                                        {item.icon}
                                                    </div>
                                                    <span className="text-xs font-black tracking-wider uppercase" style={{ fontFamily: 'Comfortaa, cursive' }}>{item.label}</span>
                                                </button>

                                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:-translate-y-1 z-20">
                                                    <div className="bg-slate-800 text-white text-[10px] py-2 px-4 rounded-xl whitespace-nowrap shadow-2xl font-bold border border-white/10">
                                                        {item.sub}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        
                                        {/* Toggle for notes */}
                                        <div className="col-span-2 mt-4 flex items-center justify-between px-6 py-4 bg-white/40 border border-white/60 rounded-3xl shadow-inner group">
                                            <div className="flex flex-col items-start gap-0.5 text-left">
                                                <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest leading-none">Anotações</span>
                                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight opacity-70">
                                                    {addNotes ? 'Janela de comentário ativa' : 'Pular anotações'}
                                                </span>
                                            </div>
                                            
                                            <button
                                                onClick={() => setAddNotes(!addNotes)}
                                                className={clsx(
                                                    "relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-300 focus:outline-none shadow-sm",
                                                    addNotes ? "bg-emerald-500 shadow-emerald-200" : "bg-slate-300 shadow-slate-200"
                                                )}
                                            >
                                                <span className={clsx(
                                                    "absolute left-1.5 text-[8px] font-black text-white transition-opacity duration-300",
                                                    addNotes ? "opacity-100" : "opacity-0"
                                                )}>ON</span>
                                                <span className={clsx(
                                                    "absolute right-1.5 text-[8px] font-black text-slate-500 transition-opacity duration-300",
                                                    addNotes ? "opacity-0" : "opacity-100"
                                                )}>OFF</span>
                                                <span
                                                    className={clsx(
                                                        "inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 shadow-md z-10",
                                                        addNotes ? "translate-x-8" : "translate-x-1"
                                                    )}
                                                />
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="notes"
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        className="space-y-4"
                                    >
                                        <div className="relative group">
                                            <textarea
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                placeholder={step === 'opportunity_flow' ? "Detalhes da oportunidade..." : "Notas finais..."}
                                                rows={4}
                                                className="w-full p-6 bg-white/60 border border-white/80 rounded-[32px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-orange-100 focus:bg-white/90 transition-all resize-none shadow-inner"
                                                style={{ fontFamily: 'Quicksand, sans-serif' }}
                                                autoFocus
                                            />
                                            <div className="absolute bottom-5 right-5 text-orange-300 pointer-events-none group-focus-within:text-orange-500 transition-colors">
                                                <MessageSquare size={20} />
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setStep('outcome')}
                                                className="flex-1 py-4 px-6 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full text-blue-600 font-black text-xs uppercase tracking-widest transition-all shadow-sm"
                                                style={{ fontFamily: 'Comfortaa, cursive' }}
                                            >
                                                Voltar
                                            </button>
                                            <motion.button
                                                onClick={handleFinish}
                                                whileHover={{ scale: 1.02, y: -2 }}
                                                whileTap={{ scale: 0.98 }}
                                                animate={{ 
                                                    y: [0, -2, 0],
                                                    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                                                }}
                                                className="flex-[2] py-4 px-6 bg-emerald-600 text-white rounded-full font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/40 hover:bg-emerald-700"
                                                style={{ fontFamily: 'Comfortaa, cursive' }}
                                            >
                                                {selectedOutcome === 'opportunity' ? 'Confirmar' : 'Finalizar'}
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
