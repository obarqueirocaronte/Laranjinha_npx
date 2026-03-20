import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock3, MessageSquare, Check, ArrowRight } from 'lucide-react';
import { cadencesAPI } from '../../lib/api';

interface CadenceRescheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    leadCadenceId: string;
    leadName: string;
    companyName?: string;
    currentStep?: number;
    maxSteps?: number;
    onSuccess?: () => void;
}

export const CadenceRescheduleModal: React.FC<CadenceRescheduleModalProps> = ({
    isOpen,
    onClose,
    leadCadenceId,
    leadName,
    companyName,
    currentStep,
    maxSteps,
    onSuccess,
}) => {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('09:00');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Quick-pick presets
    const quickPicks = [
        { label: 'Amanhã 9h', days: 1, hour: '09:00' },
        { label: 'Amanhã 14h', days: 1, hour: '14:00' },
        { label: 'Em 2 dias', days: 2, hour: '10:00' },
        { label: 'Em 3 dias', days: 3, hour: '10:00' },
    ];

    const applyQuickPick = (days: number, hour: string) => {
        const target = new Date();
        target.setDate(target.getDate() + days);
        setDate(target.toISOString().split('T')[0]);
        setTime(hour);
    };

    const handleSubmit = async () => {
        if (!date || !time) {
            setError('Selecione uma data e horário para o retorno.');
            return;
        }
        if (!notes.trim()) {
            setError('Registre o contexto do agendamento (campo obrigatório).');
            return;
        }

        setError('');
        setIsSubmitting(true);

        try {
            const retorno_em = new Date(`${date}T${time}:00`).toISOString();
            await cadencesAPI.reschedule(leadCadenceId, { retorno_em, notes: notes.trim() });
            setSuccess(true);
            setTimeout(() => {
                onSuccess?.();
                onClose();
                // reset state
                setDate('');
                setTime('09:00');
                setNotes('');
                setSuccess(false);
            }, 1500);
        } catch (err: any) {
            setError(err?.response?.data?.error?.message || 'Erro ao agendar retorno.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-orange-100 w-full max-w-md overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="relative px-6 pt-6 pb-4">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500" />
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-200/50">
                                    <Calendar size={20} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Agendar Retorno</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cadência Manual</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
                            >
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>

                    {/* Lead Info */}
                    <div className="mx-6 mb-4 p-3 bg-orange-50/60 rounded-2xl border border-orange-100/50">
                        <p className="text-sm font-bold text-slate-800">{leadName}</p>
                        {companyName && <p className="text-[11px] text-slate-500 font-medium">{companyName}</p>}
                        {currentStep && maxSteps && (
                            <div className="flex items-center gap-2 mt-2">
                                <div className="flex-1 bg-orange-100 rounded-full h-1.5 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-orange-400 to-amber-400 h-full rounded-full transition-all"
                                        style={{ width: `${(currentStep / maxSteps) * 100}%` }}
                                    />
                                </div>
                                <span className="text-[10px] font-black text-orange-600">
                                    Step {currentStep}/{maxSteps}
                                </span>
                            </div>
                        )}
                    </div>

                    {success ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="px-6 pb-6 flex flex-col items-center gap-3 py-8"
                        >
                            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                                <Check size={32} className="text-emerald-600" strokeWidth={3} />
                            </div>
                            <p className="text-lg font-black text-slate-800">Retorno Agendado!</p>
                            <p className="text-sm text-slate-500 text-center">
                                O retorno foi registrado na agenda do SDR.
                            </p>
                        </motion.div>
                    ) : (
                        <div className="px-6 pb-6 space-y-4">
                            {/* Quick Picks */}
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Atalhos Rápidos</p>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {quickPicks.map(qp => (
                                        <button
                                            key={qp.label}
                                            onClick={() => applyQuickPick(qp.days, qp.hour)}
                                            className="px-2 py-2 text-[10px] font-black text-slate-600 bg-slate-50 hover:bg-orange-50 hover:text-orange-600 border border-slate-100 hover:border-orange-200 rounded-xl transition-all text-center"
                                        >
                                            {qp.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Date & Time */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                                        <Calendar size={10} className="inline mr-1" />Data
                                    </label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-orange-200 focus:border-orange-300 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                                        <Clock3 size={10} className="inline mr-1" />Horário
                                    </label>
                                    <input
                                        type="time"
                                        value={time}
                                        onChange={e => setTime(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-orange-200 focus:border-orange-300 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                                    <MessageSquare size={10} className="inline mr-1" />Contexto do Retorno *
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Ex: Lead pediu para ligar segunda às 10h, está em reunião agora..."
                                    rows={3}
                                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-orange-200 focus:border-orange-300 outline-none transition-all resize-none placeholder:text-slate-300"
                                />
                            </div>

                            {/* Error */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold"
                                >
                                    {error}
                                </motion.div>
                            )}

                            {/* Submit */}
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !date || !time}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl font-black text-sm hover:from-orange-600 hover:to-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-200/50"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Calendar size={16} strokeWidth={2.5} />
                                        Confirmar Agendamento
                                        <ArrowRight size={14} strokeWidth={2.5} />
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
