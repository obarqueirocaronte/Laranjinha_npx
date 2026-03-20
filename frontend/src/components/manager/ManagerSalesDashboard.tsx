import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Activity, Users, Target, Trophy, Eye,
    Settings, TrendingUp, Building2, Clock, Zap, ChevronRight, LogOut,
    Brain, Sparkles, Send, Calendar, CheckCircle2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { leadsAPI, statsAPI, aiAPI, cadencesAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import type { Lead, PipelineColumn } from '../../types';
import { DndContext, useDroppable } from '@dnd-kit/core';
import { LeadCard } from '../kanban/LeadCard';
import { ProfileZone } from '../profile/ProfileZone';
import { UserAvatar } from '../common/UserAvatar';
import { CadencesDashboard } from './CadencesDashboard';

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */
type TabId = 'resumo' | 'monitoramento' | 'acompanhamento' | 'preview' | 'assistente';
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
    const [period, setPeriod] = useState<PeriodId>('tudo');
    const [showExpanded, setShowExpanded] = useState(false);
    const [sdrFilter, setSdrFilter] = useState<string>('all');

    const [history, setHistory] = useState<StatsHistory | null>(null);
    const [selectedAuditSdrIds, setSelectedAuditSdrIds] = useState<string[]>([]);
    const [isSendingAudit, setIsSendingAudit] = useState(false);
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
                                        onToggleAuditSdr={(id) => {
                                            setSelectedAuditSdrIds(prev => 
                                                prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                                            );
                                        }}
                                        onSendAudit={async () => {
                                            if (selectedAuditSdrIds.length === 0) return;
                                            setIsSendingAudit(true);
                                            try {
                                                await statsAPI.sendManualReport(selectedAuditSdrIds);
                                                alert('✅ Auditoria enviada para o Mattermost com sucesso!');
                                            } catch (e: any) {
                                                console.error('Failed to send audit:', e);
                                                alert('❌ Falha ao enviar auditoria: ' + (e.response?.data?.error || e.message));
                                            } finally {
                                                setIsSendingAudit(false);
                                            }
                                        }}
                                        isSendingAudit={isSendingAudit}
                                    />
                                )}
                                {activeTab === 'assistente' && (
                                    <AssistenteTab allLeads={allLeads} activeLeads={activeLeads} sdrs={sdrs} />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </>
                )}
            </main>

            {/* ═══════ Stats Modal ═══════ */}
            <AnimatePresence>
                {showStats && (
                    <StatsModal 
                        onClose={() => setShowStats(false)} 
                        sdrs={enrichedSdrs} 
                        allLeads={allLeads}
                        cadenceDashboard={cadenceDashboard}
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
                                className="absolute inset-0 bg-slate-900/80 backdrop-blur-3xl"
                            />
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0, y: 40 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 40 }}
                                className="relative bg-white border border-white/20 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] rounded-[3.5rem] w-full max-w-[85rem] h-[90vh] flex flex-col overflow-hidden"
                            >
                                {/* Header with gradient line */}
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-400 via-rose-500 to-purple-600" />
                                
                                <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
                                    <div>
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                                                <Sparkles size={20} />
                                            </div>
                                            <h2 className="text-4xl font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>Operational Pulse</h2>
                                        </div>
                                        <p className="text-[11px] text-slate-500 font-extrabold tracking-[0.2em] uppercase">Monitoramento em Tempo Real • {period.toUpperCase()}</p>
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
   StatsModal Component
   ───────────────────────────────────────────── */
interface StatsModalProps {
    onClose: () => void;
    sdrs: SDR[];
    allLeads: Lead[];
    cadenceDashboard?: any;
}

const StatsModal: React.FC<StatsModalProps> = ({ onClose, sdrs, allLeads, cadenceDashboard }) => {
    const [activeModalTab, setActiveModalTab] = useState<'produtividade' | 'campanhas' | 'retornos' | 'imports' | 'visibilidade'>('produtividade');

    const modalTabs = [
        { id: 'produtividade', label: 'Produtividade', icon: Activity },
        { id: 'campanhas', label: 'Campanhas', icon: Target },
        { id: 'retornos', label: 'Calendário', icon: Calendar },
        { id: 'imports', label: 'Importações & Tags', icon: Zap },
        { id: 'visibilidade', label: 'Visibilidade Full', icon: Eye },
    ];

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12">
            {/* Backdrop */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-white/40 backdrop-blur-xl"
            />

            {/* Modal Container */}
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 40 }}
                className="relative bg-white/80 backdrop-blur-3xl border border-white shadow-[0_32px_128px_rgba(0,0,0,0.1)] rounded-[3rem] w-full max-w-6xl h-full flex flex-col overflow-hidden"
            >
                {/* Modal Header */}
                <div className="px-10 py-8 border-b border-orange-100/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3" style={{ fontFamily: 'Comfortaa, cursive' }}>
                            <div className="p-3 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl text-white shadow-lg shadow-orange-200/50">
                                <TrendingUp size={24} />
                            </div>
                            <span>Estatísticas Detalhadas</span>
                        </h2>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2 ml-14">
                            Análise profunda de operação e base de dados
                        </p>
                    </div>

                    {/* Modal Tab Switcher */}
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner border border-slate-200">
                        {modalTabs.map((tab) => {
                            const isActive = activeModalTab === tab.id;
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveModalTab(tab.id as any)}
                                    className={cn(
                                        "px-5 py-3 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all",
                                        isActive 
                                            ? "bg-white text-orange-600 shadow-md border border-slate-200/50" 
                                            : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
                                    )}
                                    style={{ fontFamily: 'Comfortaa, cursive' }}
                                >
                                    <Icon size={14} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    <button 
                        onClick={onClose}
                        className="absolute top-8 right-8 w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all border border-slate-200"
                    >
                        <Zap size={20} className="rotate-45" />
                    </button>
                </div>

                {/* Modal Content Area */}
                <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeModalTab}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="h-full"
                        >
                            {activeModalTab === 'produtividade' && (
                                <StatsProductivityView sdrs={sdrs} />
                            )}
                            {activeModalTab === 'campanhas' && (
                                <StatsCampaignView leads={allLeads} />
                            )}
                            {activeModalTab === 'retornos' && (
                                <RetornosCalendarView 
                                    scheduledReturns={cadenceDashboard?.scheduled_returns || []}
                                    sdrs={sdrs}
                                />
                            )}
                            {activeModalTab === 'imports' && (
                                <StatsImportsView leads={allLeads} />
                            )}
                            {activeModalTab === 'visibilidade' && (
                                <StatsVisibilityView leads={allLeads} />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};
/* ─────────────────────────────────────────────
   Retornos Calendar View
   ───────────────────────────────────────────── */
const RetornosCalendarView: React.FC<{
    scheduledReturns: any[];
    sdrs: SDR[];
}> = ({ scheduledReturns, sdrs }) => {
    const [selectedSdrId, setSelectedSdrId] = useState<string>('all');

    // Get the current month grid
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

    const filtered = scheduledReturns.filter(r => selectedSdrId === 'all' || r.sdr_id === selectedSdrId);

    // Map by day
    const byDay: Record<string, any[]> = {};
    for (const r of filtered) {
        const d = new Date(r.scheduled_at);
        if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
            const key = d.getDate().toString();
            if (!byDay[key]) byDay[key] = [];
            byDay[key].push(r);
        }
    }

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const dayEvents = selectedDay ? (byDay[selectedDay] || []) : [];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Calendar Left */}
            <div className="lg:col-span-2 flex flex-col gap-4">
                {/* Header Controls */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <button onClick={prevMonth} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center text-slate-500">‹</button>
                        <h3 className="text-lg font-black text-slate-800" style={{ fontFamily: 'Comfortaa, cursive' }}>
                            {monthNames[viewMonth]} {viewYear}
                        </h3>
                        <button onClick={nextMonth} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center text-slate-500">›</button>
                    </div>
                    {/* SDR Switcher */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                        <Users size={14} className="text-slate-400" />
                        <select
                            value={selectedSdrId}
                            onChange={e => setSelectedSdrId(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none"
                        >
                            <option value="all">Todos SDRs</option>
                            {sdrs.map(s => (
                                <option key={s.id} value={s.id}>{s.full_name || s.email?.split('@')[0]}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                    {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                        <div key={d} className="text-center text-[9px] font-black text-slate-400 uppercase tracking-wider py-1">{d}</div>
                    ))}
                </div>

                {/* Day Grid */}
                <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells for offset */}
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}
                    {/* Day cells */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = (i + 1).toString();
                        const events = byDay[day] || [];
                        const isToday = today.getDate() === i + 1 && today.getMonth() === viewMonth && today.getFullYear() === viewYear;
                        const isSelected = selectedDay === day;
                        return (
                            <button
                                key={day}
                                onClick={() => setSelectedDay(isSelected ? null : day)}
                                className={cn(
                                    'relative rounded-xl p-2 min-h-[52px] text-left transition-all border',
                                    isSelected ? 'bg-orange-500 border-orange-600 shadow-lg' :
                                    isToday ? 'bg-orange-50 border-orange-200' :
                                    events.length > 0 ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' :
                                    'bg-white border-slate-100 hover:bg-slate-50'
                                )}
                            >
                                <span className={cn(
                                    'text-xs font-black block',
                                    isSelected ? 'text-white' : isToday ? 'text-orange-600' : 'text-slate-600'
                                )}>{i + 1}</span>
                                {events.length > 0 && (
                                    <span className={cn(
                                        'text-[8px] font-black rounded-full px-1.5 py-0.5 mt-1 inline-block',
                                        isSelected ? 'bg-white/20 text-white' : 'bg-blue-500 text-white'
                                    )}>{events.length}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-200 inline-block" />Hoje</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />Com retornos</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-white border border-slate-200 inline-block" />Sem retornos</span>
                </div>
            </div>

            {/* Detail Panel Right */}
            <div className="flex flex-col gap-4">
                <h4 className="text-sm font-black text-slate-700" style={{ fontFamily: 'Comfortaa, cursive' }}>
                    {selectedDay ? `Retornos — dia ${selectedDay}/${viewMonth + 1}` : 'Selecione um dia'}
                </h4>

                {selectedDay && dayEvents.length === 0 && (
                    <p className="text-xs text-slate-400 italic">Nenhum retorno agendado neste dia.</p>
                )}

                <div className="space-y-3 overflow-y-auto max-h-[420px] pr-1">
                    {dayEvents.map((ev, idx) => {
                        const t = new Date(ev.scheduled_at);
                        return (
                            <div key={ev.id || idx} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                        {t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase">{ev.sdr_name || 'SDR'}</span>
                                </div>
                                <p className="text-sm font-black text-slate-800 tracking-tight">{ev.lead_name}</p>
                                <p className="text-[10px] text-slate-400">{ev.company_name}</p>
                                {ev.notes && <p className="text-[10px] text-slate-500 mt-1 italic">{ev.notes}</p>}
                            </div>
                        );
                    })}
                </div>

                {/* Quick summary for unfiltered */}
                {!selectedDay && (
                    <div className="mt-4 space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retornos este mês</p>
                        {Object.entries(byDay).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).map(([day, evts]) => (
                            <button
                                key={day}
                                onClick={() => setSelectedDay(day)}
                                className="w-full flex items-center justify-between bg-white border border-slate-100 rounded-xl px-4 py-2.5 hover:border-orange-200 hover:shadow-sm transition-all"
                            >
                                <span className="text-xs font-black text-slate-600">Dia {day}/{viewMonth + 1}</span>
                                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{evts.length} retorno{evts.length > 1 ? 's' : ''}</span>
                            </button>
                        ))}
                        {Object.keys(byDay).length === 0 && (
                            <p className="text-xs text-slate-400 italic">Nenhum retorno agendado neste mês.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   Stats Sub-Views (Skeleton components for now)
   ───────────────────────────────────────────── */
const StatsProductivityView: React.FC<{ sdrs: SDR[] }> = ({ sdrs }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sdrs.map(sdr => (
                <div key={sdr.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4 mb-4">
                        <UserAvatar 
                            src={sdr.profile_picture_url} 
                            name={sdr.full_name || sdr.email?.split('@')[0]} 
                            size="md" 
                            className="text-orange-600 font-black" 
                        />
                        <div>
                            <h4 className="font-black text-slate-800 text-sm" style={{ fontFamily: 'Comfortaa, cursive' }}>{sdr.email?.split('@')[0]}</h4>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{sdr.role}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-2xl">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Ligações</p>
                            <p className="text-xl font-black text-slate-800">{sdr.calls || 0}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">E-mails</p>
                            <p className="text-xl font-black text-slate-800">{sdr.emails || 0}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">WhatsApp</p>
                            <p className="text-xl font-black text-slate-800">{sdr.whatsapp || 0}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl border border-orange-100">
                            <p className="text-[10px] text-orange-400 font-bold uppercase mb-1">Gols</p>
                            <p className="text-xl font-black text-orange-600">{sdr.completed || 0}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const StatsCampaignView: React.FC<{ leads: Lead[] }> = ({ leads }) => {
    // Basic grouping by campaign (metadata.campaign or source)
    const campaignMap = leads.reduce((acc: any, lead) => {
        const campaign = lead.metadata?.campaign || lead.metadata?.source || 'Geral';
        if (!acc[campaign]) acc[campaign] = { count: 0, qualified: 0 };
        acc[campaign].count++;
        if (lead.qualification_status === 'qualified') acc[campaign].qualified++;
        return acc;
    }, {});

    const campaigns = Object.entries(campaignMap).map(([name, data]: [string, any]) => ({
        name,
        ...data,
        conversion: data.count > 0 ? (data.qualified / data.count) * 100 : 0
    }));

    return (
        <div className="space-y-6">
            <h4 className="text-lg font-black text-slate-800 mb-4" style={{ fontFamily: 'Comfortaa, cursive' }}>Desempenho por Campanha</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {campaigns.map(camp => (
                    <div key={camp.name} className="bg-white p-6 rounded-[2rem] border border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <h5 className="font-black text-slate-700">{camp.name}</h5>
                            <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                {camp.conversion.toFixed(1)}% Conv.
                            </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full mb-4 overflow-hidden">
                            <div 
                                className="bg-gradient-to-r from-orange-400 to-rose-400 h-full rounded-full" 
                                style={{ width: `${Math.min(camp.conversion * 2, 100)}%` }} 
                            />
                        </div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
                            <span>{camp.count} Leads totais</span>
                            <span>{camp.qualified} Qualificados</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const StatsImportsView: React.FC<{ leads: Lead[] }> = ({ leads }) => {
    const allTags = leads.flatMap(l => l.tags || []);
    const tagCounts = allTags.reduce((acc: any, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
    }, {});

    const sortedTags = Object.entries(tagCounts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 15);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
                <h4 className="text-lg font-black text-slate-800 mb-6" style={{ fontFamily: 'Comfortaa, cursive' }}>Top Tags Utilizadas</h4>
                <div className="flex flex-wrap gap-3">
                    {sortedTags.map(([tag, count]) => (
                        <div key={tag as string} className="bg-white px-4 py-2 rounded-2xl border border-slate-200 flex items-center gap-2 group hover:border-orange-200 transition-colors">
                            <span className="text-xs font-black text-slate-600">{tag as string}</span>
                            <span className="bg-slate-100 group-hover:bg-orange-100 text-[10px] font-black text-slate-400 group-hover:text-orange-600 w-6 h-6 rounded-lg flex items-center justify-center transition-colors">
                                {count as number}
                            </span>
                        </div>
                    ))}
                    {sortedTags.length === 0 && <p className="text-slate-400 text-sm italic">Nenhuma tag encontrada.</p>}
                </div>
            </div>
            
            <div>
                <h4 className="text-lg font-black text-slate-800 mb-6" style={{ fontFamily: 'Comfortaa, cursive' }}>Volume de Importações</h4>
                <div className="space-y-4">
                    {/* Simulated batch analysis from creation dates */}
                    {[...new Set(leads.map(l => l.created_at.split('T')[0]))].slice(0, 5).map(date => {
                        const batchCount = leads.filter(l => l.created_at.startsWith(date)).length;
                        return (
                            <div key={date} className="bg-white p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-black text-slate-700">{new Date(date).toLocaleDateString('pt-BR')}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Batch de importação</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-slate-800">{batchCount}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">Leads</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const StatsVisibilityView: React.FC<{ leads: Lead[] }> = ({ leads }) => {
    return (
        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Origem</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {leads.slice(0, 20).map(lead => (
                        <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 text-[11px] font-bold text-slate-500">
                                {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-4">
                                <p className="text-[12px] font-black text-slate-800">{lead.full_name}</p>
                                <p className="text-[10px] text-slate-400">{lead.company_name}</p>
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">
                                    {lead.metadata?.source || 'Import Externo'}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <span className={cn(
                                    "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter",
                                    lead.qualification_status === 'qualified' ? "bg-emerald-100 text-emerald-600" :
                                    lead.qualification_status === 'disqualified' ? "bg-red-100 text-red-600" :
                                    "bg-slate-100 text-slate-600"
                                )}>
                                    {lead.qualification_status || 'Pendente'}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {leads.length > 20 && (
                <div className="p-4 text-center border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Mostrando os últimos 20 de {leads.length} leads</p>
                </div>
            )}
        </div>
    );
};

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
        className={cn("relative overflow-hidden group shadow-md shadow-slate-900/10 transition-all duration-300", onClick && "cursor-pointer hover:scale-[1.02] hover:shadow-xl", className)}
        onClick={onClick}
    >
        <div
            className="absolute -top-4 -right-4 p-4 opacity-[0.08] group-hover:opacity-20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500"
            style={{ color: '#ffffff' }}
        >
            <Icon size={120} strokeWidth={2} />
        </div>
        <div className="relative z-10 flex flex-col h-full justify-between">
            <p className="text-xs font-black uppercase tracking-[0.15em] mb-4 text-white/90 drop-shadow-sm" style={{ fontFamily: 'Comfortaa, cursive' }}>
                {label}
            </p>
            <div>
                <p className="text-[3.25rem] leading-none font-black drop-shadow-md text-white tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>
                    {value}
                </p>
                {sub && <p className="text-[10px] mt-3 font-bold text-white/90 bg-black/10 inline-block px-3 py-1.5 rounded-full uppercase tracking-wider backdrop-blur-md border border-white/10">{sub}</p>}
            </div>
        </div>
    </GlassCard>
);

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
    const cadConcluidas = cadenceDashboard?.zona_conversao?.total_concluidas || 0;
    
    // Calcula conversão baseada em leads concluídos vs total que entrou no período (simulado como total acumulado)
    const conversionRate = totalLeads > 0 ? Math.round((stats.completed_leads / totalLeads) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* ── Top KPI Row ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard 
                    label="Total de Leads" 
                    value={totalLeads} 
                    icon={Users} 
                    gradient={['#3B82F6', '#6366F1']} 
                    sub={`${allLeads?.length || 0} pendentes`} 
                />
                <KpiCard 
                    label="Em Cadência" 
                    value={inCadence} 
                    icon={Zap} 
                    gradient={['#10B981', '#059669']} 
                    sub={`${sdrs.length} SDRs ativos`} 
                />
                <KpiCard 
                    label="Conversão" 
                    value={`${conversionRate}%`} 
                    icon={TrendingUp} 
                    gradient={['#F59E0B', '#EF4444']} 
                    sub={`${stats.completed_leads} finalizados`} 
                />
                <KpiCard 
                    label="Atividades" 
                    value={(stats.calls || 0) + (stats.emails || 0) + (stats.whatsapp || 0)} 
                    icon={Activity} 
                    gradient={['#8B5CF6', '#EC4899']} 
                    sub="ligações + emails + wpp" 
                />
            </div>

            {/* ── Status Operacional Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <motion.div 
                    whileHover={{ scale: 1.02, y: -2 }}
                    onClick={() => onNavigateToTab && onNavigateToTab('monitoramento', 'operacao')}
                    className="cursor-pointer"
                >
                    <GlassCard className="p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-200/30 hover:border-emerald-400/50 transition-colors group">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
                                    <Zap size={24} />
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-slate-800 tracking-tight">{cadAtivas}</p>
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Cadências Ativas</p>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </GlassCard>
                </motion.div>

                <motion.div 
                    whileHover={{ scale: 1.02, y: -2 }}
                    onClick={() => onNavigateToTab && onNavigateToTab('monitoramento', 'operacao')}
                    className="cursor-pointer"
                >
                    <GlassCard className="p-6 bg-gradient-to-br from-rose-500/10 to-orange-500/5 border-rose-200/30 hover:border-rose-400/50 transition-colors group">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-slate-800 tracking-tight">{cadParadas}</p>
                                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Paradas &gt; 24h</p>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-rose-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </GlassCard>
                </motion.div>

                <motion.div 
                    whileHover={{ scale: 1.02, y: -2 }}
                    onClick={() => onNavigateToTab && onNavigateToTab('monitoramento', 'operacao')}
                    className="cursor-pointer"
                >
                    <GlassCard className="p-6 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-200/30 hover:border-blue-400/50 transition-colors group">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
                                    <CheckCircle2 size={24} />
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-slate-800 tracking-tight">{cadConcluidas}</p>
                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Concluídas</p>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-blue-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </GlassCard>
                </motion.div>
            </div>

            {/* ── Main Content Area ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Leads em Fluxo List */}
                <div className="lg:col-span-8">
                    <GlassCard className="h-full border-slate-100 bg-white/40">
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
                            {cadenceDashboard?.zona_progresso?.leads?.slice(0, 5).map((lead: any) => (
                                <div key={lead.id} className="flex items-center justify-between p-3 rounded-xl bg-white/60 border border-white shadow-sm hover:border-orange-200 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-black text-[10px]">
                                            {lead.lead_name?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-700">{lead.lead_name}</p>
                                            <p className="text-[9px] text-slate-400 font-bold">{lead.sdr_name} • Step {lead.step_atual}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="px-2 py-1 bg-slate-100 rounded text-[9px] font-black text-slate-500">
                                            {lead.horas_parada ? `${lead.horas_parada}h` : 'No prazo'}
                                        </div>
                                        <ChevronRight size={14} className="text-slate-300" />
                                    </div>
                                </div>
                            ))}
                            {(!cadenceDashboard?.zona_progresso?.leads || cadenceDashboard.zona_progresso.leads.length === 0) && (
                                <div className="text-center py-12 opacity-40 flex flex-col items-center">
                                    <Target size={32} className="text-slate-300 mb-2" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum agendamento pendente</p>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </div>

                {/* Right Area: SDRs Ativos + Estatísticas Full */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* SDRs Ativos */}
                    <GlassCard className="flex-1 border-slate-100 bg-white/40">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">SDRs Ativos no Período</h3>
                        <div className="space-y-4">
                            {sdrs.slice(0, 4).map(sdr => (
                                <div key={sdr.id} className="flex items-center justify-between group cursor-pointer" onClick={() => onNavigateToTab && onNavigateToTab('monitoramento', 'operacao')}>
                                    <div className="flex items-center gap-3">
                                        <UserAvatar 
                                            src={sdr.profile_picture_url} 
                                            name={sdr.full_name || sdr.email?.split('@')[0]} 
                                            size="xs" 
                                            className="font-black" 
                                        />
                                        <div>
                                            <p className="text-xs font-black text-slate-800 group-hover:text-blue-600 transition-colors truncate w-24">
                                                {sdr.full_name || sdr.email?.split('@')[0]}
                                            </p>
                                            <p className="text-[9px] text-slate-400 font-bold truncate">{(sdr as any).calls || 0} LIG | {(sdr as any).whatsapp || 0} WPP</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-slate-700">{(sdr as any).pending_leads || 0}</p>
                                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Leads</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    {/* Estatísticas Full Button Card Alternative */}
                    <motion.button
                        onClick={onOpenStats}
                        whileHover={{ scale: 1.02, y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        className="bg-white/80 backdrop-blur-2xl rounded-[2rem] border border-orange-200 shadow-xl shadow-orange-500/10 p-6 flex items-center gap-5 group transition-all text-left"
                    >
                        <div className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/40 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                            <TrendingUp size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                Estatísticas Full
                            </h3>
                            <p className="text-[9px] font-extrabold text-orange-500 uppercase tracking-widest mt-0.5 opacity-80">
                                Análise de Estratégias
                            </p>
                        </div>
                    </motion.button>
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
                    {activeSubTab === 'operacao' && <CadencesDashboard sdrId={sdrFilter} period={period as any} />}
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
    const [filter, setFilter] = useState<'all' | 'pending' | 'active'>('all');
    const leads = filter === 'pending' ? allLeads : filter === 'active' ? activeLeads : [...allLeads, ...activeLeads];

    return (
        <div className="space-y-4">
            {/* Filter pills */}
            <div className="flex items-center gap-2">
                {(['all', 'pending', 'active'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                            'px-4 py-2 rounded-full text-xs font-black transition-all border shadow-sm',
                            filter === f
                                ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white border-orange-500 shadow-orange-500/20'
                                : 'bg-gradient-soft text-slate-600 border-orange-200/60 hover:border-orange-300 hover:bg-orange-50/80'
                        )}
                        style={{ fontFamily: 'Comfortaa, cursive' }}
                    >
                        {f === 'all' ? `Todos (${allLeads.length + activeLeads.length})` : f === 'pending' ? `Pendentes (${allLeads.length})` : `Em Cadência (${activeLeads.length})`}
                    </button>
                ))}
            </div>

            {/* Table */}
            <GlassCard transparent className="p-0 overflow-hidden border-orange-200/60 bg-white/20 shadow-none">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-orange-100/60 bg-gradient-to-b from-orange-50/60 to-transparent">
                            <th className="px-5 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest" style={{ fontFamily: 'Comfortaa, cursive' }}>Lead</th>
                            <th className="px-5 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest">Empresa</th>
                            <th className="px-5 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest">Email</th>
                            <th className="px-5 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest">Status</th>
                            <th className="px-5 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest">Cadência</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-100/40">
                        {leads.length === 0 ? (
                            <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-600 font-bold text-sm">Nenhum lead encontrado</td></tr>
                        ) : leads.slice(0, 50).map((lead) => (
                            <tr key={lead.id} className="hover:bg-white/40 transition-colors">
                                <td className="px-5 py-3">
                                    <p className="font-bold text-slate-800 text-sm" style={{ fontFamily: 'Comfortaa, cursive' }}>{lead.full_name}</p>
                                    {lead.job_title && <p className="text-[10px] text-slate-600 font-bold mt-0.5">{lead.job_title}</p>}
                                </td>
                                <td className="px-5 py-3">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold">
                                        <Building2 size={12} className="text-slate-300" />
                                        {lead.company_name}
                                    </div>
                                </td>
                                <td className="px-5 py-3 text-xs text-slate-600 font-medium">{lead.email}</td>
                                <td className="px-5 py-3">
                                    <span className={cn(
                                        'px-2.5 py-1 rounded-full text-[10px] font-black border',
                                        lead.cadence_name
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                            : 'bg-amber-50 text-amber-600 border-amber-100'
                                    )}>
                                        {lead.cadence_name ? 'Em Cadência' : 'Pendente'}
                                    </span>
                                </td>
                                <td className="px-5 py-3 text-xs text-slate-600 font-bold">{lead.cadence_name || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {leads.length > 50 && (
                    <div className="px-5 py-3 bg-gradient-to-t from-orange-50/60 to-transparent border-t border-orange-100/60 text-center">
                        <p className="text-xs text-orange-400 font-bold uppercase tracking-wider">Mostrando 50 de {leads.length} leads</p>
                    </div>
                )}
            </GlassCard>
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
    columns: PipelineColumn[];
    selectedAuditSdrIds: string[];
    onToggleAuditSdr: (id: string) => void;
    onSendAudit: () => void;
    isSendingAudit: boolean;
}> = ({ sdrs, activeLeads, columns, selectedAuditSdrIds, onToggleAuditSdr, onSendAudit, isSendingAudit }) => {
    const [selectedSdr, setSelectedSdr] = useState<SDR | null>(null);

    const handleDragEnd = async (event: any) => {
        const { active, over } = event;
        if (!over || !selectedSdr) return;

        const leadId = active.id;
        const newColId = over.id;
        const lead = activeLeads.find(l => l.id === leadId);

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
    activeLeads.forEach(lead => {
        const sdrId = lead.assigned_sdr_id || 'unassigned';
        leadsBySdr.set(sdrId, [...(leadsBySdr.get(sdrId) || []), lead]);
    });

    const COLUMN_IDENTITY: Record<number, any> = {
        1: { gradient: ['#FF8C00', '#FF5722'], columnBg: 'bg-orange-100/20', icon: '🍊', label: 'Leads', subtitle: 'TRIAGEM INICIAL', accent: 'text-orange-500' },
        2: { gradient: ['#3B82F6', '#6366F1'], columnBg: 'bg-blue-100/20', icon: '📞', label: 'Chamada', subtitle: 'SCRIPT DESCOBERTA', accent: 'text-blue-500' },
        3: { gradient: ['#8B5CF6', '#EC4899'], columnBg: 'bg-violet-100/20', icon: '✉️', label: 'Email', subtitle: 'PROPOSTA E VALOR', accent: 'text-violet-500' },
        4: { gradient: ['#10B981', '#06B6D4'], columnBg: 'bg-emerald-100/20', icon: 'wpp', label: 'WhatsApp', subtitle: 'RELACIONAMENTO', accent: 'text-emerald-500' },
        5: { gradient: ['#EF4444', '#F97316'], columnBg: 'bg-red-100/20', icon: '🎯', label: 'Cadência', subtitle: 'FOLLOW-UP FINAL', accent: 'text-red-500' },
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
                    {selectedAuditSdrIds.length > 0 && (
                        <button onClick={onSendAudit} disabled={isSendingAudit} className={cn("text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all", isSendingAudit ? "bg-slate-100 text-slate-400" : "bg-orange-500 text-white shadow-lg")}>
                            Auditoria ({selectedAuditSdrIds.length})
                        </button>
                    )}
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
                                            identity={COLUMN_IDENTITY[col.position] || {}}
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
