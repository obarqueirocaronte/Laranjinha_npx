import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Activity, Users, Target, Trophy, Eye,
    Settings, TrendingUp, Building2, Clock, Zap, ChevronRight, LogOut, 
    Brain, Sparkles, Send, Calendar, X, Search, Trash2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { leadsAPI, statsAPI, aiAPI, cadencesAPI, systemAPI, batchesAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import type { Lead, PipelineColumn, LeadBatch } from '../../types';
import { DndContext, useDroppable } from '@dnd-kit/core';
import { LeadCard } from '../kanban/LeadCard';
import { ProfileZone } from '../profile/ProfileZone';
import { UserAvatar } from '../common/UserAvatar';
import { CadencesDashboard } from './CadencesDashboard';
import { FullBIDashboard } from './FullBIDashboard';

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */
type TabId = 'resumo' | 'monitoramento' | 'acompanhamento' | 'preview' | 'assistente' | 'conexoes';
type MonitorSubTab = 'operacao' | 'performance' | 'leads';

type PeriodId = 'hoje' | 'semana' | 'mes' | 'tudo';

interface StatsHistory {
    interactions: { action_type: string; created_at: string; sdr_id: string }[];
    movements: { from_column_id: string; to_column_id: string; moved_at: string; moved_by_sdr_id: string }[];
    completions: { final_outcome: string; completed_at: string; sdr_id: string }[];
}

interface SDR {
    id: string;
    email: string;
    full_name?: string;
    role?: string;
    calls?: number;
    emails?: number;
    whatsapp?: number;
    completed_leads?: number;
    completed?: number; // Added for convenience in ranking
    pending_leads?: number;
    pipeline_movements?: number;
    leads?: number;
    profile_picture_url?: string | null;
}

interface TabItem {
    id: TabId;
    label: string;
    icon: React.ElementType;
    color: string;        // gradient from
    colorTo: string;      // gradient to
    subtitle: string;
}

const TABS: TabItem[] = [
    { id: 'resumo', label: 'Resumo', icon: LayoutDashboard, color: '#FF8C00', colorTo: '#FF6347', subtitle: 'VISÃO GERAL DO DESEMPENHO' },
    { id: 'monitoramento', label: 'Monitoramento', icon: Activity, color: '#3B82F6', colorTo: '#6366F1', subtitle: 'ACOMPANHAMENTO OPERACIONAL' },
    { id: 'acompanhamento', label: 'Ranking', icon: Trophy, color: '#F59E0B', colorTo: '#EF4444', subtitle: 'RANKING E RESULTADOS' },
    { id: 'preview', label: 'Preview SDR', icon: Eye, color: '#06B6D4', colorTo: '#3B82F6', subtitle: 'VISUALIZAÇÃO DE OPERAÇÃO' },
    { id: 'assistente', label: 'Assistente', icon: Brain, color: '#F472B6', colorTo: '#DB2777', subtitle: 'INTELIGÊNCIA DE VENDAS' },
    { id: 'conexoes', label: 'Conexões', icon: Zap, color: '#10B981', colorTo: '#059669', subtitle: 'TESTE DE INTEGRAÇÕES' },
];

const springPop = { type: 'spring' as const, stiffness: 400, damping: 28 };

/* ─────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────── */
interface ManagerSalesDashboardProps {
    onAdminClick: () => void;
    onLogout: () => void;
    onNavigateBack?: () => void;
}

export const ManagerSalesDashboard: React.FC<ManagerSalesDashboardProps> = ({ onAdminClick, onLogout, onNavigateBack }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabId>('resumo');
    const [monitorSubTab, setMonitorSubTab] = useState<MonitorSubTab>('operacao');
    const [showProfile, setShowProfile] = useState(false);

    const [showStats, setShowStats] = useState(false);

    // ── Shared data ──
    const [sdrs, setSdrs] = useState<SDR[]>([]);
    const [allLeads, setAllLeads] = useState<Lead[]>([]);
    const [activeLeads, setActiveLeads] = useState<Lead[]>([]);
    const [columns, setColumns] = useState<PipelineColumn[]>([]);
    const [stats, setStats] = useState({ calls: 0, emails: 0, whatsapp: 0, completed_leads: 0 });
    const [period, setPeriod] = useState<PeriodId>('mes');
    const [showExpanded, setShowExpanded] = useState(false);
    const [sdrFilter, setSdrFilter] = useState<string>('all');

    const [history, setHistory] = useState<StatsHistory | null>(null);
    const [selectedAuditSdrIds, setSelectedAuditSdrIds] = useState<string[]>([]);
    const onToggleAuditSdr = (id: string) => {
        setSelectedAuditSdrIds(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };
    const [cadenceDashboard, setCadenceDashboard] = useState<any>(null);

    // Persist selectedAuditSdrIds
    useEffect(() => {
        const saved = localStorage.getItem('selectedAuditSdrIds');
        if (saved) {
            try {
                setSelectedAuditSdrIds(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse selectedAuditSdrIds', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('selectedAuditSdrIds', JSON.stringify(selectedAuditSdrIds));
    }, [selectedAuditSdrIds]);

    const filterByPeriod = useCallback((dateStr: string) => {
        if (period === 'tudo') return true;
        const date = new Date(dateStr);
        const now = new Date();
        
        // Normalize today to midnight for clear comparison
        const todayAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (period === 'hoje') {
            return date >= todayAtMidnight;
        }
        if (period === 'semana') {
            // Start of week (Sunday)
            const startOfWeek = new Date(todayAtMidnight);
            startOfWeek.setDate(todayAtMidnight.getDate() - todayAtMidnight.getDay());
            return date >= startOfWeek;
        }
        if (period === 'mes') {
            // Start of month
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return date >= startOfMonth;
        }
        return true;
    }, [period]);
    
    // ── Filtered data memos ──
    const filteredActiveLeads = React.useMemo(() => {
        return activeLeads.filter(l => filterByPeriod(l.created_at));
    }, [activeLeads, filterByPeriod]);

    const filteredAllLeads = React.useMemo(() => {
        return allLeads.filter(l => filterByPeriod(l.created_at));
    }, [allLeads, filterByPeriod]);

    const filteredStats = React.useMemo(() => {
        if (!history) return stats;
        
        const interactions = history.interactions.filter(i => filterByPeriod(i.created_at));
        const completions = history.completions.filter(c => filterByPeriod(c.completed_at));
        
        return {
            calls: interactions.filter(i => i.action_type === 'call' || i.action_type === 'CALL_MADE').length,
            emails: interactions.filter(i => i.action_type === 'email' || i.action_type === 'EMAIL_SENT').length,
            whatsapp: interactions.filter(i => i.action_type === 'whatsapp' || i.action_type === 'WHATSAPP_SENT').length,
            completed_leads: completions.length
        };
    }, [history, filterByPeriod, stats]);

    const enrichedSdrs = React.useMemo(() => {
        if (!history) return sdrs;
        
        return sdrs.map((sdr: SDR) => {
            const sdrInteractions = history.interactions.filter(i => i.sdr_id === sdr.id && filterByPeriod(i.created_at));
            const sdrCompletions = history.completions.filter(c => c.sdr_id === sdr.id && filterByPeriod(c.completed_at));
            
            return {
                ...sdr,
                calls: sdrInteractions.filter(i => i.action_type === 'call' || i.action_type === 'CALL_MADE').length,
                emails: sdrInteractions.filter(i => i.action_type === 'email' || i.action_type === 'EMAIL_SENT').length,
                whatsapp: sdrInteractions.filter(i => i.action_type === 'whatsapp' || i.action_type === 'WHATSAPP_SENT').length,
                completed: sdrCompletions.length,
                leads: filteredActiveLeads.filter(l => l.assigned_sdr_id === sdr.id).length
            };
        });
    }, [sdrs, history, filterByPeriod, filteredActiveLeads]);

    const fetchData = useCallback(async () => {
        try {
            const results = await Promise.allSettled([
                leadsAPI.getAllSDRs(),
                leadsAPI.getActiveLeads(),
                leadsAPI.getSegments('status', 'Novo'),
                leadsAPI.getColumns(),
                statsAPI.getGlobalStats(period),
                statsAPI.getStatsHistory(),
                cadencesAPI.getDashboard(period as any),
            ]);
            
            const [sdrsRes, activeRes, pendingRes, colsRes, statsRes, historyRes, cadenceDashboardRes] = results;

            if (statsRes.status === 'fulfilled' && statsRes.value?.success) {
                const globalData = statsRes.value.data;
                setStats(prev => globalData.summary || prev);

                // If we also got SDR breakdown from global stats, we'll merge it later
                const sdrStatsMap = new Map();
                if (globalData.sdrs) {
                    globalData.sdrs.forEach((s: any) => {
                        sdrStatsMap.set(s.email || s.full_name, s);
                    });
                }

                if (sdrsRes.status === 'fulfilled' && sdrsRes.value?.success) {
                    let fetchedSdrs = sdrsRes.value.data || [];

                    // Merge stats into SDR objects
                    fetchedSdrs = fetchedSdrs.map((s: SDR) => {
                        const sStats = sdrStatsMap.get(s.email);
                        if (sStats) {
                            return { ...s, ...sStats };
                        }
                        return s;
                    });

                    const isUserInSdrs = fetchedSdrs.some((s: SDR) => s.id === user?.id || s.email === user?.email);

                    if (user && !isUserInSdrs) {
                        fetchedSdrs.push({
                            id: user.id || 'sdr-bypass',
                            email: user.email || 'Visitante/Manager',
                            role: user.role || 'manager'
                        });
                    }
                    setSdrs(fetchedSdrs);
                }
            }

            if (historyRes.status === 'fulfilled' && historyRes.value?.success) setHistory(historyRes.value.data);
            if (cadenceDashboardRes.status === 'fulfilled' && (cadenceDashboardRes.value as any)?.success) setCadenceDashboard((cadenceDashboardRes.value as any).data);

            if (activeRes.status === 'fulfilled' && activeRes.value?.success) setActiveLeads(activeRes.value.data || []);
            if (pendingRes.status === 'fulfilled' && pendingRes.value?.success) setAllLeads(pendingRes.value.data || []);
            if (colsRes.status === 'fulfilled' && colsRes.value?.success) setColumns(colsRes.value.data || []);
        } catch (e) {
            console.error('ManagerDashboard fetch error:', e);
        }
    }, [user, period]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const currentTab = TABS.find(t => t.id === activeTab)!;

    return (
        <div className="h-full w-full max-w-7xl mx-auto flex gap-0 overflow-hidden bg-white/30 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(255,109,0,0.1)] rounded-[2.5rem] relative z-20">
            {/* ═══════ Sidebar ═══════ */}
            <aside
                className="w-[260px] shrink-0 flex flex-col py-8 px-5 border-r border-white/30 bg-white/20 relative z-10"
            >
                {/* ── User Profile Header (Premium & Large) ── */}
                <div 
                    className="flex flex-col items-center justify-center mb-10 px-4 group cursor-pointer relative"
                    onClick={() => setShowProfile(true)}
                >
                    <div className="relative mb-6">
                        <div className="absolute inset-[-10px] bg-gradient-to-br from-orange-400 via-rose-400 to-purple-500 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-40 transition-all duration-700 animate-pulse" />
                        <div className="absolute inset-[-3px] bg-white/40 rounded-[2.3rem] backdrop-blur-md border border-white/60 shadow-xl" />
                        <UserAvatar 
                            src={user?.profile_picture_url} 
                            name={user?.email?.split('@')[0]} 
                            size="xl" 
                            rounded={false}
                            border={true}
                            role={user?.role}
                            className="shadow-2xl relative z-10 !rounded-[2.1rem] hover:scale-[1.08] transition-transform duration-500 border-2 border-white/80"
                        />
                    </div>
                    <div className="text-center relative z-10">
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-tight drop-shadow-sm" style={{ fontFamily: 'Comfortaa, cursive' }}>
                            {user?.email?.split('@')[0] || 'Gestor'}
                        </h3>
                        <div className="flex items-center justify-center gap-2 mt-3 bg-white/60 backdrop-blur-xl py-1.5 px-4 rounded-full border border-white/80 shadow-lg group-hover:bg-orange-50/50 transition-colors">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-[pulse_2s_infinite] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
                                {user?.role === 'manager' ? 'Gestor de Vendas' : user?.role === 'salesops' ? 'Sales Ops Specialist' : 'SDR Specialist'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Nav items */}
                <nav className="flex-1 space-y-2 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar-thumb]:bg-transparent [&::-webkit-scrollbar-track]:bg-transparent">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <motion.button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                whileHover={{ scale: 1.02, x: 2 }}
                                whileTap={{ scale: 0.98 }}
                                className={cn(
                                    'w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all relative overflow-hidden group border',
                                    isActive
                                        ? 'shadow-lg border-transparent'
                                        : 'text-slate-600 bg-white/30 hover:bg-white/60 hover:text-slate-900 border-white/40'
                                )}
                                style={{
                                    fontFamily: 'Comfortaa, cursive',
                                    ...(isActive ? {
                                        background: `linear-gradient(135deg, ${tab.color}, ${tab.colorTo})`,
                                    } : {}),
                                }}
                            >
                                <span className={cn(
                                    "relative z-10 p-1.5 rounded-xl transition-colors",
                                    isActive ? "bg-white/20 text-white shadow-sm" : "bg-white/50 text-slate-600 group-hover:text-amber-500"
                                )}>
                                    <Icon size={18} strokeWidth={2.5} />
                                </span>
                                <span className={cn('relative z-10 text-[13px] font-black tracking-wide', isActive ? 'text-white drop-shadow-sm' : '')}>
                                    {tab.label}
                                </span>
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
                                )}
                            </motion.button>
                        );
                    })}
                </nav>

                {/* Bottom actions */}
                <div className="space-y-1 pt-6 border-t border-white/10 mt-auto">
                    {onNavigateBack && (
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={onNavigateBack}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-orange-600 hover:bg-orange-50 transition-all border border-transparent hover:shadow-lg hover:shadow-orange-200/20 group mb-2"
                            style={{ fontFamily: 'Comfortaa, cursive' }}
                        >
                            <div className="w-6 h-6 rounded-md flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-sm group-hover:scale-110 transition-transform">
                                <LayoutDashboard size={14} strokeWidth={2.5} />
                            </div>
                            <span className="text-[12px] font-black">Voltar ao Kanban</span>
                        </motion.button>
                    )}
                    <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={onAdminClick}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-800 hover:text-white transition-all border border-transparent hover:shadow-lg hover:shadow-slate-800/20 group"
                        style={{ fontFamily: 'Comfortaa, cursive' }}
                    >
                        <div className="w-6 h-6 rounded-md flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-sm group-hover:scale-110 transition-transform">
                            <Settings size={14} strokeWidth={2} className="group-hover:animate-[spin_4s_linear_infinite]" />
                        </div>
                        <span className="text-[12px] font-bold">Administração</span>
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-50/20 transition-all border border-transparent hover:border-red-200/20"
                        style={{ fontFamily: 'Comfortaa, cursive' }}
                    >
                        <LogOut size={16} strokeWidth={1.8} />
                        <span className="text-[12px] font-bold">Sair</span>
                    </motion.button>
                </div>
            </aside>

            {/* ═══════ Main Content ═══════ */}
            <main className="flex-1 overflow-y-auto p-10 bg-white/30 relative z-0">
                {showProfile ? (
                    <ProfileZone onClose={() => setShowProfile(false)} />
                ) : (
                    <>
                        {/* Page header */}
                        <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/50">
                            <div className="flex items-center gap-8">
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow border border-white/20"
                                        style={{ background: `linear-gradient(135deg, ${currentTab.color}, ${currentTab.colorTo})` }}
                                    >
                                        <currentTab.icon size={28} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h2
                                            className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-2"
                                            style={{ fontFamily: 'Comfortaa, cursive' }}
                                        >
                                            {activeTab === 'resumo' ? (
                                                <>
                                                    <span className="text-slate-700 opacity-90">Manager</span>
                                                    <span>Resumo</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-slate-700 opacity-90">Manager</span>
                                                    <span>{currentTab.label}</span>
                                                </>
                                            )}
                                        </h2>
                                        <p className="text-[11px] text-slate-500 font-extrabold mt-1 tracking-[0.1em] uppercase" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                            {currentTab.subtitle}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* ── Period Filter Mini-Buttons (Hidden on Connections tab) ── */}
                            {activeTab !== 'conexoes' && (
                                <div className="flex items-center gap-2 bg-white/40 backdrop-blur-xl p-1.5 rounded-2xl border border-white/60 shadow-lg">
                                    {([
                                        { id: 'hoje' as PeriodId, label: 'Dia', gradient: 'from-blue-500 to-cyan-500', glow: 'shadow-blue-400/30' },
                                        { id: 'semana' as PeriodId, label: 'Semana', gradient: 'from-violet-500 to-purple-500', glow: 'shadow-violet-400/30' },
                                        { id: 'mes' as PeriodId, label: 'Mês', gradient: 'from-orange-500 to-rose-500', glow: 'shadow-orange-400/30' },
                                    ]).map((btn) => {
                                        const isActive = period === btn.id;
                                        return (
                                            <motion.button
                                                key={btn.id}
                                                onClick={() => setPeriod(btn.id)}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                className={cn(
                                                    "px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all relative overflow-hidden",
                                                    isActive
                                                        ? `bg-gradient-to-r ${btn.gradient} text-white shadow-lg ${btn.glow}`
                                                        : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
                                                )}
                                                style={{ fontFamily: 'Comfortaa, cursive' }}
                                            >
                                                {isActive && (
                                                    <motion.div 
                                                        layoutId="periodIndicator"
                                                        className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"
                                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                    />
                                                )}
                                                <span className="relative z-10">{btn.label}</span>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Tab Content */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                                transition={springPop}
                            >
                                {activeTab === 'resumo' && (
                                    <ResumoTab 
                                        stats={filteredStats} 
                                        activeLeads={filteredActiveLeads} 
                                        allLeads={filteredAllLeads} 
                                        sdrs={enrichedSdrs} 
                                        onOpenStats={() => setShowStats(true)}
                                        onNavigateToTab={(tab, sub) => {
                                            setActiveTab(tab);
                                            if (sub) setMonitorSubTab(sub);
                                        }}
                                        cadenceDashboard={cadenceDashboard}
                                    />
                                )}
                                {activeTab === 'monitoramento' && (
                                    <MonitoramentoTab 
                                        activeSubTab={monitorSubTab}
                                        onSubTabChange={setMonitorSubTab}
                                        sdrs={enrichedSdrs}
                                        activeLeads={filteredActiveLeads}
                                        allLeads={filteredAllLeads}
                                        sdrFilter={sdrFilter}
                                        setSdrFilter={setSdrFilter}
                                        period={period}
                                        setPeriod={setPeriod}
                                    />
                                )}
                                {activeTab === 'acompanhamento' && (
                                    <ConquistasTab stats={filteredStats} sdrs={enrichedSdrs} />
                                )}
                                {activeTab === 'preview' && (
                                    <PreviewTab 
                                        sdrs={sdrs} 
                                        activeLeads={activeLeads}
                                        columns={columns}
                                        selectedAuditSdrIds={selectedAuditSdrIds}
                                        onToggleAuditSdr={onToggleAuditSdr}
                                    />
                                )}
                                {activeTab === 'assistente' && (
                                    <AssistenteTab allLeads={allLeads} activeLeads={activeLeads} sdrs={sdrs} />
                                )}
                                {activeTab === 'conexoes' && (
                                    <ConexoesTab sdrs={enrichedSdrs} />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </>
                )}
            </main>

            <AnimatePresence>
                {showStats && (
                    <FullBIDashboard 
                        onClose={() => setShowStats(false)} 
                        sdrs={enrichedSdrs} 
                    />
                )}
            </AnimatePresence>

            {/* ═══════ Expanded View Modal (Portal) ═══════ */}
            {createPortal(
                <AnimatePresence>
                    {showExpanded && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8">
                            {/* Backdrop with higher opacity and blur for ZERO overlap feel */}
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowExpanded(false)}
                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-3xl"
                            />
                            <motion.div 
                                initial={{ opacity: 0, y: 100 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="relative bg-[#F8FAFC] shadow-2xl w-full h-full flex flex-col overflow-hidden"
                            >
                                {/* Header with gradient line */}
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-400 via-rose-500 to-purple-600" />
                                
                                <div className="p-10 border-b border-slate-200 flex items-center justify-between bg-white relative z-10 shadow-sm">
                                    <div>
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className="w-12 h-12 bg-gradient-to-br from-[#FF8225] to-[#EF4444] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                                                <Sparkles size={24} />
                                            </div>
                                            <h2 className="text-4xl font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>Operational Pulse</h2>
                                        </div>
                                        <p className="text-[11px] text-slate-400 font-extrabold tracking-[0.2em] uppercase">Monitoramento em Tempo Real • {period.toUpperCase()}</p>
                                    </div>
                                    <button 
                                        onClick={() => setShowExpanded(false)}
                                        className="group p-4 bg-slate-100 rounded-3xl border border-slate-200 text-slate-400 hover:text-white hover:bg-slate-900 hover:border-slate-900 transition-all duration-300 transform active:scale-95 shadow-inner"
                                    >
                                        <Zap size={24} className="group-hover:rotate-12 transition-transform" />
                                    </button>
                                </div>

                                <div className="flex-1 p-10 overflow-y-auto bg-slate-50/30 custom-scrollbar">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                                        <div className="p-10 bg-gradient-to-br from-emerald-600 to-teal-800 rounded-[3rem] text-white shadow-2xl shadow-emerald-900/20 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-white/10 transition-colors" />
                                            <p className="text-sm font-black uppercase tracking-[0.2em] opacity-80 mb-2">Efficiency Rate</p>
                                            <p className="text-7xl font-black tracking-tighter">94.2<span className="text-4xl opacity-60 ml-1">%</span></p>
                                            <div className="mt-8 flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl w-fit border border-white/10">
                                                <TrendingUp size={18} className="text-emerald-300" />
                                                <span className="text-xs font-black tracking-wider uppercase">+5.4% de hoje</span>
                                            </div>
                                        </div>

                                        <div className="p-10 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[3rem] text-white shadow-2xl shadow-slate-900/30 relative overflow-hidden group">
                                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl -ml-20 -mb-20" />
                                            <p className="text-sm font-black uppercase tracking-[0.2em] opacity-80 mb-2">Live Conversions</p>
                                            <p className="text-7xl font-black tracking-tighter">{filteredStats.completed_leads}</p>
                                            <div className="mt-8 flex items-center gap-3 bg-white/10 px-4 py-2 rounded-2xl w-fit border border-white/10">
                                                <Users size={18} className="text-blue-300" />
                                                <span className="text-xs font-black tracking-wider uppercase">Futebol em campo</span>
                                            </div>
                                        </div>

                                        <div className="p-10 bg-gradient-to-br from-orange-500 to-rose-600 rounded-[3rem] text-white shadow-2xl shadow-orange-900/20 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
                                            <p className="text-sm font-black uppercase tracking-[0.2em] opacity-80 mb-2">Queue Load</p>
                                            <p className="text-7xl font-black tracking-tighter">{filteredActiveLeads.length}</p>
                                            <div className="mt-8 flex items-center gap-3 bg-white/10 px-4 py-2 rounded-2xl w-fit border border-white/10">
                                                <Clock size={18} className="text-orange-200" />
                                                <span className="text-xs font-black tracking-wider uppercase">Backlog pendente</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 p-10 relative overflow-hidden">
                                        <div className="flex items-center justify-between mb-8">
                                            <div>
                                                <h3 className="text-2xl font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>SDR Performance Pulse</h3>
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Ranking de produtividade individual</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {enrichedSdrs.map(sdr => {
                                                const conversion = Math.round((sdr.completed || 0) / (sdr.leads || 1) * 100);
                                                return (
                                                    <div key={sdr.id} className="group flex items-center justify-between p-6 bg-slate-50/50 hover:bg-white rounded-[2rem] border border-transparent hover:border-slate-100 hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300">
                                                        <div className="flex items-center gap-5">
                                                            <div className="relative">
                                                                 <UserAvatar 
                                                                    src={sdr.profile_picture_url} 
                                                                    name={sdr.full_name || sdr.email?.split('@')[0]} 
                                                                    size="lg" 
                                                                    className="shadow-lg group-hover:scale-110 transition-transform" 
                                                                />
                                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full" />
                                                            </div>
                                                            <div>
                                                                <p className="text-base font-black text-slate-800 group-hover:text-orange-500 transition-colors">{sdr.full_name || sdr.email?.split('@')[0]}</p>
                                                                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">Especialista de Vendas</p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-12">
                                                            <div className="flex gap-10">
                                                                <div className="text-center">
                                                                    <p className="text-2xl font-black text-slate-800 tracking-tight">{sdr.calls || 0}</p>
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Calls</p>
                                                                </div>
                                                                <div className="text-center">
                                                                    <p className="text-2xl font-black text-emerald-600 tracking-tight">{conversion}%</p>
                                                                    <p className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest mt-1">Prod.</p>
                                                                </div>
                                                            </div>
                                                            <div className="w-48">
                                                                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                                                    <span>Activity Rate</span>
                                                                    <span>{Math.min((sdr.calls || 0) * 2, 100)}%</span>
                                                                </div>
                                                                <div className="h-2.5 bg-slate-200/60 rounded-full overflow-hidden p-0.5 border border-slate-100 shadow-inner">
                                                                    <motion.div 
                                                                        initial={{ width: 0 }}
                                                                        animate={{ width: `${Math.min((sdr.calls || 0) * 2, 100)}%` }}
                                                                        className="h-full bg-gradient-to-r from-orange-400 to-rose-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.4)]"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────
   Shared UI Primitives
   ───────────────────────────────────────────── */

/* ═══════════════════════════════════════════
   Shared UI Primitives
   ═══════════════════════════════════════════ */

const GlassCard: React.FC<{
    children: React.ReactNode;
    className?: string;
    gradient?: [string, string];
    transparent?: boolean;
    onClick?: () => void;
}> = ({ children, className, gradient, transparent, onClick }) => (
    <motion.div
        whileHover={onClick ? { scale: 1.01, y: -2 } : {}}
        onClick={onClick}
        className={cn(
            'rounded-[2rem] border p-6 transition-all duration-300 overflow-hidden',
            onClick && 'cursor-pointer',
            gradient
                ? 'border-white/30 text-white shadow-lg'
                : transparent
                    ? 'bg-white/20 border-white/40 shadow-sm'
                    : 'bg-white/80 backdrop-blur-2xl border-white shadow-xl shadow-slate-200/50',
            className

        )}
        style={{
            ...(gradient ? {
                background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
            } : {}),
            WebkitBackdropFilter: 'blur(24px)',
        }}
    >
        {children}
    </motion.div>
);

const KpiCard: React.FC<{
    label: string;
    value: number | string;
    icon: React.ElementType;
    gradient: [string, string];
    sub?: string;
    onClick?: () => void;
    className?: string;
}> = ({ label, value, icon: Icon, gradient, sub, onClick, className }) => (
    <GlassCard 
        gradient={gradient} 
        className={cn("relative overflow-hidden group shadow-xl shadow-slate-900/10 transition-all duration-500 border-white/20", onClick && "cursor-pointer hover:scale-[1.05] hover:shadow-2xl hover:shadow-slate-900/20", className)}
        onClick={onClick}
    >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div
            className="absolute -top-6 -right-6 p-4 opacity-[0.1] group-hover:opacity-25 group-hover:scale-125 group-hover:rotate-12 transition-all duration-700"
            style={{ color: '#ffffff' }}
        >
            <Icon size={140} strokeWidth={1.5} />
        </div>
        <div className="relative z-10 flex flex-col h-full justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-white/80 drop-shadow-sm" style={{ fontFamily: 'Comfortaa, cursive' }}>
                {label}
            </p>
            <div>
                <p className="text-6xl font-black drop-shadow-2xl text-white tracking-tighter" style={{ fontFamily: 'Comfortaa, cursive' }}>
                    {value}
                </p>
                {sub && (
                    <div className="mt-4 flex items-center gap-2">
                         <p className="text-[9px] font-black text-white/90 bg-white/20 inline-block px-4 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-md border border-white/10 shadow-sm">
                            {sub}
                        </p>
                    </div>
                )}
            </div>
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_2s_infinite]" />
        </div>
    </GlassCard>
);

const StatsMiniCard: React.FC<{
    label: string;
    value: number | string;
    icon: React.ElementType;
    color: 'emerald' | 'rose' | 'blue' | 'purple' | 'orange';
    sub?: string;
    onClick?: () => void;
}> = ({ label, value, icon: Icon, color, sub, onClick }) => {
    const accents = {
        emerald: 'bg-emerald-500 shadow-emerald-200/50',
        rose: 'bg-rose-500 shadow-rose-200/50',
        blue: 'bg-blue-500 shadow-blue-200/50',
        purple: 'bg-indigo-500 shadow-indigo-200/50',
        orange: 'bg-orange-500 shadow-orange-200/50',
    };

    const textAccents = {
        emerald: 'text-emerald-500',
        rose: 'text-rose-500',
        blue: 'text-blue-500',
        purple: 'text-indigo-500',
        orange: 'text-orange-500',
    };

    return (
        <motion.div 
            whileHover={{ scale: 1.02, y: -2 }}
            onClick={onClick}
            className={cn("bg-white h-full rounded-[24px] p-5 shadow-lg shadow-slate-200/10 border border-slate-50 transition-all cursor-pointer flex items-center justify-between group")}
        >
            <div className="flex items-center gap-4">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:rotate-6", accents[color])}>
                    <Icon size={24} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                    <span className="text-2xl font-black text-slate-800" style={{ fontFamily: 'Comfortaa, cursive' }}>{value}</span>
                    <span className={cn("text-[8px] font-black tracking-widest uppercase mt-0.5 opacity-80", textAccents[color])}>{label}</span>
                    {sub && <span className="text-[7px] font-bold text-slate-400 mt-1 leading-none">{sub}</span>}
                </div>
            </div>
            {onClick && (
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-slate-500 group-hover:bg-slate-100 transition-colors">
                    <ChevronRight size={16} />
                </div>
            )}
        </motion.div>
    );
};

/* ═══════════════════════════════════════════
   Tab: Resumo
   ═══════════════════════════════════════════ */
const ResumoTab: React.FC<{
    stats: any;
    activeLeads: Lead[];
    allLeads: Lead[];
    sdrs: SDR[];
    onOpenStats?: () => void;
    onNavigateToTab?: (tab: TabId, subTab?: MonitorSubTab) => void;
    cadenceDashboard: any;
}> = ({ 
    stats, activeLeads, allLeads, sdrs, onNavigateToTab, 
    cadenceDashboard, onOpenStats
}) => {

    const inCadence = activeLeads.length;
    const totalLeads = (allLeads?.length || 0) + (activeLeads?.length || 0);

    const cadAtivas = cadenceDashboard?.zona_progresso?.total || 0;
    const cadParadas = cadenceDashboard?.zona_critica?.total || 0;
    
    // Calcula conversão baseada em leads concluídos vs total que entrou no período (simulado como total acumulado)
    const conversionRate = totalLeads > 0 ? Math.round((stats.completed_leads / totalLeads) * 100) : 0;

    const avgCompletion = cadenceDashboard?.average_completion?.percentage || 0;
    const avgSteps = cadenceDashboard?.average_completion?.average_steps || 0;

    return (
        <div className="space-y-6">
            {/* ── Top row (Big KPIs) ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard 
                    label="TOTAL DE LEADS" 
                    value={totalLeads} 
                    icon={Users} 
                    gradient={['#5356FF', '#49108B']} 
                    sub={`${allLeads?.length || 0} PENDENTES`} 
                />
                <KpiCard 
                    label="EM CADÊNCIA" 
                    value={inCadence} 
                    icon={Zap} 
                    gradient={['#009FBD', '#10964D']} 
                    sub={`${sdrs.length} SDRS ATIVOS`} 
                />
                <KpiCard 
                    label="CONVERSÃO GERAL" 
                    value={`${conversionRate}%`} 
                    icon={TrendingUp} 
                    gradient={['#FF8225', '#EF4444']} 
                    sub="LEADS FINALIZADOS (GANHOS)" 
                />
                <KpiCard 
                    label="TOTAL LIGAÇÕES" 
                    value={stats.calls || 0} 
                    icon={Activity} 
                    gradient={['#9b22db', '#ec4899']} 
                    sub="CONFIRMADAS NO PERÍODO" 
                />
            </div>

            {/* ── Second row (Medium Status KPIs) ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsMiniCard 
                    label="ATIVAS" 
                    value={cadAtivas} 
                    icon={Zap} 
                    color="emerald" 
                    onClick={() => onNavigateToTab?.('monitoramento', 'operacao')}
                />
                <StatsMiniCard 
                    label="ATRASADAS" 
                    value={cadParadas} 
                    icon={Clock} 
                    color="rose" 
                    onClick={() => onNavigateToTab?.('monitoramento', 'operacao')}
                />
                <StatsMiniCard 
                    label="CONCLUSÃO" 
                    value={`${avgCompletion}%`} 
                    icon={Target} 
                    color="blue" 
                    sub="Média de progresso"
                    onClick={() => onOpenStats?.()}
                />
                <StatsMiniCard 
                    label="MÉDIA STEPS" 
                    value={avgSteps} 
                    icon={Activity} 
                    color="purple" 
                    sub="ciclos por lead"
                    onClick={() => onOpenStats?.()}
                />
            </div>



            {/* ── Main Content Area ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Leads em Fluxo List */}
                <div className="lg:col-span-8">
                    <GlassCard className="h-full border-white/40 bg-white/80 backdrop-blur-3xl shadow-2xl rounded-[3rem] p-10">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                    Leads em Fluxo
                                </h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Acompanhamento de retornos agendados</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <select className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-black text-slate-500 focus:outline-none">
                                    <option>SDR: Todos</option>
                                </select>
                                <button className="text-[9px] font-black text-blue-500 hover:text-blue-600 uppercase tracking-widest" onClick={() => onNavigateToTab && onNavigateToTab('monitoramento', 'operacao')}>Ver Detalhes</button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {(() => {
                                const allLeads = [
                                    ...(cadenceDashboard?.zona_progresso?.leads || []),
                                    ...(cadenceDashboard?.zona_critica?.leads || [])
                                ].sort((a: any, b: any) => {
                                    if (!a.proxima_acao_em) return 1;
                                    if (!b.proxima_acao_em) return -1;
                                    return new Date(a.proxima_acao_em).getTime() - new Date(b.proxima_acao_em).getTime();
                                });

                                if (allLeads.length === 0) {
                                    return (
                                        <div className="text-center py-12 opacity-40 flex flex-col items-center">
                                            <Target size={32} className="text-slate-300 mb-2" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum agendamento pendente</p>
                                        </div>
                                    );
                                }

                                return allLeads.slice(0, 6).map((lead: any) => {
                                    const isStalled = cadenceDashboard?.zona_critica?.leads?.some((l: any) => l.id === lead.id);
                                    return (
                                        <div key={lead.id} className={cn(
                                            "flex items-center justify-between p-3 rounded-xl border transition-colors",
                                            isStalled ? "bg-rose-50/50 border-rose-100 hover:border-rose-200" : "bg-white/60 border-white shadow-sm hover:border-orange-200"
                                        )}>
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px]",
                                                    isStalled ? "bg-rose-100 text-rose-600" : "bg-orange-100 text-orange-600"
                                                )}>
                                                    {lead.lead_name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xs font-black text-slate-700">{lead.lead_name}</p>
                                                        {isStalled && (
                                                            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[7px] font-black uppercase rounded">Atrasado</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[9px] text-slate-400 font-bold">{lead.sdr_name} • Step {lead.step_atual}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "px-2 py-1 rounded text-[9px] font-black",
                                                    isStalled ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500"
                                                )}>
                                                    {lead.horas_parada ? `${lead.horas_parada}h` : 'No prazo'}
                                                </div>
                                                <ChevronRight size={14} className="text-slate-300" />
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </GlassCard>
                </div>

                {/* Right Area: SDRs Ativos + Estatísticas Full (IMAGE REPLICA) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* SDRs Ativos List */}
                    <GlassCard className="bg-white/80 border-white/40 shadow-2xl backdrop-blur-3xl p-8 rounded-[3rem]">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8" style={{ fontFamily: 'Comfortaa, cursive' }}>
                            SDRs ativos no período
                        </h3>
                        
                        <div className="space-y-6">
                            {sdrs.slice(0, 4).map((sdr, i) => {
                                const colors = ['bg-orange-500', 'bg-emerald-500', 'bg-blue-500', 'bg-purple-500'];
                                return (
                                    <div key={sdr.id} className="flex items-center justify-between group cursor-pointer transition-all hover:translate-x-1">
                                        <div className="flex items-center gap-4">
                                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-lg group-hover:scale-110", colors[i % colors.length])}>
                                                {sdr.full_name?.[0].toUpperCase() || 'S'}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[14px] font-black text-slate-800 leading-tight">{sdr.full_name || sdr.email?.split('@')[0]}</span>
                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">
                                                    Atividade Recente
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-black text-slate-800">{sdr.calls || 0}</div>
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Calls</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </GlassCard>

                    {/* Estatísticas Full (Pill/Card Trigger from Image) */}
                    <motion.div 
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onOpenStats}
                        className="cursor-pointer group mt-auto"
                    >
                        <div className="p-7 rounded-[2.5rem] bg-gradient-to-br from-[#FF8225] to-[#EF4444] border-transparent shadow-[0_20px_50px_rgba(249,115,22,0.3)] flex items-center gap-6 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                            <div className="w-16 h-16 rounded-[1.5rem] bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 group-hover:rotate-6 transition-transform">
                                <TrendingUp size={32} strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col">
                                <h4 className="text-lg font-black text-white tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                    BI ANALYTICS FULL
                                </h4>
                                <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-1">
                                    Explorar Insights de Vendas
                                </span>
                            </div>
                            <div className="ml-auto w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                                <ChevronRight size={20} />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Outcome Status area (Novo - Mantido para Dados Adicionais) */}
            {cadenceDashboard?.outcome_summary && Object.keys(cadenceDashboard.outcome_summary).length > 0 && (
                <GlassCard className="p-6">
                    <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-4">
                        Performance das Ligações (Últimas 24h)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {[
                            { key: 'no_answer', label: 'Sem Resposta', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
                            { key: 'busy', label: 'Ocupado', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
                            { key: 'voicemail', label: 'Caixa Postal', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
                            { key: 'invalid_number', label: 'Nº Inválido', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
                            { key: 'success', label: 'Atendeu', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                            { key: 'reschedule', label: 'Reagendado', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
                        ].map(item => (
                            <div key={item.key} className={`${item.bg} ${item.border} border rounded-2xl p-4 text-center cursor-pointer hover:scale-105 transition-transform`} onClick={() => onNavigateToTab && onNavigateToTab('monitoramento', 'performance')}>
                                <p className={`text-2xl font-black ${item.color}`}>
                                    {cadenceDashboard.outcome_summary[item.key] || 0}
                                </p>
                                <p className={`text-[9px] font-bold ${item.color} uppercase tracking-widest mt-1`}>
                                    {item.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            )}

        </div>
    );
};

/* ═══════════════════════════════════════════
   Tab: Monitoramento (Unified Tracking)
   ═══════════════════════════════════════════ */
const MonitoramentoTab: React.FC<{
    activeSubTab: MonitorSubTab;
    onSubTabChange: (tab: MonitorSubTab) => void;
    sdrs: SDR[];
    activeLeads: Lead[];
    allLeads: Lead[];
    sdrFilter: string;
    setSdrFilter: (s: string) => void;
    period: PeriodId;
    setPeriod: (p: PeriodId) => void;
}> = ({ activeSubTab, onSubTabChange, sdrs, activeLeads, allLeads, sdrFilter, setSdrFilter, period, setPeriod }) => {



    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-6">
                {/* Sub-tabs Navigation */}
                <div className="flex bg-white/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/60 shadow-lg">
                    {[
                        { id: 'operacao', label: 'Operação', icon: Target },
                        { id: 'leads', label: 'Base de Leads', icon: Users },
                    ].map((tab) => {
                        const isActive = activeSubTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onSubTabChange(tab.id as MonitorSubTab)}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl flex items-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all",
                                    isActive 
                                        ? "bg-white text-blue-600 shadow-md border border-slate-200/50" 
                                        : "text-slate-500 hover:text-slate-700 hover:bg-white/30"
                                )}
                                style={{ fontFamily: 'Comfortaa, cursive' }}
                            >
                                <Icon size={14} strokeWidth={2.5} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Integrated SDR & Period Filters */}
                <div className="flex bg-slate-100/40 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/50 shadow-inner items-center gap-4">
                    {/* SDR Selector */}
                    <div className="flex items-center gap-2 pl-2">
                        <Users size={14} className="text-slate-400" />
                        <select 
                            value={sdrFilter}
                            onChange={(e) => setSdrFilter(e.target.value)}
                            className="bg-transparent text-[10px] font-black text-slate-600 uppercase tracking-widest focus:outline-none cursor-pointer border-none p-0"
                            style={{ fontFamily: 'Comfortaa, cursive' }}
                        >
                            <option value="all">SDR: Todos</option>
                            {sdrs.map(s => (
                                <option key={s.id} value={s.id}>SDR: {s.email?.split('@')[0]}</option>
                            ))}
                        </select>
                    </div>

                    <div className="h-4 w-[1px] bg-slate-300/30" />

                    {/* Period Filter */}
                    <div className="flex gap-1">
                        {(['hoje', 'semana', 'mes'] as PeriodId[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    period === p 
                                        ? "bg-white text-orange-600 shadow-sm border border-slate-200/50" 
                                        : "text-slate-400 hover:text-slate-600"
                                )}
                                style={{ fontFamily: 'Comfortaa, cursive' }}
                            >
                                {p === 'hoje' ? 'Hoje' : p === 'semana' ? 'Semana' : 'Mês'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>


            {/* Sub-tab Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeSubTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeSubTab === 'operacao' && <CadencesDashboard sdrId={sdrFilter} period={(period || 'hoje') as any} />}
                    {activeSubTab === 'performance' && <PerformanceTab sdrs={sdrs} activeLeads={activeLeads} />}

                    {activeSubTab === 'leads' && <LeadsTab allLeads={allLeads} activeLeads={activeLeads} />}

                </motion.div>
            </AnimatePresence>
        </div>
    );
};

/* ═══════════════════════════════════════════
   Tab: Performance (formerly Acompanhamento)
   ═══════════════════════════════════════════ */
const PerformanceTab: React.FC<{
    sdrs: SDR[];
    activeLeads: Lead[];
}> = ({ sdrs, activeLeads }) => (

    <GlassCard>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b border-slate-100">
                        <th className="px-4 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest" style={{ fontFamily: 'Comfortaa, cursive' }}>SDR</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Leads Ativos</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">📞 Ligações</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">✉️ Emails</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">💬 WhatsApp</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-orange-100/40">
                    {sdrs.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-600 font-bold text-sm">Nenhum SDR encontrado</td></tr>
                    ) : sdrs.map((sdr) => {
                        const sdrLeads = activeLeads.filter(l => l.assigned_sdr_id === sdr.id);
                        return (
                            <motion.tr
                                key={sdr.id}
                                whileHover={{ backgroundColor: 'rgba(255,140,0,0.06)' }}
                                className="group transition-all"
                            >
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                        <UserAvatar 
                                            src={sdr.profile_picture_url} 
                                            name={sdr.full_name || sdr.email?.split('@')[0]} 
                                            size="sm" 
                                            className="font-black shadow-sm" 
                                        />
                                        <div>
                                            <p className="font-black text-slate-800 text-sm" style={{ fontFamily: 'Comfortaa, cursive' }}>{sdr.email?.split('@')[0]}</p>
                                            <p className="text-[10px] text-slate-600 font-bold">{sdr.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <span className="text-lg font-black text-slate-700" style={{ fontFamily: 'Comfortaa, cursive' }}>{sdr.pending_leads ?? sdrLeads.length}</span>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <span className="text-lg font-black text-blue-600" style={{ fontFamily: 'Comfortaa, cursive' }}>{sdr.calls ?? 0}</span>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <span className="text-lg font-black text-purple-600" style={{ fontFamily: 'Comfortaa, cursive' }}>{sdr.emails ?? 0}</span>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <span className="text-lg font-black text-emerald-600" style={{ fontFamily: 'Comfortaa, cursive' }}>{sdr.whatsapp ?? 0}</span>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                        Ativo
                                    </span>
                                </td>
                            </motion.tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </GlassCard>
);

/* ═══════════════════════════════════════════
   Tab: Leads
   ═══════════════════════════════════════════ */
const LeadsTab: React.FC<{
    allLeads: Lead[];
    activeLeads: Lead[];
}> = ({ allLeads, activeLeads }) => {
    const [leadsSubTab, setLeadsSubTab] = useState<'lista' | 'lotes' | 'segmentos' | 'filtros'>('lista');
    const [filter, setFilter] = useState<'all' | 'pending' | 'active'>('all');
    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Batch State
    const [batches, setBatches] = useState<LeadBatch[]>([]);
    const [loadingBatches, setLoadingBatches] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<LeadBatch | null>(null);

    useEffect(() => {
        if (leadsSubTab === 'lotes') {
            fetchBatches();
        }
    }, [leadsSubTab]);

    const fetchBatches = async () => {
        setLoadingBatches(true);
        try {
            const res = await batchesAPI.list();
            if (res.success) setBatches(res.data);
        } catch (error) {
            console.error('Error fetching batches:', error);
        } finally {
            setLoadingBatches(false);
        }
    };

    const leads = useMemo(() => {
        let base = filter === 'pending' ? allLeads : filter === 'active' ? activeLeads : [...allLeads, ...activeLeads];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            base = base.filter(l => 
                l.full_name?.toLowerCase().includes(q) || 
                l.email?.toLowerCase().includes(q) || 
                (l as any).company_name?.toLowerCase().includes(q)
            );
        }
        return base;
    }, [filter, allLeads, activeLeads, searchQuery]);

    const filteredBatchesContent = useMemo(() => {
        if (!searchQuery) return batches;
        const q = searchQuery.toLowerCase();
        return batches.filter(b => 
            b.name?.toLowerCase().includes(q) || 
            b.origin?.toLowerCase().includes(q) ||
            (b.tags || []).some(t => t.toLowerCase().includes(q))
        );
    }, [batches, searchQuery]);

    const toggleLeadSelection = (id: string) => {
        setSelectedLeadIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedLeadIds.length === leads.length && leads.length > 0) {
            setSelectedLeadIds([]);
        } else {
            setSelectedLeadIds(leads.map(l => l.id));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex bg-slate-100/60 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/50 shadow-inner">
                        {[
                            { id: 'lista', label: 'Lista de leads', icon: Activity },
                            { id: 'lotes', label: 'Lotes (Imports)', icon: LayoutDashboard },
                            { id: 'segmentos', label: 'Segmentos', icon: Target },
                            { id: 'filtros', label: 'Filtros Salvos', icon: Clock },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setLeadsSubTab(tab.id as any)}
                                className={cn(
                                    "px-5 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all",
                                    leadsSubTab === tab.id 
                                        ? "bg-white text-orange-600 shadow-md border border-slate-200/50" 
                                        : "text-slate-500 hover:text-slate-700 hover:bg-white/30"
                                )}
                                style={{ fontFamily: 'Comfortaa, cursive' }}
                            >
                                <tab.icon size={13} strokeWidth={2.5} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Busca global (leads, lotes, tags)..."
                                className="pl-11 pr-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all w-[300px] shadow-sm"
                                style={{ fontFamily: 'Comfortaa, cursive' }}
                            />
                        </div>
                        
                        {leadsSubTab === 'lista' && (
                            <div className="flex items-center gap-2">
                                {(['all', 'pending', 'active'] as const).map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={cn(
                                            'px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border shadow-sm',
                                            filter === f
                                                ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white border-orange-500 shadow-orange-500/20'
                                                : 'bg-white text-slate-500 border-slate-200 hover:border-orange-300'
                                        )}
                                        style={{ fontFamily: 'Comfortaa, cursive' }}
                                    >
                                        {f === 'all' ? `Todos (${allLeads.length + activeLeads.length})` : f === 'pending' ? `Pendentes (${allLeads.length})` : `Em Cadência (${activeLeads.length})`}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <AnimatePresence>
                    {selectedLeadIds.length > 0 && (
                        <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4">
                                <span className="bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black">{selectedLeadIds.length}</span>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Leads selecionados</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="px-4 py-2 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-all border border-slate-700 flex items-center gap-2">
                                    <Trash2 size={14} className="text-rose-400" /> Excluir
                                </button>
                                <button className="px-4 py-2 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-all border border-slate-700 flex items-center gap-2">
                                    <Zap size={14} className="text-orange-400" /> Iniciar Cadência
                                </button>
                                <button className="px-4 py-2 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-all border border-slate-700 flex items-center gap-2">
                                    <Users size={14} className="text-blue-400" /> Atribuir SDR
                                </button>
                                <button onClick={() => setSelectedLeadIds([])} className="p-2 text-slate-500 hover:text-white transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {searchQuery && (
                    <div className="flex items-center gap-2 px-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtros ativos:</span>
                        <div className="flex flex-wrap gap-2">
                            <span className="flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-[9px] font-black uppercase border border-orange-100 shadow-sm">
                                Busca: {searchQuery}
                                <button onClick={() => setSearchQuery('')} className="hover:text-rose-500 transition-colors"><X size={10} /></button>
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={leadsSubTab}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                >
                    {leadsSubTab === 'lista' && (
                        <GlassCard transparent className="p-0 overflow-hidden border-slate-200/60 bg-white/40 backdrop-blur-xl shadow-xl shadow-slate-200/20">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50">
                                        <th className="px-6 py-4 w-10">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedLeadIds.length === leads.length && leads.length > 0}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 border-slate-300 transition-all cursor-pointer" 
                                            />
                                        </th>
                                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest" style={{ fontFamily: 'Comfortaa, cursive' }}>Lead Info</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Empresa</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tags</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status / Cadência</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {leads.length === 0 ? (
                                        <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-bold text-sm">Nenhum lead disponível nesta categoria</td></tr>
                                    ) : leads.slice(0, 100).map((lead) => (
                                        <tr key={lead.id} className={cn(
                                            "hover:bg-white/60 transition-colors group",
                                            selectedLeadIds.includes(lead.id) && "bg-orange-50/30"
                                        )}>
                                            <td className="px-6 py-4">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedLeadIds.includes(lead.id)}
                                                    onChange={() => toggleLeadSelection(lead.id)}
                                                    className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 border-slate-300 transition-all cursor-pointer" 
                                                />
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-800 text-sm tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>{lead.full_name}</span>
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{lead.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
                                                    <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-400 transition-colors">
                                                        <Building2 size={12} />
                                                    </div>
                                                    {lead.company_name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(lead.metadata?.tags || []).slice(0, 2).map((t: string) => (
                                                        <span key={t} className="bg-white text-slate-600 text-[9px] font-black px-2 py-1 rounded-md uppercase border border-slate-200/50 shadow-sm">{t}</span>
                                                    ))}
                                                    {(lead.metadata?.tags || []).length > 2 && (
                                                        <span className="text-[9px] font-bold text-slate-400">+{(lead.metadata?.tags || []).length - 2}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className={cn(
                                                        'px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm',
                                                        lead.cadence_name
                                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                            : 'bg-amber-50 text-amber-600 border-amber-100'
                                                    )}>
                                                        {lead.cadence_name ? 'Ativo' : 'Pendente'}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-500 truncate max-w-[120px]">{lead.cadence_name || 'Aguardando SDR'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-orange-500 hover:shadow-lg transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-orange-100 shadow-sm">
                                                    <ChevronRight size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </GlassCard>
                    )}

                    {leadsSubTab === 'lotes' && (
                        <div className="space-y-6">
                            {loadingBatches ? (
                                <div className="flex flex-col items-center justify-center py-20 bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-slate-100">
                                    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando lotes...</p>
                                </div>
                            ) : (
                                <GlassCard transparent className="p-0 overflow-hidden border-slate-200/60 bg-white/40 backdrop-blur-xl shadow-xl shadow-slate-200/20">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest" style={{ fontFamily: 'Comfortaa, cursive' }}>Nome do Arquivo / Lote</th>
                                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Importação</th>
                                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Leads</th>
                                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">SDRs</th>
                                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">% Trabalhado</th>
                                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredBatchesContent.length === 0 ? (
                                                <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-400 font-bold text-sm italic">Nenhum lote encontrado para esta busca</td></tr>
                                            ) : filteredBatchesContent.map((batch) => (
                                                <motion.tr 
                                                    key={batch.id} 
                                                    onClick={() => setSelectedBatch(batch)}
                                                    className="hover:bg-white/60 transition-all group cursor-pointer"
                                                >
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 group-hover:border-orange-200 group-hover:text-orange-500 transition-all">
                                                                <Building2 size={20} />
                                                            </div>
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="font-black text-slate-800 text-sm tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>{batch.name}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[8px] font-black uppercase tracking-wider">{batch.origin || 'Import CSV'}</span>
                                                                    <div className="flex gap-1">
                                                                        {(batch.tags || []).slice(0, 2).map((t: string) => (
                                                                            <span key={t} className="text-[8px] font-black text-orange-400 uppercase">#{t}</span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                            {new Date(batch.import_date).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <span className="text-lg font-black text-slate-800" style={{ fontFamily: 'Comfortaa, cursive' }}>{batch.total_leads}</span>
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <div className="flex items-center justify-center -space-x-2">
                                                            {[1, 2, 3].map(i => (
                                                                <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 shadow-sm" />
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5 w-32 mx-auto">
                                                            <div className="flex justify-between text-[9px] font-black text-slate-500">
                                                                <span className="text-emerald-600">{batch.progress || 0}%</span>
                                                                <span className="opacity-50 tracking-tighter">{batch.processed_leads || 0} / {batch.total_leads}</span>
                                                            </div>
                                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-100">
                                                                <motion.div 
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${batch.progress || 0}%` }}
                                                                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full" 
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <button className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-300 hover:text-orange-500 hover:border-orange-200 hover:shadow-lg transition-all shadow-sm">
                                                            <Eye size={18} />
                                                        </button>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </GlassCard>
                            )}
                        </div>
                    )}


                    {(leadsSubTab === 'segmentos' || leadsSubTab === 'filtros') && (
                        <div className="flex flex-col items-center justify-center py-20 bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-slate-100">
                            <Sparkles size={48} className="text-slate-200 mb-4" />
                            <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Em Breve</h3>
                            <p className="text-xs text-slate-400 font-bold mt-2">Estamos construindo o motor de segmentação avançada.</p>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Batch Side Modal */}
            <AnimatePresence>
                {selectedBatch && (
                    <div className="fixed inset-0 z-[10000] flex justify-end">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedBatch(null)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 200 }}
                            className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col"
                        >
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>{selectedBatch.name}</h2>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Detalhes do Lote • {new Date(selectedBatch.import_date).toLocaleDateString()}</p>
                                </div>
                                <button onClick={() => setSelectedBatch(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                    <ChevronRight size={24} className="text-slate-400" />
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                {/* Batch Summary KPIs */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 group hover:border-orange-200 transition-all">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Leads</span>
                                        <p className="text-3xl font-black text-slate-800 mt-1">{selectedBatch.total_leads}</p>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 group hover:border-indigo-200 transition-all">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progresso</span>
                                        <p className="text-3xl font-black text-indigo-600 mt-1">{selectedBatch.progress}%</p>
                                        <div className="mt-4 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${selectedBatch.progress}%` }} />
                                        </div>
                                    </div>
                                </div>

                                {/* Tags Section */}
                                <section>
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Tags do Lote</h4>
                                        <button className="text-[10px] font-black text-orange-500 uppercase tracking-widest hover:underline">Limpar Todas</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 p-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                        {(selectedBatch.tags || []).map((t: string) => (
                                            <span key={t} className="bg-white text-slate-600 text-[10px] font-black px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-2 group">
                                                {t}
                                                <button className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><X size={12} /></button>
                                            </span>
                                        ))}
                                        <button className="px-3 py-1.5 rounded-xl border border-dashed border-slate-300 text-slate-400 text-[10px] font-black uppercase hover:bg-white transition-all">+ Adicionar</button>
                                    </div>
                                </section>

                                {/* Quick Filters */}
                                <section>
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Filtros Rápidos</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { label: 'Somente Pendentes', count: selectedBatch.total_leads - selectedBatch.processed_leads },
                                            { label: 'Somente em Fluxo', count: 0 }, // Mock
                                            { label: 'Leads Qualificados', count: 0 }, // Mock
                                            { label: 'Sem Email', count: 0 } // Mock
                                        ].map(f => (
                                            <label key={f.label} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <input type="checkbox" className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 border-slate-300" />
                                                    <span className="text-xs font-bold text-slate-600">{f.label}</span>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400">{f.count}</span>
                                            </label>
                                        ))}
                                    </div>
                                </section>

                                {/* Internal Search */}
                                <section>
                                     <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Busca Interna</h4>
                                     <div className="relative">
                                         <input 
                                            type="text" 
                                            placeholder="Buscar lead por nome ou email..." 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-inner"
                                         />
                                     </div>
                                </section>

                                {/* Bulk Actions */}
                                <section className="pt-8 border-t border-slate-100">
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Ações em Lote</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        <button className="flex items-center justify-between p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-[1.5rem] hover:shadow-xl hover:shadow-slate-500/20 transition-all font-black group">
                                            <div className="flex items-center gap-3">
                                                <Users size={18} className="text-orange-400" /> 
                                                <span className="text-sm tracking-tight">Atribuir a SDR em Massa</span>
                                            </div>
                                            <ChevronRight size={18} className="opacity-40 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                        <button className="flex items-center justify-between p-5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-[1.5rem] hover:shadow-xl hover:shadow-orange-500/20 transition-all font-black group">
                                            <div className="flex items-center gap-3">
                                                <Zap size={18} /> 
                                                <span className="text-sm tracking-tight">Iniciar Cadência Inteligente</span>
                                            </div>
                                            <ChevronRight size={18} className="opacity-40 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                        <button className="flex items-center justify-between p-5 bg-rose-50 text-rose-600 border border-rose-100 rounded-[1.5rem] hover:bg-rose-100 transition-all font-black group mt-4">
                                            <div className="flex items-center gap-3">
                                                <LayoutDashboard size={18} /> 
                                                <span className="text-sm tracking-tight">Excluir Lote Permanentemente</span>
                                            </div>
                                            <X size={18} className="opacity-40" />
                                        </button>
                                    </div>
                                </section>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

/* ═══════════════════════════════════════════
   Tab: Cadências
   ═══════════════════════════════════════════ */
export const CadenciasTab: React.FC<{
    activeLeads: Lead[];
}> = ({ activeLeads }) => {
    // Group leads by cadence_name
    const cadenceMap = new Map<string, Lead[]>();
    activeLeads.forEach(lead => {
        const name = lead.cadence_name || 'Sem Cadência';
        cadenceMap.set(name, [...(cadenceMap.get(name) || []), lead]);
    });

    const cadences = Array.from(cadenceMap.entries()).sort((a, b) => b[1].length - a[1].length);

    const gradients: [string, string][] = [
        ['#3B82F6', '#6366F1'],
        ['#10B981', '#059669'],
        ['#F59E0B', '#EF4444'],
        ['#8B5CF6', '#EC4899'],
        ['#06B6D4', '#3B82F6'],
        ['#FF8C00', '#FF5722'],
    ];

    return (
        <div className="space-y-4">
            {/* Stats summary */}
            <div className="grid grid-cols-3 gap-4">
                <KpiCard label="Cadências Ativas" value={cadences.length} icon={Target} gradient={['#8B5CF6', '#EC4899']} />
                <KpiCard label="Leads em Cadência" value={activeLeads.length} icon={Zap} gradient={['#10B981', '#059669']} />
                <KpiCard label="Sem Cadência" value={cadenceMap.get('Sem Cadência')?.length || 0} icon={Clock} gradient={['#F59E0B', '#EF4444']} />
            </div>

            {/* Cadence cards */}
            <div className="grid grid-cols-2 gap-4">
                {cadences.map(([name, leads], i) => (
                    <GlassCard key={name}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm"
                                    style={{ background: `linear-gradient(135deg, ${gradients[i % gradients.length][0]}, ${gradients[i % gradients.length][1]})` }}
                                >
                                    <Target size={14} />
                                </div>
                                <h4 className="font-black text-sm text-slate-700" style={{ fontFamily: 'Comfortaa, cursive' }}>{name}</h4>
                            </div>
                            <span className="text-2xl font-black text-slate-800" style={{ fontFamily: 'Comfortaa, cursive' }}>{leads.length}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full"
                                style={{
                                    width: `${Math.min((leads.length / Math.max(activeLeads.length, 1)) * 100, 100)}%`,
                                    background: `linear-gradient(90deg, ${gradients[i % gradients.length][0]}, ${gradients[i % gradients.length][1]})`,
                                }}
                            />
                        </div>
                        <p className="text-[10px] text-slate-600 font-bold mt-2">
                            {Math.round((leads.length / Math.max(activeLeads.length, 1)) * 100)}% do total em cadência
                        </p>
                    </GlassCard>
                ))}
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════
   Tab: Conquistas
   ═══════════════════════════════════════════ */
const PodiumItem: React.FC<{
    sdr: any;
    rank: number;
}> = ({ sdr, rank }) => {
    const config = {
        1: {
            height: 'h-[220px]',
            gradient: ['#FFD700', '#FFA500'],
            medal: '🥇',
            glow: 'shadow-amber-500/40',
            label: 'Campeão'
        },
        2: {
            height: 'h-[180px]',
            gradient: ['#E2E8F0', '#94A3B8'],
            medal: '🥈',
            glow: 'shadow-slate-400/30',
            label: 'Vice-Líder'
        },
        3: {
            height: 'h-[150px]',
            gradient: ['#CD7F32', '#A0522D'],
            medal: '🥉',
            glow: 'shadow-orange-700/20',
            label: 'Destaque'
        }
    }[rank as 1 | 2 | 3];

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springPop, delay: rank * 0.1 }}
            className="flex flex-col items-center group"
        >
            <div className="relative mb-4">
                <UserAvatar 
                    src={sdr.profile_picture_url} 
                    name={sdr.full_name} 
                    size={rank === 1 ? "xl" : "lg"} 
                    rounded 
                    border={false}
                    className={cn(
                        "w-full h-full !rounded-full relative z-10",
                        rank === 1 ? "ring-4 ring-amber-100" : ""
                    )} 
                />
                <div className={cn(
                    "absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-2xl z-20 border-2 border-slate-50",
                    rank === 1 ? "w-12 h-12 -bottom-3 -right-3" : ""
                )}>
                    {config.medal}
                </div>
                {/* Glow behind */}
                <div className={cn(
                    "absolute inset-0 rounded-full blur-2xl opacity-40 group-hover:opacity-70 transition-opacity",
                    config.glow,
                    "bg-current"
                )} style={{ color: config.gradient[0] }} />
            </div>

            <div
                className={cn(
                    "w-32 rounded-t-[2.5rem] flex flex-col items-center justify-end p-6 border border-white/40 shadow-2xl relative overflow-hidden",
                    config.height
                )}
                style={{
                    background: `linear-gradient(180deg, ${config.gradient[0]}dd, ${config.gradient[1]}ee)`,
                    backdropFilter: 'blur(12px)'
                }}
            >
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMiIvPjwvc3ZnPg==')] opacity-30" />
                
                <p className="text-white font-black text-3xl drop-shadow-lg mb-1" style={{ fontFamily: 'Comfortaa, cursive' }}>
                    {sdr.completed}
                </p>
                <p className="text-white/80 text-[10px] font-black uppercase tracking-widest">{config.label}</p>
                
                <div className="mt-4 w-full bg-white/20 h-1 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full bg-white shadow-[0_0_8px_white]" 
                    />
                </div>
            </div>
            
            <div className="mt-4 text-center">
                <p className="font-black text-slate-800 text-sm capitalize" style={{ fontFamily: 'Comfortaa, cursive' }}>
                    {sdr.email?.split('@')[0].replace(/[^a-zA-Z]/g, ' ')}
                </p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                    {(sdr.calls || 0) + (sdr.emails || 0) + (sdr.whatsapp || 0)} atividades
                </p>
            </div>
        </motion.div>
    );
};

const ConquistasTab: React.FC<{
    stats: any;
    sdrs: SDR[];
}> = ({ stats, sdrs }) => {
    const [expandedCard, setExpandedCard] = useState<string | null>(null);

    // Sort SDRs by completed leads (real data from enrichedSdrs)
    const leaderboard = [...sdrs].sort((a, b) => (b.completed || 0) - (a.completed || 0));
    
    const podium = leaderboard.slice(0, 3);
    const others = leaderboard.slice(3);

    // Reorder for visual pódio: [2nd, 1st, 3rd]
    const visualPodium = [
        podium[1], // 2nd
        podium[0], // 1st
        podium[2]  // 3rd
    ].filter(Boolean);

    const topCards = [
        {
            id: 'calls',
            label: 'TOP Ligações',
            icon: '📞',
            gradient: ['#3B82F6', '#6366F1'],
            metric: (sdr: SDR) => sdr.calls || 0,
            unit: 'calls',
            sorted: [...sdrs].sort((a, b) => (b.calls || 0) - (a.calls || 0)),
        },
        {
            id: 'cadencias',
            label: 'TOP Cadências Concluídas',
            icon: '🏆',
            gradient: ['#F59E0B', '#EF4444'],
            metric: (sdr: SDR) => sdr.completed || 0,
            unit: 'concluídas',
            sorted: [...sdrs].sort((a, b) => (b.completed || 0) - (a.completed || 0)),
        },
        {
            id: 'leads',
            label: 'TOP Leads Tratados',
            icon: '🎯',
            gradient: ['#10B981', '#06B6D4'],
            metric: (sdr: SDR) => (sdr.calls || 0) + (sdr.emails || 0) + (sdr.whatsapp || 0),
            unit: 'interações',
            sorted: [...sdrs].sort((a, b) => ((b.calls || 0) + (b.emails || 0) + (b.whatsapp || 0)) - ((a.calls || 0) + (a.emails || 0) + (a.whatsapp || 0))),
        },
        {
            id: 'reunioes',
            label: 'TOP Reuniões Agendadas',
            icon: '📅',
            gradient: ['#8B5CF6', '#EC4899'],
            metric: (sdr: SDR) => sdr.pipeline_movements || 0,
            unit: 'movimentos',
            sorted: [...sdrs].sort((a, b) => (b.pipeline_movements || 0) - (a.pipeline_movements || 0)),
        },
    ];

    return (
        <div className="space-y-12 pb-20">
            {/* Header section with total trophy */}
            <div className="flex items-center justify-between gap-8 px-4">
                <div className="max-w-md">
                    <h3 className="text-2xl font-black text-slate-800 mb-2" style={{ fontFamily: 'Comfortaa, cursive' }}>
                        Copa de Performance
                    </h3>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                        Reconhecendo os SDRs que mais converteram leads e mantiveram a cadência ativa no período selecionado.
                    </p>
                </div>
                
                <GlassCard gradient={['#FF8C00', '#FF5722']} className="min-w-[240px] py-4 px-8 text-center shadow-orange-500/20">
                    <Trophy size={32} className="mx-auto text-white/90 mb-2 drop-shadow-md" />
                    <p className="text-3xl font-black text-white" style={{ fontFamily: 'Comfortaa, cursive' }}>
                        {stats.completed_leads}
                    </p>
                    <p className="text-[10px] font-black text-white/80 uppercase tracking-widest mt-1">Gols da Equipe</p>
                </GlassCard>
            </div>

            {/* TOP ranking mini modals */}
            <div className="grid grid-cols-2 gap-4 px-4">
                {topCards.map((card) => {
                    const isExpanded = expandedCard === card.id;
                    const leaders = card.sorted.slice(0, 5);
                    const top = leaders[0];
                    return (
                        <motion.div
                            key={card.id}
                            layout
                            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                            className="rounded-3xl border border-white/60 overflow-hidden shadow-lg cursor-pointer"
                            style={{ background: `linear-gradient(135deg, ${card.gradient[0]}15, ${card.gradient[1]}10)`, backdropFilter: 'blur(12px)' }}
                            onClick={() => setExpandedCard(isExpanded ? null : card.id)}
                        >
                            {/* Card Header */}
                            <div
                                className="p-5 flex items-center justify-between"
                                style={{ background: `linear-gradient(135deg, ${card.gradient[0]}, ${card.gradient[1]})` }}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{card.icon}</span>
                                    <div>
                                        <p className="text-white font-black text-sm" style={{ fontFamily: 'Comfortaa, cursive' }}>{card.label}</p>
                                        {top && (
                                            <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider">
                                                Líder: {top.full_name?.split(' ')[0] || top.email?.split('@')[0]} — {card.metric(top)} {card.unit}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <motion.div
                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
                                >
                                    <ChevronRight size={16} className="text-white rotate-90" />
                                </motion.div>
                            </div>

                            {/* Expanded ranking list */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="overflow-hidden"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="p-4 space-y-2">
                                            {leaders.map((sdr, i) => (
                                                <motion.div
                                                    key={sdr.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.04 }}
                                                    className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/60 border border-white/80 shadow-sm"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[11px] font-black w-5 text-center" style={{ color: card.gradient[0] }}>#{i + 1}</span>
                                                        <UserAvatar src={sdr.profile_picture_url} name={sdr.full_name || sdr.email?.split('@')[0]} size="sm" rounded />
                                                        <span className="text-sm font-bold text-slate-700">
                                                            {sdr.full_name?.split(' ')[0] || sdr.email?.split('@')[0]}
                                                        </span>
                                                    </div>
                                                    <div
                                                        className="px-3 py-1 rounded-full text-xs font-black text-white shadow-sm"
                                                        style={{ background: `linear-gradient(135deg, ${card.gradient[0]}, ${card.gradient[1]})` }}
                                                    >
                                                        {card.metric(sdr)}
                                                    </div>
                                                </motion.div>
                                            ))}
                                            {leaders.length === 0 && (
                                                <p className="text-center text-slate-400 text-xs py-4 font-bold">Sem dados ainda</p>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            {/* Pódio visual */}
            <div className="flex items-end justify-center gap-0 md:gap-4 pt-10 min-h-[400px]">
                {visualPodium.map((sdr, i) => {
                    // Logic to map current index to real rank
                    // Index 0 is 2nd place, 1 is 1st place, 2 is 3rd place
                    const rank = i === 1 ? 1 : i === 0 ? 2 : 3;
                    return (
                        <PodiumItem key={sdr.id} sdr={sdr} rank={rank} />
                    );
                })}
                {visualPodium.length === 0 && (
                    <div className="flex flex-col items-center py-20 text-slate-400">
                        <Trophy size={64} className="opacity-10 mb-4" />
                        <p className="font-black" style={{ fontFamily: 'Comfortaa, cursive' }}>Aguardando o primeiro gol...</p>
                    </div>
                )}
            </div>

            {/* Outros SDRs */}
            {others.length > 0 && (
                <div className="max-w-4xl mx-auto px-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-4">
                        <div className="h-px flex-1 bg-slate-100" />
                        Abaixo do Tops 3
                        <div className="h-px flex-1 bg-slate-100" />
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {others.map((sdr, i) => (
                            <motion.div
                                key={sdr.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-center justify-between p-4 bg-white rounded-3xl border border-slate-100/80 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-xs font-black text-slate-300 min-w-[20px]">#{i + 4}</span>
                                    <UserAvatar 
                                        src={sdr.profile_picture_url} 
                                        name={sdr.full_name} 
                                        size="md" 
                                        rounded 
                                        border={false}
                                        className="!rounded-full border border-slate-100 shadow-sm" 
                                    />
                                    <div>
                                        <p className="font-black text-slate-800 text-sm" style={{ fontFamily: 'Comfortaa, cursive' }}>{sdr.email?.split('@')[0]}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{(sdr.calls || 0) + (sdr.emails || 0) + (sdr.whatsapp || 0)} atividades</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black text-slate-800" style={{ fontFamily: 'Comfortaa, cursive' }}>{sdr.completed || 0}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">Gols</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ═══════════════════════════════════════════
   Tab: Preview SDR
   ═══════════════════════════════════════════ */

const PreviewTab: React.FC<{
    sdrs: SDR[];
    activeLeads: Lead[];
    columns: any[];
    selectedAuditSdrIds: string[];
    onToggleAuditSdr: (id: string) => void;
}> = ({ sdrs, activeLeads, columns, selectedAuditSdrIds, onToggleAuditSdr }) => {
    const [selectedSdr, setSelectedSdr] = useState<SDR | null>(null);

    const handleDragEnd = async (event: any) => {
        const { active, over } = event;
        if (!over || !selectedSdr) return;

        const leadId = active.id;
        const newColId = over.id;
        const lead = activeLeads.find((l: any) => l.id === leadId);

        if (!lead || lead.current_column_id === newColId) return;

        try {
            await leadsAPI.moveLead(leadId, newColId);
            const col = columns.find(c => c.id === newColId);
            if (col) {
                if (col.position === 2) await statsAPI.updateActivity('call', selectedSdr.id);
                if (col.position === 3) await statsAPI.updateActivity('email', selectedSdr.id);
                if (col.position === 4) await statsAPI.updateActivity('whatsapp', selectedSdr.id);
            }
        } catch (err) {
            console.error('Failed to move lead or update activity:', err);
        }
    };

    const leadsBySdr = new Map<string, Lead[]>();
    activeLeads.forEach((lead: any) => {
        const sdrId = lead.assigned_sdr_id || 'unassigned';
        leadsBySdr.set(sdrId, [...(leadsBySdr.get(sdrId) || []), lead]);
    });

    const getColumnIdentity = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('whatsapp') || n.includes('wpp')) {
            return { gradient: ['#10B981', '#06B6D4'], columnBg: 'bg-emerald-100/20', icon: 'wpp', label: 'WhatsApp', subtitle: 'RELACIONAMENTO', accent: 'text-emerald-500' };
        }
        if (n.includes('email')) {
            return { gradient: ['#8B5CF6', '#EC4899'], columnBg: 'bg-violet-100/20', icon: '✉️', label: 'Email', subtitle: 'PROPOSTA E VALOR', accent: 'text-violet-500' };
        }
        if (n.includes('chamada') || n.includes('ligação')) {
            return { gradient: ['#3B82F6', '#6366F1'], columnBg: 'bg-blue-100/20', icon: '📞', label: 'Chamada', subtitle: 'SCRIPT DESCOBERTA', accent: 'text-blue-500' };
        }
        if (n.includes('cadência') || n.includes('follow')) {
            return { gradient: ['#EF4444', '#F97316'], columnBg: 'bg-red-100/20', icon: '🎯', label: 'Cadência', subtitle: 'FOLLOW-UP FINAL', accent: 'text-red-500' };
        }
        return { gradient: ['#FF8C00', '#FF5722'], columnBg: 'bg-orange-100/20', icon: '🍊', label: name, subtitle: 'TRIAGEM INICIAL', accent: 'text-orange-500' };
    };


    const orderedColumns = columns.length > 0 ? [...columns].sort((a, b) => a.position - b.position) : [
        { id: 'c1', name: 'Leads', position: 1, color: '#FF8C00' },
        { id: 'c2', name: 'Chamada', position: 2, color: '#3B82F6' },
        { id: 'c3', name: 'Email', position: 3, color: '#8B5CF6' },
        { id: 'c4', name: 'WhatsApp', position: 4, color: '#10B981' },
        { id: 'c5', name: 'Cadência', position: 5, color: '#EF4444' },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-280px)] overflow-hidden">
            {/* Sidebar selector */}
            <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">
                <div className="flex items-center justify-between px-2 mb-2">
                    <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-[0.2em]" style={{ fontFamily: 'Comfortaa, cursive' }}>Preview SDR</h3>
                </div>
                <div className="space-y-3">
                    {sdrs.map(sdr => {
                        const isSelected = selectedSdr?.id === sdr.id;
                        return (
                            <motion.div
                                key={sdr.id}
                                whileHover={{ x: 4 }}
                                onClick={() => setSelectedSdr(sdr)}
                                className={cn(
                                    "p-4 rounded-[2rem] border transition-all cursor-pointer group relative overflow-hidden",
                                    isSelected 
                                        ? "bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 shadow-xl shadow-slate-500/20 text-white" 
                                        : "bg-white border-slate-100 hover:border-orange-200 text-slate-800"
                                )}
                            >
                                <div className="flex items-center gap-3 relative z-10">
                                    <input 
                                        type="checkbox"
                                        checked={selectedAuditSdrIds.includes(sdr.id)}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            onToggleAuditSdr(sdr.id);
                                        }}
                                        className="w-3.5 h-3.5 rounded border-slate-200 text-orange-500 focus:ring-orange-500 cursor-pointer"
                                    />
                                    <UserAvatar 
                                        src={sdr.profile_picture_url} 
                                        name={sdr.full_name || sdr.email?.split('@')[0]} 
                                        size="sm" 
                                        className="font-black" 
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black truncate">{sdr.full_name || sdr.email?.split('@')[0]}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={cn("text-[9px] font-black uppercase tracking-[0.1em]", isSelected ? "text-slate-400" : "text-slate-400")}>
                                                {sdr.calls || 0} calls
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className={cn("transition-transform", isSelected ? "text-orange-500 translate-x-1" : "text-slate-300")} />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Funnel Preview */}
            <div className="lg:col-span-9 bg-white/40 backdrop-blur-md rounded-[3rem] border border-white/80 shadow-inner flex flex-col overflow-hidden">
                {!selectedSdr ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                        <div className="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm flex items-center justify-center text-slate-300 mb-6">
                            <Users size={32} />
                        </div>
                        <h4 className="text-xl font-black text-slate-800" style={{ fontFamily: 'Comfortaa, cursive' }}>Selecione um Especialista</h4>
                        <p className="text-xs text-slate-400 font-bold mt-2 uppercase tracking-widest">Para visualizar o pipeline individual em tempo real</p>
                    </div>
                ) : (
                    <>
                        <div className="p-8 border-b border-slate-100/50 flex items-center justify-between bg-white/40 backdrop-blur-xl">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                                    <Zap size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>Operação Real-Time</h3>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{selectedSdr.full_name || selectedSdr.email}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 p-8 overflow-x-auto overflow-y-hidden">
                            <DndContext onDragEnd={handleDragEnd}>
                                <div className="flex gap-6 h-full min-w-[1200px]">
                                    {orderedColumns.map(col => (
                                        <PreviewColumn 
                                            key={col.id}
                                            id={col.id}
                                            leads={leadsBySdr.get(selectedSdr.id)?.filter(l => l.current_column_id === col.id) || []}
                                            identity={getColumnIdentity(col.name)}
                                        />
                                    ))}
                                </div>
                            </DndContext>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const PreviewColumn: React.FC<{ id: string; leads: Lead[]; identity: any }> = ({ id, leads, identity }) => {
    const { setNodeRef } = useDroppable({ id });

    return (
        <div ref={setNodeRef} className={cn("w-[260px] h-full flex flex-col rounded-[2.5rem] p-4 transition-all border border-transparent shadow-inner", identity.columnBg || 'bg-slate-50/50')}>
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                    <span className="text-sm">{identity.icon === 'wpp' ? '📱' : identity.icon}</span>
                    <div>
                        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{identity.label}</h4>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">{identity.subtitle}</p>
                    </div>
                </div>
                <div className={cn("px-2.5 py-1 rounded-full text-[10px] font-black bg-white shadow-sm border border-slate-100", identity.accent)}>
                    {leads.length}
                </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                {leads.map(lead => (
                    <LeadCard key={lead.id} lead={lead} simple={true} />
                ))}
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════
   Tab: Assistente (IA Sales AI)
   ═══════════════════════════════════════════ */
const AssistenteTab: React.FC<{
    allLeads: Lead[];
    activeLeads: Lead[];
    sdrs: SDR[];
}> = ({ allLeads, activeLeads, sdrs }) => {
    const [dataSource, setDataSource] = useState<'leads' | 'campeonatos' | 'tags'>('leads');
    const [query, setQuery] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [isExporting, setIsExporting] = useState(false);

    // Derived data
    const uniqueTags = Array.from(new Set([...allLeads, ...activeLeads].flatMap(l => l.tags || [])));
    const uniqueCadences = Array.from(new Set(activeLeads.map(l => l.cadence_name).filter(Boolean))) as string[];

    const handleAnalyze = async () => {
        if (!query.trim()) {
            alert('Por favor, digite uma pergunta ou análise desejada.');
            return;
        }
        setIsAnalyzing(true);
        setAiResponse(null);
        try {
            // Prepare context data based on selection
            let filteredLeads = [...activeLeads, ...allLeads];
            if (dataSource === 'tags' && selectedItems.length > 0) {
                filteredLeads = filteredLeads.filter(l => l.tags?.some(t => selectedItems.includes(t)));
            } else if (dataSource === 'campeonatos' && selectedItems.length > 0) {
                filteredLeads = filteredLeads.filter(l => selectedItems.includes(l.cadence_name || ''));
            }

            const contextData = {
                source: dataSource,
                selectedItems,
                summary: {
                    total_leads: filteredLeads.length,
                    active_in_cadence: filteredLeads.filter(l => l.cadence_status === 'ativa').length,
                    sdrs_count: sdrs.length,
                    leads_sample: filteredLeads.slice(0, 50).map(l => ({ 
                        name: l.full_name, 
                        company: l.company_name, 
                        cadence: l.cadence_name, 
                        status: (l as any).current_column,
                        tags: l.tags
                    }))
                }
            };

            const response = await aiAPI.analyzeSales(contextData, query);
            if (response.success) {
                setAiResponse(response.data);
            }
        } catch (error) {
            console.error('Analysis failed:', error);
            setAiResponse('### ❌ Erro na análise\nNão foi possível processar a requisição com a OpenAI. Verifique se a chave de API está configurada no backend.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleExport = async () => {
        if (!aiResponse) return;
        setIsExporting(true);
        try {
            const response = await aiAPI.exportToMattermost(aiResponse);
            if (response.success) {
                alert('Relatório exportado com sucesso para o Mattermost!');
            }
        } catch (error) {
            console.error('MM Export failed:', error);
            alert('Falha ao exportar para o Mattermost. Verifique a URL do Webhook no backend.');
        } finally {
            setIsExporting(false);
        }
    };

    const toggleItem = (item: string) => {
        setSelectedItems(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    };

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header / Selection Area */}
            <GlassCard className="space-y-6">
                <div className="flex items-center gap-6">
                    <div className="flex-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block" style={{ fontFamily: 'Comfortaa, cursive' }}>Fonte de Dados</label>
                        <div className="flex gap-2">
                            {(['leads', 'campeonatos', 'tags'] as const).map(src => (
                                <button
                                    key={src}
                                    onClick={() => { setDataSource(src); setSelectedItems([]); }}
                                    className={cn(
                                        "px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all border shadow-sm",
                                        dataSource === src
                                            ? "bg-gradient-to-br from-pink-400 to-rose-500 text-white border-rose-400 shadow-rose-200"
                                            : "bg-white text-slate-600 border-slate-100 hover:border-rose-200 hover:bg-rose-50/50"
                                    )}
                                    style={{ fontFamily: 'Comfortaa, cursive' }}
                                >
                                    {src === 'leads' ? 'Base de Leads' : src === 'campeonatos' ? 'Campanhas' : 'Filtro por Tags'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="w-1/3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block" style={{ fontFamily: 'Comfortaa, cursive' }}>Período</label>
                        <div className="bg-white border border-slate-100 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-sm">
                            <Calendar size={16} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-600">Últimos 30 dias (Auto)</span>
                        </div>
                    </div>
                </div>

                {/* Selective Tags Grid */}
                <div className="min-h-[100px] p-4 bg-slate-50/50 rounded-3xl border border-slate-100/50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">Itens Selecionados ({selectedItems.length})</p>
                    <div className="flex flex-wrap gap-2">
                        {dataSource === 'tags' && uniqueTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => toggleItem(tag)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-bold transition-all border",
                                    selectedItems.includes(tag) ? "bg-rose-100 border-rose-200 text-rose-700" : "bg-white border-slate-100 text-slate-500 hover:border-rose-200"
                                )}
                            >
                                #{tag}
                            </button>
                        ))}
                        {dataSource === 'campeonatos' && uniqueCadences.map(c => (
                            <button
                                key={c}
                                onClick={() => toggleItem(c)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-bold transition-all border",
                                    selectedItems.includes(c) ? "bg-rose-100 border-rose-200 text-rose-700" : "bg-white border-slate-100 text-slate-500 hover:border-rose-200"
                                )}
                            >
                                🎯 {c}
                            </button>
                        ))}
                        {dataSource === 'leads' && (
                            <p className="text-xs text-slate-400 italic p-2">Toda a base ativa ({activeLeads.length + allLeads.length} registros) selecionada.</p>
                        )}
                        {dataSource !== 'leads' && selectedItems.length === 0 && (
                            <p className="text-xs text-slate-400 italic p-2">Selecione um ou mais itens para análise específica.</p>
                        )}
                    </div>
                </div>

                {/* Query Area */}
                <div className="relative">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block" style={{ fontFamily: 'Comfortaa, cursive' }}>O que você deseja saber?</label>
                    <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ex: Qual campanha teve melhor conversão essa semana? / Me dê uma análise de performance dos SDRs..."
                        className="w-full h-32 bg-white/60 border border-slate-100 rounded-3xl p-6 text-sm text-slate-800 focus:border-rose-300 focus:bg-white outline-none transition-all shadow-inner custom-scrollbar"
                    />
                    <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className={cn(
                            "absolute bottom-4 right-4 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50",
                            isAnalyzing ? "bg-slate-200 text-slate-400 cursor-wait" : "bg-slate-900 text-white hover:bg-slate-800"
                        )}
                        style={{ fontFamily: 'Comfortaa, cursive' }}
                    >
                        {isAnalyzing ? (
                            <>Analisando...</>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                Gerar Análise
                            </>
                        )}
                    </button>
                </div>
            </GlassCard>

            {/* AI Response Area */}
            <AnimatePresence>
                {aiResponse && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <GlassCard className="bg-gradient-to-br from-white to-rose-50/30 border-rose-100 shadow-rose-100/20">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg">
                                    <Brain size={20} />
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-800 text-sm" style={{ fontFamily: 'Comfortaa, cursive' }}>Resposta do Assistente IA</h4>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em]">Análise Gerada em tempo real</p>
                                </div>
                            </div>

                            <div className="prose prose-slate prose-sm max-w-none text-slate-700 leading-relaxed font-medium">
                                {/* Simple markdown renderer for the analysis */}
                                {aiResponse.split('\n').map((line, i) => (
                                    <p key={i} className={cn(
                                        line.startsWith('###') ? "text-lg font-black text-slate-900 mt-6 mb-3 border-b border-rose-100 pb-2" :
                                            line.startsWith('**') ? "font-bold text-slate-900" : ""
                                    )}>
                                        {line.replace(/^###\s+/, '').replace(/^\*\*\s+/, '')}
                                    </p>
                                ))}
                            </div>

                            <div className="mt-8 pt-6 border-t border-rose-100/50 flex justify-between items-center">
                                <div className="flex items-center gap-2 text-rose-600/60 font-bold text-[10px] uppercase">
                                    <Zap size={14} />
                                    Baseado em GPT-4 Turbo
                                </div>
                                <button
                                    onClick={handleExport}
                                    disabled={isExporting}
                                    className="px-6 py-2.5 bg-white border border-rose-200 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm hover:shadow-md hover:bg-rose-50 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isExporting ? 'Exportando...' : (
                                        <>
                                            <Send size={14} />
                                            Exportar para Mattermost
                                        </>
                                    )}
                                </button>
                            </div>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/* ─────────────────────────────────────────────
   Tab: Conexões (System Integration)
   ───────────────────────────────────────────── */
const ConexoesTab: React.FC<{ sdrs?: SDR[] }> = ({ sdrs = [] }) => {
    const [results, setResults] = useState<any>(null);
    const [schema, setSchema] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSendingReport, setIsSendingReport] = useState(false);
    
    // Config state
    const [config, setConfig] = useState<{
        webhook_url: string;
        schedule_times: string[];
        is_active: boolean;
        sdr_ids: string[];
    }>({
        webhook_url: '',
        schedule_times: ['09:00', '18:00'],
        is_active: true,
        sdr_ids: []
    });

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [res, schemaRes, configRes] = await Promise.all([
                systemAPI.testConnections(),
                systemAPI.validateSchema(),
                systemAPI.getReportConfig()
            ]);
            
            if (res.success) setResults(res.data);
            if (schemaRes.success) setSchema(schemaRes.data);
            if (configRes.success && configRes.data) {
                setConfig({
                    webhook_url: configRes.data.webhook_url || '',
                    schedule_times: configRes.data.schedule_times || ['09:00', '18:00'],
                    is_active: configRes.data.is_active ?? true,
                    sdr_ids: configRes.data.sdr_ids || []
                });
            }
        } catch (err) {
            console.error('Load connections data failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        setIsSaving(true);
        try {
            await systemAPI.updateReportConfig(config);
            alert('Configurações salvas com sucesso!');
        } catch (err) {
            console.error('Save config failed:', err);
            alert('Erro ao salvar configurações.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendReport = async () => {
        setIsSendingReport(true);
        try {
            // Send report only for selected SDRs if any, otherwise all
            await systemAPI.sendManualReport(config.sdr_ids.length > 0 ? config.sdr_ids : undefined);
            alert('Relatório de Auditoria enviado para o Mattermost!');
        } catch (err) {
            console.error('Failed to send report:', err);
            alert('Falha ao enviar relatório.');
        } finally {
            setIsSendingReport(false);
        }
    };

    const toggleSdr = (id: string) => {
        setConfig(prev => ({
            ...prev,
            sdr_ids: prev.sdr_ids.includes(id) 
                ? prev.sdr_ids.filter(sid => sid !== id) 
                : [...prev.sdr_ids, id]
        }));
    };

    useEffect(() => {
        loadData();
    }, []);

    return (
        <div className="space-y-8 max-w-5xl pb-20">
            <header className="flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>
                        Infraestrutura & Conexões
                    </h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Gestão de integrações e diagnósticos</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleSendReport} 
                        disabled={isSendingReport || !config.webhook_url}
                        className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-500 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                    >
                        <Send size={14} className={isSendingReport ? 'animate-bounce' : ''} />
                        {isSendingReport ? 'Enviando...' : 'Testar Webhook Agora'}
                    </button>
                    <button 
                        onClick={loadData} 
                        disabled={isLoading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                    >
                        <Zap size={14} className={isLoading ? 'animate-pulse' : ''} />
                        {isLoading ? 'Testando...' : 'Re-testar Infra'}
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Diagnostics */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Connection Status Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { id: 'backend', label: 'Backend Server', icon: Activity, desc: 'API Loopback / Express' },
                            { id: 'database', label: 'DB Connection', icon: Building2, desc: 'PostgreSQL Pool' },
                            { id: 'postgress', label: 'SSL Network', icon: Target, desc: 'External Access' },
                            { id: 'mattermost', label: 'Mattermost API', icon: Send, desc: 'Webhook Ready' }
                        ].map(conn => (
                            <GlassCard key={conn.id} className="p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-slate-100 rounded-2xl text-slate-600">
                                        <conn.icon size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">{conn.label}</h4>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">{conn.desc}</p>
                                    </div>
                                </div>
                                {results ? (
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-white shadow-sm",
                                            results[conn.id]?.status === 'success' ? "bg-emerald-500" : 
                                            results[conn.id]?.status === 'error' ? "bg-rose-500" : "bg-amber-500"
                                        )}>
                                            {results[conn.id]?.status || 'unknown'}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500 truncate">{results[conn.id]?.message}</span>
                                    </div>
                                ) : (
                                    <div className="h-6 w-32 bg-slate-100 animate-pulse rounded-full" />
                                )}
                            </GlassCard>
                        ))}
                    </div>

                    {/* Schema Validation Section */}
                    <GlassCard className="bg-slate-900 border-none shadow-2xl overflow-hidden relative">
                        {/* Decorative background element */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] -mr-32 -mt-32" />
                        
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-amber-400 border border-white/10">
                                        <Settings size={20} className="animate-[spin_8s_linear_infinite]" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-white" style={{ fontFamily: 'Comfortaa, cursive' }}>Integridade de Dados</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Validação profunda de tabelas e colunas</p>
                                    </div>
                                </div>
                                {schema.some(i => !i.exists) && (
                                    <div className="px-3 py-1 bg-rose-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest animate-pulse">
                                        MIGRAÇÃO NECESSÁRIA
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {schema.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]", 
                                                item.exists ? "text-emerald-500 bg-emerald-500" : "text-rose-500 bg-rose-500"
                                            )} />
                                            <div>
                                                <p className="text-xs font-black text-slate-100">
                                                    {item.type === 'table' ? item.name : `${item.table}.${item.column}`}
                                                </p>
                                                <p className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">
                                                    {item.type === 'table' ? 'INFRAESTRUTURA' : 'CAMPO CRÍTICO'}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={cn(
                                            "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md", 
                                            item.exists ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                                        )}>
                                            {item.exists ? 'OK' : 'FAIL'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Right Column: Mattermost Settings */}
                <div className="space-y-6">
                    <GlassCard className="border-orange-200 shadow-orange-100/50">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-800" style={{ fontFamily: 'Comfortaa, cursive' }}>Agendamento</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Relatório Automático</p>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Status da Automação</label>
                                <button 
                                    onClick={() => setConfig(prev => ({ ...prev, is_active: !prev.is_active }))}
                                    className={cn(
                                        "w-full p-4 rounded-2xl border flex items-center justify-between transition-all",
                                        config.is_active ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"
                                    )}
                                >
                                    <span className={cn("text-xs font-black uppercase tracking-widest", config.is_active ? "text-emerald-600" : "text-slate-400")}>
                                        {config.is_active ? 'ATIVADO' : 'DESATIVADO'}
                                    </span>
                                    <div className={cn("w-10 h-5 rounded-full relative transition-colors", config.is_active ? "bg-emerald-500" : "bg-slate-300")}>
                                        <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", config.is_active ? "left-6" : "left-1")} />
                                    </div>
                                </button>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Mattermost Webhook URL</label>
                                <input 
                                    type="text"
                                    value={config.webhook_url}
                                    onChange={(e) => setConfig(prev => ({ ...prev, webhook_url: e.target.value }))}
                                    placeholder="https://mattermost.servidor.com/hooks/..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[10px] font-bold text-slate-700 focus:border-orange-300 outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Horários de Envio (JSON)</label>
                                <input 
                                    type="text"
                                    value={JSON.stringify(config.schedule_times)}
                                    onChange={(e) => {
                                        try { setConfig(prev => ({ ...prev, schedule_times: JSON.parse(e.target.value) })); } catch(e) {}
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[10px] font-bold font-mono text-slate-600 focus:border-orange-300 outline-none"
                                />
                                <p className="text-[8px] text-slate-400 mt-1 uppercase font-bold">* Formato: ["HH:mm", "HH:mm"]</p>
                            </div>

                            <div className="pt-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">SDRs Incluídos no Report</label>
                                <div className="max-h-[220px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                    {sdrs.map(sdr => (
                                        <div 
                                            key={sdr.id} 
                                            onClick={() => toggleSdr(sdr.id)}
                                            className={cn(
                                                "flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all",
                                                config.sdr_ids.includes(sdr.id) ? "bg-orange-50 border-orange-200" : "bg-white border-slate-100 hover:border-slate-200"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                                config.sdr_ids.includes(sdr.id) ? "bg-orange-500 border-orange-500" : "bg-white border-slate-300"
                                            )}>
                                                {config.sdr_ids.includes(sdr.id) && <Zap size={10} className="text-white" />}
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-700 truncate">{sdr.full_name || sdr.email}</span>
                                        </div>
                                    ))}
                                    {sdrs.length === 0 && (
                                        <p className="text-[10px] text-slate-400 italic text-center py-4">Nenhum SDR encontrado</p>
                                    )}
                                </div>
                                <p className="text-[8px] text-slate-400 mt-2 uppercase font-bold">
                                    {config.sdr_ids.length === 0 ? '* Todos os usuários incluídos se vazio' : `* ${config.sdr_ids.length} selecionados para o report`}
                                </p>
                            </div>

                            <button 
                                onClick={handleSaveConfig}
                                disabled={isSaving}
                                className="w-full bg-slate-900 text-white rounded-xl py-3 text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                            </button>
                        </div>
                    </GlassCard>

                    <GlassCard className="bg-gradient-to-br from-slate-50 to-white border-slate-200">
                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                            <Activity size={12} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Log de Envio</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                            <span>Último Report:</span>
                            <span className="text-slate-400">{(results as any)?.mattermost?.details?.time || '—'}</span>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};

