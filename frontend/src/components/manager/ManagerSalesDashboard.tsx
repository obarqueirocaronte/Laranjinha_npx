import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Activity, Users, Target, Trophy, Eye,
    Settings, Phone, Mail, TrendingUp,
    Building2, Clock, Zap, ChevronRight, LogOut,
    Brain, Sparkles, Send, Calendar,
} from 'lucide-react';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';
import { cn } from '../../lib/utils';
import { leadsAPI, statsAPI, aiAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import type { Lead, PipelineColumn } from '../../types';
import { DndContext } from '@dnd-kit/core';
import { LeadCard } from '../kanban/LeadCard';
import { ProfileZone } from '../profile/ProfileZone';

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */
type TabId = 'resumo' | 'acompanhamento' | 'leads' | 'cadencias' | 'conquistas' | 'preview' | 'assistente';

interface SDR {
    id: string;
    email: string;
    role?: string;
    calls?: number;
    emails?: number;
    whatsapp?: number;
    completed_leads?: number;
    pending_leads?: number;
    pipeline_movements?: number;
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
    { id: 'acompanhamento', label: 'Acompanhamento', icon: Activity, color: '#3B82F6', colorTo: '#6366F1', subtitle: 'CONTROLE DE ATIVIDADES' },
    { id: 'leads', label: 'Leads', icon: Users, color: '#10B981', colorTo: '#059669', subtitle: 'GESTÃO DE BASE E FILTROS' },
    { id: 'cadencias', label: 'Cadências', icon: Target, color: '#8B5CF6', colorTo: '#EC4899', subtitle: 'ESTRATÉGIAS DE CONTATO' },
    { id: 'conquistas', label: 'Conquistas', icon: Trophy, color: '#F59E0B', colorTo: '#EF4444', subtitle: 'RANKING E RESULTADOS' },
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
}

export const ManagerSalesDashboard: React.FC<ManagerSalesDashboardProps> = ({ onAdminClick, onLogout }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabId>('resumo');
    const [showProfile, setShowProfile] = useState(false);

    // ── Shared data ──
    const [sdrs, setSdrs] = useState<SDR[]>([]);
    const [allLeads, setAllLeads] = useState<Lead[]>([]);
    const [activeLeads, setActiveLeads] = useState<Lead[]>([]);
    const [columns, setColumns] = useState<PipelineColumn[]>([]);
    const [stats, setStats] = useState({ calls: 0, emails: 0, whatsapp: 0, completed_leads: 0 });

    const fetchData = useCallback(async () => {
        try {
            const [sdrsRes, activeRes, pendingRes, colsRes, statsRes] = await Promise.allSettled([
                leadsAPI.getAllSDRs(),
                leadsAPI.getActiveLeads(),
                leadsAPI.getSegments('status', 'Novo'),
                leadsAPI.getColumns(),
                statsAPI.getGlobalStats(),
            ]);

            if (statsRes.status === 'fulfilled' && statsRes.value?.success) {
                const globalData = statsRes.value.data;
                setStats(globalData.summary || stats);

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

            if (activeRes.status === 'fulfilled' && activeRes.value?.success) setActiveLeads(activeRes.value.data || []);
            if (pendingRes.status === 'fulfilled' && pendingRes.value?.success) setAllLeads(pendingRes.value.data || []);
            if (colsRes.status === 'fulfilled' && colsRes.value?.success) setColumns(colsRes.value.data || []);
        } catch (e) {
            console.error('ManagerDashboard fetch error:', e);
        }
    }, [user, stats]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const currentTab = TABS.find(t => t.id === activeTab)!;

    return (
        <div className="h-full w-full max-w-7xl mx-auto flex gap-0 overflow-hidden bg-white/30 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(255,109,0,0.1)] rounded-[2.5rem] relative z-20">
            {/* ═══════ Sidebar ═══════ */}
            <aside
                className="w-[260px] shrink-0 flex flex-col py-8 px-5 border-r border-white/30 bg-white/20 relative z-10"
            >
                {/* ── User Profile Header ── */}
                <div
                    className="flex flex-col items-center text-center mb-10 px-2 cursor-pointer group"
                    onClick={() => setShowProfile(true)}
                    role="button"
                    tabIndex={0}
                >
                    <div className="relative group mb-5">
                        {/* Glow effect */}
                        <div className="absolute inset-[-4px] bg-gradient-to-br from-orange-400 to-rose-400 rounded-full blur-md opacity-30 group-hover:opacity-60 transition-opacity" />

                        <div className="relative w-[72px] h-[72px] rounded-full overflow-hidden border-[3px] border-white shadow-xl bg-gradient-to-br from-orange-100 to-rose-50">
                            {/* Dicebear Avatar */}
                            <img
                                src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user?.email || 'Manager'}&backgroundColor=transparent`}
                                alt="Manager Profile"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                        </div>
                    </div>
                    <div>
                        <h2
                            className="text-sm font-black text-slate-800 tracking-tight capitalize group-hover:text-orange-600 transition-colors"
                            style={{ fontFamily: 'Comfortaa, cursive' }}
                        >
                            {user?.email?.split('@')[0].replace(/[^a-zA-Z]/g, ' ') || 'Manager'}
                        </h2>
                        <div className="flex items-center justify-center gap-1.5 mt-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            <p
                                className="text-[9px] font-bold text-orange-500 uppercase tracking-widest"
                                style={{ fontFamily: 'Comfortaa, cursive' }}
                            >
                                Manager Profile
                            </p>
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
                                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
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
                        <div className="flex items-center gap-6 mb-10 pb-6 border-b border-white/50">
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
                                        <span className="text-slate-700 opacity-90">Manager</span>
                                        <span>{currentTab.label}</span>
                                    </h2>
                                    <p className="text-[11px] text-slate-500 font-extrabold mt-1 tracking-[0.1em] uppercase" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                        {currentTab.subtitle}
                                    </p>
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
                                    <ResumoTab stats={stats} activeLeads={activeLeads} allLeads={allLeads} sdrs={sdrs} />
                                )}
                                {activeTab === 'acompanhamento' && (
                                    <AcompanhamentoTab sdrs={sdrs} activeLeads={activeLeads} />
                                )}
                                {activeTab === 'leads' && (
                                    <LeadsTab allLeads={allLeads} activeLeads={activeLeads} />
                                )}
                                {activeTab === 'cadencias' && (
                                    <CadenciasTab activeLeads={activeLeads} />
                                )}
                                {activeTab === 'conquistas' && (
                                    <ConquistasTab stats={stats} sdrs={sdrs} activeLeads={activeLeads} />
                                )}
                                {activeTab === 'preview' && (
                                    <PreviewTab sdrs={sdrs} activeLeads={activeLeads} columns={columns} />
                                )}
                                {activeTab === 'assistente' && (
                                    <AssistenteTab allLeads={allLeads} activeLeads={activeLeads} sdrs={sdrs} />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </>
                )}
            </main>
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
}> = ({ children, className, gradient, transparent }) => (
    <motion.div
        whileHover={{ scale: 1.01, y: -2 }}
        className={cn(
            'rounded-[2rem] border p-6 transition-all duration-300 overflow-hidden',
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
}> = ({ label, value, icon: Icon, gradient, sub }) => (
    <GlassCard gradient={gradient} className="relative overflow-hidden group shadow-md shadow-slate-900/10">
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
}> = ({ stats, activeLeads, allLeads, sdrs }) => {
    const totalLeads = allLeads.length + activeLeads.length;
    const inCadence = activeLeads.length;
    const conversionRate = totalLeads > 0 ? Math.round((stats.completed_leads / totalLeads) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Total de Leads" value={totalLeads} icon={Users} gradient={['#3B82F6', '#6366F1']} sub={`${allLeads.length} pendentes`} />
                <KpiCard label="Em Cadência" value={inCadence} icon={Zap} gradient={['#10B981', '#059669']} sub={`${sdrs.length} SDRs ativos`} />
                <KpiCard label="Conversão" value={`${conversionRate}%`} icon={TrendingUp} gradient={['#F59E0B', '#EF4444']} sub={`${stats.completed_leads} finalizados`} />
                <KpiCard label="Atividades" value={stats.calls + stats.emails + stats.whatsapp} icon={Activity} gradient={['#8B5CF6', '#EC4899']} sub="ligações + emails + wpp" />
            </div>

            {/* Activity breakdown */}
            <div className="grid grid-cols-3 gap-5">
                <GlassCard className="flex items-center gap-5 hover:border-blue-300/50 hover:shadow-blue-500/10 transition-all cursor-default">
                    <div className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-white shadow-xl bg-gradient-to-br from-blue-500 to-indigo-600 border-[3px] border-white ring-4 ring-blue-50">
                        <Phone size={22} strokeWidth={2.5} />
                    </div>
                    <div>
                        <p className="text-4xl font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>{stats.calls}</p>
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Ligações Feitas</p>
                    </div>
                </GlassCard>
                <GlassCard className="flex items-center gap-5 hover:border-purple-300/50 hover:shadow-purple-500/10 transition-all cursor-default">
                    <div className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-white shadow-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 border-[3px] border-white ring-4 ring-purple-50">
                        <Mail size={22} strokeWidth={2.5} />
                    </div>
                    <div>
                        <p className="text-4xl font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>{stats.emails}</p>
                        <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">E-mails Enviados</p>
                    </div>
                </GlassCard>
                <GlassCard className="flex items-center gap-5 hover:border-emerald-300/50 hover:shadow-emerald-500/10 transition-all cursor-default">
                    <div className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-white shadow-xl bg-gradient-to-br from-emerald-500 to-teal-600 border-[3px] border-white ring-4 ring-emerald-50">
                        <WhatsAppIcon size={24} />
                    </div>
                    <div>
                        <p className="text-4xl font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>{stats.whatsapp}</p>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">WhatsApp</p>
                    </div>
                </GlassCard>
            </div>

            {/* Quick SDR status */}
            {sdrs.length > 0 && (
                <GlassCard>
                    <h3 className="text-sm font-black text-slate-700 mb-4" style={{ fontFamily: 'Comfortaa, cursive' }}>
                        SDRs Ativos
                    </h3>
                    <div className="space-y-3">
                        {sdrs.map((sdr) => {
                            const sdrLeads = activeLeads.filter(l => l.assigned_sdr_id === sdr.id);
                            return (
                                <div key={sdr.id} className="flex items-center justify-between py-3 px-4 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all hover:border-orange-200 hover:shadow-md">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-black shadow-md border-2 border-white">
                                            {sdr.email?.charAt(0).toUpperCase() || 'S'}
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 capitalize" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                            {sdr.email?.split('@')[0].replace(/[^a-zA-Z]/g, ' ') || 'SDR'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 shadow-sm uppercase tracking-wider">
                                            {sdrLeads.length} leads
                                        </span>
                                        <ChevronRight size={16} className="text-slate-300 group-hover:text-orange-400" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </GlassCard>
            )}
        </div>
    );
};

/* ═══════════════════════════════════════════
   Tab: Acompanhamento
   ═══════════════════════════════════════════ */
const AcompanhamentoTab: React.FC<{
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
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-black shadow-sm">
                                            {sdr.email?.charAt(0).toUpperCase()}
                                        </div>
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
const CadenciasTab: React.FC<{
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
const ConquistasTab: React.FC<{
    stats: any;
    sdrs: SDR[];
    activeLeads: Lead[];
}> = ({ stats, sdrs, activeLeads }) => {
    // Mock leaderboard based on distributed stats
    const leaderboard = sdrs.map((sdr, i) => ({
        ...sdr,
        completed: Math.max(0, Math.floor(stats.completed_leads / Math.max(sdrs.length, 1)) + (i === 0 ? 2 : 0)),
        leads: activeLeads.filter(l => l.assigned_sdr_id === sdr.id).length,
    })).sort((a, b) => b.completed - a.completed);

    const medals = ['🥇', '🥈', '🥉'];

    return (
        <div className="space-y-6">
            {/* Trophy banner */}
            <GlassCard gradient={['#FFD700', '#FFA500']} className="text-center relative overflow-hidden py-8">
                <div className="absolute inset-0 bg-white/10 pointer-events-none" />
                <div className="relative z-10">
                    <Trophy size={48} className="mx-auto text-white/90 mb-3 drop-shadow-lg" />
                    <h3 className="text-3xl font-black text-white drop-shadow-md" style={{ fontFamily: 'Comfortaa, cursive' }}>
                        {stats.completed_leads}
                    </h3>
                    <p className="text-sm font-bold text-white/80 mt-1" style={{ fontFamily: 'Comfortaa, cursive' }}>
                        Leads Finalizados no Total
                    </p>
                </div>
            </GlassCard>

            {/* Leaderboard */}
            <GlassCard>
                <h3 className="text-sm font-black text-slate-700 mb-4" style={{ fontFamily: 'Comfortaa, cursive' }}>
                    🏆 Ranking de SDRs
                </h3>
                <div className="space-y-3">
                    {leaderboard.length === 0 ? (
                        <p className="text-center text-slate-600 font-bold py-8">Nenhum SDR encontrado</p>
                    ) : leaderboard.map((sdr, i) => (
                        <motion.div
                            key={sdr.id}
                            whileHover={{ scale: 1.02, x: 4 }}
                            className={cn(
                                'flex items-center justify-between px-4 py-3 rounded-2xl border transition-all shadow-sm',
                                i === 0 ? 'bg-gradient-to-r from-amber-100/80 to-amber-50/40 border-amber-300/60 shadow-amber-500/10' :
                                    i === 1 ? 'bg-gradient-to-r from-slate-100/80 to-slate-50/40 border-slate-300/60' :
                                        i === 2 ? 'bg-gradient-to-r from-orange-100/80 to-orange-50/40 border-orange-300/60' :
                                            'bg-gradient-soft border-orange-100/60'
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <span className="text-2xl leading-none">{medals[i] || `#${i + 1}`}</span>
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-black shadow-sm">
                                    {sdr.email?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-black text-sm text-slate-800" style={{ fontFamily: 'Comfortaa, cursive' }}>{sdr.email?.split('@')[0]}</p>
                                    <p className="text-[10px] text-slate-600 font-bold">{sdr.leads} leads ativos</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-black text-slate-800" style={{ fontFamily: 'Comfortaa, cursive' }}>{sdr.completed}</p>
                                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Finalizados</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </GlassCard>
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
}> = ({ sdrs, activeLeads, columns }) => {
    const [selectedSdr, setSelectedSdr] = useState<SDR | null>(null);

    // Group leads for all active leads to distribute among SDRs
    const leadsBySdr = new Map<string, Lead[]>();
    activeLeads.forEach(lead => {
        const sdrId = lead.assigned_sdr_id || 'unassigned';
        leadsBySdr.set(sdrId, [...(leadsBySdr.get(sdrId) || []), lead]);
    });

    const COLUMN_IDENTITY: Record<number, any> = {
        1: {
            gradient: ['#FF8C00', '#FF5722'],
            cardBg: 'bg-orange-50/90 border-orange-200/50',
            columnBg: 'bg-orange-100/20',
            shadow: 'shadow-orange-300/30',
            ring: 'ring-orange-300/40',
            icon: '🍊',
            label: 'Leads',
            subtitle: 'TRIAGEM INICIAL',
            accent: 'text-orange-500'
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
            accent: 'text-blue-500'
        },
        3: {
            gradient: ['#8B5CF6', '#EC4899'],
            cardBg: 'bg-violet-50/90 border-violet-200/50',
            columnBg: 'bg-violet-100/20',
            shadow: 'shadow-violet-300/30',
            ring: 'ring-violet-300/40',
            icon: '✉️',
            label: 'Email',
            subtitle: 'PROPOSTA E VALOR',
            accent: 'text-violet-500'
        },
        4: {
            gradient: ['#10B981', '#06B6D4'],
            cardBg: 'bg-emerald-50/90 border-emerald-200/50',
            columnBg: 'bg-emerald-100/20',
            shadow: 'shadow-emerald-300/30',
            ring: 'ring-emerald-300/40',
            icon: 'wpp',
            label: 'WhatsApp',
            subtitle: 'RELACIONAMENTO',
            accent: 'text-emerald-500'
        },
        5: {
            gradient: ['#EF4444', '#F97316'],
            cardBg: 'bg-red-50/90 border-red-200/50',
            columnBg: 'bg-red-100/20',
            shadow: 'shadow-red-300/30',
            ring: 'ring-red-300/40',
            icon: '🎯',
            label: 'Cadência',
            subtitle: 'FOLLOW-UP FINAL',
            accent: 'text-red-500'
        },
    };

    const WppIconInline = ({ size = 20 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.031 0A12.03 12.03 0 0 0 0 12c0 2.124.553 4.195 1.603 6L.513 24l6.15-1.58A11.96 11.96 0 0 0 12.031 24c6.626 0 12-5.373 12-12S18.658 0 12.031 0zm0 21.996c-1.782 0-3.529-.462-5.071-1.336l-.364-.206-3.766.968 1.004-3.606-.23-.352A9.998 9.998 0 0 1 2.032 12c0-5.485 4.542-9.946 10-9.946s10 4.461 10 9.946-4.542 9.946-10 9.946zm5.424-7.408c-.297-.146-1.755-.845-2.025-.941-.271-.097-.468-.146-.665.146-.197.293-.765.941-.937 1.134-.173.193-.346.218-.643.073-.297-.146-1.252-.451-2.385-1.44-.881-.769-1.477-1.719-1.649-2.013-.173-.293-.018-.45.129-.596.133-.131.297-.338.445-.506.148-.168.197-.291.296-.484.099-.193.05-.366-.024-.512-.074-.146-.665-1.564-.911-2.14-.24-.564-.485-.487-.665-.497-.172-.009-.37-.012-.568-.012s-.518.073-.789.366c-.272.293-1.037.985-1.037 2.4 0 1.415 1.062 2.782 1.21 2.977.149.195 2.072 3.09 5.02 4.331.7.293 1.246.468 1.673.599.704.215 1.345.184 1.849.112.564-.08 1.755-.698 2.003-1.373.247-.675.247-1.252.173-1.373-.075-.122-.273-.195-.57-.342z" />
        </svg>
    );

    const orderedColumns = columns.length > 0 ? columns.sort((a, b) => a.position - b.position) : [
        { id: 'c1', name: 'Leads', position: 1, color: '#FF8C00' },
        { id: 'c2', name: 'Chamada', position: 2, color: '#3B82F6' },
        { id: 'c3', name: 'Email', position: 3, color: '#8B5CF6' },
        { id: 'c4', name: 'WhatsApp', position: 4, color: '#10B981' },
        { id: 'c5', name: 'Cadência', position: 5, color: '#EF4444' },
    ];

    /** Modal View Renderer */
    const renderModalKanban = () => {
        if (!selectedSdr) return null;
        const myLeads = leadsBySdr.get(selectedSdr.id) || [];
        const myColumnMap = new Map<string, Lead[]>();
        myLeads.forEach(lead => {
            const colId = lead.current_column_id || 'unknown';
            myColumnMap.set(colId, [...(myColumnMap.get(colId) || []), lead]);
        });

        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 sm:p-8"
                onClick={() => setSelectedSdr(null)}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.95, y: 10, opacity: 0 }}
                    transition={springPop}
                    className="w-full max-w-5xl h-[75vh] bg-slate-50 border border-white/20 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* macOS styling header */}
                    <div className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0">
                        <div className="flex gap-2 items-center">
                            <button onClick={() => setSelectedSdr(null)} className="w-3.5 h-3.5 rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-inner" />
                            <div className="w-3.5 h-3.5 rounded-full bg-amber-400 shadow-inner" />
                            <div className="w-3.5 h-3.5 rounded-full bg-green-500 shadow-inner" />
                        </div>
                        <h3 className="text-sm font-black text-slate-700 absolute left-1/2 -translate-x-1/2" style={{ fontFamily: 'Comfortaa, cursive' }}>
                            Pipeline: {selectedSdr.email?.split('@')[0]}
                        </h3>
                        <div className="w-10"></div>
                    </div>

                    {/* Detailed Kanban View */}
                    <div className="flex-1 flex gap-4 md:gap-5 overflow-x-auto p-4 sm:p-5 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiNlNGRlNTQiLz48L3N2Zz4=')] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                        {orderedColumns.map((col) => {
                            const colLeads = myColumnMap.get(col.id) || [];
                            const tok = COLUMN_IDENTITY[col.position] ?? COLUMN_IDENTITY[1];

                            return (
                                <div key={col.id} className={cn("w-[270px] shrink-0 flex flex-col h-full rounded-2xl p-1.5 transition-all duration-300 backdrop-blur-md border border-white/60 shadow-lg relative", tok.columnBg, tok.shadow)}>

                                    {/* ── Header ── */}
                                    <div className="relative mb-4 shrink-0 px-1">
                                        <div
                                            className="rounded-2xl px-4 py-3.5 flex items-center gap-3 bg-white/60 backdrop-blur-md border border-white/80 shadow-sm"
                                        >
                                            <div
                                                className="w-9 h-9 rounded-xl flex items-center justify-center bg-white shadow-sm border border-slate-100"
                                                style={{ color: tok.gradient[0] }}
                                            >
                                                <span className="text-lg leading-none select-none drop-shadow-sm">
                                                    {tok.icon === 'wpp' ? <WppIconInline size={18} /> : tok.icon}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <h3
                                                    className="font-black text-xs text-slate-800 tracking-tight leading-none"
                                                    style={{ fontFamily: 'Comfortaa, cursive' }}
                                                >
                                                    {col.name}
                                                </h3>
                                                <p className="text-[8px] text-slate-500 font-extrabold mt-1 tracking-wider uppercase truncate" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                                    {tok.subtitle}
                                                </p>
                                            </div>
                                        </div>
                                        <span
                                            className="absolute -top-2 -right-1 min-w-[20px] h-[20px] px-1 flex items-center justify-center rounded-full text-[9px] font-black shadow-md border-[2px] border-white/60 text-white"
                                            style={{ background: `linear-gradient(135deg, ${tok.gradient[0]}, ${tok.gradient[1]})`, fontFamily: 'Comfortaa, cursive' }}
                                        >
                                            {colLeads.length}
                                        </span>
                                    </div>

                                    <div className="flex-1 overflow-y-auto space-y-3 pb-3 px-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300/50 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                                        <DndContext>
                                            {colLeads.map(lead => (
                                                <LeadCard key={lead.id} lead={lead} columnPosition={col.position} />
                                            ))}
                                        </DndContext>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            </motion.div>
        );
    };
    return (
        <div className="space-y-6 relative h-full flex flex-col z-0">
            {/* Modal Overlay Render - Elevated Z-Index utilizing Portal */}
            {createPortal(
                <AnimatePresence>
                    {renderModalKanban()}
                </AnimatePresence>,
                document.body
            )}

            <h3 className="text-sm font-bold text-slate-600 tracking-widest uppercase" style={{ fontFamily: 'Comfortaa, cursive' }}>
                Visão Geral das Operações
            </h3>

            {/* Grid of SDRs Minimaps */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {sdrs.map(sdr => {
                    const myLeads = leadsBySdr.get(sdr.id) || [];

                    return (
                        <motion.div
                            key={sdr.id}
                            whileHover={{ scale: 1.02, y: -4 }}
                            onClick={() => setSelectedSdr(sdr)}
                            className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-orange-100 transition-all p-6 cursor-pointer group"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center text-white font-black shadow-md border-2 border-white">
                                        {sdr.email?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-black text-sm text-slate-800 tracking-tight capitalize" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                            {sdr.email?.split('@')[0].replace(/[^a-zA-Z]/g, ' ')}
                                        </p>
                                        <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wider">{myLeads.length} leads</p>
                                    </div>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                                    <Eye size={16} strokeWidth={2.5} />
                                </div>
                            </div>

                            {/* Ultra Mini Kanban Bars */}
                            <div className="flex items-end gap-1.5 h-16 w-full">
                                {orderedColumns.map(col => {
                                    const count = myLeads.filter(l => l.current_column_id === col.id).length;
                                    const maxCount = Math.max(...orderedColumns.map(c => myLeads.filter(l => l.current_column_id === c.id).length), 1);
                                    const heightPercent = count === 0 ? 8 : (count / maxCount) * 100;
                                    const tok = COLUMN_IDENTITY[col.position] ?? COLUMN_IDENTITY[1];
                                    const grad = tok.gradient;

                                    return (
                                        <div key={col.id} className="flex-1 flex flex-col justify-end items-center gap-2 group/bar">
                                            <span className="text-[10px] font-black text-slate-300 group-hover/bar:text-slate-600 transition-colors">{count}</span>
                                            <div
                                                className="w-full rounded-md shadow-sm opacity-60 group-hover/bar:opacity-100 transition-all"
                                                style={{
                                                    height: `${heightPercent}%`,
                                                    background: `linear-gradient(to top, ${grad[1]}, ${grad[0]})`
                                                }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    );
                })}
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
            const contextData = {
                source: dataSource,
                selectedItems,
                summary: {
                    total_leads: allLeads.length + activeLeads.length,
                    active_in_cadence: activeLeads.length,
                    sdrs_count: sdrs.length,
                    leads_sample: activeLeads.slice(0, 50).map(l => ({ name: l.full_name, company: l.company_name, cadence: l.cadence_name, status: (l as any).current_column }))
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
