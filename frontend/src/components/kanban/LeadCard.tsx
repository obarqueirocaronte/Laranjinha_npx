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
    accentColor,
}) => {
    const isCadenceColumn = columnPosition === 5;
    const voip = useVoip();
    const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: lead.id,
        data: { lead, type: 'lead' },
        disabled: isCadenceColumn,
    });



    const handlePointerDown = (e: React.PointerEvent) => {
        listeners?.onPointerDown?.(e);
        pointerDownPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleClick = () => {
        if (isDragging) return;
        onClick?.();
    };

    const [isMapHovered, setIsMapHovered] = React.useState(false);
    const [isTagHovered, setIsTagHovered] = React.useState(false);

    // ── Data flags ──────────────────────────────────────────────────────────
    const hasContactPhone = lead.phone && String(lead.phone).trim().length > 0;
    const hasContactEmail = lead.email && !String(lead.email).includes('sem_email_');
    const hasLinkedin = !!(lead.metadata?.linkedin_url || lead.metadata?.linkedin);
    const hasTags = lead.tags && lead.tags.length > 0;
    const hasContactName = !!(lead.full_name && lead.full_name.trim().length > 0);

    const cadenceProgress = lead.cadence_progress || 0;
    const cnpj = lead.metadata?.cnpj;
    const location = lead.metadata?.location || lead.metadata?.city;
    const hasLocation = !!location;
    const hasSchedule = !!lead.metadata?.next_contact_at;

    // Smart tag visibility: if card has limited info, show 2 tags inline instead of 1
    const hasRichInfo = !!(cnpj || lead.metadata?.job_title || hasContactEmail || hasLinkedin);
    const visibleTagCount = (!hasRichInfo && hasTags && lead.tags!.length >= 2) ? 2 : 1;

    // Apply dynamic glassmorphism based on accentColor
    const dynamicStyle = React.useMemo(() => {
        const baseStyle = transform ? { transform: CSS.Translate.toString(transform) } : {};
        if (accentColor) {
            // Add ~10% opacity (1A) for bg, and ~20% opacity (33) for border
            return {
                ...baseStyle,
                backgroundColor: `${accentColor}15`,
                borderColor: `${accentColor}30`,
            };
        }
        return {
            ...baseStyle,
            backgroundColor: 'rgba(255, 255, 255, 0.65)',
            borderColor: 'rgba(255, 255, 255, 0.8)',
        };
    }, [transform, accentColor]);

    return (
        <motion.div
            ref={setNodeRef}
            {...attributes}
            onPointerDown={!isCadenceColumn ? handlePointerDown : undefined}
            onClick={handleClick}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className={clsx(
                "relative flex flex-col p-[14px] gap-2.5 w-full backdrop-blur-md shadow-sm rounded-[24px] border transition-all duration-300 hover:shadow-lg",
                !isCadenceColumn ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                isDragging && "opacity-40 grayscale-[0.5] scale-95"
            )}
            style={dynamicStyle}
            {...(!isCadenceColumn ? listeners : {})}
        >
            {/* ── ROW 1: Company name + icons ── */}
            <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Company icon */}
                    <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm border border-slate-50">
                        <Building2 size={19} className="text-[#10B981]" strokeWidth={2} />
                    </div>
                    {/* Company name — single line with ellipsis, full name on hover */}
                    <h4
                        className="font-bold text-[#1E293B] text-[14.5px] leading-tight truncate"
                        style={{ fontFamily: 'Comfortaa, cursive' }}
                        title={lead.company_name}
                    >
                        {lead.company_name}
                    </h4>
                </div>

                {/* Header actions — only renders if there's location or schedule */}
                {(hasLocation || hasSchedule) && (
                    <div className="flex items-center gap-1.5 shrink-0" onPointerDown={e => e.stopPropagation()}>
                        {hasLocation && (
                            <motion.button
                                key="location"
                                onHoverStart={() => setIsMapHovered(true)}
                                onHoverEnd={() => setIsMapHovered(false)}
                                className="h-8 min-w-[32px] rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100 text-[#3B82F6] hover:border-[#3B82F6] hover:shadow-md transition-all active:scale-95 px-2 overflow-hidden"
                                title={location!}
                            >
                                <MapPin size={15} strokeWidth={2} className="shrink-0" />
                                <AnimatePresence>
                                    {isMapHovered && (
                                        <motion.span
                                            initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                                            animate={{ width: 'auto', opacity: 1, marginLeft: 5 }}
                                            exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                                            transition={{ duration: 0.18 }}
                                            className="text-[11px] font-semibold whitespace-nowrap overflow-hidden"
                                        >
                                            {location}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        )}
                        {hasSchedule && (
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                className="w-8 h-8 rounded-full bg-[#FFF7ED] text-[#F97316] flex items-center justify-center cursor-pointer hover:bg-[#F97316] hover:text-white hover:shadow-md transition-all active:scale-90 border border-[#FED7AA]/60"
                                title={`Agenda: ${new Date(lead.metadata!.next_contact_at!).toLocaleDateString()}`}
                                onClick={(e) => { e.stopPropagation(); onSchedule?.(lead); }}
                            >
                                <CalendarClock size={15} strokeWidth={2} />
                            </motion.button>
                        )}
                    </div>
                )}
            </div>

            {/* ── ROW 2: CNPJ (conditional) ── */}
            {cnpj && (
                <div className="flex -mt-1">
                    <div
                        className="px-2.5 py-0.5 rounded-lg bg-white border border-[#E2E8F0] text-[#94A3B8] text-[11px] font-medium shadow-sm cursor-default select-all"
                        title="CNPJ"
                    >
                        {cnpj}
                    </div>
                </div>
            )}

            {/* ── ROW 3: Contact card (adaptive) ── */}
            <div className="bg-white rounded-[18px] px-3 py-2.5 shadow-sm border border-[#F1F5F9] flex items-center justify-between gap-2">
                {hasContactName ? (
                    /* Named contact */
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                            <User size={16} className="text-slate-400" strokeWidth={1.5} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <p
                                className="font-bold text-[#334155] text-[14px] truncate leading-tight"
                                style={{ fontFamily: 'Comfortaa, cursive' }}
                                title={lead.full_name}
                            >
                                {lead.full_name}
                            </p>
                            {lead.metadata?.job_title && (
                                <p className="text-[#94A3B8] text-[10px] font-bold uppercase tracking-wider truncate mt-0.5">
                                    {lead.metadata.job_title}
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    /* No named contact — show phone number */
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-[#EBFDF5] flex items-center justify-center shrink-0 border border-[#D1FAE5]">
                            <Phone size={16} className="text-[#10B981]" strokeWidth={1.5} />
                        </div>
                        <p
                            className="font-bold text-[#334155] text-[14px] truncate"
                            title={String(lead.phone)}
                        >
                            {String(lead.phone || '')}
                        </p>
                    </div>
                )}

                {/* Contact action buttons */}
                <div className="flex gap-1.5 shrink-0" onPointerDown={e => e.stopPropagation()}>
                    {hasContactPhone && (
                        <motion.span
                            whileHover={{ scale: 1.12 }}
                            className="w-8 h-8 rounded-full bg-[#EBFDF5] text-[#10B981] flex items-center justify-center cursor-pointer hover:bg-[#10B981] hover:text-white transition-all active:scale-90"
                            title={`Ligar: ${lead.full_name || lead.phone}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!voip.isCallActive && lead.phone) {
                                    voip.initiateCall(String(lead.phone), lead.id, lead.full_name);
                                }
                            }}
                        >
                            <Phone size={15} strokeWidth={2} />
                        </motion.span>
                    )}
                    {hasContactEmail && (
                        <motion.span
                            whileHover={{ scale: 1.12 }}
                            className="w-8 h-8 rounded-full bg-[#EEF2FF] text-[#6366F1] flex items-center justify-center cursor-pointer hover:bg-[#6366F1] hover:text-white transition-all"
                            title={lead.email}
                        >
                            <Mail size={15} strokeWidth={2} />
                        </motion.span>
                    )}
                    {hasLinkedin && (
                        <motion.span
                            whileHover={{ scale: 1.12 }}
                            className="w-8 h-8 rounded-full bg-[#EBF5FF] text-[#3B82F6] flex items-center justify-center cursor-pointer hover:bg-[#3B82F6] hover:text-white transition-all text-[11.5px] font-black"
                            title="LinkedIn"
                        >
                            in
                        </motion.span>
                    )}
                </div>
            </div>

            {/* ── ROW 4: Tags + Progress ── */}
            <div className="flex items-center justify-between w-full mt-auto">
                {/* Tags — smart display */}
                <div className="relative flex items-center gap-1.5 overflow-visible min-w-0 flex-1 mr-2">
                    {hasTags && (
                        <div
                            className="relative flex items-center gap-1.5 flex-wrap"
                            onMouseEnter={() => setIsTagHovered(true)}
                            onMouseLeave={() => setIsTagHovered(false)}
                        >
                            {lead.tags!.slice(0, visibleTagCount).map((tag, idx) => (
                                <motion.span
                                    key={idx}
                                    layout
                                    className="inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-xl bg-[#FFEDD5] border border-[#FED7AA] text-[#9A3412] cursor-help shadow-sm hover:brightness-95 transition-all whitespace-nowrap"
                                    style={{ fontFamily: 'Comfortaa, cursive' }}
                                >
                                    {idx === 0 && <Tag size={11} className="text-[#F97316]" {...ICON} />}
                                    {tag}
                                </motion.span>
                            ))}

                            {lead.tags!.length > visibleTagCount && !isTagHovered && (
                                <span className="text-[#94A3B8] text-[12px] font-bold whitespace-nowrap">
                                    +{lead.tags!.length - visibleTagCount}
                                </span>
                            )}

                            {/* Hover popup with all tags */}
                            <AnimatePresence>
                                {isTagHovered && lead.tags!.length > visibleTagCount && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.92 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.92 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute bottom-full left-0 mb-2 p-2 bg-white border border-[#FED7AA] rounded-xl shadow-xl flex flex-wrap gap-1 z-50 min-w-[140px]"
                                    >
                                        {lead.tags?.map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-0.5 bg-[#FFEDD5] text-[#9A3412] text-[10px] font-bold rounded-lg border border-[#FED7AA]/50 whitespace-nowrap"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Progress badge */}
                <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-[#FFEDD5] border border-[#FED7AA] text-[#9A3412] text-[11.5px] font-bold shadow-sm cursor-default"
                    style={{ fontFamily: 'Comfortaa, cursive' }}
                    title={`Cadência: ${cadenceProgress}%`}
                >
                    {cadenceProgress}%
                </motion.div>
            </div>

            {/* ── Cadence column controls ── */}
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
