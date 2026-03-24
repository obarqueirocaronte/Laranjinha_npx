import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, Calendar, Users, Target, Phone, Mail, MessageCircle,
    RefreshCw, X, Sparkles, LayoutDashboard,
    CheckCircle2, Handshake, Layers, Activity, Award,
    AlertTriangle, Zap, BarChart3
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { statsAPI } from '../../lib/api';

/* ─── Component ─── */
export const FullBIDashboard: React.FC<{
    onClose: () => void;
    sdrs: any[];
}> = ({ onClose, sdrs }) => {
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [sdrFilter, setSdrFilter] = useState('all');
    const [dateStart, setDateStart] = useState(() =>
        new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    );
    const [dateEnd, setDateEnd] = useState(() =>
        new Date().toISOString().split('T')[0]
    );

    useEffect(() => { fetchData(); }, [sdrFilter, dateStart, dateEnd]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await (statsAPI as any).getBIFullStats(
                sdrFilter === 'all' ? undefined : sdrFilter, 
                dateStart, 
                dateEnd
            );
            if (res.success) setData(res.data);
        } catch (_) { /* keep previous data */ }
        finally { setLoading(false); }
    };

    /* ── Derived data from API ── */
    const d = data || {};
    const kpis = [
        { label: 'Ligações',           value: d.total_calls       || 0, icon: Phone,        color: 'orange',  delta: d.total_calls > 0 },
        { label: 'E-mails',            value: d.total_emails      || 0, icon: Mail,         color: 'indigo',  delta: d.total_emails > 0 },
        { label: 'WhatsApp',           value: d.total_whatsapp    || 0, icon: MessageCircle, color: 'emerald', delta: d.total_whatsapp > 0 },
        { label: 'Reuniões',           value: d.total_meetings    || 0, icon: Handshake,    color: 'violet',  delta: d.total_meetings > 0 },
        { label: 'Cadências Concluídas', value: d.cadences_finished || 0, icon: CheckCircle2, color: 'teal', delta: d.cadences_finished > 0 },
        { label: 'Leads Trabalhados',  value: d.total_leads       || 0, icon: Users,        color: 'blue',    delta: d.total_leads > 0 },
    ];

    const timeline = useMemo(() => {
        if (!d.timeline?.length) return [];
        const map = new Map<string, any>();
        d.timeline.forEach((item: any) => {
            const key = new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            if (!map.has(key)) map.set(key, { date: key, calls: 0, meetings: 0, emails: 0, whatsapp: 0 });
            const e = map.get(key);
            if (item.type === 'call')     e.calls    += Number(item.count);
            if (item.type === 'meeting')  e.meetings += Number(item.count);
            if (item.type === 'email')    e.emails   += Number(item.count);
            if (item.type === 'whatsapp') e.whatsapp += Number(item.count);
        });
        return Array.from(map.values());
    }, [d.timeline]);

    const sdrPerf = useMemo(() => (d.sdr_performance || []).map((s: any) => ({
        name: s.full_name, calls: +s.calls || 0, emails: +s.emails || 0,
        whatsapp: +s.whatsapp || 0, meetings: +s.meetings || 0,
        cadences: +s.cadences_done || 0, cadences_active: +s.cadences_active || 0,
        rate: s.calls > 0 && s.meetings > 0 ? `${Math.round((s.meetings / s.calls) * 100)}%` : '—',
    })), [d.sdr_performance]);

    const pieData = useMemo(() => [
        { name: 'Ligações', value: d.total_calls || 0, color: '#f97316' },
        { name: 'WhatsApp', value: d.total_whatsapp || 0, color: '#10b981' },
        { name: 'E-mail',   value: d.total_emails || 0, color: '#6366f1' },
    ], [d.total_calls, d.total_whatsapp, d.total_emails]);

    const colorMap: Record<string, string> = {
        orange: '#f97316', indigo: '#6366f1', emerald: '#10b981', violet: '#8b5cf6',
        teal: '#14b8a6', blue: '#3b82f6',
    };
    const bgMap: Record<string, string> = {
        orange: 'bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200/50 text-orange-600',
        indigo: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200/50 text-indigo-600',
        emerald: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/50 text-emerald-600',
        violet: 'bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200/50 text-violet-600',
        teal: 'bg-gradient-to-br from-teal-50 to-teal-100/50 border-teal-200/50 text-teal-600',
        blue: 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50 text-blue-600',
    };

    const PAGES = [
        { label: 'Visão Geral', icon: LayoutDashboard },
        { label: 'Painel Operacional', icon: Activity },
        { label: 'Produtividade', icon: BarChart3 },
    ];

    return createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-6 md:p-12"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full h-full max-w-[1800px] bg-[#F8FAFC] flex flex-col relative rounded-[4rem] shadow-[0_50px_100px_rgba(0,0,0,0.15)] overflow-hidden border border-white"
            >
                {/* ── Background Blobs ── */}
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-200/30 blur-[120px] rounded-full -z-10" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-rose-200/30 blur-[120px] rounded-full -z-10" />

                {/* ── TOP BAR ── */}
                <div className="shrink-0 px-12 pt-10 pb-8 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-10 relative z-[100] shadow-sm">
                    {/* Brand */}
                    <div className="flex items-center gap-6 group">
                        <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-[#FF8225] via-[#EF4444] to-[#B22222] flex items-center justify-center text-white shadow-[0_12px_30px_rgba(239,68,68,0.25)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                            <TrendingUp size={32} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-slate-800 tracking-tighter leading-none" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                Deep <span className="bg-gradient-to-r from-orange-500 via-rose-500 to-rose-600 bg-clip-text text-transparent">Analytics</span>
                            </h1>
                            <div className="flex items-center gap-2 mt-3">
                                <div className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-[0.2em] border border-slate-200">Intelligence Console</div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" /> Live Monitoring
                                </p>
                            </div>
                        </div>
                    </div>

                {/* Page Tabs */}
                <div className="flex items-center bg-slate-50 border border-slate-200/60 rounded-3xl p-1 gap-1 shadow-inner h-14">
                    {PAGES.map((p, i) => (
                        <button
                            key={i}
                            onClick={() => setPage(i)}
                            className={`flex items-center gap-2 px-8 py-2.5 rounded-2xl text-[12px] font-black uppercase tracking-[0.1em] transition-all h-full ${
                                page === i
                                    ? 'bg-white text-orange-600 shadow-sm border border-slate-100 scale-[1.05]'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                            }`}
                        >
                            <p.icon size={16} strokeWidth={2.5} />
                            {p.label}
                        </button>
                    ))}
                </div>

                    <div className="flex items-center gap-6">
                        {/* SDR Pill */}
                        <div className="flex items-center gap-3 px-6 h-14 bg-white border border-slate-200 rounded-[1.5rem] shadow-sm group hover:shadow-md transition-all">
                            <Users size={18} className="text-orange-500" />
                            <select value={sdrFilter} onChange={e => setSdrFilter(e.target.value)} className="bg-transparent text-[11px] font-black text-slate-700 outline-none cursor-pointer uppercase tracking-widest">
                                <option value="all">Time Completo</option>
                                {sdrs.map(s => (<option key={s.id} value={s.id}>{s.full_name || s.email?.split('@')[0]}</option>))}
                            </select>
                        </div>

                        {/* Date Range Pill */}
                        <div className="flex items-center gap-2 pr-6 bg-white border border-slate-200 rounded-[1.5rem] shadow-sm hover:shadow-md h-14 transition-all group overflow-hidden">
                            <div className="h-full px-5 flex items-center gap-2 bg-slate-50 border-r border-slate-100">
                                <Calendar size={18} className="text-blue-500 group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="flex items-center gap-4 pl-3">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Período De</span>
                                    <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="bg-transparent text-[10px] font-black text-slate-800 outline-none uppercase" />
                                </div>
                                <div className="w-[1px] h-6 bg-slate-200" />
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Até</span>
                                    <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="bg-transparent text-[10px] font-black text-slate-800 outline-none uppercase" />
                                </div>
                            </div>
                        </div>

                        <button onClick={fetchData} className={`group w-14 h-14 rounded-2xl flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-orange-500 hover:shadow-lg transition-all ${loading ? 'animate-spin text-orange-400' : ''}`}>
                            <RefreshCw size={22} className="group-hover:rotate-180 transition-transform duration-500" />
                        </button>
                        
                        <button onClick={onClose} className="w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-900 text-white shadow-xl shadow-slate-900/40 hover:scale-105 hover:bg-black transition-all border-2 border-white/20">
                            <X size={26} />
                        </button>
                    </div>
                </div>

                {/* ── CONTENT ── */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-10 py-8">
                    <AnimatePresence mode="wait">
                        {page === 0 && <PageOverview key="p0" kpis={kpis} timeline={timeline} sdrPerf={sdrPerf} pieData={pieData} colorMap={colorMap} bgMap={bgMap} />}
                        {page === 1 && <PageOperational key="p1" data={d} />}
                        {page === 2 && <PageProductivity key="p2" sdrs={sdrPerf} timeline={timeline} />}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* ── Bottom Nav Dots ── */}
            <div className="shrink-0 flex items-center justify-center gap-2 py-4 border-t border-orange-100/50 bg-white/40 backdrop-blur-sm">
                {PAGES.map((_, i) => (
                    <button key={i} onClick={() => setPage(i)} className={`transition-all rounded-full ${page === i ? 'w-8 h-2.5 bg-orange-500' : 'w-2.5 h-2.5 bg-slate-200 hover:bg-slate-300'}`} />
                ))}
            </div>
        </motion.div>,
        document.body
    );
};

/* ── Mini Icon Block Helper ── */
function MiniKPI({ icon: Icon, label, value, color, sub }: { icon: any; label: string; value: string | number; color: string; sub?: string }) {
    return (
        <div className={`flex items-center gap-4 px-5 py-4 rounded-3xl border ${color} transition-all hover:shadow-lg hover:scale-[1.02] group cursor-pointer`}>
            <div className="w-11 h-11 rounded-[1.15rem] flex items-center justify-center border border-white/40 bg-white/40 shadow-sm transition-transform group-hover:scale-110">
                <Icon size={18} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] truncate mb-0.5">{label}</div>
                <div className="text-[22px] font-black text-slate-800 leading-none" style={{ fontFamily: 'Comfortaa, cursive' }}>{value}</div>
                {sub && <div className="text-[9px] font-bold opacity-60 mt-1 uppercase tracking-wider">{sub}</div>}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════
   PAGE 0 — Visão Geral (Real Data)
══════════════════════════════════════════ */
function PageOverview({ kpis, timeline, sdrPerf, pieData }: any) {
    return (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="p-12 space-y-12 w-full">
            {/* KPI Strip — Premium Glass Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {kpis.map((kpi: any, i: number) => {
                    const gradients: any = {
                        orange: ['#FF8225', '#EF4444'],
                        blue: ['#3B82F6', '#1E40AF'],
                        emerald: ['#10B981', '#064E3B'],
                        purple: ['#8B5CF6', '#5B21B6'],
                        green: ['#22C55E', '#166534'],
                        indigo: ['#6366F1', '#3730A3'],
                    };
                    const grad = gradients[kpi.color] || ['#94A3B8', '#475569'];

                    return (
                        <motion.div key={kpi.label} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
                            whileHover={{ y: -10, scale: 1.05 }}
                            className="relative p-8 rounded-[3rem] bg-white border border-slate-100 shadow-[0_10px_35px_rgba(0,0,0,0.03)] hover:shadow-[0_40px_80px_rgba(0,0,0,0.12)] transition-all cursor-pointer group overflow-hidden"
                        >
                            <div 
                                className="absolute -top-10 -right-10 w-32 h-32 blur-[40px] opacity-[0.07] rounded-full transition-all group-hover:opacity-[0.15] group-hover:scale-150" 
                                style={{ background: grad[0] }}
                            />
                            
                            <div className="relative flex flex-col h-full">
                                <div 
                                    className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl transition-all group-hover:rotate-12 group-hover:translate-x-1"
                                    style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}
                                >
                                    <kpi.icon size={28} strokeWidth={2.5} />
                                </div>
                                <div className="mt-8">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2">{kpi.label}</div>
                                    <div className="text-5xl font-black text-slate-900 leading-none tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>{kpi.value.toLocaleString()}</div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Chart Row */}
            <div className="grid grid-cols-12 gap-8">
                <div className="col-span-8 bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="relative z-10 flex items-center justify-between mb-10">
                        <div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>Fluxo de Performance</h3>
                            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.25em] mt-2">Interações diárias no período</p>
                        </div>
                        <div className="flex gap-5">
                            {[['Ligações', '#f97316'], ['Reuniões', '#6366f1'], ['WhatsApp', '#10b981']].map(([l, c]) => (
                                <div key={l} className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full" style={{ background: c as string }} />
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{l}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="h-[280px]">
                        {timeline.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={timeline} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                                    <defs>
                                        <linearGradient id="gCalls" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.15}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient>
                                        <linearGradient id="gMeets" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                                        <linearGradient id="gWA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} dy={8} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '13px', fontWeight: 700 }} />
                                    <Area type="monotone" dataKey="calls" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#gCalls)" name="Ligações" />
                                    <Area type="monotone" dataKey="meetings" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#gMeets)" name="Reuniões" />
                                    <Area type="monotone" dataKey="whatsapp" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#gWA)" name="WhatsApp" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : <div className="h-full flex items-center justify-center text-slate-400 font-bold text-sm">Sem dados de timeline no período</div>}
                    </div>
                </div>

                <div className="col-span-4 bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm flex flex-col relative overflow-hidden group">
                    <div className="absolute bottom-0 right-0 w-48 h-48 bg-slate-50 rounded-full blur-3xl -mr-24 -mb-24 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="relative z-10 mb-10">
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>Canais</h3>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.25em] mt-2">Mix de interações</p>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center">
                        {pieData.some((p: any) => p.value > 0) ? (
                            <PieChart width={190} height={190}>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                                    {pieData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                                </Pie>
                            </PieChart>
                        ) : <div className="text-slate-400 font-bold text-sm">Sem dados</div>}
                        <div className="flex flex-col gap-2.5 w-full mt-4">
                            {pieData.map((dd: any) => (
                                <div key={dd.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: dd.color }} />
                                        <span className="text-[13px] font-bold text-slate-600">{dd.name}</span>
                                    </div>
                                    <span className="text-[13px] font-black text-slate-800">{dd.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* SDR Leaderboard */}
            <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>Ranking de SDRs</h3>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.25em] mt-2">Performance por ligações, reuniões e fechamentos</p>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-xl text-amber-600 text-[11px] font-black uppercase tracking-wider">
                        <Award size={13} /> Ranking do Período
                    </div>
                </div>
                {sdrPerf.length > 0 ? (
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="pb-4 pr-3 text-[11px] font-black text-slate-400 uppercase tracking-wider w-8">#</th>
                            <th className="pb-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">SDR</th>
                            {['Ligações','E-mails','WhatsApp','Reuniões','Cadências','Taxa'].map(h => (
                                <th key={h} className="pb-4 px-4 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {sdrPerf.map((sdr: any, i: number) => (
                            <motion.tr key={sdr.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                                className="group hover:bg-slate-50/80 transition-colors"
                            >
                                <td className="py-4 pr-3">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${i === 0 ? 'bg-amber-400 text-amber-950' : i === 1 ? 'bg-slate-200 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>{i+1}</div>
                                </td>
                                <td className="py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white font-black text-sm shadow-sm">{sdr.name.charAt(0)}</div>
                                        <span className="text-[14px] font-black text-slate-800">{sdr.name}</span>
                                    </div>
                                </td>
                                {[sdr.calls, sdr.emails, sdr.whatsapp, sdr.meetings, sdr.cadences].map((val: number, j: number) => (
                                    <td key={j} className="py-4 px-4 text-center text-[15px] font-black text-slate-700">{val}</td>
                                ))}
                                <td className="py-4 px-4 text-center">
                                    <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg text-[12px] font-black">{sdr.rate}</span>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
                ) : <div className="text-center text-slate-400 font-bold py-8">Nenhum SDR ativo no período</div>}
            </div>
        </motion.div>
    );
}

/* ══════════════════════════════════════════
   PAGE 1 — Painel Operacional (Real Data)
══════════════════════════════════════════ */
function PageOperational({ data }: { data: any }) {
    const d = data || {};
    const criticalLeads: any[] = d.critical_leads || [];
    const steps: any[] = d.steps_breakdown || [];
    const outcomes: any[] = d.completion_outcomes || [];
    const batches: any[] = d.conversion_by_batch || [];
    const pipeline: any[] = d.pipeline_distribution || [];

    const totalOutcomes = outcomes.reduce((s: number, o: any) => s + o.count, 0);
    const wonCount = outcomes.find((o: any) => o.final_outcome === 'opportunity')?.count || 0;
    const rejCount = outcomes.find((o: any) => o.final_outcome === 'rejected')?.count || 0;
    const totalActiveSteps = steps.reduce((s: number, st: any) => s + st.lead_count, 0);

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8 space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-black text-slate-800" style={{ fontFamily: 'Comfortaa, cursive' }}>Painel Operacional</h2>
                <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest mt-1">Status de cadências e atividade de SDR</p>
            </div>

            {/* 3 Status Cards */}
            <div className="grid grid-cols-3 gap-6">
                {/* Zona Crítica */}
                <motion.div whileHover={{ y: -5 }} className="bg-white border border-red-100/60 rounded-[2.5rem] p-8 shadow-[0_10px_40px_rgba(239,68,68,0.05)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-100/30 blur-[60px] rounded-full group-hover:scale-125 transition-transform" />
                    <div className="relative">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 border border-red-200 flex items-center justify-center text-red-500 shadow-sm"><AlertTriangle size={24} strokeWidth={2.5} /></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Zona Crítica</h3>
                                <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.1em]">Gargalos Operacionais</p>
                            </div>
                        </div>
                        <div className="flex items-end justify-between mb-4">
                            <div className="text-5xl font-black text-red-500 tracking-tighter" style={{ fontFamily: 'Comfortaa, cursive' }}>{criticalLeads.length}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Leads em atraso</div>
                        </div>
                        {criticalLeads.length === 0 ? (
                            <div className="flex items-center gap-2 text-emerald-500 text-[13px] font-black bg-emerald-50/50 py-3 px-4 rounded-2xl border border-emerald-100"><CheckCircle2 size={16} /> Operação em dia</div>
                        ) : (
                            <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                                {criticalLeads.slice(0, 5).map((l: any) => (
                                    <div key={l.id} className="flex items-center justify-between text-[12px] px-4 py-3 bg-red-50/40 border border-red-100/50 rounded-2xl group/item hover:bg-red-50 transition-colors">
                                        <span className="font-bold text-slate-700 truncate">{l.lead_name}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                                            <span className="font-black text-red-600/70 uppercase text-[9px]">{l.sdr_name?.split(' ')[0]}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Em Andamento */}
                <motion.div whileHover={{ y: -5 }} className="bg-white border border-orange-100/60 rounded-[2.5rem] p-8 shadow-[0_10px_40px_rgba(249,115,22,0.05)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100/30 blur-[60px] rounded-full group-hover:scale-125 transition-transform" />
                    <div className="relative">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 flex items-center justify-center text-orange-500 shadow-sm"><Zap size={24} strokeWidth={2.5} /></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Em Andamento</h3>
                                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.1em]">Cadências Ativas</p>
                            </div>
                        </div>
                        <div className="flex items-end justify-between mb-4">
                            <div className="text-5xl font-black text-orange-500 tracking-tighter" style={{ fontFamily: 'Comfortaa, cursive' }}>{totalActiveSteps}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Fluxo produtivo</div>
                        </div>
                        <div className="space-y-3.5">
                            {steps.map((s: any) => (
                                <div key={s.step} className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Etapa {s.step}</span>
                                        <span className="text-[11px] font-black text-orange-600">{s.lead_count}</span>
                                    </div>
                                    <div className="h-2 bg-slate-50 border border-slate-100 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${totalActiveSteps > 0 ? (s.lead_count / totalActiveSteps) * 100 : 0}%` }}
                                            className="h-full bg-gradient-to-r from-orange-400 via-orange-500 to-rose-500 rounded-full" />
                                    </div>
                                </div>
                            ))}
                            {steps.length === 0 && <div className="text-[13px] text-slate-400 font-bold text-center py-6 bg-slate-50 border border-slate-100 rounded-2xl border-dashed">Aguardando novos leads</div>}
                        </div>
                    </div>
                </motion.div>

                {/* Concluídas */}
                <motion.div whileHover={{ y: -5 }} className="bg-white border border-emerald-100/60 rounded-[2.5rem] p-8 shadow-[0_10px_40px_rgba(16,185,129,0.05)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/30 blur-[60px] rounded-full group-hover:scale-125 transition-transform" />
                    <div className="relative">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-500 shadow-sm"><CheckCircle2 size={24} strokeWidth={2.5} /></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Resultados</h3>
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.1em]">Conversão de Funil</p>
                            </div>
                        </div>
                        <div className="text-5xl font-black text-emerald-500 tracking-tighter mb-4" style={{ fontFamily: 'Comfortaa, cursive' }}>{totalOutcomes}</div>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Total', val: totalOutcomes, color: 'emerald', bg: 'bg-emerald-50/60' },
                                { label: 'Oportunidade', val: wonCount, color: 'emerald', bg: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' },
                                { label: 'Fluxo Esgotado', val: totalOutcomes - wonCount - rejCount, color: 'amber', bg: 'bg-amber-50/60' },
                                { label: 'Rejeitados', val: rejCount, color: 'slate', bg: 'bg-slate-50/60' }
                            ].map((pill, idx) => (
                                <div key={idx} className={`px-4 py-4 rounded-2xl transition-all border border-transparent ${pill.bg} flex flex-col justify-center`}>
                                    <div className={`text-[9px] font-black uppercase tracking-widest ${pill.bg.includes('emerald-500') ? 'text-emerald-100' : 'text-slate-400'}`}>{pill.label}</div>
                                    <div className={`text-xl font-black ${pill.bg.includes('emerald-500') ? 'text-white' : 'text-slate-800'}`}>{pill.val}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Progresso Médio + Tempo Médio */}
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-white border border-slate-100 rounded-[2rem] p-7 shadow-sm flex items-center gap-8">
                    <div className="relative w-24 h-24 shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                            <circle cx="50" cy="50" r="42" fill="none" stroke="#f97316" strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${(d.avg_progress || 0) * 2.64} 264`} />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-xl font-black text-slate-800" style={{ fontFamily: 'Comfortaa, cursive' }}>{d.avg_progress || 0}%</div>
                    </div>
                    <div>
                        <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Progresso Médio</div>
                        <div className="text-[14px] font-bold text-slate-600">Média de avanço nas cadências ativas</div>
                    </div>
                </div>
                <div className="bg-white border border-slate-100 rounded-[2rem] p-7 shadow-sm flex items-center gap-8">
                    <div className="w-24 h-24 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                        <div className="text-center">
                            <div className="text-3xl font-black text-indigo-600" style={{ fontFamily: 'Comfortaa, cursive' }}>{d.avg_completion_hours || 0}</div>
                            <div className="text-[10px] font-black text-indigo-400 uppercase">horas</div>
                        </div>
                    </div>
                    <div>
                        <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Tempo Médio de Conclusão</div>
                        <div className="text-[14px] font-bold text-slate-600">Desde a atribuição até o encerramento</div>
                    </div>
                </div>
            </div>

            {/* Mini KPIs: Channel Distribution */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <MiniKPI icon={Phone} label="Ligações" value={d.total_calls || 0} color="bg-orange-50 border-orange-100 text-orange-600" />
                <MiniKPI icon={Mail} label="E-mails" value={d.total_emails || 0} color="bg-blue-50 border-blue-100 text-blue-600" />
                <MiniKPI icon={MessageCircle} label="WhatsApp" value={d.total_whatsapp || 0} color="bg-emerald-50 border-emerald-100 text-emerald-600" />
                <MiniKPI icon={Handshake} label="Reuniões" value={d.total_meetings || 0} color="bg-violet-50 border-violet-100 text-violet-600" />
                <MiniKPI icon={Target} label="Tx. Conversão" value={totalOutcomes > 0 ? `${Math.round((wonCount / totalOutcomes) * 100)}%` : '0%'} color="bg-amber-50 border-amber-100 text-amber-600" sub="won / total" />
            </div>

            {/* Pipeline + Batch Conversion */}
            <div className="grid grid-cols-12 gap-6">
                {/* Pipeline */}
                <div className="col-span-5 bg-white border border-slate-100 rounded-[2rem] p-7 shadow-sm">
                    <h3 className="text-[16px] font-black text-slate-800 mb-4" style={{ fontFamily: 'Comfortaa, cursive' }}>Pipeline</h3>
                    <div className="space-y-3">
                        {pipeline.map((p: any, i: number) => {
                            const max = Math.max(...pipeline.map((pp: any) => pp.count), 1);
                            return (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="text-[12px] font-black text-slate-500 uppercase w-20 truncate">{p.name}</span>
                                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-orange-400 to-rose-500 rounded-full transition-all" style={{ width: `${(p.count / max) * 100}%` }} />
                                    </div>
                                    <span className="text-[13px] font-black text-slate-700 w-8 text-right">{p.count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
                {/* Batch Conversion */}
                <div className="col-span-7 bg-white border border-slate-100 rounded-[2rem] p-7 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Layers size={16} className="text-orange-500" />
                        <h3 className="text-[16px] font-black text-slate-800" style={{ fontFamily: 'Comfortaa, cursive' }}>Conversão por Lote</h3>
                    </div>
                    {batches.length > 0 ? (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100">
                                {['Arquivo', 'Leads', 'Concluídas', 'Won', 'Taxa'].map(h => (
                                    <th key={h} className={`pb-3 text-[10px] font-black text-slate-400 uppercase tracking-wider ${h === 'Arquivo' ? 'text-left' : 'text-center'}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {batches.map((b: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-3 text-[13px] font-bold text-slate-700 max-w-[180px] truncate">{b.name || 'Sem nome'}</td>
                                    <td className="py-3 text-center text-[14px] font-black text-slate-700">{b.leads}</td>
                                    <td className="py-3 text-center text-[14px] font-black text-slate-700">{b.concluded}</td>
                                    <td className="py-3 text-center text-[14px] font-black text-emerald-600">{b.won}</td>
                                    <td className="py-3 text-center"><span className="px-2 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg text-[11px] font-black">{b.leads > 0 ? `${Math.round((b.won / b.leads) * 100)}%` : '0%'}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    ) : <div className="text-center text-slate-400 font-bold py-6">Nenhum lote importado</div>}
                </div>
            </div>
        </motion.div>
    );
}

/* ══════════════════════════════════════════
   PAGE 2 — Produtividade Granular
══════════════════════════════════════════ */
function PageProductivity({ sdrs, timeline }: any) {
    const [selectedSdr, setSelectedSdr] = useState<number>(0);
    const sdr = sdrs[selectedSdr] || sdrs[0] || { name: '—', calls: 0, emails: 0, whatsapp: 0, meetings: 0, cadences: 0, rate: '—' };

    const barData = useMemo(() => timeline.map((d: any) => ({
        date: d.date, Ligações: d.calls, WhatsApp: d.whatsapp, 'E-mails': d.emails,
    })), [timeline]);

    const totalInteractions = sdr.calls + sdr.emails + sdr.whatsapp;
    const prodItems = [
        { label: 'Ligações feitas', value: sdr.calls, icon: Phone, color: 'bg-orange-50 text-orange-600 border-orange-100', progress: Math.min((sdr.calls / Math.max(totalInteractions, 1)) * 100, 100) },
        { label: 'E-mails', value: sdr.emails, icon: Mail, color: 'bg-indigo-50 text-indigo-600 border-indigo-100', progress: Math.min((sdr.emails / Math.max(totalInteractions, 1)) * 100, 100) },
        { label: 'WhatsApp', value: sdr.whatsapp, icon: MessageCircle, color: 'bg-emerald-50 text-emerald-600 border-emerald-100', progress: Math.min((sdr.whatsapp / Math.max(totalInteractions, 1)) * 100, 100) },
        { label: 'Reuniões', value: sdr.meetings, icon: Handshake, color: 'bg-violet-50 text-violet-600 border-violet-100', progress: Math.min((sdr.meetings / Math.max(sdr.calls, 1)) * 100, 100) },
    ];

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8 space-y-8">
            {/* SDR Selector */}
            {sdrs.length > 0 && (
            <div className="bg-white/40 backdrop-blur-md border border-white/60 rounded-[2.5rem] p-6 shadow-sm flex items-center gap-5 overflow-x-auto no-scrollbar">
                <div className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] shrink-0 flex items-center gap-2.5 ml-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400"><Users size={16} /></div>
                    Filtrar SDR
                </div>
                <div className="flex items-center gap-3">
                    {sdrs.map((s: any, i: number) => (
                        <button key={i} onClick={() => setSelectedSdr(i)}
                            className={`group flex items-center gap-4 px-6 py-3.5 rounded-[1.75rem] border transition-all shrink-0 ${selectedSdr === i ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white border-transparent shadow-xl shadow-orange-500/25 scale-[1.05]' : 'bg-white border-white/80 text-slate-600 hover:border-orange-200/50 hover:bg-orange-50/30'}`}
                        >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm transition-transform group-hover:scale-110 shadow-sm ${selectedSdr === i ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-500'}`}>{s.name.charAt(0)}</div>
                            <div className="text-left">
                                <div className="text-[14px] font-black leading-none group-hover:translate-x-0.5 transition-transform">{s.name.split(' ')[0]}</div>
                                <div className={`text-[9px] font-black uppercase tracking-wider mt-1.5 opacity-60 ${selectedSdr === i ? 'text-white' : 'text-slate-400'}`}>{s.rate} COV.</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
            )}

            {/* 4 Big Metric Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                {prodItems.map((item: any, i: number) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                        whileHover={{ y: -5, scale: 1.02 }}
                        className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[2.5rem] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-all group overflow-hidden"
                    >
                        <div className={`absolute -top-10 -right-10 w-32 h-32 blur-[50px] opacity-10 rounded-full ${item.color.split(' ')[0]}`} />
                        <div className={`w-14 h-14 rounded-[1.25rem] border flex items-center justify-center mb-6 shadow-sm transition-transform group-hover:rotate-6 ${item.color}`}><item.icon size={24} strokeWidth={2.5} /></div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">{item.label}</div>
                        <div className="text-5xl font-black text-slate-800 leading-none mb-6 tracking-tighter" style={{ fontFamily: 'Comfortaa, cursive' }}>{item.value}</div>
                        <div className="h-3 bg-slate-100/50 border border-slate-100/50 rounded-full overflow-hidden p-0.5">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${item.progress}%` }}
                                transition={{ duration: 1, delay: 0.3 + i * 0.1, ease: 'easeOut' }}
                                className="h-full rounded-full bg-gradient-to-r from-orange-400 via-orange-500 to-rose-500 shadow-sm" />
                        </div>
                        <div className="flex justify-between mt-3 px-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Taxa de Ocupação</span>
                            <span className="text-[12px] font-black text-slate-700 tracking-tight">{Math.round(item.progress)}%</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Bar Chart + Executive Summary */}
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-8 bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
                    <h3 className="text-xl font-black text-slate-800 mb-1" style={{ fontFamily: 'Comfortaa, cursive' }}>Distribuição por Canal</h3>
                    <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-6">Volume diário de interações por tipo</p>
                    <div className="h-[260px]">
                        {barData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} barSize={10}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} dy={8} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '13px', fontWeight: 700 }} />
                                <Bar dataKey="Ligações" fill="#f97316" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="WhatsApp" fill="#10b981" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="E-mails" fill="#6366f1" radius={[6, 6, 0, 0]} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                            </BarChart>
                        </ResponsiveContainer>
                        ) : <div className="h-full flex items-center justify-center text-slate-400 font-bold">Sem dados</div>}
                    </div>
                </div>
                <div className="col-span-4 rounded-[2.5rem] p-8 glass-card border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.06)] flex flex-col gap-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-400/10 blur-[50px] rounded-full -z-10" />
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-black text-slate-800" style={{ fontFamily: 'Comfortaa, cursive' }}>Resumo Executivo</h3>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white shadow-lg">
                            <Sparkles size={18} />
                        </div>
                    </div>
                    {[
                        { label: '% Interação', value: sdr.total_leads_assigned > 0 ? `${Math.round(((sdr.calls + sdr.emails + sdr.whatsapp) / sdr.total_leads_assigned) * 100)}%` : '0%', highlight: false, icon: Activity, gradient: 'from-orange-500 to-amber-500' },
                        { label: '% Conversão', value: sdr.rate, highlight: true, icon: Target, gradient: 'from-orange-500 to-rose-500' },
                        { label: 'Reuniões Agendadas', value: sdr.meetings, highlight: false, icon: Handshake, gradient: 'from-indigo-500 to-blue-500' },
                        { label: 'Cadências Concluídas', value: sdr.cadences, highlight: false, icon: CheckCircle2, gradient: 'from-emerald-500 to-teal-500' },
                        { label: 'Total Interações', value: totalInteractions, highlight: false, icon: Zap, gradient: 'from-slate-700 to-slate-900' },
                    ].map((row: any, i: number) => (
                        <div key={i} className={`flex items-center justify-between px-6 py-5 rounded-[1.75rem] border transition-all hover:scale-[1.02] active:scale-[0.98] ${row.highlight ? `bg-gradient-to-r ${row.gradient} border-transparent text-white shadow-xl shadow-orange-500/20` : 'bg-white border-white/60 shadow-sm hover:shadow-lg hover:border-orange-200'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${row.highlight ? 'bg-white/20' : 'bg-slate-50 text-slate-400 group-hover:text-orange-500'}`}>
                                    <row.icon size={18} strokeWidth={2.5} />
                                </div>
                                <span className={`text-[13px] font-bold tracking-tight ${row.highlight ? 'text-white' : 'text-slate-600'}`}>{row.label}</span>
                            </div>
                            <span className={`text-xl font-black ${row.highlight ? 'text-white' : 'text-slate-800'}`}>{row.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
