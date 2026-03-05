import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock3, X, Check, Info } from 'lucide-react';
const ICON = { strokeWidth: 1.5 };
import { cn } from '../../lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────
interface TimeSlot {
    id: string;
    label: string;
    range: string;
    detail: string; // shown on hover
    color: string;
    activeBg: string;
    activeBorder: string;
    activeText: string;
}

interface SchedulingRuleModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Initial slots that are enabled */
    selectedSlots: string[];
    onSave: (slots: string[]) => void;
}

// ─── Data ────────────────────────────────────────────────────────────────────
const TIME_SLOTS: TimeSlot[] = [
    {
        id: 'morning',
        label: 'Manhã',
        range: '08h–12h',
        detail: 'Retornos: 3 tentativas em dias úteis. Alta abertura de email no período.',
        color: 'text-amber-600',
        activeBg: 'bg-amber-50',
        activeBorder: 'border-amber-300',
        activeText: 'text-amber-900',
    },
    {
        id: 'lunch',
        label: 'Almoço',
        range: '12h–14h',
        detail: 'Retornos: 1 tentativa. Menor taxa de resposta, recomendado só para WhatsApp.',
        color: 'text-orange-500',
        activeBg: 'bg-orange-50',
        activeBorder: 'border-orange-300',
        activeText: 'text-orange-900',
    },
    {
        id: 'afternoon',
        label: 'Tarde',
        range: '14h–18h',
        detail: 'Retornos: 3 tentativas. Melhor janela para cold call e WhatsApp.',
        color: 'text-indigo-500',
        activeBg: 'bg-indigo-50',
        activeBorder: 'border-indigo-300',
        activeText: 'text-indigo-900',
    },
    {
        id: 'evening',
        label: 'Noite',
        range: '18h–21h',
        detail: 'Retornos: 1 tentativa. Uso restrito a email e mensagens assíncronas.',
        color: 'text-violet-500',
        activeBg: 'bg-violet-50',
        activeBorder: 'border-violet-300',
        activeText: 'text-violet-900',
    },
];

const SUGGESTIONS = [
    {
        id: 'commercial',
        label: 'Horário Comercial',
        detail: 'Manhã + Tarde em dias úteis — máxima taxa de conversão.',
        slots: ['morning', 'afternoon'],
    },
    {
        id: 'queue_free',
        label: 'Menor Fila',
        detail: 'Almoço + início da tarde — SDR sem chamadas simultâneas.',
        slots: ['lunch', 'afternoon'],
    },
    {
        id: 'full_day',
        label: 'Dia Completo',
        detail: 'Todos os períodos — máximo alcance, menor precisão.',
        slots: ['morning', 'lunch', 'afternoon', 'evening'],
    },
    {
        id: 'end_of_day',
        label: 'Fim do Dia',
        detail: 'Tarde + Noite — decisores disponíveis após reuniões de manhã.',
        slots: ['afternoon', 'evening'],
    },
];

// ─── Tooltip ─────────────────────────────────────────────────────────────────
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
            {children}
            <AnimatePresence>
                {show && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-slate-900 text-white text-[10px] leading-4 font-medium rounded-xl px-3 py-2 z-[300] shadow-xl pointer-events-none text-center"
                    >
                        {text}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const SchedulingRuleModal: React.FC<SchedulingRuleModalProps> = ({
    isOpen,
    onClose,
    selectedSlots: initialSlots,
    onSave,
}) => {
    const [slots, setSlots] = useState<string[]>(initialSlots.length ? initialSlots : ['morning', 'afternoon']);

    const toggle = (id: string) =>
        setSlots(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

    const applySuggestion = (suggSlots: string[]) => setSlots(suggSlots);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Card */}
                <motion.div
                    initial={{ scale: 0.88, opacity: 0, y: 12 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.88, opacity: 0, y: 12 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                    className="relative w-full max-w-sm bg-gradient-soft border border-orange-100 shadow-glass rounded-[30px] shadow-2xl border border-slate-200 overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-indigo-50 rounded-full flex items-center justify-center">
                                <Clock3 size={17} className="text-indigo-600" {...ICON} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 leading-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>Horários Definidos</h3>
                                <p className="text-[10px] text-slate-600 font-medium mt-0.5" style={{ fontFamily: 'Quicksand, sans-serif' }}>Selecione os períodos de contato</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-700 hover:bg-slate-100 transition-all"
                        >
                            <X size={15} {...ICON} />
                        </button>
                    </div>

                    <div className="px-6 py-5 space-y-5">
                        {/* Slots grid */}
                        <div>
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">Períodos Disponíveis</p>
                            <div className="grid grid-cols-2 gap-2">
                                {TIME_SLOTS.map(slot => {
                                    const active = slots.includes(slot.id);
                                    return (
                                        <Tooltip key={slot.id} text={slot.detail}>
                                            <button
                                                onClick={() => toggle(slot.id)}
                                                className={cn(
                                                    'w-full text-center py-3 px-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 group',
                                                    active
                                                        ? `${slot.activeBg} ${slot.activeBorder} shadow-sm`
                                                        : 'border-orange-200/50 bg-white/40 hover:border-orange-300 hover:bg-gradient-soft shadow-glass'
                                                )}
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    {active && <Check size={10} strokeWidth={3} className={slot.activeText} />}
                                                    <span className={cn('text-xs font-black', active ? slot.activeText : 'text-slate-600')}>
                                                        {slot.label}
                                                    </span>
                                                </div>
                                                <span className={cn('text-[10px] font-bold', active ? slot.color : 'text-slate-600')}>
                                                    {slot.range}
                                                </span>
                                            </button>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Suggestions */}
                        <div>
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                Sugestões Rápidas
                                <Info size={9} className="text-slate-300" />
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {SUGGESTIONS.map(sug => {
                                    const active = sug.slots.length === slots.length &&
                                        sug.slots.every(s => slots.includes(s));
                                    return (
                                        <Tooltip key={sug.id} text={sug.detail}>
                                            <button
                                                onClick={() => applySuggestion(sug.slots)}
                                                className={cn(
                                                    'px-3 py-1.5 rounded-full text-[10px] font-black border transition-all',
                                                    active
                                                        ? 'bg-slate-900 border-slate-900 text-white'
                                                        : 'bg-gradient-soft border border-orange-100 shadow-glass border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900'
                                                )}
                                            >
                                                {sug.label}
                                            </button>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Active summary */}
                        <div className="bg-gradient-to-b from-orange-50/60 to-transparent rounded-2xl border border-orange-100/60 px-4 py-3 text-center">
                            {slots.length === 0 ? (
                                <p className="text-xs text-slate-600 font-medium">Nenhum período selecionado</p>
                            ) : (
                                <>
                                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-1">Período ativo</p>
                                    <p className="text-sm font-black text-slate-800">
                                        {TIME_SLOTS.filter(s => slots.includes(s.id)).map(s => s.range).join(' · ')}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 pb-6 flex gap-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-full border border-orange-200/50 text-slate-600 text-xs font-bold hover:bg-white/40 shadow-glass transition-all"
                            style={{ fontFamily: 'Quicksand, sans-serif' }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => { onSave(slots); onClose(); }}
                            disabled={slots.length === 0}
                            className="flex-1 py-2.5 rounded-full bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 hover:shadow-[0_0_16px_rgba(99,102,241,0.4)] disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
                            style={{ fontFamily: 'Quicksand, sans-serif' }}
                        >
                            <Check size={13} {...ICON} /> Salvar
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
