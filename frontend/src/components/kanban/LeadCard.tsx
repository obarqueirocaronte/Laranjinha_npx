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

    const [isMapHovered, setIsMapHovered] = React.useState(false);
    const [isTagHovered, setIsTagHovered] = React.useState(false);

    const hasTags = lead.tags && lead.tags.length > 0;
    const hasContactPhone = lead.phone && String(lead.phone).trim().length > 0;
    const hasContactEmail = lead.email && !String(lead.email).includes('sem_email_');
    const hasLinkedin = lead.metadata?.linkedin_url || lead.metadata?.linkedin;

    const cadenceProgress = lead.cadence_progress || 0;
    const cnpj = lead.metadata?.cnpj;
    const location = lead.metadata?.location;

    return (
        <motion.div
            ref={setNodeRef}
            {...attributes}
            onPointerDown={!isCadenceColumn ? handlePointerDown : undefined}
            onClick={handleClick}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={clsx(
                "relative flex flex-col p-[14px] gap-2.5 w-full bg-[#ECF9F4] shadow-sm rounded-[24px] border border-[#D1F0E4] transition-all duration-300 hover:shadow-lg",
                !isCadenceColumn ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                isDragging && "opacity-40 grayscale-[0.5] scale-95"
            )}
            style={style}
            {...(!isCadenceColumn ? listeners : {})}
        >
            {/* ROW 1: Company & Top Actions */}
            <div className="flex items-start justify-between w-full">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm border border-slate-50 mt-0.5">
                        <Building2 size={20} className="text-[#10B981]" strokeWidth={2} />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                        <h4
                            className="font-bold text-[#1E293B] text-[15px] leading-tight break-words"
                            style={{ fontFamily: 'Comfortaa, cursive' }}
                        >
                            {lead.company_name}
                        </h4>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2" onPointerDown={e => e.stopPropagation()}>
                    <motion.button 
                        onHoverStart={() => setIsMapHovered(true)}
                        onHoverEnd={() => setIsMapHovered(false)}
                        className="h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100 text-[#3B82F6] hover:bg-white hover:border-[#3B82F6] hover:shadow-md transition-all active:scale-95 px-2"
                    >
                        <MapPin size={15} strokeWidth={2} />
                        <AnimatePresence>
                            {isMapHovered && location && (
                                <motion.span
                                    initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                                    animate={{ width: 'auto', opacity: 1, marginLeft: 6 }}
                                    exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                                    className="text-[10px] font-bold whitespace-nowrap overflow-hidden"
                                >
                                    {location}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.button>
                    {hasContactPhone && (
                         <button className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100 text-[#10B981] hover:bg-white hover:border-[#10B981] hover:shadow-md transition-all active:scale-95" title="Cadastro possui Telefone">
                            <Phone size={15} strokeWidth={2} />
                        </button>
                    )}
                    {hasContactEmail && (
                        <button className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100 text-[#6366F1] hover:bg-white hover:border-[#6366F1] hover:shadow-md transition-all active:scale-95" title="Cadastro possui Email">
                            <Mail size={15} strokeWidth={2} />
                        </button>
                    )}
                </div>
            </div>

            {/* ROW 2: CNPJ & Extra Info */}
            <div className="flex items-center justify-between -mt-1.5">
                {cnpj && (
                    <div className="px-2.5 py-0.5 rounded-lg bg-white border border-[#E2E8F0] text-[#94A3B8] text-[11px] font-medium shadow-sm transition-opacity hover:opacity-80 cursor-default" title="CNPJ da Empresa">
                        {cnpj}
                    </div>
                )}
                
                {lead.metadata?.next_contact_at && (
                    <motion.span
                        whileHover={{ scale: 1.1 }}
                        className="w-7.5 h-7.5 rounded-full bg-[#FFF7ED] text-[#F97316] flex items-center justify-center cursor-pointer hover:bg-[#F97316] hover:text-white hover:shadow-md transition-all active:scale-90 border border-[#FED7AA]/50"
                        title={`Agenda: ${new Date(lead.metadata.next_contact_at).toLocaleDateString()}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSchedule?.(lead);
                        }}
                    >
                        <CalendarClock size={14} strokeWidth={2} />
                    </motion.span>
                )}
            </div>

            {/* ROW 3: Inner Contact Card */}
            <div className="bg-white rounded-[18px] p-2.5 shadow-sm border border-[#F1F5F9] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                        <User size={16} className="text-slate-400" strokeWidth={1.5} />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <p
                            className="font-bold text-[#334155] text-[14.2px] truncate leading-tight"
                            style={{ fontFamily: 'Comfortaa, cursive' }}
                            title={lead.full_name}
                        >
                            {lead.full_name}
                        </p>
                        <p className="text-[#94A3B8] text-[9px] font-bold uppercase tracking-wider truncate mt-0.5" title={lead.metadata?.job_title}>
                            {lead.metadata?.job_title || 'CONTATO'}
                        </p>
                    </div>
                </div>

                <div className="flex gap-1.5 shrink-0" onPointerDown={e => e.stopPropagation()}>
                    {hasContactPhone && (
                        <span
                            className="w-7.5 h-7.5 rounded-full bg-[#EBFDF5] text-[#10B981] flex items-center justify-center cursor-pointer hover:bg-[#10B981] hover:text-white hover:shadow-md transition-all active:scale-90"
                            title={`Ligar via WhatsApp para ${lead.full_name}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!voip.isCallActive && lead.phone) {
                                    voip.initiateCall(lead.phone, lead.id, lead.full_name);
                                }
                            }}
                        >
                            <Phone size={14} strokeWidth={2} />
                        </span>
                    )}
                    {(hasLinkedin || true) && (
                        <span className="w-7.5 h-7.5 rounded-full bg-[#EBF5FF] text-[#3B82F6] flex items-center justify-center hover:shadow-md transition-all cursor-pointer text-[11px] font-black" title="LinkedIn">
                            in
                        </span>
                    )}
                </div>
            </div>

            {/* ROW 4: Tags Area */}
            <div className="flex items-center justify-between w-full mt-auto pt-1">
                <div className="relative flex items-center gap-1.5 overflow-visible">
                    {/* Tags List */}
                    {hasTags && (
                        <div 
                            className="relative"
                            onMouseEnter={() => setIsTagHovered(true)}
                            onMouseLeave={() => setIsTagHovered(false)}
                        >
                            <motion.span
                                layout
                                className="inline-flex items-center gap-1.5 text-[11.5px] font-bold px-3 py-1.5 rounded-xl bg-[#FFEDD5] border border-[#FED7AA] text-[#9A3412] cursor-help shadow-sm hover:brightness-95 transition-all"
                                style={{ fontFamily: 'Comfortaa, cursive' }}
                            >
                                <Tag size={11} className="text-[#F97316]" {...ICON} />
                                {lead.tags![0]}
                            </motion.span>
                            
                            <AnimatePresence>
                                {isTagHovered && lead.tags!.length > 1 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                        className="absolute bottom-full left-0 mb-2 p-2 bg-white border border-[#FED7AA] rounded-xl shadow-xl flex flex-wrap gap-1 z-50 min-w-[120px]"
                                    >
                                        {lead.tags?.map((tag, idx) => (
                                            <span key={idx} className="px-2 py-0.5 bg-[#FFEDD5] text-[#9A3412] text-[9.5px] font-bold rounded-lg border border-[#FED7AA]/50 whitespace-nowrap">
                                                {tag}
                                            </span>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            
                            {!isTagHovered && lead.tags!.length > 1 && (
                                <span className="text-[#94A3B8] text-[11.5px] font-bold ml-1.5">+{lead.tags!.length - 1}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Cadence Progress Badge */}
                <div
                    className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-[#FFEDD5] border border-[#FED7AA] text-[#9A3412] text-[11px] font-bold shadow-sm hover:scale-110 transition-transform cursor-default"
                    style={{ fontFamily: 'Comfortaa, cursive' }}
                    title={`Progresso da Cadência: ${cadenceProgress}%`}
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
