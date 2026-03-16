import React, { useRef, useState, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Lead } from '../../types';
import { Building2, Undo2, Check, Mail, Phone, Tag, Linkedin, User, Calendar } from 'lucide-react';
import { useVoip } from '../../contexts/VoipContext';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

const ICON_BASE = { strokeWidth: 1.5 };
const ICON_BOLD = { strokeWidth: 2.2 };

interface LeadCardProps {
    lead: Lead;
    columnPosition?: number;
    onClick?: () => void;
    onReturn?: (lead: Lead) => void;
    onFinish?: (lead: Lead) => void;
    onSchedule?: (lead: Lead) => void;
    accentColor?: string;
    model?: 'MODERN_FULL' | 'MODERN_COMPACT' | 'MODERN_MINIMAL' | 'MODERN_ACTION';
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

    // ── Data flags ──────────────────────────────────────────────────────────
    const hasLinkedin = !!(lead.metadata?.linkedin_url || lead.metadata?.linkedin);
    const hasTags = lead.tags && lead.tags.length > 0;

    const cadenceProgress = lead.cadence_progress || 0;
    const cnpj = lead.metadata?.cnpj;
    const jobTitle = lead.metadata?.job_title;
    const isFirstColumn = columnPosition === 1;

    // ── Idle "Impatience" Animation Logic ──
    const [shakeVariant, setShakeVariant] = useState<string | null>(null);
    React.useEffect(() => {
        if (!isFirstColumn) return;

        const interval = setInterval(() => {
            const variants = ['footTap', 'pushUp', 'shiver', 'heartbeat', 'swing'];
            const randomVariant = variants[Math.floor(Math.random() * variants.length)];
            setShakeVariant(randomVariant);
            
            // Reset variant after a duration (increased to see the full motion)
            setTimeout(() => setShakeVariant(null), 2500);
        }, 30000); // 30 seconds (Production interval)

        return () => clearInterval(interval);
    }, [isFirstColumn]);

    // Animation Variants
    const impatienceVariants = {
        footTap: { 
            rotate: [0, -8, 0, -8, 0],
            originX: 1, originY: 1, // Pivot from bottom right
            transition: { duration: 0.4, repeat: 2, ease: "easeInOut" } 
        },
        pushUp: { 
            y: [0, -15, 0, -10, 0],
            transition: { duration: 0.5, ease: "easeOut" } 
        },
        shiver: { 
            x: [-2, 2, -2, 2, -1, 1, 0],
            scale: [1, 1.02, 1],
            transition: { duration: 0.1, repeat: 8 } 
        },
        heartbeat: { 
            scale: [1, 1.1, 1, 1.08, 1],
            transition: { duration: 0.6, times: [0, 0.2, 0.4, 0.7, 1] } 
        },
        swing: { 
            rotate: [0, 5, -5, 3, -3, 0],
            originX: 0.5, originY: 0, // Pivot from top
            transition: { duration: 0.8, ease: "easeInOut" } 
        }
    };

    // Apply dynamic glassmorphism based on accentColor - Ultra-soft mint green theme
    const dynamicStyle = React.useMemo(() => {
        const baseStyle = transform ? { transform: CSS.Translate.toString(transform) } : {};
        if (accentColor) {
            return {
                ...baseStyle,
                backgroundColor: `${accentColor}12`,
                borderColor: `${accentColor}26`,
                backdropFilter: 'blur(8px)',
            };
        }
        return {
            ...baseStyle,
            backgroundColor: 'rgba(236, 253, 245, 0.6)', 
            borderColor: 'rgba(167, 243, 208, 0.4)',
            backdropFilter: 'blur(12px)',
        };
    }, [transform, accentColor]);

    // ── Unified macOS-style spring config for all popovers ──
    const POPOVER_SPRING = { type: 'spring' as const, stiffness: 500, damping: 30, mass: 0.8 };
    const HOVER_DELAY_MS = 300; // Delay before showing popovers to avoid drag interference

    const ActionButton = ({ icon: Icon, color, text, previewText, onClick: btnClick, isMini }: any) => {
        const [isHovered, setIsHovered] = useState(false);
        const [coords, setCoords] = useState({ top: 0, left: 0 });
        const triggerRef = useRef<HTMLButtonElement>(null);
        const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

        const hasData = text || previewText;

        const handleMouseEnter = useCallback(() => {
            if (isDragging) return;
            hoverTimer.current = setTimeout(() => setIsHovered(true), HOVER_DELAY_MS);
        }, [isDragging]);

        const handleMouseLeave = useCallback(() => {
            if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
            setIsHovered(false);
        }, []);

        useLayoutEffect(() => {
            if (isHovered && triggerRef.current && hasData) {
                const rect = triggerRef.current.getBoundingClientRect();
                setCoords({
                    top: rect.top + rect.height / 2,
                    left: rect.right + 12
                });
            }
        }, [isHovered, hasData]);

        return (
            <div className="relative flex items-center h-full">
                <motion.button
                    ref={triggerRef}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    whileHover={{ scale: 1.12 }}
                    whileTap={{ scale: 0.92 }}
                    transition={POPOVER_SPRING}
                    className={clsx(
                        "relative flex items-center justify-center rounded-full bg-white/60 shadow-sm border border-white/80 gap-2 px-0",
                        isMini ? "h-6 min-w-[24px]" : "h-7 min-w-[28px]",
                        isHovered && hasData && "bg-white z-[100] shadow-md ring-1 ring-white/50",
                        color
                    )}
                    onClick={(e) => {
                        e.stopPropagation();
                        btnClick?.(e);
                    }}
                >
                    <Icon size={isMini ? 11 : 13} {...ICON_BOLD} className="shrink-0" />
                </motion.button>
                
                {isHovered && hasData && createPortal(
                    <div className="fixed inset-0 pointer-events-none z-[99999]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5, y: '-50%' }}
                                animate={{ opacity: 1, scale: 1, y: '-50%' }}
                                exit={{ opacity: 0, scale: 0.5, y: '-50%' }}
                                transition={POPOVER_SPRING}
                                style={{ 
                                    position: 'fixed',
                                    top: coords.top,
                                    left: coords.left,
                                    originX: 0,
                                    originY: 0.5
                                }}
                                className="px-4 py-2.5 bg-orange-50/90 backdrop-blur-[50px] border border-orange-200/50 rounded-2xl shadow-2xl flex flex-col group"
                            >
                                <div className="absolute inset-0 rounded-2xl border border-white/40 pointer-events-none" />
                                <motion.span
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ ...POPOVER_SPRING, delay: 0.04 }}
                                    className="text-[11px] font-black text-slate-800 uppercase tracking-widest whitespace-nowrap drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]"
                                >
                                    {text || 'Ação'}
                                </motion.span>
                                {previewText && (
                                    <motion.span
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ ...POPOVER_SPRING, delay: 0.08 }}
                                        className="text-[13px] font-bold text-slate-900 tracking-tight whitespace-nowrap mt-1 drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]"
                                    >
                                        {previewText}
                                    </motion.span>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>,
                    document.body
                )}
            </div>
        );
    };

    const ExplorationBalloon = ({ children, title, position = 'top' }: any) => {
        const [isVisible, setIsVisible] = useState(false);
        const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
        const triggerRef = useRef<HTMLDivElement>(null);

        // Conditional Data Check
        const hasContent = React.useMemo(() => {
            if (title === 'Explorar Empresa') return !!(lead.metadata?.cnpj || lead.metadata?.city);
            if (title === 'Explorar Contato') return !!(lead.phone || lead.email);
            if (title === 'Explorar Tags') return (lead.tags || []).length > 0;
            return false;
        }, [title, lead]);

        useLayoutEffect(() => {
            if (isVisible && triggerRef.current && hasContent) {
                const rect = triggerRef.current.getBoundingClientRect();
                setCoords({
                    top: position === 'top' ? rect.top : rect.bottom,
                    left: rect.left + rect.width / 2, // Center of the trigger
                    width: rect.width
                });
            }
        }, [isVisible, position, hasContent]);

        const balloonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

        const handleBalloonEnter = useCallback(() => {
            if (isDragging) return;
            balloonTimer.current = setTimeout(() => setIsVisible(true), HOVER_DELAY_MS);
        }, [isDragging]);

        const handleBalloonLeave = useCallback(() => {
            if (balloonTimer.current) { clearTimeout(balloonTimer.current); balloonTimer.current = null; }
            setIsVisible(false);
        }, []);

        return (
            <div 
                ref={triggerRef}
                className="relative group flex items-center h-full min-w-0 flex-1"
                onMouseEnter={handleBalloonEnter}
                onMouseLeave={handleBalloonLeave}
            >
                <motion.div
                    animate={{ scale: isVisible && hasContent ? 1.06 : 1 }}
                    transition={POPOVER_SPRING}
                    className="cursor-pointer min-w-0 flex-1 origin-left"
                >
                    {children}
                </motion.div>
                {isVisible && hasContent && createPortal(
                    <div className="fixed inset-0 pointer-events-none z-[99999]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ 
                                    opacity: 1, 
                                    scale: 1, 
                                    x: '-50%',
                                    y: position === 'top' ? '-100%' : '0%'
                                }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={POPOVER_SPRING}
                                style={{ 
                                    position: 'fixed',
                                    top: coords.top,
                                    left: coords.left,
                                    width: position === 'top' ? '280px' : '240px',
                                    marginTop: position === 'bottom' ? '8px' : '0px',
                                    marginBottom: position === 'top' ? '8px' : '0px',
                                    originX: 0.5,
                                    originY: position === 'top' ? 1 : 0
                                }}
                                className={clsx(
                                    "bg-orange-50/90 backdrop-blur-[50px] border border-orange-200/50 rounded-2xl p-4 shadow-2xl",
                                    "shadow-[0_20px_50px_-12px_rgba(251,146,60,0.15)]"
                                )}
                            >
                                <div className="absolute inset-0 rounded-2xl border border-white/50 pointer-events-none" />
                                <div className="flex flex-col gap-3">
                                    {title === 'Explorar Empresa' && (
                                        <div className="flex flex-col gap-2.5">
                                            <motion.div className="flex flex-col" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...POPOVER_SPRING, delay: 0.03 }}>
                                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest opacity-70">CNPJ</span>
                                                <span className="text-[13px] font-bold text-slate-900 tracking-tight mt-0.5">{lead.metadata?.cnpj || '-'}</span>
                                            </motion.div>
                                            <motion.div className="flex flex-col border-t border-orange-100/30 pt-2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...POPOVER_SPRING, delay: 0.06 }}>
                                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest opacity-70">Cidade</span>
                                                <span className="text-[13px] font-bold text-slate-900 tracking-tight mt-0.5">{lead.metadata?.city || '-'}</span>
                                            </motion.div>
                                        </div>
                                    )}
                                    {title === 'Explorar Contato' && (
                                        <div className="flex flex-col gap-2.5">
                                            <motion.div className="flex flex-col" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...POPOVER_SPRING, delay: 0.03 }}>
                                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest opacity-70">Telefone</span>
                                                <span className="text-[13px] font-bold text-slate-900 tracking-tight mt-0.5">{lead.phone || '-'}</span>
                                            </motion.div>
                                            {lead.email && (
                                                <motion.div className="flex flex-col border-t border-orange-100/30 pt-2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...POPOVER_SPRING, delay: 0.06 }}>
                                                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest opacity-70">Email</span>
                                                    <span className="text-[12px] font-bold text-slate-900 tracking-tight mt-0.5 truncate">{lead.email}</span>
                                                </motion.div>
                                            )}
                                        </div>
                                    )}
                                    {title === 'Explorar Tags' && (
                                        <div className="flex flex-col gap-2">
                                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest opacity-70 mb-1">Tags</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {(lead.tags || []).map((t, i) => (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ opacity: 0, scale: 0.6 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ ...POPOVER_SPRING, delay: 0.03 + i * 0.04 }}
                                                        className="px-3 py-1 rounded-full bg-orange-100/50 border border-orange-200/50"
                                                    >
                                                        <span className="text-orange-700 text-[10px] font-black uppercase tracking-tight">{t}</span>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>,
                    document.body
                )}
            </div>
        );
    };


    return (
        <motion.div
            ref={setNodeRef}
            {...attributes}
            onPointerDown={!isCadenceColumn ? handlePointerDown : undefined}
            onClick={handleClick}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ 
                opacity: 1, 
                scale: 1,
                ...(shakeVariant ? (impatienceVariants as any)[shakeVariant] : {})
            }}
            whileHover={{ y: -4, zIndex: 1000, boxShadow: "0 20px 40px -12px rgba(251, 146, 60, 0.2)" }}
            className={clsx(
                "relative flex flex-col p-4 gap-3 w-full rounded-[32px] border transition-all duration-500",
                !isCadenceColumn ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                isDragging && "opacity-40 grayscale-[0.5] scale-95",
                "min-h-[190px]" // Fixed height for consistency
            )}
            style={dynamicStyle}
            {...(!isCadenceColumn ? listeners : {})}
        >
            {/* 1. Header: Company Info and Quick Actions */}
            <div className="flex items-start justify-between">
                <ExplorationBalloon title="Explorar Empresa" icon={Building2} position="top">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pointer-events-none overflow-hidden">
                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0 border border-emerald-100 shadow-sm">
                            <Building2 size={16} className="text-[#10B981]" {...ICON_BOLD} />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <div className="marquee-container group min-w-0 flex-1">
                                <h4 className="font-bold text-[#334155] text-[13px] leading-tight tracking-tight marquee-text group-hover:marquee-hover-active truncate" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                                    {lead.company_name}
                                </h4>
                            </div>
                            {cnpj && (
                                <div className="mt-0.5 px-1.5 py-0.5 rounded bg-white/40 border border-white/50 text-slate-400 text-[7px] font-black tracking-widest inline-flex w-fit shadow-xs uppercase shrink-0">
                                    {cnpj}
                                </div>
                            )}
                        </div>
                    </div>
                </ExplorationBalloon>
                <div className="flex items-center gap-1.5 shrink-0" onPointerDown={e => e.stopPropagation()}>
                    <ActionButton icon={Phone} color="text-emerald-500" text="Ligar" previewText={lead.phone} onClick={() => !voip.isCallActive && lead.phone && voip.initiateCall(String(lead.phone), lead.id, lead.full_name)} />
                    {lead.email && <ActionButton icon={Mail} color="text-blue-500" text="Email" previewText={lead.email} />}
                </div>
            </div>

                <div className="flex-1">
                    <ExplorationBalloon title="Explorar Contato" icon={User} position="top">
                        <div className="bg-white/80 rounded-[20px] p-2.5 shadow-sm border border-white/90 flex items-center justify-between gap-2 backdrop-blur-sm transition-all hover:bg-white group/contact pointer-events-auto min-w-0 flex-1">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                    <User size={12} className="text-slate-400" {...ICON_BASE} />
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                    <div className="marquee-container group min-w-0 flex-1">
                                        <p className="font-bold text-[#475569] text-[11px] tracking-tight marquee-text group-hover:marquee-hover-active truncate">
                                            {lead.full_name || 'Sem Contato'}
                                        </p>
                                    </div>
                                    {jobTitle && (
                                        <p className="text-[#94A3B8] text-[7px] font-black uppercase tracking-wider truncate mt-0.5 opacity-80 shrink-0">
                                            {jobTitle}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0" onPointerDown={e => e.stopPropagation()}>
                                 <ActionButton icon={Phone} color="text-emerald-500" text="Ligar" previewText={lead.phone} isMini onClick={() => !voip.isCallActive && lead.phone && voip.initiateCall(String(lead.phone), lead.id, lead.full_name)} />
                                 {lead.email && <ActionButton icon={Mail} color="text-blue-500" text="Email" previewText={lead.email} isMini />}
                                 {hasLinkedin && <ActionButton icon={Linkedin} color="text-sky-500" text="LinkedIn" isMini />}
                            </div>
                        </div>
                    </ExplorationBalloon>
                </div>

            {/* 3. Footer: Tags and Engagement */}
            <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 min-w-0">
                    <ExplorationBalloon title="Explorar Tags" icon={Tag} position="bottom">
                        <motion.div 
                            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.8)' }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-orange-100 bg-orange-50/40 cursor-default shadow-xs"
                        >
                            <Tag size={10} className="text-orange-600" {...ICON_BOLD} />
                            <div className="flex items-center gap-1">
                                <span className="text-[9px] font-black text-orange-700 uppercase tracking-tighter">
                                    {hasTags ? lead.tags![0] : 'Lead'}
                                </span>
                                {hasTags && lead.tags!.length > 1 && (
                                    <span className="text-[8px] font-black text-orange-400">+{lead.tags!.length - 1}</span>
                                )}
                            </div>
                            {(lead.metadata?.city || lead.metadata?.state) && (
                                <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-orange-200/50 text-[8px] font-bold text-slate-400 truncate max-w-[80px]">
                                    {lead.metadata.city && <span>{lead.metadata.city}</span>}
                                    {lead.metadata.state && <span className="opacity-50">/{lead.metadata.state}</span>}
                                </div>
                            )}
                        </motion.div>
                    </ExplorationBalloon>
                </div>
                <div className="flex items-center gap-1">
                    <div className="px-2 py-1 rounded-lg bg-emerald-50/50 border border-emerald-100/50 text-emerald-700 text-[9px] font-black shadow-xs tracking-tight">
                        {cadenceProgress}%
                    </div>
                    <ActionButton icon={Calendar} color="text-orange-500 bg-orange-50 border-orange-100" text="Agenda" onClick={() => onSchedule?.(lead)} />
                </div>
            </div>

            {/* Cadence controls (Floating lateral zone) */}
            <AnimatePresence>
                {isCadenceColumn && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="absolute -right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2.5 z-[100]"
                        onPointerDown={e => e.stopPropagation()}
                    >
                        <motion.button 
                            whileHover={{ scale: 1.1, backgroundColor: '#f8fafc' }}
                            whileTap={{ scale: 0.9 }}
                            onClick={e => { e.stopPropagation(); onReturn?.(lead); }} 
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-slate-500 rounded-full shadow-lg ring-4 ring-white/50 transition-all"
                            title="Voltar"
                        >
                            <Undo2 size={14} {...ICON_BOLD} />
                        </motion.button>
                        
                        <motion.button 
                            whileHover={{ scale: 1.1, filter: 'brightness(1.1)' }}
                            whileTap={{ scale: 0.9 }}
                            onClick={e => { e.stopPropagation(); onFinish?.(lead); }} 
                            className="w-8 h-8 flex items-center justify-center bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-200/50 ring-4 ring-emerald-500/20 transition-all font-bold"
                            title="Concluir"
                        >
                            <Check size={14} {...ICON_BOLD} />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
            {lead.metadata?.is_paused && (
                <span className="absolute -bottom-3 right-8 text-[10px] font-black px-3 py-1 bg-amber-100 text-amber-700 border border-amber-300 rounded-xl uppercase tracking-widest shadow-sm">
                    Pausado
                </span>
            )}
        </motion.div>
    );
};
