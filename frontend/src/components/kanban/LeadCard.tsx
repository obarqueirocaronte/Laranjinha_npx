import React, { useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Lead } from '../../types';
import { Building2, Undo2, Check, Mail, Phone, Tag, User, Calendar } from 'lucide-react';
import { useVoip } from '../../contexts/VoipContext';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { UserAvatar } from '../common/UserAvatar';

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

// Static layout configurations for a pixel-perfect feel
const LAYOUT_VARIANTS = {
    FULL: {
        px: 'p-5',
        gap: 'gap-4',
        nameSize: 'text-[15px]',
        companySize: 'text-[17px]',
        tagSize: 'text-[10px]',
        iconSize: 18,
        contactPillPadding: 'py-2.5 px-4',
    },
    COMPACT: {
        px: 'p-4',
        gap: 'gap-3',
        nameSize: 'text-[13px]',
        companySize: 'text-[15px]',
        tagSize: 'text-[9px]',
        iconSize: 16,
        contactPillPadding: 'py-2 px-3',
    },
    PHONE_ONLY: {
        px: 'p-4',
        gap: 'gap-4',
        nameSize: 'text-[14px]',
        companySize: 'text-[16px]',
        tagSize: 'text-[10px]',
        iconSize: 18,
        contactPillPadding: 'py-2.5 px-4',
    },
    EMAIL_ONLY: {
        px: 'p-4',
        gap: 'gap-4',
        nameSize: 'text-[14px]',
        companySize: 'text-[16px]',
        tagSize: 'text-[10px]',
        iconSize: 18,
        contactPillPadding: 'py-2.5 px-4',
    },
};

export const LeadCard: React.FC<LeadCardProps> = ({
    lead,
    columnPosition,
    onClick,
    onReturn,
    onFinish,
    onSchedule,
    accentColor = '#FF8C00'
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

    // Model selection logic
    const cardModel = (lead.metadata?.card_model || 'FULL') as 'FULL' | 'COMPACT' | 'PHONE_ONLY' | 'EMAIL_ONLY';
    const variant = LAYOUT_VARIANTS[cardModel] || LAYOUT_VARIANTS.FULL;

    const hasTags = lead.tags && lead.tags.length > 0;
    const hasContactPhone = lead.phone && lead.phone.trim().length > 0;
    const hasContactEmail = lead.email && !lead.email.includes('sem_email_');

    const cadenceProgress = lead.cadence_progress || 0;
    const cnpj = lead.metadata?.cnpj;

    const cadenceColor = cadenceProgress >= 100 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
        cadenceProgress > 50 ? 'bg-blue-50 text-blue-600 border-blue-100' :
            'bg-slate-50 text-slate-400 border-slate-100';

    return (
        <motion.div
            ref={setNodeRef}
            {...attributes}
            onPointerDown={!isCadenceColumn ? handlePointerDown : undefined}
            onClick={handleClick}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={clsx(
                "relative flex flex-col w-full bg-[#FFFBF7] shadow-glass rounded-[40px] border border-orange-100/50 transition-all duration-300 hover:shadow-2xl hover:border-orange-200/50",
                variant.px,
                variant.gap,
                !isCadenceColumn ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                isDragging && "opacity-40 grayscale-[0.5] scale-95"
            )}
            style={{
                ...style,
                borderLeft: `5px solid ${accentColor}`,
                background: `linear-gradient(to right, ${accentColor}08, white 20%, white 100%)`
            }}
            {...(!isCadenceColumn ? listeners : {})}
        >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] pointer-events-none" 
                 style={{ background: `radial-gradient(circle at 70% 30%, ${accentColor} 0%, transparent 70%)` }} />
            {/* ROW 1: Company & Top Actions */}
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110">
                        <Building2 size={20} className="text-orange-500" strokeWidth={2} />
                    </div>
                    <h4
                        className={clsx("font-black text-slate-800 leading-tight truncate", variant.companySize)}
                        style={{ fontFamily: 'Comfortaa, cursive' }}
                        title={lead.company_name}
                    >
                        {lead.company_name}
                    </h4>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2" onPointerDown={e => e.stopPropagation()}>
                    {lead.assigned_sdr_id && (
                        <div className="mr-1">
                            <UserAvatar 
                                src={lead.sdr_profile_picture_url} 
                                name={lead.metadata?.assigned_sdr_name || 'SDR'} 
                                size="sm" 
                                border={false}
                                className="!rounded-lg ring-2 ring-white shadow-sm"
                            />
                        </div>
                    )}
                    {hasContactEmail && (
                        <div 
                            className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center cursor-pointer hover:bg-orange-200 transition-colors shadow-sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onSchedule) onSchedule(lead);
                            }}
                        >
                            <Calendar size={18} strokeWidth={2.5} />
                        </div>
                    )}
                </div>
            </div>

            {/* Visual Divider (The Black Line from Screen) */}
            <div className="h-[2px] w-full bg-slate-900/10 rounded-full mx-auto opacity-40 shrink-0" />

            {/* ROW 2: Contact Pill (The 'Roberto Rocha' style) */}
            <div className="relative shrink-0">
                <div className={clsx(
                    "flex items-center gap-3 rounded-3xl border transition-all duration-300 select-none bg-white/80 border-slate-100 shadow-sm hover:shadow-md hover:bg-white",
                    variant.contactPillPadding
                )}>
                    <User size={18} className="shrink-0 text-slate-400" {...ICON} />
                    <div className="flex-1 min-w-0">
                        <p
                            className={clsx("font-black text-slate-800 truncate", variant.nameSize)}
                            style={{ fontFamily: 'Comfortaa, cursive' }}
                        >
                            {lead.full_name}
                        </p>
                    </div>

                    <div className="flex gap-2 shrink-0 ml-1">
                        {hasContactPhone && (
                            <span
                                className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100 flex items-center justify-center cursor-pointer hover:bg-emerald-500 hover:text-white hover:scale-110 transition-all shadow-sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!voip.isCallActive && lead.phone) {
                                        voip.initiateCall(lead.phone, lead.id, lead.full_name);
                                    }
                                }}
                            >
                                <Phone size={14} strokeWidth={2.5} />
                            </span>
                        )}
                        {hasContactEmail && (
                            <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 border border-blue-100 flex items-center justify-center shadow-sm">
                                <Mail size={14} strokeWidth={2.5} />
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ROW 3: Tags Area (Dynamic Spacing) */}
            <div className="flex items-end justify-between w-full mt-auto min-h-6">
                <div className="flex flex-wrap gap-2 flex-1 min-w-0">
                    {/* Phone Tag Highlighted */}
                    {hasContactPhone && (
                        <span
                            className="inline-flex items-center gap-2 text-[10px] font-black px-3 py-1.5 rounded-xl bg-emerald-100/80 border border-emerald-200/60 text-emerald-700 cursor-default shadow-sm hover:scale-105 transition-transform"
                            style={{ fontFamily: 'Quicksand, sans-serif' }}
                        >
                            <Phone size={11} strokeWidth={2.5} className="shrink-0" />
                            {lead.phone}
                        </span>
                    )}

                    {/* Tags List */}
                    {cardModel === 'FULL' && hasTags && lead.tags?.map((t: string, idx: number) => (
                        <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-100 text-orange-700 cursor-default shadow-sm hover:bg-orange-100 transition-colors"
                            style={{ fontFamily: 'Comfortaa, cursive' }}
                        >
                            {idx === 0 && <Tag size={10} className="text-orange-400 shrink-0" {...ICON} />}
                            {t}
                        </span>
                    ))}

                    {/* Optional Label (like "Importação" in screen) */}
                    {cnpj && (
                        <span className="inline-flex items-center text-[10px] font-bold px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-100 text-orange-700 cursor-default shadow-sm">
                            {cnpj}
                        </span>
                    )}
                </div>

                {/* Cadence Progress Badge */}
                {(cardModel === 'FULL' || cardModel === 'COMPACT') && (
                    <div
                        className={clsx(
                            "shrink-0 flex items-center justify-center min-w-[44px] h-7 px-2.5 rounded-2xl border text-[11px] font-black tracking-widest shadow-sm transition-all",
                            cadenceColor
                        )}
                        style={{ fontFamily: 'Comfortaa, cursive' }}
                    >
                        {cadenceProgress}%
                    </div>
                )}
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
