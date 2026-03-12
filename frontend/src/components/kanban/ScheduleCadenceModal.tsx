import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarClock, X, Check } from 'lucide-react';

import type { Lead } from '../../types';
import { leadsAPI } from '../../lib/api';

interface ScheduleCadenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead | null;
    onSave: (dateTime: string, notes: string, returnToQueue: boolean) => void;
}

export const ScheduleCadenceModal: React.FC<ScheduleCadenceModalProps> = ({
    isOpen, onClose, lead, onSave
}) => {
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [returnToQueue, setReturnToQueue] = useState<boolean>(false);
    const [allowReturnToQueue, setAllowReturnToQueue] = useState<boolean>(true);

    useEffect(() => {
        if (isOpen && lead) {
            // Pre-fill with current date and time
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');

            setSelectedDate(`${year}-${month}-${day}`);
            setSelectedTime(`${hours}:${minutes}`);

            // Fetch team configuration
            const fetchConfig = async () => {
                try {
                    const userStr = localStorage.getItem('user');
                    const sdrId = userStr ? JSON.parse(userStr).id : null;
                    if (sdrId) {
                        const response = await leadsAPI.getConfig(sdrId);
                        if (response.success && response.data) {
                            setAllowReturnToQueue(response.data.allow_return_to_queue !== false);
                        }
                    }
                } catch (err) {
                    console.error('Error fetching pipeline config:', err);
                }
            };
            fetchConfig();
        }
    }, [isOpen, lead]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedDate && selectedTime) {
            onSave(`${selectedDate}T${selectedTime}`, notes, returnToQueue);
            setSelectedDate('');
            setSelectedTime('');
            setNotes('');
            setReturnToQueue(false);
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
                    className="relative w-full max-w-sm bg-white/40 border border-white/60 shadow-glass rounded-[40px] overflow-hidden backdrop-blur-2xl"
                >
                    {/* Soft Nude Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-50/70 via-white/40 to-orange-100/50 pointer-events-none" />

                    <div className="relative h-20 flex items-center justify-center pt-4">
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 bg-black/5 hover:bg-black/10 rounded-full transition-colors text-slate-400 shadow-sm border border-white/40 z-10"
                        >
                            <X size={18} strokeWidth={2.5} />
                        </button>
                        <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-rose-500 rounded-[22px] shadow-[0_8px_20px_rgba(249,115,22,0.3)] border border-white/40 flex items-center justify-center transform hover:scale-105 transition-transform">
                            <CalendarClock className="text-white" size={24} strokeWidth={2.5} />
                        </div>
                    </div>

                    <div className="p-8 text-center relative z-10">
                        <h3 className="text-xl font-black text-slate-800 mb-1" style={{ fontFamily: 'Comfortaa, cursive' }}>Próxima Cadência</h3>
                        <p className="text-xs text-slate-500 mb-8 font-medium px-4" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                            Qual o horário para a próxima tentativa de contato com <strong className="text-orange-600">{lead.full_name}</strong>?
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="flex gap-3">
                                <div className="flex-1 text-left">
                                    <label className="block text-[10px] font-black text-orange-600/60 uppercase tracking-widest mb-1.5 ml-2">Data</label>
                                    <input
                                        type="date"
                                        required
                                        value={selectedDate}
                                        onChange={e => setSelectedDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                                    />
                                </div>
                                <div className="flex-1 text-left">
                                    <label className="block text-[10px] font-black text-orange-600/60 uppercase tracking-widest mb-1.5 ml-2">Hora</label>
                                    <input
                                        type="time"
                                        required
                                        value={selectedTime}
                                        onChange={e => setSelectedTime(e.target.value)}
                                        className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex flex-col text-left">
                                <label className="block text-[10px] font-black text-orange-600/60 uppercase tracking-widest mb-1.5 ml-2">Comentários (Opcional)</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-orange-100 outline-none h-24 resize-none transition-all"
                                    placeholder="Razão do agendamento..."
                                />
                            </div>

                            {allowReturnToQueue && (
                                <div className="flex items-center gap-3 px-1 py-1">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={returnToQueue}
                                            onChange={e => setReturnToQueue(e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                    </label>
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                                        Retornar para a Fila de Leads
                                    </span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={!selectedDate || !selectedTime}
                                className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-full font-black text-sm uppercase tracking-widest hover:from-orange-600 hover:to-rose-600 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ fontFamily: 'Comfortaa, cursive' }}
                            >
                                Confirmar Horário <Check size={18} strokeWidth={2.5} />
                            </button>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
