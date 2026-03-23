import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { PipelineColumn, Lead } from '../../types';
import { LeadCard } from './LeadCard';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';

/** Official WhatsApp logo as inline SVG */
const WppIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.031 0A12.03 12.03 0 0 0 0 12c0 2.124.553 4.195 1.603 6L.513 24l6.15-1.58A11.96 11.96 0 0 0 12.031 24c6.626 0 12-5.373 12-12S18.658 0 12.031 0zm0 21.996c-1.782 0-3.529-.462-5.071-1.336l-.364-.206-3.766.968 1.004-3.606-.23-.352A9.998 9.998 0 0 1 2.032 12c0-5.485 4.542-9.946 10-9.946s10 4.461 10 9.946-4.542 9.946-10 9.946zm5.424-7.408c-.297-.146-1.755-.845-2.025-.941-.271-.097-.468-.146-.665.146-.197.293-.765.941-.937 1.134-.173.193-.346.218-.643.073-.297-.146-1.252-.451-2.385-1.44-.881-.769-1.477-1.719-1.649-2.013-.173-.293-.018-.45.129-.596.133-.131.297-.338.445-.506.148-.168.197-.291.296-.484.099-.193.05-.366-.024-.512-.074-.146-.665-1.564-.911-2.14-.24-.564-.485-.487-.665-.497-.172-.009-.37-.012-.568-.012s-.518.073-.789.366c-.272.293-1.037.985-1.037 2.4 0 1.415 1.062 2.782 1.21 2.977.149.195 2.072 3.09 5.02 4.331.7.293 1.246.468 1.673.599.704.215 1.345.184 1.849.112.564-.08 1.755-.698 2.003-1.373.247-.675.247-1.252.173-1.373-.075-.122-.273-.195-.57-.342z" />
    </svg>
);

/**
 * Column identity system
 * – gradient: header bg (vibrant pair, 135deg, same angle always)
 * – cardBg: card backdrop (same hue, much softer — ~8% opacity)
 * – columnBg: column body tint (barely there)
 * – shadow / ring: glow colours
 * – icon: emoji with a visual colour reference
 */
const COLUMN_IDENTITY: Record<number, {
    gradient: [string, string];   // [from, to]
    cardBg: string;               // card body class
    columnBg: string;             // column wrapper class
    shadow: string;
    ring: string;
    icon: string;
    label: string;
    subtitle: string;
}> = {
    1: {
        gradient: ['#FF8C00', '#FF5722'],
        cardBg: 'bg-orange-50/90 border-orange-200/50',
        columnBg: 'bg-orange-100/20',
        shadow: 'shadow-orange-300/30',
        ring: 'ring-orange-300/40',
        icon: '🍊',
        label: 'Leads',
        subtitle: 'TRIAGEM INICIAL',
    },
    2: {
        gradient: ['#3B82F6', '#6366F1'],
        cardBg: 'bg-blue-50/90 border-blue-200/50',
        columnBg: 'bg-blue-100/20',
        shadow: 'shadow-blue-300/30',
        ring: 'ring-blue-300/40',
        icon: '📞',
        label: 'Chamada',
        subtitle: 'SCRIPT DE DESCOBERTA',
    },
    3: {
        gradient: ['#10B981', '#06B6D4'],
        cardBg: 'bg-emerald-50/90 border-emerald-200/50',
        columnBg: 'bg-emerald-100/20',
        shadow: 'shadow-emerald-300/30',
        ring: 'ring-emerald-300/40',
        icon: 'wpp',   // WhatsApp
        label: 'WhatsApp',
        subtitle: 'RELACIONAMENTO',
    },
    4: {
        gradient: ['#8B5CF6', '#EC4899'],
        cardBg: 'bg-violet-50/90 border-violet-200/50',
        columnBg: 'bg-violet-100/20',
        shadow: 'shadow-violet-300/30',
        ring: 'ring-violet-300/40',
        icon: '✉️',    // Email
        label: 'Email',
        subtitle: 'PROPOSTA E VALOR',
    },
    5: {
        gradient: ['#EF4444', '#F97316'],
        cardBg: 'bg-red-50/90 border-red-200/50',
        columnBg: 'bg-red-100/20',
        shadow: 'shadow-red-300/30',
        ring: 'ring-red-300/40',
        icon: '🎯',
        label: 'Conclusão',
        subtitle: 'OPORTUNIDADE REAL',
    },
};

interface KanbanColumnProps {
    column: PipelineColumn;
    leads: Lead[];
    onCardClick: (lead: Lead) => void;
    onReturn?: (lead: Lead) => void;
    onFinish?: (lead: Lead) => void;
    onSchedule?: (lead: Lead) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, leads, onCardClick, onReturn, onFinish, onSchedule }) => {
    const { setNodeRef, isOver } = useDroppable({ id: column.id });
    const tok = COLUMN_IDENTITY[column.position] ?? COLUMN_IDENTITY[1];

    // Build gradient CSS (always 135deg, consistent visual direction)
    const headerGradient = `linear-gradient(135deg, ${tok.gradient[0]} 0%, ${tok.gradient[1]} 100%)`;

    // Softer version for card stripe (same direction, very light)
    const cardAccentColor = tok.gradient[0];

    return (
        <div
            className={clsx(
                'flex flex-col h-full rounded-t-[1.5rem] rounded-b-none px-1.5 pt-1.5 transition-all duration-300',
                'backdrop-blur-md border-t border-x border-white/60 shadow-lg border-b-0 overflow-visible',
                tok.columnBg,
                tok.shadow,
                'z-0 group/col relative transition-all duration-300',
                isOver && `ring-2 ${tok.ring} scale-[1.005]`
            )}
            style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            } as any}
        >
            {/* ── Header ── */}
            <div 
                className="shrink-0 z-[50] py-4 backdrop-blur-3xl transition-all duration-300 group-hover/col:z-[99]"
                style={{ 
                    marginTop: '-24px', 
                    paddingTop: '24px',
                    background: 'transparent'
                }}
            >
                <div
                    className="relative rounded-2xl h-14 flex items-center justify-center shadow-lg transition-all mb-4 mt-1 mx-1 text-white group/header"
                    style={{
                        background: headerGradient,
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}
                >
                    {/* Lead count badge — Pinned to the TOP-RIGHT corner with overflow effect */}
                    <motion.span
                        key={leads.length}
                        initial={{ scale: 0.6, opacity: 0, x: 10, y: -10 }}
                        animate={{ scale: 1, opacity: 1, x: 6, y: -6 }}
                        transition={{ type: 'spring', stiffness: 550, damping: 25 }}
                        className="absolute top-0 right-0 z-[60] px-2.5 py-1 min-w-[28px] rounded-xl text-[12px] font-black flex items-center justify-center shadow-2xl"
                        style={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(8px)',
                            color: tok.gradient[1], // Use the vibrant color from the gradient
                            border: '1px solid rgba(255, 255, 255, 1)',
                            transform: 'translate(40%, -40%)',
                            boxShadow: '0 8px 16px -4px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)'
                        }}
                    >
                        {leads.length}
                    </motion.span>

                    {/* Centered Wrapper */}
                    <div className="relative flex items-center justify-center gap-3">
                        {/* Icon */}
                        <span className="text-2xl leading-none select-none drop-shadow-md transition-transform group-hover/header:scale-110">
                            {tok.icon === 'wpp'
                                ? <WppIcon size={24} />
                                : tok.icon
                            }
                        </span>

                        {/* Title - Perfectly centered */}
                        <h3
                            className="font-black text-xl tracking-tight leading-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] truncate"
                            style={{ fontFamily: 'Comfortaa, cursive' }}
                        >
                            {column.position === 5 ? 'Conclusão' : column.name}
                        </h3>
                    </div>
                </div>
            </div>

            {/* ── Cards zone ── */}
            <div
                ref={setNodeRef}
                className={clsx(
                    'flex-1 pt-2 pb-20 space-y-5 relative z-[10]',
                    'px-1.5',
                    'overflow-y-auto overflow-x-visible custom-scrollbar',
                    isOver ? 'bg-white/25 ring-2 ring-white/50 ring-inset rounded-2xl' : 'bg-transparent'
                )}
                style={{
                    maskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 90%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 90%, transparent 100%)',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                } as any}
            >
                <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
                    <AnimatePresence mode="sync">
                        {leads.map((lead) => (
                            <LeadCard
                                key={lead.id}
                                lead={lead}
                                columnPosition={column.position}
                                isCadenceColumn={column.position === 5 || column.name.toLowerCase().includes('conclusão')}
                                onClick={() => onCardClick(lead)}
                                onReturn={onReturn}
                                onFinish={onFinish}
                                onSchedule={onSchedule}
                                /* pass accent for card stripe */
                                accentColor={cardAccentColor}
                            />
                        ))}
                    </AnimatePresence>
                </SortableContext>
            </div>
        </div>
    );
};
