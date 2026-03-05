import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarClock, X, Check } from 'lucide-react';
const ICON = { strokeWidth: 1.5 };
import type { Lead } from '../../types';

interface ScheduleCadenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead | null;
    onSave: (dateTime: string) => void;
}

export const ScheduleCadenceModal: React.FC<ScheduleCadenceModalProps> = ({
    isOpen, onClose, lead, onSave
}) => {
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedDate && selectedTime) {
            onSave(`${selectedDate}T${selectedTime}`);
            setSelectedDate('');
            setSelectedTime('');
        }
    };

    if (!isOpen || !lead) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 10 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="relative w-full max-w-sm bg-gradient-soft border border-orange-100 shadow-glass rounded-[30px] shadow-xl overflow-hidden border border-slate-200"
                >
                    <div className="relative h-24 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                        >
                            <X size={20} {...ICON} />
                        </button>
                        <div className="w-12 h-12 bg-gradient-soft border border-orange-100 shadow-glass rounded-2xl shadow flex items-center justify-center transform group-hover:scale-110 transition-transform">
                            <CalendarClock className="text-indigo-600" size={24} {...ICON} />
                        </div>
                    </div>

                    <div className="p-6 text-center">
                        <h3 className="text-lg font-black text-slate-900 mb-1" style={{ fontFamily: 'Comfortaa, cursive' }}>Próxima Cadência</h3>
                        <p className="text-xs text-slate-600 mb-6 font-medium" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                            Qual o horário para a próxima tentativa de contato com <strong className="text-slate-800">{lead.full_name}</strong>?
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="flex gap-3">
                                <div className="flex-1 text-left">
                                    <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 mx-1">Data</label>
                                    <input
                                        type="date"
                                        required
                                        value={selectedDate}
                                        onChange={e => setSelectedDate(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-100 outline-none"
                                    />
                                </div>
                                <div className="flex-1 text-left">
                                    <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 mx-1">Hora</label>
                                    <input
                                        type="time"
                                        required
                                        value={selectedTime}
                                        onChange={e => setSelectedTime(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-100 outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!selectedDate || !selectedTime}
                                className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-full font-bold text-sm hover:bg-indigo-700 hover:shadow-[0_0_18px_rgba(99,102,241,0.45)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ fontFamily: 'Quicksand, sans-serif' }}
                            >
                                Confirmar Horário <Check size={16} {...ICON} />
                            </button>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
