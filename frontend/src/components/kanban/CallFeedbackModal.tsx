import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, CheckCircle, X, XCircle, Voicemail, MessageSquare, CalendarClock } from 'lucide-react';
import type { ActiveCall } from '../../contexts/VoipContext';

interface CallFeedbackModalProps {
    isOpen: boolean;
    callData: ActiveCall | null;
    onResult: (result: 'success' | 'busy' | 'voicemail' | 'invalid' | 'reschedule' | 'no-answer', notes?: string) => void;
    onClose: () => void;
}

export const CallFeedbackModal: React.FC<CallFeedbackModalProps> = ({ isOpen, callData, onResult, onClose }) => {
    const [step, setStep] = useState<'feedback' | 'notes'>('feedback');
    const [noteText, setNoteText] = useState('');
    const [selectedResult, setSelectedResult] = useState<'success' | 'busy' | 'voicemail' | 'invalid' | 'reschedule' | 'no-answer' | null>(null);

    const handleResultClick = (result: 'success' | 'busy' | 'voicemail' | 'invalid' | 'reschedule' | 'no-answer') => {
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
                        className="relative w-full max-w-sm bg-white/40 border border-white/60 shadow-glass rounded-[40px] overflow-hidden p-8 text-center backdrop-blur-2xl"
                    >
                        {/* Soft Nude/Orange Glass Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/80 via-white/40 to-orange-100/60 pointer-events-none" />
                        
                        {/* Premium Reflections */}
                        <div className="absolute -top-32 -left-32 w-64 h-64 bg-orange-200/30 rounded-full blur-3xl pointer-events-none" />
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
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="w-full space-y-3 mt-2"
                                    >
                                        {/* Sucesso */}
                                        <button
                                            onClick={() => handleResultClick('success')}
                                            className="w-full relative overflow-hidden p-4 bg-white/60 hover:bg-white/90 border border-white/80 rounded-[28px] flex items-center justify-between group transition-all shadow-sm hover:shadow-md"
                                        >
                                            <div className="relative z-10 text-left pl-2">
                                                <span className="block text-sm font-black text-emerald-700 tracking-wide uppercase" style={{ fontFamily: 'Comfortaa, cursive' }}>CONTATO FEITO</span>
                                                <span className="block text-[10px] text-emerald-600/80 font-bold uppercase tracking-widest mt-0.5" style={{ fontFamily: 'Quicksand, sans-serif' }}>Qualificou o lead</span>
                                            </div>
                                            <div className="relative z-10 w-9 h-9 rounded-2xl bg-emerald-500 shadow-sm flex items-center justify-center text-white transition-transform group-hover:scale-110">
                                                <CheckCircle size={18} strokeWidth={2.5} />
                                            </div>
                                        </button>

                                        {/* Ocupado */}
                                        <button
                                            onClick={() => handleResultClick('busy')}
                                            className="w-full relative overflow-hidden p-4 bg-white/60 hover:bg-white/90 border border-white/80 rounded-[28px] flex items-center justify-between group transition-all shadow-sm hover:shadow-md"
                                        >
                                            <div className="relative z-10 text-left pl-2">
                                                <span className="block text-sm font-black text-amber-700 tracking-wide uppercase" style={{ fontFamily: 'Comfortaa, cursive' }}>OCUPADO / RECUSOU</span>
                                                <span className="block text-[10px] text-amber-600/80 font-bold uppercase tracking-widest mt-0.5" style={{ fontFamily: 'Quicksand, sans-serif' }}>Tentar novamente</span>
                                            </div>
                                            <div className="relative z-10 w-9 h-9 rounded-2xl bg-amber-500 shadow-sm flex items-center justify-center text-white transition-transform group-hover:scale-110">
                                                <Phone size={16} strokeWidth={2.5} className="rotate-90" />
                                            </div>
                                        </button>

                                        {/* Caixa Postal */}
                                        <button
                                            onClick={() => handleResultClick('voicemail')}
                                            className="w-full relative overflow-hidden p-4 bg-white/60 hover:bg-white/90 border border-white/80 rounded-[28px] flex items-center justify-between group transition-all shadow-sm hover:shadow-md"
                                        >
                                            <div className="relative z-10 text-left pl-2">
                                                <span className="block text-sm font-black text-slate-700 tracking-wide uppercase" style={{ fontFamily: 'Comfortaa, cursive' }}>CAIXA POSTAL</span>
                                                <span className="block text-[10px] text-slate-500/80 font-bold uppercase tracking-widest mt-0.5" style={{ fontFamily: 'Quicksand, sans-serif' }}>Não atendeu / Recado</span>
                                            </div>
                                            <div className="relative z-10 w-9 h-9 rounded-2xl bg-slate-500 shadow-sm flex items-center justify-center text-white transition-transform group-hover:scale-110">
                                                <Voicemail size={18} strokeWidth={2.5} />
                                            </div>
                                        </button>

                                        {/* Não Atendeu */}
                                        <button
                                            onClick={() => handleResultClick('no-answer')}
                                            className="w-full relative overflow-hidden p-4 bg-white/60 hover:bg-white/90 border border-white/80 rounded-[28px] flex items-center justify-between group transition-all shadow-sm hover:shadow-md"
                                        >
                                            <div className="relative z-10 text-left pl-2">
                                                <span className="block text-sm font-black text-orange-700 tracking-wide uppercase" style={{ fontFamily: 'Comfortaa, cursive' }}>NÃO ATENDEU</span>
                                                <span className="block text-[10px] text-orange-600/80 font-bold uppercase tracking-widest mt-0.5" style={{ fontFamily: 'Quicksand, sans-serif' }}>Ligação perdida</span>
                                            </div>
                                            <div className="relative z-10 w-9 h-9 rounded-2xl bg-orange-500 shadow-sm flex items-center justify-center text-white transition-transform group-hover:scale-110">
                                                <X size={18} strokeWidth={2.5} />
                                            </div>
                                        </button>

                                        {/* Inválido */}
                                        <button
                                            onClick={() => handleResultClick('invalid')}
                                            className="w-full relative overflow-hidden p-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-[28px] flex items-center justify-between group transition-all mt-6"
                                        >
                                            <div className="relative z-10 text-left pl-2">
                                                <span className="block text-sm font-black text-rose-700 tracking-wide uppercase" style={{ fontFamily: 'Comfortaa, cursive' }}>NÚMERO INVÁLIDO</span>
                                                <span className="block text-[10px] text-rose-500/80 font-bold uppercase tracking-widest mt-0.5" style={{ fontFamily: 'Quicksand, sans-serif' }}>Descartar lead</span>
                                            </div>
                                            <div className="relative z-10 w-9 h-9 rounded-2xl bg-rose-500 shadow-sm flex items-center justify-center text-white transition-transform group-hover:scale-110">
                                                <XCircle size={18} strokeWidth={2.5} />
                                            </div>
                                        </button>

                                        {/* Agendar Retorno */}
                                        <button
                                            onClick={() => handleResultClick('reschedule')}
                                            className="w-full relative overflow-hidden p-4 bg-slate-100/80 hover:bg-slate-200/80 border border-slate-300/40 rounded-[28px] flex items-center justify-between group transition-all mt-3"
                                        >
                                            <div className="relative z-10 text-left pl-2">
                                                <span className="block text-sm font-black text-slate-800 tracking-wide uppercase" style={{ fontFamily: 'Comfortaa, cursive' }}>AGENDAR RETORNO</span>
                                                <span className="block text-[10px] text-slate-500/80 font-bold uppercase tracking-widest mt-0.5" style={{ fontFamily: 'Quicksand, sans-serif' }}>Definir data e hora</span>
                                            </div>
                                            <div className="relative z-10 w-9 h-9 rounded-2xl bg-slate-800 shadow-sm flex items-center justify-center text-white transition-transform group-hover:scale-110">
                                                <CalendarClock size={18} strokeWidth={2.5} className="text-orange-400" />
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
                                                className="flex-1 py-4 px-4 bg-white/40 hover:bg-white/60 border border-white/80 rounded-full text-slate-600 font-bold transition-all shadow-sm"
                                                style={{ fontFamily: 'Quicksand, sans-serif' }}
                                            >
                                                Voltar
                                            </button>
                                            <button
                                                onClick={handleSaveNotes}
                                                disabled={!noteText.trim()}
                                                className="flex-[2] py-4 px-4 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white rounded-full font-black text-sm uppercase tracking-widest transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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

