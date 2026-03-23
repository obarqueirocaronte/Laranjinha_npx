import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, Calendar, Users, Target, Phone, Mail, MessageCircle,
    ArrowUpRight, ArrowDownRight, RefreshCw, X, Sparkles, LayoutDashboard,
    CheckCircle2, Handshake, Layers, Activity, Award, Tag, Filter,
    AlertTriangle, Zap, Clock, ArrowLeft, BarChart3, PieChart as PieIcon
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
                sdrFilter === 'all' ? undefined : sdrFilter, dateStart, dateEnd
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
        orange: 'bg-orange-50 border-orange-100 text-orange-600',
        indigo: 'bg-indigo-50 border-indigo-100 text-indigo-600',
        emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
        violet: 'bg-violet-50 border-violet-100 text-violet-600',
        teal: 'bg-teal-50 border-teal-100 text-teal-600',
        blue: 'bg-blue-50 border-blue-100 text-blue-600',
    };

    const PAGES = [
        { label: 'Visão Geral', icon: LayoutDashboard },
        { label: 'Painel Operacional', icon: Activity },
        { label: 'Produtividade', icon: BarChart3 },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="fixed inset-0 z-[10000] overflow-hidden flex flex-col"
            style={{ background: 'linear-gradient(145deg, #fdf8f3 0%, #fef5ea 40%, #fff9f4 100%)' }}
        >
            {/* ── TOP BAR ── */}
            <div className="shrink-0 px-8 pt-6 pb-5 border-b border-orange-100/70 bg-white/60 backdrop-blur-md flex items-center justify-between gap-6">
                {/* Back + Brand */}
                <div className="flex items-center gap-3 min-w-max">
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:text-orange-500 hover:border-orange-200 shadow-sm transition-all"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-orange-400/25 shrink-0">
                        <TrendingUp size={22} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none" style={{ fontFamily: 'Comfortaa, cursive' }}>
                            Estatísticas <span className="text-orange-500">Full</span>
                        </h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5 flex items-center gap-1.5">
                            <Sparkles size={10} className="text-orange-400" /> BI Operacional
                        </p>
                    </div>
                </div>

                {/* Page Tabs */}
                <div className="flex items-center bg-white border border-slate-200/70 rounded-2xl p-1 gap-1 shadow-sm">
                    {PAGES.map((p, i) => (
                        <button
                            key={i}
                            onClick={() => setPage(i)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-wider transition-all ${
                                page === i
                                    ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md shadow-orange-400/20 scale-[1.02]'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                            }`}
                        >
                            <p.icon size={14} />
                            {p.label}
                        </button>
                    ))}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm text-sm font-bold text-slate-700">
                        <Users size={15} className="text-slate-400" />
                        <select value={sdrFilter} onChange={e => setSdrFilter(e.target.value)} className="bg-transparent text-[13px] font-bold text-slate-700 outline-none cursor-pointer">
                            <option value="all">Todos SDRs</option>
                            {sdrs.map(s => (<option key={s.id} value={s.id}>{s.full_name || s.email?.split('@')[0]}</option>))}
                        </select>
                    </div>
                    <div className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                        <Calendar size={15} className="text-slate-400 shrink-0" />
                        <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="bg-transparent text-[13px] font-bold text-slate-700 outline-none w-[110px]" />
                        <span className="text-slate-300 font-bold">–</span>
                        <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="bg-transparent text-[13px] font-bold text-slate-700 outline-none w-[110px]" />
                        <button onClick={() => { const y = new Date(); y.setDate(y.getDate() - 1); const s = y.toISOString().split('T')[0]; setDateStart(s); setDateEnd(s); }}
                            className="ml-1 px-2.5 py-1 bg-orange-50 border border-orange-200 text-orange-600 rounded-lg text-[11px] font-black uppercase tracking-wider hover:bg-orange-100 transition-colors"
                        >Ontem</button>
                    </div>
                    <button onClick={fetchData} className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:text-orange-500 hover:border-orange-200 shadow-sm transition-all ${loading ? 'animate-spin text-orange-400' : ''}`}>
                        <RefreshCw size={16} />
                    </button>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50 border border-red-100 text-red-400 hover:bg-red-100 hover:text-red-600 shadow-sm transition-all">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* ── CONTENT ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                    {page === 0 && <PageOverview key="p0" kpis={kpis} timeline={timeline} sdrPerf={sdrPerf} pieData={pieData} colorMap={colorMap} bgMap={bgMap} />}
                    {page === 1 && <PageOperational key="p1" data={d} />}
                    {page === 2 && <PageProductivity key="p2" sdrs={sdrPerf} timeline={timeline} />}
                </AnimatePresence>
            </div>

            {/* ── Bottom Nav Dots ── */}
            <div className="shrink-0 flex items-center justify-center gap-2 py-4 border-t border-orange-100/50 bg-white/40 backdrop-blur-sm">
                {PAGES.map((_, i) => (
                    <button key={i} onClick={() => setPage(i)} className={`transition-all rounded-full ${page === i ? 'w-8 h-2.5 bg-orange-500' : 'w-2.5 h-2.5 bg-slate-200 hover:bg-slate-300'}`} />
                ))}
            </div>
        </motion.div>
    );
};

/* ── Mini Icon Block Helper ── */
function MiniKPI({ icon: Icon, label, value, color, sub }: { icon: any; label: string; value: string | number; color: string; sub?: string }) {
    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${color} transition-all hover:shadow-sm`}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center border bg-white/60 shadow-xs">
                <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">{label}</div>
                <div className="text-[18px] font-black text-slate-800 leading-none mt-0.5" style={{ fontFamily: 'Comfortaa, cursive' }}>{value}</div>
                {sub && <div className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">{sub}</div>}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════
   PAGE 0 — Visão Geral (Real Data)
══════════════════════════════════════════ */
function PageOverview({ kpis, timeline, sdrPerf, pieData, colorMap, bgMap }: any) {
    return (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="p-8 space-y-8">
            {/* KPI Strip — 6 blocks */}
            <div className="grid grid-cols-6 gap-4">
                {kpis.map((kpi: any, i: number) => (
                    <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        whileHover={{ y: -3 }}
                        className="bg-white border border-slate-100 rounded-[1.75rem] p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            style={{ background: `radial-gradient(circle at 70% 30%, ${colorMap[kpi.color]}10, transparent 60%)` }} />
                        <div className="flex items-start justify-between mb-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${bgMap[kpi.color]} shadow-sm`}>
                                <kpi.icon size={18} />
                            </div>
                            {kpi.delta && <div className="flex items-center gap-0.5 text-emerald-500 text-[10px] font-black"><ArrowUpRight size={10} />ativo</div>}
                        </div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{kpi.label}</div>
                        <div className="text-2xl font-black text-slate-800 leading-none" style={{ fontFamily: 'Comfortaa, cursive' }}>{kpi.value.toLocaleString()}</div>
                    </motion.div>
                ))}
            </div>

            {/* Chart Row */}
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-8 bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>Fluxo de Performance</h3>
                            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-1">Interações diárias no período</p>
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

                <div className="col-span-4 bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm flex flex-col">
                    <div className="mb-4">
                        <h3 className="text-xl font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>Canais</h3>
                        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-1">Mix de interações</p>
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
            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>Ranking de SDRs</h3>
                        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-1">Performance por ligações, reuniões e fechamentos</p>
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
                <motion.div whileHover={{ y: -3 }} className="bg-white border border-red-100/50 rounded-[2rem] p-7 shadow-sm relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-50/30 to-transparent" />
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500"><AlertTriangle size={22} /></div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800">Zona Crítica</h3>
                                <p className="text-[10px] font-black text-red-500 uppercase tracking-wider">Ações atrasadas (&gt;24h)</p>
                            </div>
                            <div className="ml-auto text-[11px] font-bold text-slate-400 uppercase">Leads Parados</div>
                        </div>
                        <div className="text-4xl font-black text-red-500 mb-3" style={{ fontFamily: 'Comfortaa, cursive' }}>{criticalLeads.length}</div>
                        {criticalLeads.length === 0 ? (
                            <div className="flex items-center gap-2 text-emerald-500 text-[12px] font-bold"><CheckCircle2 size={14} /> Nenhum gargalo</div>
                        ) : (
                            <div className="space-y-2 max-h-[120px] overflow-y-auto">
                                {criticalLeads.slice(0, 4).map((l: any) => (
                                    <div key={l.id} className="flex items-center justify-between text-[11px] px-3 py-2 bg-red-50/50 rounded-xl">
                                        <span className="font-bold text-slate-700 truncate">{l.lead_name}</span>
                                        <span className="font-black text-red-400 shrink-0 ml-2">{l.sdr_name?.split(' ')[0]}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Em Andamento */}
                <motion.div whileHover={{ y: -3 }} className="bg-white border border-orange-100/50 rounded-[2rem] p-7 shadow-sm relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 to-transparent" />
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500"><Zap size={22} /></div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800">Em Andamento</h3>
                                <p className="text-[10px] font-black text-orange-500 uppercase tracking-wider">Distribuição ativa</p>
                            </div>
                            <div className="ml-auto text-[11px] font-bold text-slate-400 uppercase">Leads em fluxo</div>
                        </div>
                        <div className="text-4xl font-black text-orange-500 mb-3" style={{ fontFamily: 'Comfortaa, cursive' }}>{totalActiveSteps}</div>
                        <div className="space-y-2">
                            {steps.map((s: any) => (
                                <div key={s.step} className="flex items-center justify-between px-3 py-2">
                                    <span className="text-[12px] font-black text-slate-600 uppercase">Step {s.step}</span>
                                    <div className="flex-1 mx-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-orange-400 to-rose-500 rounded-full" style={{ width: `${totalActiveSteps > 0 ? (s.lead_count / totalActiveSteps) * 100 : 0}%` }} />
                                    </div>
                                    <span className="text-[12px] font-black text-orange-500">{s.lead_count} leads</span>
                                </div>
                            ))}
                            {steps.length === 0 && <div className="text-[12px] text-slate-400 font-bold text-center py-4">Nenhuma cadência ativa</div>}
                        </div>
                    </div>
                </motion.div>

                {/* Concluídas */}
                <motion.div whileHover={{ y: -3 }} className="bg-white border border-emerald-100/50 rounded-[2rem] p-7 shadow-sm relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 to-transparent" />
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500"><CheckCircle2 size={22} /></div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800">Concluídas</h3>
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">Desempenho final</p>
                            </div>
                            <div className="ml-auto text-[11px] font-bold text-slate-400 uppercase">Taxa de sucesso</div>
                        </div>
                        <div className="text-4xl font-black text-emerald-500 mb-3" style={{ fontFamily: 'Comfortaa, cursive' }}>{totalOutcomes}</div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="px-3 py-2.5 bg-emerald-50/50 border border-emerald-100/50 rounded-xl text-center">
                                <div className="text-[10px] font-black text-slate-400 uppercase">Total</div>
                                <div className="text-[16px] font-black text-slate-800">{totalOutcomes}</div>
                            </div>
                            <div className="px-3 py-2.5 bg-emerald-50/50 border border-emerald-100/50 rounded-xl text-center">
                                <div className="text-[10px] font-black text-slate-400 uppercase">Won</div>
                                <div className="text-[16px] font-black text-emerald-600">{wonCount}</div>
                            </div>
                            <div className="px-3 py-2.5 bg-red-50/50 border border-red-100/50 rounded-xl text-center">
                                <div className="text-[10px] font-black text-slate-400 uppercase">Fluxo Esgotado</div>
                                <div className="text-[16px] font-black text-red-500">{totalOutcomes - wonCount - rejCount}</div>
                            </div>
                            <div className="px-3 py-2.5 bg-slate-50/50 border border-slate-100/50 rounded-xl text-center">
                                <div className="text-[10px] font-black text-slate-400 uppercase">Rejeitados</div>
                                <div className="text-[16px] font-black text-slate-600">{rejCount}</div>
                            </div>
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
            <div className="grid grid-cols-5 gap-4">
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
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex items-center gap-4 overflow-x-auto">
                <div className="text-[12px] font-black text-slate-400 uppercase tracking-widest shrink-0 flex items-center gap-2 mr-2"><Users size={14} /> Selecionar SDR:</div>
                {sdrs.map((s: any, i: number) => (
                    <button key={i} onClick={() => setSelectedSdr(i)}
                        className={`flex items-center gap-3 px-5 py-3 rounded-2xl border text-left transition-all shrink-0 ${selectedSdr === i ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white border-transparent shadow-lg shadow-orange-400/20' : 'bg-white border-slate-200 text-slate-700 hover:border-orange-200 hover:bg-orange-50'}`}
                    >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${selectedSdr === i ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-600'}`}>{s.name.charAt(0)}</div>
                        <div>
                            <div className="text-[13px] font-black leading-none">{s.name.split(' ')[0]}</div>
                            <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${selectedSdr === i ? 'text-orange-100' : 'text-slate-400'}`}>{s.rate} conv.</div>
                        </div>
                    </button>
                ))}
            </div>
            )}

            {/* 4 Big Metric Blocks */}
            <div className="grid grid-cols-4 gap-5">
                {prodItems.map((item: any, i: number) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                        className="bg-white border border-slate-100 rounded-[2rem] p-7 shadow-sm hover:shadow-md transition-all"
                    >
                        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-5 ${item.color}`}><item.icon size={22} /></div>
                        <div className="text-[12px] font-black text-slate-400 uppercase tracking-wider mb-2">{item.label}</div>
                        <div className="text-4xl font-black text-slate-800 leading-none mb-5" style={{ fontFamily: 'Comfortaa, cursive' }}>{item.value}</div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${item.progress}%` }}
                                transition={{ duration: 0.8, delay: 0.2 + i * 0.07, ease: 'easeOut' }}
                                className="h-full rounded-full bg-gradient-to-r from-orange-400 to-rose-500" />
                        </div>
                        <div className="flex justify-between mt-2">
                            <span className="text-[10px] font-bold text-slate-400">% do total</span>
                            <span className="text-[11px] font-black text-slate-600">{Math.round(item.progress)}%</span>
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
                <div className="col-span-4 bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm flex flex-col gap-4">
                    <h3 className="text-[16px] font-black text-slate-800" style={{ fontFamily: 'Comfortaa, cursive' }}>Resumo Executivo</h3>
                    {[
                        { label: 'Taxa de Conversão', value: sdr.rate, highlight: true },
                        { label: 'Total Interações', value: totalInteractions, highlight: false },
                        { label: 'Reunião por Ligação', value: sdr.calls > 0 ? `1 : ${Math.round(sdr.calls / Math.max(sdr.meetings, 1))}` : '—', highlight: false },
                        { label: 'E-mails por Lead', value: sdr.emails, highlight: false },
                        { label: 'WhatsApp por Lead', value: sdr.whatsapp, highlight: false },
                    ].map((row: any, i: number) => (
                        <div key={i} className={`flex items-center justify-between px-5 py-3.5 rounded-2xl border ${row.highlight ? 'bg-gradient-to-r from-orange-50 to-rose-50 border-orange-100' : 'bg-slate-50 border-slate-100'}`}>
                            <span className="text-[12px] font-bold text-slate-600">{row.label}</span>
                            <span className={`text-[15px] font-black ${row.highlight ? 'text-orange-600' : 'text-slate-800'}`}>{row.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
