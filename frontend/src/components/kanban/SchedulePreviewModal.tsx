import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, CalendarDays, ChevronLeft, ChevronRight, ListFilter } from 'lucide-react';
import type { Lead } from '../../types';

interface SchedulePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    leads: Lead[];
    onLeadClick?: (lead: Lead) => void;
}

export const SchedulePreviewModal: React.FC<SchedulePreviewModalProps> = ({
    isOpen,
    onClose,
    leads,
    onLeadClick
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());

    const scheduledLeads = useMemo(() => {
        return leads.filter(l => Boolean(l.metadata?.next_contact_at))
            .sort((a, b) => new Date(a.metadata!.next_contact_at!).getTime() - new Date(b.metadata!.next_contact_at!).getTime());
    }, [leads]);

    const { daysInMonth, startDay, currentMonthLabel } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        return {
            daysInMonth: lastDay.getDate(),
            startDay: firstDay.getDay(),
            currentMonthLabel: currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
        };
    }, [currentDate]);

    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const emptyDays = Array.from({ length: startDay }, (_, i) => i);

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        setSelectedDay(null);
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        setSelectedDay(null);
    };

    const getLeadsForDay = (day: number) => {
        const dateString = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
        return scheduledLeads.filter(l => new Date(l.metadata!.next_contact_at!).toDateString() === dateString);
    };

    const isDateScheduled = (day: number) => getLeadsForDay(day).length > 0;

    const isToday = (day: number) => {
        const today = new Date();
        return day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
    };

    const filteredLeads = useMemo(() => {
        if (selectedDay === null) return scheduledLeads;
        return getLeadsForDay(selectedDay);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDay, scheduledLeads, currentDate]);

    const selectedDayLabel = selectedDay !== null
        ? new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
        : 'Todos os agendamentos';

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 lg:p-10">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className="relative w-full max-w-4xl bg-[#fcfffb] shadow-[0_32px_80px_rgba(0,0,0,0.15)] rounded-[40px] overflow-hidden flex flex-col md:flex-row max-h-[85vh] ring-1 ring-white/50"
                    >
                        {/* ======================== SIDEBAR: Calendar ======================== */}
                        <div className="w-full md:w-[320px] bg-white border-b md:border-b-0 md:border-r border-slate-100 p-6 flex flex-col shrink-0 relative overflow-hidden">
                            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle at 0% 0%, #F97316 0%, transparent 60%)' }} />

                            <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 mb-6" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                <CalendarDays className="text-orange-500" size={24} />
                                Visão Geral
                            </h3>

                            {/* Mini Calendar */}
                            <div className="bg-white border border-slate-100 shadow-sm rounded-[24px] p-4 relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest capitalize" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                                        {currentMonthLabel}
                                    </span>
                                    <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                                        <span key={d} className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{d}</span>
                                    ))}
                                </div>

                                <div className="grid grid-cols-7 gap-1">
                                    {emptyDays.map(empty => (
                                        <div key={`empty-${empty}`} className="h-8"></div>
                                    ))}
                                    {daysArray.map(day => {
                                        const scheduled = isDateScheduled(day);
                                        const today = isToday(day);
                                        const selected = selectedDay === day;
                                        const count = getLeadsForDay(day).length;
                                        return (
                                            <div
                                                key={day}
                                                onClick={() => setSelectedDay(prev => prev === day ? null : day)}
                                                className={`h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer relative
                                                    ${selected ? 'bg-orange-500 text-white shadow-md shadow-orange-200 scale-110 z-10' :
                                                    today ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200 shadow-sm' :
                                                    scheduled ? 'bg-orange-50 text-orange-600 ring-1 ring-orange-200 shadow-sm hover:bg-orange-100' :
                                                    'text-slate-600 hover:bg-slate-50'}`}
                                                style={{ fontFamily: 'Quicksand, sans-serif' }}
                                                title={scheduled ? `${count} agendamento${count > 1 ? 's' : ''}` : undefined}
                                            >
                                                {day}
                                                {scheduled && !selected && (
                                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full flex items-center justify-center text-[7px] text-white font-black">
                                                        {count}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Sidebar Stats */}
                            <div className="mt-6 space-y-3 relative z-10">
                                {selectedDay !== null && (
                                    <button
                                        onClick={() => setSelectedDay(null)}
                                        className="w-full flex items-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-widest py-2 px-3 bg-orange-50 rounded-xl border border-orange-100 hover:bg-orange-100 transition-colors"
                                    >
                                        <ListFilter size={12} />
                                        Ver todos ({scheduledLeads.length})
                                    </button>
                                )}
                                <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100/50">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Manuais</span>
                                        <span className="text-sm font-black text-orange-700">{scheduledLeads.filter(l => l.metadata?.next_contact_type !== 'cadence').length}</span>
                                    </div>
                                    <p className="text-[9px] font-bold text-orange-500 uppercase tracking-tighter">Agendamentos diretos do SDR</p>
                                </div>
                                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Cadências</span>
                                        <span className="text-sm font-black text-indigo-700">{scheduledLeads.filter(l => l.metadata?.next_contact_type === 'cadence').length}</span>
                                    </div>
                                    <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">Fluxos automáticos de retorno</p>
                                </div>
                            </div>
                        </div>

                        {/* ======================== MAIN: Lead List ======================== */}
                        <div className="flex-1 flex flex-col min-h-0 bg-[#fcfffb] relative">
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ background: 'radial-gradient(circle at 100% 100%, #4F46E5 0%, transparent 60%)' }} />

                            <div className="px-8 py-6 pb-4 flex justify-between items-center shrink-0 border-b border-slate-100 relative z-10 bg-white/50 backdrop-blur-md">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                        <Clock size={24} className="text-white" strokeWidth={1.5} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>Agendamentos</h2>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                                            <span className={`w-2 h-2 rounded-full inline-block ${filteredLeads.length > 0 ? 'bg-orange-400 animate-pulse' : 'bg-slate-300'}`}></span>
                                            {selectedDayLabel} — {filteredLeads.length} compromisso{filteredLeads.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:shadow-md transition-all"
                                >
                                    <X size={20} strokeWidth={2} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 relative z-10 custom-scrollbar">
                                {filteredLeads.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                                        <div className="w-20 h-20 rounded-[24px] bg-slate-50 border border-slate-100 flex items-center justify-center">
                                            <CalendarDays className="text-slate-300" size={32} />
                                        </div>
                                        <div>
                                            <p className="text-base font-black text-slate-700" style={{ fontFamily: 'Comfortaa, cursive' }}>Nenhum agendamento</p>
                                            <p className="text-[12px] font-bold text-slate-400 mt-1 max-w-[200px]" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                                                {selectedDay !== null ? 'Nenhum compromisso neste dia.' : 'Sua agenda está livre.'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {filteredLeads.map(l => {
                                            const date = new Date(l.metadata!.next_contact_at!);
                                            const isTodayCard = date.toDateString() === new Date().toDateString();
                                            const isPastCard = date.getTime() < new Date().getTime() && !isTodayCard;
                                            const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                            const notes = l.metadata?.last_schedule_notes;

                                            return (
                                                <div
                                                    key={l.id}
                                                    className="group flex flex-col bg-white border border-slate-100 rounded-[20px] p-5 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all cursor-pointer relative overflow-hidden"
                                                    onClick={() => { if (onLeadClick) onLeadClick(l); }}
                                                >
                                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${isPastCard ? 'bg-red-400' : isTodayCard ? 'bg-orange-400' : 'bg-indigo-400'}`} />

                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-sm font-black text-slate-800 truncate" style={{ fontFamily: 'Comfortaa, cursive' }}>{l.full_name || l.company_name}</span>
                                                        <span className={`shrink-0 ml-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${isPastCard ? 'bg-red-50 text-red-600' : isTodayCard ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                            <Clock size={10} />
                                                            {timeStr}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${l.metadata?.next_contact_type === 'cadence' ? 'bg-indigo-50 text-indigo-500 border-indigo-100' : 'bg-orange-50 text-orange-500 border-orange-100'}`}>
                                                            {l.metadata?.next_contact_type === 'cadence' ? 'Cadência' : 'Manual'}
                                                        </span>
                                                        {l.company_name && (
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none truncate" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                                                                {l.company_name}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {notes && (
                                                        <p className="text-[11px] text-slate-500 font-medium italic leading-snug mb-2 line-clamp-2 pl-1 border-l-2 border-slate-200">
                                                            {notes}
                                                        </p>
                                                    )}

                                                    <div className="mt-auto flex items-center justify-between text-[11px]">
                                                        <span className="text-slate-400 font-bold" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                                                            {l.phone || l.email || 'Sem contato extra'}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                                                            Score {l.quality_score ?? 0}%
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
