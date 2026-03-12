import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, type PanInfo } from 'framer-motion';
import {
    Settings,
    Phone,
    MessageSquare,
    Layers,
    Zap,
    Calendar,
    Mail,
    TrendingUp,
    Sparkles,
    Trophy,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { UserAvatar } from '../common/UserAvatar';

type TabType = 'Hoje' | 'Semana' | 'Mês';

// macOS Scale Effect
const scaleTransition = {
    type: "spring" as const,
    stiffness: 350,
    damping: 24,
    mass: 0.8
};

const springTransition = {
    type: "spring" as const,
    stiffness: 500,
    damping: 40,
    mass: 0.8
};

interface ControlHubProps {
    onAdminClick: () => void;
    completedCount?: number;
    activityStats?: {
        calls: number;
        emails: number;
        whatsapp: number;
    };
    onReset?: () => void;
    user?: { email: string; role?: 'manager' | 'sdr' | 'salesops'; profile_picture_url?: string | null } | null;
}

export const ControlHub: React.FC<ControlHubProps> = ({
    onAdminClick,
    completedCount = 0,
    activityStats = { calls: 0, emails: 0, whatsapp: 0 },
    onReset,
    user
}) => {
    const tabs: TabType[] = ['Hoje', 'Semana', 'Mês'];
    const [activeTab, setActiveTab] = useState<TabType>('Hoje');
    const [isOpen, setIsOpen] = useState(true);
    const hubRef = useRef<HTMLDivElement>(null);
    const carouselRef = useRef<HTMLDivElement>(null);
    const [activeSection, setActiveSection] = useState(0);

    const sections = ['Stats', 'KPIs', 'Agenda'];
    const CARD_WIDTH = 302;
    const CARD_GAP = 16;
    const x = useMotionValue(0);
    const containerWidth = CARD_WIDTH + CARD_GAP;

    const navigateTo = useCallback((index: number) => {
        const clampedIndex = Math.max(0, Math.min(index, sections.length - 1));
        setActiveSection(clampedIndex);
    }, [sections.length]);

    const handleDragEnd = (_: any, info: PanInfo) => {
        const threshold = 50;
        const velocity = info.velocity.x;
        const offset = info.offset.x;

        if (Math.abs(velocity) > 500 || Math.abs(offset) > threshold) {
            if (offset > 0 || velocity > 500) {
                navigateTo(activeSection - 1);
            } else {
                navigateTo(activeSection + 1);
            }
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (hubRef.current && !hubRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            // Use click (not pointerdown) so dnd-kit's pointerdown events are unaffected
            document.addEventListener('click', handleClickOutside, { capture: false });
        }
        return () => document.removeEventListener('click', handleClickOutside, { capture: false } as EventListenerOptions);
    }, [isOpen]);

    // Sections Components (Stats, KPIs, Agenda) remain largely similar but ensuring clean layout
    const StatsSection = () => (
        <div className="w-[302px] flex-shrink-0 space-y-3">
            <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-orange-100 flex items-center justify-center text-orange-600">
                        <Sparkles size={14} />
                    </div>
                    <h3 className="text-sm font-black text-slate-800" style={{ fontFamily: 'Comfortaa, cursive' }}>Atividade</h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm border border-emerald-100/50">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    ONLINE
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-blue-500 rounded-2xl p-4 shadow-lg shadow-blue-500/20 text-white relative overflow-hidden group"
                    style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}
                >
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform"><Phone size={48} /></div>
                    <div className="relative z-10">
                        <div className="text-3xl font-black mb-1 drop-shadow-sm" style={{ fontFamily: 'Comfortaa, cursive' }}>{activityStats.calls}</div>
                        <div className="text-[11px] font-bold text-blue-100 tracking-wide">Ligações</div>
                        <div className="w-full bg-black/20 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div className="bg-white w-[80%] h-full rounded-full shadow-sm" />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-purple-500 rounded-2xl p-4 shadow-lg shadow-purple-500/20 text-white relative overflow-hidden group"
                    style={{ background: 'linear-gradient(135deg, #A855F7 0%, #9333EA 100%)' }}
                >
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform"><Mail size={48} /></div>
                    <div className="relative z-10">
                        <div className="text-3xl font-black mb-1 drop-shadow-sm" style={{ fontFamily: 'Comfortaa, cursive' }}>{activityStats.emails}</div>
                        <div className="text-[11px] font-bold text-purple-100 tracking-wide">Emails</div>
                        <div className="w-full bg-black/20 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div className="bg-white w-[90%] h-full rounded-full shadow-sm" />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="col-span-2 bg-emerald-500 rounded-2xl p-4 shadow-lg shadow-emerald-500/20 text-white relative overflow-hidden group flex items-center justify-between"
                    style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                >
                    <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12 group-hover:rotate-0 transition-transform"><MessageSquare size={88} /></div>

                    <div className="relative z-10">
                        <div className="text-3xl font-black mb-1 drop-shadow-sm" style={{ fontFamily: 'Comfortaa, cursive' }}>{activityStats.whatsapp}</div>
                        <div className="text-[11px] font-bold text-emerald-100 tracking-wide">Mensagens WhatsApp</div>
                    </div>

                    <div className="text-right relative z-10 bg-white/10 px-3 py-2 rounded-xl backdrop-blur-sm border border-white/20">
                        <div className="text-xl font-black drop-shadow-sm" style={{ fontFamily: 'Comfortaa, cursive' }}>93%</div>
                        <div className="text-[9px] font-bold text-emerald-100">Resp.</div>
                    </div>
                </motion.div>
            </div>
        </div>
    );

    const KPIsSection = () => (
        <div className="w-[302px] flex-shrink-0 space-y-3">
            <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center text-amber-600">
                        <TrendingUp size={12} />
                    </div>
                    <h3 className="text-xs font-bold text-slate-600">Performance</h3>
                </div>
            </div>

            <motion.div
                whileHover={{ scale: 1.01 }}
                className="bg-slate-800 rounded-2xl p-4 shadow-xl text-white relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Conversão</div>
                        <div className="text-3xl font-black text-white mt-1">92<span className="text-lg text-orange-400">%</span></div>
                    </div>
                    <div className="p-2 bg-gradient-soft border border-orange-100 shadow-glass/10 rounded-lg">
                        <Zap size={18} className="text-orange-400 fill-orange-400" />
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-600 text-xs">Pipeline</span>
                        <span className="font-bold">R$ 42.5k</span>
                    </div>
                    <div className="w-full bg-gradient-soft border border-orange-100 shadow-glass/10 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-orange-500 to-amber-500 w-[92%] h-full rounded-full" />
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-gradient-soft border border-orange-100 shadow-glass border border-slate-100 p-3 rounded-xl shadow-sm">
                    <div className="text-[10px] text-slate-600 font-bold uppercase">Leads</div>
                    <div className="text-lg font-black text-slate-700">47</div>
                </div>
                <div className="bg-gradient-soft border border-orange-100 shadow-glass border border-slate-100 p-3 rounded-xl shadow-sm">
                    <div className="text-[10px] text-slate-600 font-bold uppercase">Rank</div>
                    <div className="text-lg font-black text-amber-500">#2</div>
                </div>
            </div>
        </div>
    );

    const AgendaSection = () => (
        <div className="w-[302px] flex-shrink-0 space-y-3">
            <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-purple-100 flex items-center justify-center text-purple-600">
                        <Calendar size={12} />
                    </div>
                    <h3 className="text-xs font-bold text-slate-600">Agenda</h3>
                </div>
            </div>

            <div className="space-y-2">
                <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl flex items-center gap-3">
                    <div className="bg-gradient-soft border border-orange-100 shadow-glass p-2 rounded-lg text-center min-w-[44px] shadow-sm">
                        <div className="text-[10px] font-bold text-slate-600 uppercase">Hoje</div>
                        <div className="text-sm font-black text-orange-600">14:00</div>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-800">Call MegaCorp</div>
                        <div className="text-[10px] text-slate-600">Apresentação Proposta</div>
                    </div>
                </div>

                <div className="bg-gradient-soft border border-orange-100 shadow-glass border border-slate-100 p-3 rounded-xl flex items-center gap-3 opacity-60">
                    <div className="bg-slate-50 p-2 rounded-lg text-center min-w-[44px]">
                        <div className="text-[10px] font-bold text-slate-600 uppercase">Hoje</div>
                        <div className="text-sm font-black text-slate-600">16:30</div>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-700">Follow-up Green</div>
                        <div className="text-[10px] text-slate-600">Verificar contrato</div>
                    </div>
                </div>
            </div>
        </div>
    );

    const sectionComponents = [StatsSection, KPIsSection, AgendaSection];

    return (
        <div
            ref={hubRef}
            className="fixed top-6 left-6 z-50 pointer-events-none"
        >
            <AnimatePresence mode="wait">
                {/* Golden Trophy Trigger Button */}
                {!isOpen && (
                    <motion.button
                        key="trigger"
                        onClick={() => setIsOpen(true)}
                        initial={{ opacity: 0, scale: 0.7, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.7, y: -10 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                        whileHover={{ scale: 1.08, rotate: -3 }}
                        whileTap={{ scale: 0.93 }}
                        className="pointer-events-auto relative flex items-center justify-center w-[52px] h-[52px] rounded-full cursor-pointer z-50 border border-yellow-200/80"
                        style={{
                            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 60%, #FF8C00 100%)',
                            boxShadow: '0 6px 20px rgba(255, 180, 0, 0.35), 0 2px 8px rgba(255,140,0,0.25)',
                        }}
                    >
                        {/* Sheen */}
                        <div className="absolute inset-0 rounded-full bg-white/20 pointer-events-none" />

                        {/* Golden Trophy icon */}
                        <motion.span
                            animate={{ rotate: [0, 8, -5, 0] }}
                            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                            className="relative z-10 text-white drop-shadow-sm flex items-center justify-center"
                        >
                            <Trophy size={20} fill="currentColor" className="drop-shadow-sm opacity-90" strokeWidth={1.5} />
                        </motion.span>

                        {/* Completed count badge */}
                        {completedCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 border-2 border-white text-[9px] font-bold text-white shadow-md">
                                {completedCount}
                            </span>
                        )}
                    </motion.button>
                )}

                {/* Expanded Panel */}
                {isOpen && (
                    <motion.div
                        key="hub-panel"
                        initial={{ opacity: 0, scale: 0.8, y: -20, x: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -20, x: -20 }}
                        transition={scaleTransition}
                        className="pointer-events-auto origin-top-left w-[340px] rounded-[32px] shadow-2xl shadow-orange-900/15 overflow-hidden flex flex-col ring-1 ring-orange-200/40"
                        style={{
                            background: 'rgba(255, 252, 248, 0.97)',
                            backdropFilter: 'blur(24px)',
                        }}
                    >
                        {/* ── Panel Header — gradient accent strip + user info ── */}
                        <header
                            className="px-5 py-4 flex items-center justify-between"
                            style={{ background: 'linear-gradient(135deg, #FF8C00 0%, #FF6347 100%)' }}
                        >
                            <motion.div
                                className="flex items-center gap-3 cursor-pointer group"
                                whileHover={{ scale: 1.02 }}
                                onClick={() => (user?.role === 'manager' || user?.role === 'salesops') && onAdminClick()}
                            >
                                {/* Avatar */}
                                <UserAvatar 
                                    src={user?.profile_picture_url} 
                                    name={user?.email?.split('@')[0]} 
                                    size="md" 
                                    border={true}
                                    role={user?.role}
                                    className="!rounded-full !bg-white/20 !border-white/30 shadow-md backdrop-blur-sm" 
                                />
                                <div className="flex flex-col">
                                    <span
                                        className={cn(
                                            "text-sm font-black leading-tight drop-shadow-sm",
                                            user?.role === 'manager' ? "text-amber-200" : user?.role === 'salesops' ? "text-indigo-200" : "text-white"
                                        )}
                                        style={{ fontFamily: 'Comfortaa, cursive' }}
                                    >
                                        {user?.email?.split('@')[0] || 'Visitante'}
                                    </span>
                                    <span
                                        className={cn(
                                            "text-[10px] font-bold uppercase tracking-widest mt-0.5 px-2 py-0.5 rounded-md bg-white/10 w-fit",
                                            user?.role === 'manager' ? "text-amber-300 border border-amber-400/30" : 
                                            user?.role === 'salesops' ? "text-indigo-300 border border-indigo-400/30" : 
                                            "text-white/80"
                                        )}
                                        style={{ fontFamily: 'Comfortaa, cursive' }}
                                    >
                                        {user?.role === 'manager' ? '⭐ Manager' : user?.role === 'salesops' ? '🛠️ SalesOps' : '🍊 SDR'}
                                    </span>
                                </div>
                            </motion.div>

                            <div className="flex items-center gap-1.5">
                                {(user?.role === 'manager' || user?.role === 'salesops') && (
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={onAdminClick}
                                        className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800 hover:scale-110 border border-transparent rounded-full transition-all text-white shadow-md shadow-slate-900/20 group"
                                    >
                                        <Settings size={15} className="group-hover:animate-[spin_4s_linear_infinite]" />
                                    </motion.button>
                                )}
                                {onReset && user?.role === 'manager' && (
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => { if (confirm('Limpar todos os dados de produtividade?')) onReset(); }}
                                        className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-red-400/40 border border-white/30 rounded-full transition-all text-white shadow-sm"
                                        title="Limpar produtividade"
                                    >
                                        <Layers size={15} />
                                    </motion.button>
                                )}
                            </div>
                        </header>

                        {/* ── Tabs — pill style, prominent ── */}
                        <div className="px-5 pt-3 pb-1">
                            <div className="flex items-center gap-1 bg-orange-50/80 rounded-full p-1 border border-orange-100/60">
                                {tabs.map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setActiveTab(t)}
                                        className={cn(
                                            "flex-1 text-[11px] font-black py-1.5 rounded-full transition-all duration-200 relative",
                                            activeTab === t
                                                ? "text-white shadow-md shadow-orange-400/30"
                                                : "text-slate-600 hover:text-orange-600"
                                        )}
                                        style={{
                                            fontFamily: 'Comfortaa, cursive',
                                            background: activeTab === t ? 'linear-gradient(135deg, #FF8C00, #FF6347)' : 'transparent',
                                        }}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="relative overflow-hidden pb-6">
                            <motion.div
                                ref={carouselRef}
                                className="flex px-6 pt-4 gap-4 cursor-grab active:cursor-grabbing"
                                drag="x"
                                dragConstraints={{
                                    left: -(containerWidth * (sections.length - 1)),
                                    right: 0
                                }}
                                dragElastic={0.1}
                                onDragEnd={handleDragEnd}
                                animate={{ x: -activeSection * containerWidth }}
                                transition={springTransition}
                                style={{ x }}
                            >
                                {sectionComponents.map((Section, idx) => (
                                    <motion.div
                                        key={sections[idx]}
                                        className="flex-shrink-0"
                                        animate={{
                                            opacity: activeSection === idx ? 1 : 0.4,
                                            scale: activeSection === idx ? 1 : 0.95
                                        }}
                                        transition={springTransition}
                                    >
                                        <Section />
                                    </motion.div>
                                ))}
                            </motion.div>

                            {/* Pagination Dots */}
                            <div className="flex justify-center gap-1.5 mt-2">
                                {sections.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                            activeSection === idx ? "bg-orange-400 w-3" : "bg-slate-200"
                                        )}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};
