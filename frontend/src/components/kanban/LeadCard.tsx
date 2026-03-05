import React, { useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Lead } from '../../types';
import { Building2, Undo2, Check, Lock, MapPin, Mail, Phone, Tag, User, MessageSquare, CalendarClock } from 'lucide-react';
import { useVoip } from '../../contexts/VoipContext';

const ICON = { strokeWidth: 1.5 };
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

interface LeadCardProps {
    lead: Lead;
    columnPosition?: number;
    onClick?: () => void;
    onReturn?: (lead: Lead) => void;
    onFinish?: (lead: Lead) => void;
    onSchedule?: (lead: Lead) => void;
    accentColor?: string; // hex, from parent column
}

// ─── Shared pill height for all inline expand chips ───
const PILL_BASE = "h-6 inline-flex items-center rounded-full border cursor-default shadow-sm overflow-hidden transition-all duration-200 ease-out";

// ─── Generic hover-expand chip (top-right zone) ───
interface ExpandChipProps {
    icon: React.ReactNode;
    label?: string;
    baseClass: string;
    openClass: string;
}
const ExpandChip: React.FC<ExpandChipProps> = ({ icon, label, baseClass, openClass }) => {
    const [open, setOpen] = React.useState(false);
    return (
        <div
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            className={clsx(PILL_BASE, "px-1.5 pointer-events-auto", open ? openClass : baseClass)}
        >
            <span className="shrink-0 flex items-center">{icon}</span>
            <div className={clsx(
                "overflow-hidden whitespace-nowrap transition-all duration-200 ease-out",
                open ? "max-w-[180px] opacity-100 ml-1.5" : "max-w-0 opacity-0"
            )}>
                <span className="text-[10px] font-extrabold tracking-tight leading-none">{label}</span>
            </div>
        </div>
    );
};

export const LeadCard: React.FC<LeadCardProps> = ({ lead, columnPosition, onClick, onReturn, onFinish, onSchedule }) => {
    const isCadenceColumn = columnPosition === 5;
    const voip = useVoip();

    // ── Drag vs Click guard ──
    // dnd-kit needs distance>=8px before it activates drag.
    // We track pointer position on down; if the displacement on up > 6px, it was a drag, skip onClick.
    const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

    const handlePointerDown = (e: React.PointerEvent) => {
        // Call dnd-kit's own pointer handler FIRST so drag detection works
        listeners?.onPointerDown?.(e);
        // Then record position for our click-vs-drag guard
        pointerDownPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleClick = () => {
        // dnd-kit sets isDragging=true when a drag is active; suppress click in that case
        if (isDragging) return;
        onClick?.();
    };

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: lead.id,
        data: { ...lead },
        disabled: isCadenceColumn,
    });

    const style = { transform: CSS.Translate.toString(transform) };

    // ── Column styling: soft tinted card bg matching column identity ──
    const columnTokens = {
        1: { card: 'bg-orange-50/80  border-orange-200/50 hover:border-orange-300/80 shadow-orange-400/10', accent: 'text-orange-500' },
        2: { card: 'bg-blue-50/80    border-blue-200/50   hover:border-blue-300/80   shadow-blue-400/10', accent: 'text-blue-500' },
        3: { card: 'bg-violet-50/80  border-violet-200/50 hover:border-violet-300/80 shadow-violet-400/10', accent: 'text-violet-500' },
        4: { card: 'bg-emerald-50/80 border-emerald-200/50 hover:border-emerald-300/80 shadow-emerald-400/10', accent: 'text-emerald-500' },
        5: { card: 'bg-red-50/80     border-red-200/50    hover:border-red-300/80    shadow-red-400/10', accent: 'text-red-500' },
    } as const;
    const tok = columnTokens[(columnPosition ?? 0) as keyof typeof columnTokens] ?? {
        card: 'bg-orange-50/60 border-orange-200/40 hover:border-orange-300/60', accent: 'text-orange-500',
    };

    // ── Data extraction ──
    const estado = lead.metadata?.estado || lead.metadata?.estado_uf || lead.metadata?.state;
    const cidade = lead.metadata?.cidade || lead.metadata?.city;
    const geoLabel = [cidade, estado].filter(Boolean).join(' - ');
    const cnpj = lead.metadata?.cnpj || lead.metadata?.CNPJ;
    const telEmpresa = lead.metadata?.telefone_empresa || lead.metadata?.tel_empresa;
    const emailEmpresa = lead.metadata?.email_empresa;
    const lastCallNotes = lead.metadata?.last_call_notes;

    const hasContactPhone = Boolean(lead.phone);
    const hasContactEmail = Boolean(lead.email && !lead.email.includes('sem_email_'));
    const hasLinkedin = Boolean(lead.metadata?.linkedin_url);
    const hasTags = lead.tags && lead.tags.length > 0;
    const hasAnyContact = hasContactPhone || hasContactEmail || hasLinkedin;

    // ── Cadence badge ──
    const cadenceProgress = lead.cadence_progress || 0;
    const cadenceColor =
        cadenceProgress > 100 ? 'bg-red-100 text-red-700 border-red-200' :
            cadenceProgress > 70 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                cadenceProgress > 30 ? 'bg-orange-100 text-orange-700 border-orange-200' :
                    cadenceProgress > 0 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                        'bg-slate-100 text-slate-600 border-slate-200';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
            whileHover={!isCadenceColumn && !isDragging ? { y: -2 } : undefined}
            transition={{ type: 'spring', stiffness: 350, damping: 28, mass: 0.7 }}
            ref={setNodeRef}
            style={{ ...style, touchAction: isCadenceColumn ? 'auto' : 'none' }}
            {...attributes}
            onPointerDown={!isCadenceColumn ? handlePointerDown : undefined}
            onClick={handleClick}
            className={clsx(
                'relative rounded-2xl border-2 outline-none flex flex-col p-4',
                'h-[184px]',
                'transition-[border-color,box-shadow] duration-200 shadow-sm hover:shadow-xl',
                isCadenceColumn ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
                tok.card,
                isDragging && 'opacity-0 invisible pointer-events-none'
            )}
        >
            {/* ── ROW 1: Company name + expand chips (top-right) ── */}
            <div className="flex justify-between items-start gap-2 mb-1.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Building2 size={16} className={clsx('shrink-0', tok.accent)} {...ICON} />
                    <h4
                        className="font-black text-slate-800 text-[14px] leading-tight truncate"
                        style={{ fontFamily: 'Comfortaa, cursive' }}
                        title={lead.company_name}
                    >
                        {lead.company_name}
                    </h4>
                </div>

                {/* Top-right lateral expand chips — pointer-events isolated */}
                <div className="flex items-center gap-1 shrink-0" onPointerDown={e => e.stopPropagation()}>
                    {lastCallNotes && (
                        <ExpandChip
                            icon={<MessageSquare size={11} className="text-orange-600" {...ICON} />}
                            label={lastCallNotes}
                            baseClass="bg-orange-100 border border-orange-200 shadow-glass/80"
                            openClass="bg-orange-50 border-orange-200 pr-2"
                        />
                    )}
                    {geoLabel && (
                        <ExpandChip
                            icon={<MapPin size={11} className="text-blue-600" {...ICON} />}
                            label={geoLabel}
                            baseClass="bg-gradient-soft border border-orange-100 shadow-glass/80 border-slate-200/70"
                            openClass="bg-blue-50 border-blue-200 pr-2"
                        />
                    )}
                    {telEmpresa && (
                        <ExpandChip
                            icon={<Phone size={11} className="text-emerald-600" {...ICON} />}
                            label={telEmpresa}
                            baseClass="bg-gradient-soft border border-orange-100 shadow-glass/80 border-slate-200/70"
                            openClass="bg-emerald-50 border-emerald-200 pr-2"
                        />
                    )}
                    {emailEmpresa && (
                        <ExpandChip
                            icon={<Mail size={11} className="text-blue-600" {...ICON} />}
                            label={emailEmpresa}
                            baseClass="bg-gradient-soft border border-orange-100 shadow-glass/80 border-slate-200/70"
                            openClass="bg-blue-50 border-blue-200 pr-2"
                        />
                    )}
                </div>
            </div>

            {/* ── ROW 2: CNPJ badge ── */}
            <div className="mb-3">
                {cnpj && (
                    <span
                        className="text-[9px] font-bold px-2 py-[2px] rounded-md bg-white/60 border border-slate-200/60 text-slate-600 tracking-widest shadow-sm"
                        style={{ fontFamily: 'Comfortaa, cursive' }}
                    >
                        {cnpj}
                    </span>
                )}
            </div>

            {/* ── ROW 3: Contact pill (static, no hover popup) ── */}
            <div className="relative mt-auto mb-2">
                <div className={clsx(
                    "flex items-center gap-2.5 rounded-xl py-2 px-3 border transition-all duration-200 select-none",
                    'bg-white/60 border-slate-200/60 shadow-sm hover:shadow-md hover:bg-white/80'
                )}>
                    <User size={14} className="shrink-0 text-slate-600" {...ICON} />
                    <div className="flex-1 min-w-0">
                        <p
                            className="text-[12px] font-bold text-slate-800 truncate"
                            style={{ fontFamily: 'Comfortaa, cursive' }}
                            title={lead.full_name}
                        >
                            {lead.full_name}
                        </p>
                        {lead.job_title && (
                            <p
                                className="text-[9px] text-slate-600 font-bold uppercase tracking-widest truncate mt-[1px]"
                                style={{ fontFamily: 'Comfortaa, cursive' }}
                            >
                                {lead.job_title}
                            </p>
                        )}
                    </div>
                    {hasAnyContact && (
                        <div className="flex gap-1 shrink-0">
                            {hasContactPhone && (
                                <span
                                    className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center cursor-pointer hover:bg-emerald-200 hover:scale-110 transition-all"
                                    title={`Ligar: ${lead.phone}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!voip.isCallActive && lead.phone) {
                                            voip.initiateCall(lead.phone, lead.id, lead.full_name);
                                        }
                                    }}
                                >
                                    <Phone size={9} className="text-emerald-600" strokeWidth={2} />
                                </span>
                            )}
                            {hasContactEmail && (
                                <span className="w-5 h-5 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center" title="Email">
                                    <Mail size={9} className="text-blue-600" strokeWidth={2} />
                                </span>
                            )}
                            {hasLinkedin && (
                                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black" style={{ background: '#E8F0FA', border: '1px solid #BFDBFE', color: '#0A66C2' }} title="LinkedIn">
                                    in
                                </span>
                            )}
                            {lead.metadata?.next_contact_at && (
                                <span
                                    className="w-5 h-5 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center cursor-pointer hover:bg-orange-200 hover:scale-110 transition-all text-orange-600"
                                    title="Reagendar Retorno"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSchedule?.(lead);
                                    }}
                                >
                                    <CalendarClock size={9} strokeWidth={2} />
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── ROW 4: Tags (static, first tag + count) + Cadence badge ── */}
            <div className="flex justify-between items-end mt-auto gap-2">
                <div className="flex-1 min-w-0">
                    {hasTags && (
                        <div className="relative group flex items-center gap-1.5">
                            <span
                                className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full bg-orange-100/80 border border-orange-200/70 text-orange-700 cursor-default shadow-sm whitespace-nowrap hover:scale-105 hover:shadow-md transition-all duration-200"
                                style={{ fontFamily: 'Comfortaa, cursive' }}
                            >
                                <Tag size={10} className="text-orange-500 shrink-0" {...ICON} />
                                {lead.tags![0]}
                            </span>
                            {lead.tags!.length > 1 && (
                                <span
                                    className="text-[10px] font-black text-slate-600 cursor-default"
                                    style={{ fontFamily: 'Comfortaa, cursive' }}
                                >
                                    +{lead.tags!.length - 1}
                                </span>
                            )}

                            {/* Tooltip showing all tags on hover - Orange Liquid Glass & surget animation */}
                            <div className="absolute bottom-full left-0 mb-3 pointer-events-none opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-500 origin-bottom-left z-[100] min-w-[160px]">
                                <div className="bg-orange-50/80 backdrop-blur-xl p-3 rounded-2xl shadow-2xl border border-orange-200/50 flex flex-wrap gap-2">
                                    {lead.tags!.map((t, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg bg-red-50 border border-red-200/60 text-red-600 shadow-sm"
                                            style={{ fontFamily: 'Comfortaa, cursive' }}
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                            {t}
                                        </span>
                                    ))}
                                </div>
                                {/* Triangle pointer */}
                                <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-orange-50/80 border-r border-b border-orange-200/50 rotate-45" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Cadence badge */}
                <div
                    className={clsx(
                        "shrink-0 flex items-center justify-center min-w-[38px] h-6 px-2 rounded-full border text-[10px] font-bold tracking-wide transition-all duration-300 shadow-sm",
                        cadenceColor
                    )}
                    style={{ fontFamily: 'Comfortaa, cursive' }}
                >
                    {cadenceProgress}%
                </div>
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
                            className="w-7 h-7 grid place-items-center bg-gradient-soft border border-orange-100 shadow-glass hover:bg-slate-50 text-slate-600 rounded-full border border-slate-200 shadow-md hover:shadow-[0_0_12px_rgba(99,102,241,0.25)] transition-all duration-150 active:scale-90"
                        >
                            <Undo2 size={12} {...ICON} />
                        </button>
                        <button
                            onClick={e => { e.stopPropagation(); onFinish?.(lead); }}
                            className="w-7 h-7 grid place-items-center bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md shadow-red-200 hover:shadow-[0_0_12px_rgba(239,68,68,0.4)] transition-all duration-150 active:scale-90"
                        >
                            <Check size={12} {...ICON} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {isCadenceColumn && (
                <div className="absolute top-3 right-3 text-red-300/50">
                    <Lock size={11} {...ICON} />
                </div>
            )}

            {lead.metadata?.is_paused && (
                <span className="absolute bottom-10 right-3 text-[9px] font-black px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-300 rounded-md uppercase tracking-widest shadow-sm">
                    Pausado
                </span>
            )}
        </motion.div>
    );
};
