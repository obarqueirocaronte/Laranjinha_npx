import React, { useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Lead } from '../../types';
import { Building2, Undo2, Check, Mail, Phone, Tag, User, MapPin, CalendarClock } from 'lucide-react';
import { useVoip } from '../../contexts/VoipContext';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

const ICON = { strokeWidth: 1.5 };

interface LeadCardProps {
    lead: Lead;
    columnPosition?: number;
    onClick?: () => void;
    onReturn?: (lead: Lead) => void;
    onFinish?: (lead: Lead) => void;
    onSchedule?: (lead: Lead) => void;
    accentColor?: string;
}

export const LeadCard: React.FC<LeadCardProps> = ({
    lead,
    columnPosition,
    onClick,
    onReturn,
    onFinish,
    onSchedule,
}) => {
    const isCadenceColumn = columnPosition === 5;
    const voip = useVoip();
    const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: lead.id,
        data: { lead, type: 'lead' },
        disabled: isCadenceColumn,
    });

    const style = transform ? {
        transform: CSS.Translate.toString(transform),
    } : undefined;

    const handlePointerDown = (e: React.PointerEvent) => {
        listeners?.onPointerDown?.(e);
        pointerDownPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleClick = () => {
        if (isDragging) return;
        onClick?.();
    };

    const hasTags = lead.tags && lead.tags.length > 0;
    const hasContactPhone = lead.phone && String(lead.phone).trim().length > 0;
    const hasContactEmail = lead.email && !String(lead.email).includes('sem_email_');
    const hasLinkedin = lead.metadata?.linkedin_url || lead.metadata?.linkedin;

    const cadenceProgress = lead.cadence_progress || 0;
    const cnpj = lead.metadata?.cnpj;

    return (
        <motion.div
            ref={setNodeRef}
            {...attributes}
            onPointerDown={!isCadenceColumn ? handlePointerDown : undefined}
            onClick={handleClick}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={clsx(
                "relative flex flex-col p-5 gap-3 w-full bg-[#ECF9F4] shadow-sm rounded-[32px] border border-[#D1F0E4] transition-all duration-300 hover:shadow-lg",
                !isCadenceColumn ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                isDragging && "opacity-40 grayscale-[0.5] scale-95"
            )}
            style={style}
            {...(!isCadenceColumn ? listeners : {})}
        >
            {/* ROW 1: Company & Top Actions */}
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm border border-slate-50">
                        <Building2 size={24} className="text-[#10B981]" strokeWidth={2} />
                    </div>
                    <h4
                        className="font-bold text-[#1E293B] text-[18px] leading-tight truncate shrink min-w-0"
                        style={{ fontFamily: 'Comfortaa, cursive' }}
                        title={lead.company_name}
                    >
                        {lead.company_name}
                    </h4>
                </div>

                <div className="flex items-center gap-2 shrink-0" onPointerDown={e => e.stopPropagation()}>
                    <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100 text-[#3B82F6] hover:bg-slate-50 transition-colors">
                        <MapPin size={18} strokeWidth={2} />
                    </button>
                    <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100 text-[#10B981] hover:bg-slate-50 transition-colors">
                        <Phone size={18} strokeWidth={2} />
                    </button>
                    <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100 text-[#6366F1] hover:bg-slate-50 transition-colors">
                        <Mail size={18} strokeWidth={2} />
                    </button>
                </div>
            </div>

            {/* ROW 2: CNPJ */}
            {cnpj && (
                <div className="flex -mt-1">
                    <div className="px-3 py-1 rounded-xl bg-white border border-[#E2E8F0] text-[#94A3B8] text-[12px] font-medium shadow-sm">
                        {cnpj}
                    </div>
                </div>
            )}

            {/* ROW 3: Inner Contact Card */}
            <div className="bg-white rounded-[24px] p-4 shadow-sm border border-[#F1F5F9] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                        <User size={20} className="text-slate-400" strokeWidth={1.5} />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <p
                            className="font-bold text-[#334155] text-[17px] truncate"
                            style={{ fontFamily: 'Comfortaa, cursive' }}
                        >
                            {lead.full_name}
                        </p>
                        <p className="text-[#94A3B8] text-[11px] font-bold uppercase tracking-wider truncate">
                            {lead.metadata?.job_title || 'CONTATO'}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2 shrink-0">
                    {hasContactPhone && (
                        <span
                            className="w-9 h-9 rounded-full bg-[#EBFDF5] text-[#10B981] flex items-center justify-center cursor-pointer hover:bg-[#10B981] hover:text-white transition-all shadow-sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!voip.isCallActive && lead.phone) {
                                    voip.initiateCall(lead.phone, lead.id, lead.full_name);
                                }
                            }}
                        >
                            <Phone size={16} strokeWidth={2} />
                        </span>
                    )}
                    {hasContactEmail && (
                        <span className="w-9 h-9 rounded-full bg-[#EEF2FF] text-[#6366F1] flex items-center justify-center shadow-sm">
                            <Mail size={16} strokeWidth={2} />
                        </span>
                    )}
                    {(hasLinkedin || true) && (
                        <span className="w-9 h-9 rounded-full bg-[#EBF5FF] text-[#3B82F6] flex items-center justify-center shadow-sm text-[12px] font-black">
                            in
                        </span>
                    )}
                    {lead.metadata?.next_contact_at && (
                        <span
                            className="w-9 h-9 rounded-full bg-[#FFF7ED] text-[#F97316] flex items-center justify-center cursor-pointer hover:bg-[#F97316] hover:text-white transition-all shadow-sm"
                            title="Reagendar Retorno"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSchedule?.(lead);
                            }}
                        >
                            <CalendarClock size={16} strokeWidth={2} />
                        </span>
                    )}
                </div>
            </div>

            {/* ROW 4: Tags Area */}
            <div className="flex items-center justify-between w-full mt-auto pt-1">
                <div className="flex items-center gap-2">
                    {/* Tags List */}
                    {hasTags && (
                        <>
                            <span
                                className="inline-flex items-center gap-1.5 text-[13px] font-bold px-4 py-2 rounded-2xl bg-[#FFEDD5] border border-[#FED7AA] text-[#9A3412] cursor-default shadow-sm"
                                style={{ fontFamily: 'Comfortaa, cursive' }}
                            >
                                <Tag size={13} className="text-[#F97316]" {...ICON} />
                                {lead.tags![0]}
                            </span>
                            {lead.tags!.length > 1 && (
                                <span className="text-[#94A3B8] text-[13px] font-bold">+{lead.tags!.length - 1}</span>
                            )}
                        </>
                    )}
                </div>

                {/* Cadence Progress Badge */}
                <div
                    className="shrink-0 flex items-center justify-center w-11 h-11 rounded-full bg-[#FFEDD5] border border-[#FED7AA] text-[#9A3412] text-[13px] font-bold shadow-sm"
                    style={{ fontFamily: 'Comfortaa, cursive' }}
                >
                    {cadenceProgress}%
                </div>
            </div>

            {/* Floating Cadence Controls */}
            <AnimatePresence>
                {isCadenceColumn && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 500, damping: 30 } }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        className="absolute -top-3 -right-3 flex gap-1.5 z-10"
                    >
                        <button
                            onClick={e => { e.stopPropagation(); onReturn?.(lead); }}
                            className="w-8 h-8 grid place-items-center bg-white border border-slate-200 text-slate-600 rounded-full shadow-lg hover:bg-slate-50 transition-all active:scale-90"
                        >
                            <Undo2 size={13} {...ICON} />
                        </button>
                        <button
                            onClick={e => { e.stopPropagation(); onFinish?.(lead); }}
                            className="w-8 h-8 grid place-items-center bg-red-500 text-white rounded-full shadow-lg shadow-red-200 hover:bg-red-600 transition-all active:scale-90"
                        >
                            <Check size={13} {...ICON} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {lead.metadata?.is_paused && (
                <span className="absolute -bottom-2 right-12 text-[9px] font-black px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-300 rounded-lg uppercase tracking-widest shadow-sm">
                    Pausado
                </span>
            )}
        </motion.div>
    );
};
