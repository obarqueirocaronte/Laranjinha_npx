import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, CheckCircle, X, XCircle, Voicemail, MessageSquare, CalendarClock, AlertTriangle, Zap } from 'lucide-react';
import type { ActiveCall } from '../../contexts/VoipContext';
import clsx from 'clsx';

interface CallFeedbackModalProps {
    isOpen: boolean;
    callData: ActiveCall | null;
    onResult: (result: 'success' | 'busy' | 'voicemail' | 'invalid' | 'reschedule' | 'no-answer' | 'connected' | 'not_interested' | 'spam', notes?: string) => void;
    onClose: () => void;
}

export const CallFeedbackModal: React.FC<CallFeedbackModalProps> = ({ isOpen, callData, onResult, onClose }) => {
    const [step, setStep] = useState<'feedback' | 'notes'>('feedback');
    const [noteText, setNoteText] = useState('');
    const [addNotes, setAddNotes] = useState(false);
    const [selectedResult, setSelectedResult] = useState<'success' | 'busy' | 'voicemail' | 'invalid' | 'reschedule' | 'no-answer' | 'connected' | 'not_interested' | 'spam' | null>(null);

    const handleResultClick = (result: 'success' | 'busy' | 'voicemail' | 'invalid' | 'reschedule' | 'no-answer' | 'connected' | 'not_interested' | 'spam') => {
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
                        className="relative w-full max-w-lg bg-white/70 border border-white/60 shadow-[0_32px_80px_-15px_rgba(249,115,22,0.15)] rounded-[3rem] overflow-hidden p-10 text-center"
                        style={{ backdropFilter: 'blur(32px) saturate(160%)' }}
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
                                        className="w-full grid grid-cols-4 gap-4 mt-8"
                                    >
                                        {[
                                            { id: 'connected',      label: 'Conectou',     sub: 'Conexão Real', icon: <CheckCircle size={32} strokeWidth={2.5}  />,     color: 'from-emerald-500 to-teal-500' },
                                            { id: 'not_interested', label: 'Descarte',     sub: 'Sem Interes.', icon: <XCircle size={32} strokeWidth={2.5}  />,         color: 'from-rose-500 to-orange-600' },
                                            { id: 'busy',           label: 'Ocupado',      sub: 'Tentar dps',   icon: <Phone size={32} strokeWidth={2.5}  className="rotate-90" />, color: 'from-amber-400 to-orange-500' },
                                            { id: 'voicemail',      label: 'Postal',       sub: 'Não atende',   icon: <Voicemail size={32} strokeWidth={2.5}  />,       color: 'from-slate-500 to-slate-700' },
                                            { id: 'no-answer',      label: 'Perdida',      sub: 'Resposta 0',   icon: <X size={32} strokeWidth={3} />,           color: 'from-orange-400 to-rose-400' },
                                            { id: 'invalid',        label: 'Inválido',     sub: 'Num. Errado',  icon: <AlertTriangle size={32} strokeWidth={2.5}  />,   color: 'from-red-500 to-rose-600' },
                                            { id: 'spam',           label: 'Spam',         sub: 'Robô/Bot',     icon: <Zap size={32} strokeWidth={2.5}  />,             color: 'from-slate-700 to-slate-900' },
                                            { id: 'reschedule',     label: 'Reagendar',    sub: 'Novo Horár.',  icon: <CalendarClock size={32} strokeWidth={2.5}  />,   color: 'from-indigo-500 to-blue-600' },
                                        ].map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleResultClick(item.id as any)}
                                                className="group relative aspect-square w-full rounded-[2.5rem] flex flex-col items-center justify-center gap-2 transition-all duration-500 hover:scale-110 active:scale-95 shadow-[0_15px_40px_rgba(0,0,0,0.06)] hover:shadow-orange-500/30 overflow-hidden ring-4 ring-white shadow-inner"
                                            >
                                                {/* Gradient Layer */}
                                                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                                                
                                                {/* Soft Base for non-hover */}
                                                <div className="absolute inset-0 bg-white/10 group-hover:opacity-0 transition-opacity duration-500" />

                                                {/* Content */}
                                                <div className="relative z-10 flex flex-col items-center gap-1">
                                                    <div className="text-slate-400 group-hover:text-white transition-colors duration-300">
                                                        {item.icon}
                                                    </div>
                                                    <div className="font-black text-[11px] tracking-tight text-slate-700 group-hover:text-white transition-colors duration-300 leading-none mt-1">{item.label}</div>
                                                    <div className="text-[8px] uppercase tracking-widest font-bold text-slate-400 group-hover:text-white/70 transition-colors duration-300">{item.sub}</div>
                                                </div>
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
