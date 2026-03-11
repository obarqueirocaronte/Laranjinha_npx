import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, CheckCircle, X, XCircle, Voicemail, MessageSquare, CalendarClock } from 'lucide-react';
import type { ActiveCall } from '../../contexts/VoipContext';

interface CallFeedbackModalProps {
    isOpen: boolean;
    callData: ActiveCall | null;
    onResult: (result: 'success' | 'busy' | 'voicemail' | 'invalid' | 'reschedule', notes?: string) => void;
    onClose: () => void;
}

export const CallFeedbackModal: React.FC<CallFeedbackModalProps> = ({ isOpen, callData, onResult, onClose }) => {
    const [step, setStep] = useState<'feedback' | 'notes'>('feedback');
    const [noteText, setNoteText] = useState('');
    const [selectedResult, setSelectedResult] = useState<'success' | 'busy' | 'voicemail' | 'invalid' | 'reschedule' | null>(null);

    const handleResultClick = (result: 'success' | 'busy' | 'voicemail' | 'invalid' | 'reschedule') => {
        setSelectedResult(result);
        setStep('notes');
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
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-sm bg-gradient-to-br from-orange-500 via-orange-500 to-red-500 border border-white/40 shadow-[0_20px_60px_rgba(249,115,22,0.4)] rounded-[40px] overflow-hidden p-8 text-center backdrop-blur-xl"
                    >
                        {/* Glass Reflections */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                        <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/20 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-red-600/30 rounded-full blur-3xl pointer-events-none" />

                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white shadow-sm border border-white/20 z-10"
                        >
                            <X size={20} strokeWidth={2.5} />
                        </button>

                        <div className="relative z-10 flex flex-col items-center gap-2">
                            {/* Ícone Refinado Azul/Glass */}
                            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mb-2 shadow-[0_8px_32px_rgba(59,130,246,0.4)] border border-white/40">
                                <motion.div
                                    animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                                >
                                    <Phone size={36} className="text-white drop-shadow-md" strokeWidth={2.5} />
                                </motion.div>
                            </div>

                            <h2 className="text-2xl font-black text-white leading-tight tracking-tight drop-shadow-sm mt-2" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                {step === 'feedback' ? 'Chamada Encerrada' : 'Anotações'}
                            </h2>

                            <p className="text-sm text-white/90 font-bold mb-6 drop-shadow-sm px-4" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                                {step === 'feedback' ? (
                                    <>A ligação com <strong className="text-white font-black underline decoration-white/40 decoration-2 underline-offset-4">{callData.leadName}</strong> terminou. Qual foi o desfecho?</>
                                ) : (
                                    <>Registre os detalhes da conversa com <strong className="text-white font-black">{callData.leadName}</strong>.</>
                                )}
                            </p>

                            <AnimatePresence mode="wait">
                                {step === 'feedback' ? (
                                    <motion.div
                                        key="feedback"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="w-full space-y-3 mt-2"
                                    >
                                        {/* Sucesso */}
                                        <button
                                            onClick={() => handleResultClick('success')}
                                            className="w-full relative overflow-hidden p-4 bg-white/10 hover:bg-white/20 border border-white/30 rounded-[24px] flex items-center justify-between group transition-all shadow-[0_8px_24px_rgba(16,185,129,0.3)] hover:shadow-[0_12px_32px_rgba(16,185,129,0.5)]"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/80 to-teal-400/80 opacity-60 group-hover:opacity-100 transition-opacity" />
                                            <div className="relative z-10 text-left pl-2">
                                                <span className="block text-base font-black text-white drop-shadow-md tracking-wide" style={{ fontFamily: 'Comfortaa, cursive' }}>CONTATO FEITO</span>
                                                <span className="block text-[11px] text-white/90 font-bold drop-shadow-sm uppercase tracking-widest mt-0.5" style={{ fontFamily: 'Quicksand, sans-serif' }}>Avançou na qualificação</span>
                                            </div>
                                            <div className="relative z-10 w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                                <CheckCircle size={20} strokeWidth={2.5} />
                                            </div>
                                        </button>

                                        {/* Ocupado / Recusou */}
                                        <button
                                            onClick={() => handleResultClick('busy')}
                                            className="w-full relative overflow-hidden p-4 bg-white/10 hover:bg-white/20 border border-white/30 rounded-[24px] flex items-center justify-between group transition-all shadow-[0_8px_24px_rgba(245,158,11,0.2)] hover:shadow-[0_12px_32px_rgba(245,158,11,0.4)]"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/80 to-yellow-400/80 opacity-60 group-hover:opacity-100 transition-opacity" />
                                            <div className="relative z-10 text-left pl-2">
                                                <span className="block text-base font-black text-white drop-shadow-md tracking-wide" style={{ fontFamily: 'Comfortaa, cursive' }}>OCUPADO / RECUSOU</span>
                                                <span className="block text-[11px] text-white/90 font-bold drop-shadow-sm uppercase tracking-widest mt-0.5" style={{ fontFamily: 'Quicksand, sans-serif' }}>Tentar novamente depois</span>
                                            </div>
                                            <div className="relative z-10 w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                                <Phone size={18} strokeWidth={2.5} className="rotate-90" />
                                            </div>
                                        </button>

                                        {/* Caixa Postal */}
                                        <button
                                            onClick={() => handleResultClick('voicemail')}
                                            className="w-full relative overflow-hidden p-4 bg-white/10 hover:bg-white/20 border border-white/30 rounded-[24px] flex items-center justify-between group transition-all shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.2)]"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-slate-600/80 to-slate-500/80 opacity-60 group-hover:opacity-100 transition-opacity" />
                                            <div className="relative z-10 text-left pl-2">
                                                <span className="block text-base font-black text-white drop-shadow-md tracking-wide" style={{ fontFamily: 'Comfortaa, cursive' }}>CAIXA POSTAL</span>
                                                <span className="block text-[11px] text-white/90 font-bold drop-shadow-sm uppercase tracking-widest mt-0.5" style={{ fontFamily: 'Quicksand, sans-serif' }}>Não atendeu / Recado</span>
                                            </div>
                                            <div className="relative z-10 w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                                <Voicemail size={20} strokeWidth={2.5} />
                                            </div>
                                        </button>

                                        {/* Número Inválido / Errado */}
                                        <button
                                            onClick={() => handleResultClick('invalid')}
                                            className="w-full relative overflow-hidden p-4 bg-white/10 hover:bg-white/20 border border-white/30 rounded-[24px] flex items-center justify-between group transition-all shadow-[0_8px_24px_rgba(239,68,68,0.3)] hover:shadow-[0_12px_32px_rgba(239,68,68,0.5)] mt-6"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-red-600/90 to-red-500/90 opacity-60 group-hover:opacity-100 transition-opacity" />
                                            <div className="relative z-10 text-left pl-2">
                                                <span className="block text-base font-black text-white drop-shadow-md tracking-wide" style={{ fontFamily: 'Comfortaa, cursive' }}>NÚMERO INVÁLIDO</span>
                                                <span className="block text-[11px] text-white/90 font-bold drop-shadow-sm uppercase tracking-widest mt-0.5" style={{ fontFamily: 'Quicksand, sans-serif' }}>Descartar lead</span>
                                            </div>
                                            <div className="relative z-10 w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                                <XCircle size={20} strokeWidth={2.5} />
                                            </div>
                                        </button>

                                        {/* Agendar Retorno */}
                                        <button
                                            onClick={() => handleResultClick('reschedule')}
                                            className="w-full relative overflow-hidden p-4 bg-white/10 hover:bg-white/20 border border-white/30 rounded-[24px] flex items-center justify-between group transition-all shadow-[0_8px_24px_rgba(30,41,59,0.2)] mt-3"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-slate-700 to-slate-600 opacity-60 group-hover:opacity-100 transition-opacity" />
                                            <div className="relative z-10 text-left pl-2">
                                                <span className="block text-base font-black text-white drop-shadow-md tracking-wide" style={{ fontFamily: 'Comfortaa, cursive' }}>AGENDAR RETORNO</span>
                                                <span className="block text-[11px] text-white/90 font-bold drop-shadow-sm uppercase tracking-widest mt-0.5" style={{ fontFamily: 'Quicksand, sans-serif' }}>Definir data e hora</span>
                                            </div>
                                            <div className="relative z-10 w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                                <CalendarClock size={20} strokeWidth={2.5} className="text-orange-400" />
                                            </div>
                                        </button>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="notes"
                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                        className="w-full space-y-4"
                                    >
                                        <div className="relative">
                                            <textarea
                                                value={noteText}
                                                onChange={(e) => setNoteText(e.target.value)}
                                                placeholder="Descreva aqui o que foi falado (ex: cliente pediu para ligar amanhã às 14h, ou quais os próximos passos...)"
                                                rows={4}
                                                className="w-full p-4 bg-white/20 border border-white/30 rounded-2xl text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/30 transition-all resize-none shadow-inner"
                                                style={{ fontFamily: 'Quicksand, sans-serif' }}
                                                autoFocus
                                            />
                                            <MessageSquare className="absolute bottom-4 right-4 text-white/40 pointer-events-none" size={20} />
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setStep('feedback')}
                                                className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-[20px] text-white font-bold transition-all shadow-sm"
                                                style={{ fontFamily: 'Quicksand, sans-serif' }}
                                            >
                                                Voltar
                                            </button>
                                            <button
                                                onClick={handleSaveNotes}
                                                disabled={selectedResult === 'success' ? !noteText.trim() : false}
                                                className="flex-[2] py-3 px-4 bg-white text-orange-600 hover:bg-orange-50 rounded-[20px] font-black transition-all shadow-[0_8px_16px_rgba(0,0,0,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
                                                style={{ fontFamily: 'Comfortaa, cursive' }}
                                            >
                                                Salvar Anotação
                                            </button>
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

