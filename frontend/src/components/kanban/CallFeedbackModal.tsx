import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, CheckCircle, X, XCircle, Voicemail, MessageSquare, CalendarClock } from 'lucide-react';
import type { ActiveCall } from '../../contexts/VoipContext';
import clsx from 'clsx';

interface CallFeedbackModalProps {
    isOpen: boolean;
    callData: ActiveCall | null;
    onResult: (result: 'success' | 'busy' | 'voicemail' | 'invalid' | 'reschedule' | 'no-answer', notes?: string) => void;
    onClose: () => void;
}

export const CallFeedbackModal: React.FC<CallFeedbackModalProps> = ({ isOpen, callData, onResult, onClose }) => {
    const [step, setStep] = useState<'feedback' | 'notes'>('feedback');
    const [noteText, setNoteText] = useState('');
    const [addNotes, setAddNotes] = useState(false);
    const [selectedResult, setSelectedResult] = useState<'success' | 'busy' | 'voicemail' | 'invalid' | 'reschedule' | 'no-answer' | null>(null);

    const handleResultClick = (result: 'success' | 'busy' | 'voicemail' | 'invalid' | 'reschedule' | 'no-answer') => {
        if (addNotes || result === 'reschedule') {
            setSelectedResult(result);
            setStep('notes');
        } else {
            onResult(result, '');
            onClose();
            setTimeout(() => {
                setStep('feedback');
                setNoteText('');
                setSelectedResult(null);
                setAddNotes(false);
            }, 300);
        }
    };

    const handleSaveNotes = () => {
        if (selectedResult) {
            onResult(selectedResult, noteText);
        }
        setStep('feedback');
        setNoteText('');
        setSelectedResult(null);
    };

    const handleClose = () => {
        onClose();
        setTimeout(() => {
            setStep('feedback');
            setNoteText('');
            setSelectedResult(null);
            setAddNotes(false);
        }, 300);
    };

    return (
        <AnimatePresence>
            {isOpen && callData && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 text-left">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-md bg-white/60 border border-white/80 shadow-2xl shadow-orange-500/10 rounded-[40px] overflow-hidden p-8 text-center backdrop-blur-3xl"
                    >
                        {/* Soft Nude/Orange Glass Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/90 via-white/60 to-orange-100/80 pointer-events-none" />
                        
                        {/* Premium Reflections */}
                        <div className="absolute -top-32 -left-32 w-64 h-64 bg-orange-300/20 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-rose-200/20 rounded-full blur-3xl pointer-events-none" />

                        <button
                            onClick={handleClose}
                            className="absolute top-6 right-6 p-2 bg-black/5 hover:bg-black/10 rounded-full transition-colors text-slate-400 shadow-sm border border-white/40 z-10"
                        >
                            <X size={18} strokeWidth={2.5} />
                        </button>

                        <div className="relative z-10 flex flex-col items-center gap-2">
                            {/* Refined Icon Block */}
                            <div className="w-16 h-16 rounded-[28px] bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center mb-3 shadow-[0_12px_24px_rgba(249,115,22,0.3)] border border-white/40">
                                <motion.div
                                    animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                                >
                                    <Phone size={28} className="text-white drop-shadow-md" strokeWidth={2.5} />
                                </motion.div>
                            </div>

                            <h2 className="text-2xl font-black text-slate-800 leading-tight tracking-tight mt-1" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                {step === 'feedback' ? 'Chamada Encerrada' : 'Anotações'}
                            </h2>

                            <p className="text-sm text-slate-500 font-medium mb-6 px-4" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                                {step === 'feedback' ? (
                                    <>A ligação com <strong className="text-orange-600 font-black">{callData.leadName}</strong> terminou. Qual foi o desfecho?</>
                                ) : (
                                    <>Registre os detalhes da conversa com <strong className="text-orange-600 font-black">{callData.leadName}</strong>.</>
                                )}
                            </p>

                            <AnimatePresence mode="wait">
                                {step === 'feedback' ? (
                                    <motion.div
                                        key="feedback"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="w-full grid grid-cols-2 gap-3 mt-6"
                                    >
                                        {[
                                            { id: 'success', label: 'Contato Feito', sub: 'Qualificou o lead', icon: <CheckCircle size={24} strokeWidth={2.5} />, color: 'emerald' },
                                            { id: 'busy', label: 'Ocupado', sub: 'Tentar novamente', icon: <Phone size={24} strokeWidth={2.5} className="rotate-90" />, color: 'amber' },
                                            { id: 'voicemail', label: 'Caixa Postal', sub: 'Não atendeu', icon: <Voicemail size={24} strokeWidth={2.5} />, color: 'slate' },
                                            { id: 'no-answer', label: 'Sem Resposta', sub: 'Ligação perdida', icon: <X size={24} strokeWidth={2.5} />, color: 'orange' },
                                            { id: 'invalid', label: 'Número Inválido', sub: 'Descartar lead', icon: <XCircle size={24} strokeWidth={2.5} />, color: 'rose' },
                                            { id: 'reschedule', label: 'Agendar', sub: 'Definir retorno', icon: <CalendarClock size={24} strokeWidth={2.5} className="text-indigo-400 group-hover:text-white transition-colors" />, color: 'indigo' },
                                        ].map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleResultClick(item.id as any)}
                                                className={clsx(
                                                    "relative w-full p-4 rounded-3xl flex flex-col items-center justify-center gap-1 transition-all duration-300 border shadow-sm group overflow-hidden",
                                                    item.color === 'emerald' && "bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400/30 hover:bg-emerald-700 hover:shadow-lg",
                                                    item.color === 'amber' && "bg-amber-50/80 border-amber-200 text-amber-700 hover:bg-amber-500 hover:text-white hover:shadow-amber-500/30 hover:shadow-lg",
                                                    item.color === 'slate' && "bg-slate-50/80 border-slate-200 text-slate-700 hover:bg-slate-500 hover:text-white hover:shadow-slate-500/30 hover:shadow-lg",
                                                    item.color === 'orange' && "bg-orange-50/80 border-orange-200 text-orange-700 hover:bg-orange-500 hover:text-white hover:shadow-orange-500/30 hover:shadow-lg",
                                                    item.color === 'rose' && "bg-rose-50/80 border-rose-200 text-rose-700 hover:bg-rose-500 hover:text-white hover:shadow-rose-500/30 hover:shadow-lg",
                                                    item.color === 'indigo' && "bg-indigo-50/80 border-indigo-200 text-indigo-700 hover:bg-indigo-500 hover:text-white hover:shadow-indigo-500/30 hover:shadow-lg"
                                                )}
                                            >
                                                <div className="relative z-10 transition-transform group-hover:scale-110 duration-300 mb-1">
                                                    {item.icon}
                                                </div>
                                                <div className="relative z-10 font-black text-[13px] tracking-tight">{item.label}</div>
                                                <div className="relative z-10 text-[9px] uppercase tracking-widest font-bold opacity-70">{item.sub}</div>
                                                
                                                {/* Hover Glow Behind Content */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        ))}
                                        
                                        {/* Toggle for notes */}
                                        <div className="col-span-2 mt-4 flex items-center justify-between px-6 py-4 bg-white/40 border border-white/60 rounded-3xl shadow-inner group">
                                            <div className="flex flex-col items-start gap-0.5">
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
                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                        className="w-full space-y-4"
                                    >
                                        <div className="relative group">
                                            <textarea
                                                value={noteText}
                                                onChange={(e) => setNoteText(e.target.value)}
                                                placeholder="Descreva aqui o que foi falado..."
                                                rows={4}
                                                className="w-full p-4 bg-white/60 border border-white/80 rounded-3xl text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-white/90 transition-all resize-none shadow-sm"
                                                style={{ fontFamily: 'Quicksand, sans-serif' }}
                                                autoFocus
                                            />
                                            <div className="absolute bottom-4 right-4 text-orange-200 pointer-events-none group-focus-within:text-orange-400 transition-colors">
                                                <MessageSquare size={20} />
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setStep('feedback')}
                                                className="flex-1 py-4 px-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full text-blue-600 font-bold transition-all shadow-sm"
                                                style={{ fontFamily: 'Quicksand, sans-serif' }}
                                            >
                                                Voltar
                                            </button>
                                            <motion.button
                                                onClick={handleSaveNotes}
                                                disabled={!noteText.trim()}
                                                whileHover={{ scale: 1.02, y: -2 }}
                                                whileTap={{ scale: 0.98 }}
                                                animate={{ 
                                                    y: [0, -2, 0],
                                                    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                                                }}
                                                className="flex-[2] py-4 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-black text-sm uppercase tracking-widest transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                                style={{ fontFamily: 'Comfortaa, cursive' }}
                                            >
                                                Salvar Anotação
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
