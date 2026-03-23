import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, Calendar, Users, Target, Phone,
    ArrowUpRight, ArrowDownRight, RefreshCw, X, Sparkles, LayoutDashboard,
    CheckCircle2, Handshake, Layers, Activity, Award, Tag, Filter
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { statsAPI } from '../../lib/api';

/* ─── Seed data for empty states / demo ─── */
const SEED_TIMELINE = [
    { date: '10/03', calls: 18, meetings: 4, whatsapp: 12, emails: 8 },
    { date: '11/03', calls: 22, meetings: 6, whatsapp: 15, emails: 11 },
    { date: '12/03', calls: 31, meetings: 9, whatsapp: 20, emails: 14 },
    { date: '13/03', calls: 14, meetings: 3, whatsapp: 8,  emails: 6 },
    { date: '14/03', calls: 27, meetings: 7, whatsapp: 18, emails: 13 },
    { date: '17/03', calls: 35, meetings: 11, whatsapp: 22, emails: 17 },
    { date: '18/03', calls: 28, meetings: 8, whatsapp: 16, emails: 10 },
    { date: '19/03', calls: 41, meetings: 13, whatsapp: 29, emails: 20 },
    { date: '20/03', calls: 33, meetings: 10, whatsapp: 21, emails: 15 },
    { date: '21/03', calls: 19, meetings: 5, whatsapp: 11, emails: 9 },
    { date: '24/03', calls: 38, meetings: 12, whatsapp: 25, emails: 18 },
];

const SEED_SDR = [
    { name: 'Marília Santos', calls: 142, meetings: 38, cadences: 24, deals: 12, rate: '31%', trend: 'up' },
    { name: 'João Vitor', calls: 118, meetings: 29, cadences: 19, deals: 9, rate: '24%', trend: 'up' },
    { name: 'Ana Lima', calls: 97, meetings: 22, cadences: 16, deals: 7, rate: '22%', trend: 'down' },
    { name: 'Carlos Mendes', calls: 85, meetings: 18, cadences: 13, deals: 5, rate: '21%', trend: 'up' },
    { name: 'Fernanda Rocha', calls: 73, meetings: 14, cadences: 10, deals: 4, rate: '19%', trend: 'down' },
];

const SEED_CAMPAIGNS = [
    { name: 'Prospecção Inverno', leads: 230, contatos: 148, reunioes: 32, fechamentos: 11, rate: '34%' },
    { name: 'Reativação B2B', leads: 185, contatos: 110, reunioes: 24, fechamentos: 7, rate: '29%' },
    { name: 'Indicações Q1', leads: 124, contatos: 98, reunioes: 21, fechamentos: 9, rate: '43%' },
    { name: 'Outbound Digital', leads: 310, contatos: 172, reunioes: 28, fechamentos: 6, rate: '21%' },
    { name: 'Parceiros 2026', leads: 87, contatos: 52, reunioes: 14, fechamentos: 5, rate: '36%' },
];

const SEED_TAGS = [
    { tag: '🔥 Quente', leads: 78, taxa: '52%', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
    { tag: '💼 Decisor', leads: 48, taxa: '41%', bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
    { tag: '📞 Retorno', leads: 134, taxa: '28%', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    { tag: '🏢 Enterprise', leads: 32, taxa: '38%', bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100' },
    { tag: '🌱 Novo', leads: 211, taxa: '12%', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
];

const SEED_MEETINGS = [
    { lead: 'Rodrigo Dantas', company: 'TechVision', sdr: 'Marília', time: '09:30', date: 'Hoje', status: 'realizada', outcome: 'oportunidade' },
    { lead: 'Paula Ferreira', company: 'DataCore LTDA', sdr: 'João Vitor', time: '11:00', date: 'Hoje', status: 'agendada', outcome: null },
    { lead: 'Bruno Almeida', company: 'NexusFlow', sdr: 'Ana Lima', time: '14:30', date: 'Amanhã', status: 'agendada', outcome: null },
    { lead: 'Clarice Ramos', company: 'Structa Group', sdr: 'Marília', time: '15:00', date: 'Amanhã', status: 'agendada', outcome: null },
    { lead: 'Tiago Vieira', company: 'InfoBolt', sdr: 'Carlos', time: '10:00', date: '25/03', status: 'realizada', outcome: 'conectado' },
    { lead: 'Renata Braga', company: 'CarbonX', sdr: 'Fernanda', time: '16:30', date: '25/03', status: 'realizada', outcome: 'rejeitado' },
];

const PIE_DATA = [
    { name: 'Ligações', value: 312, color: '#f97316' },
    { name: 'WhatsApp', value: 188, color: '#10b981' },
    { name: 'E-mail', value: 124, color: '#6366f1' },
];

/* ─── Component ─── */
export const FullBIDashboard: React.FC<{
    onClose: () => void;
    sdrs: any[];
}> = ({ onClose, sdrs }) => {
    const [page, setPage] = useState(0); // 0 = visão geral, 1 = reuniões, 2 = produtividade
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [sdrFilter, setSdrFilter] = useState('all');
    const [dateStart, setDateStart] = useState(() =>
        new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0]
    );
    const [dateEnd, setDateEnd] = useState(() =>
        new Date().toISOString().split('T')[0]
    );

    useEffect(() => {
        fetchData();
    }, [sdrFilter, dateStart, dateEnd]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await (statsAPI as any).getBIFullStats(
                sdrFilter === 'all' ? undefined : sdrFilter,
                dateStart,
                dateEnd
            );
            if (res.success) setData(res.data);
            else setData(null);
        } catch (_) {
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    // Use real data when API responds, seeds only when data===null (api error/never fetched)
    const isDemo = data === null;


    const kpis = [
        { label: 'Ligações',           value: isDemo ? 312  : (data?.total_calls       ?? 0), icon: Phone,        color: 'orange',  trend: '+18%', up: true },
        { label: 'Reuniões',           value: isDemo ? 87   : (data?.total_meetings    ?? 0), icon: Handshake,    color: 'indigo',  trend: '+11%', up: true },
        { label: 'Cadências Concluídas', value: isDemo ? 54  : (data?.cadences_finished ?? 0), icon: CheckCircle2, color: 'emerald', trend: '+8%',  up: true },
        { label: 'Leads Trabalhados',  value: isDemo ? 248  : (data?.total_leads       ?? 0), icon: Users,        color: 'violet',  trend: '+22%', up: true },
    ];

    const timeline = (isDemo || !data?.timeline?.length)
        ? SEED_TIMELINE
        : (() => {
            const map = new Map<string, any>();
            data.timeline.forEach((item: any) => {
                const key = new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                if (!map.has(key)) map.set(key, { date: key, calls: 0, meetings: 0, emails: 0, whatsapp: 0 });
                const e = map.get(key);
                if (item.type === 'call')     e.calls    += Number(item.count);
                if (item.type === 'meeting')  e.meetings += Number(item.count);
                if (item.type === 'email')    e.emails   += Number(item.count);
                if (item.type === 'whatsapp') e.whatsapp += Number(item.count);
            });
            return Array.from(map.values());
        })();

    const sdrPerf = (isDemo || !data?.sdr_performance?.length)
        ? SEED_SDR
        : data.sdr_performance.map((s: any) => ({
            name: s.full_name,
            calls: Number(s.calls) || 0,
            meetings: Number(s.meetings) || 0,
            cadences: Number(s.cadences_finished) || 0,
            deals: Number(s.meetings) || 0,
            rate: s.meetings > 0 && s.calls > 0 ? `${Math.round((s.meetings / s.calls) * 100)}%` : '—',
            trend: 'up',
        }));

    // Dynamic pie data from real totals
    const pieData = isDemo ? PIE_DATA : [
        { name: 'Ligações', value: data?.total_calls    ?? 0, color: '#f97316' },
        { name: 'WhatsApp', value: data?.total_whatsapp ?? 0, color: '#10b981' },
        { name: 'E-mail',   value: data?.total_emails   ?? 0, color: '#6366f1' },
    ];


    const colorMap: Record<string, string> = {
        orange: '#f97316', indigo: '#6366f1', emerald: '#10b981', violet: '#8b5cf6',
    };
    const bgMap: Record<string, string> = {
        orange: 'bg-orange-50 border-orange-100 text-orange-600',
        indigo: 'bg-indigo-50 border-indigo-100 text-indigo-600',
        emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
        violet: 'bg-violet-50 border-violet-100 text-violet-600',
    };

    const PAGES = [
        { label: 'Visão Geral', icon: LayoutDashboard },
        { label: 'Reuniões & Conversões', icon: Handshake },
        { label: 'Produtividade', icon: Activity },
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
                {/* Brand */}
                <div className="flex items-center gap-4 min-w-max">
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
                    {/* SDR Filter */}
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm text-sm font-bold text-slate-700">
                        <Users size={15} className="text-slate-400" />
                        <select
                            value={sdrFilter}
                            onChange={e => setSdrFilter(e.target.value)}
                            className="bg-transparent text-[13px] font-bold text-slate-700 outline-none cursor-pointer"
                        >
                            <option value="all">Todos SDRs</option>
                            {sdrs.map(s => (
                                <option key={s.id} value={s.id}>{s.full_name || s.email?.split('@')[0]}</option>
                            ))}
                        </select>
                    </div>

                    {/* Compact Date Range */}
                    <div className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                        <Calendar size={15} className="text-slate-400 shrink-0" />
                        <input
                            type="date"
                            value={dateStart}
                            onChange={e => setDateStart(e.target.value)}
                            className="bg-transparent text-[13px] font-bold text-slate-700 outline-none w-[110px]"
                        />
                        <span className="text-slate-300 font-bold">–</span>
                        <input
                            type="date"
                            value={dateEnd}
                            onChange={e => setDateEnd(e.target.value)}
                            className="bg-transparent text-[13px] font-bold text-slate-700 outline-none w-[110px]"
                        />
                        <button
                            onClick={() => {
                                const y = new Date();
                                y.setDate(y.getDate() - 1);
                                const s = y.toISOString().split('T')[0];
                                setDateStart(s); setDateEnd(s);
                            }}
                            className="ml-1 px-2.5 py-1 bg-orange-50 border border-orange-200 text-orange-600 rounded-lg text-[11px] font-black uppercase tracking-wider hover:bg-orange-100 transition-colors"
                        >Ontem</button>
                    </div>

                    <button
                        onClick={fetchData}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:text-orange-500 hover:border-orange-200 shadow-sm transition-all ${loading ? 'animate-spin text-orange-400' : ''}`}
                    >
                        <RefreshCw size={16} />
                    </button>

                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50 border border-red-100 text-red-400 hover:bg-red-100 hover:text-red-600 shadow-sm transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* ── CONTENT ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                    {page === 0 && (
                        <PageOverview key="p0" kpis={kpis} timeline={timeline} sdrPerf={sdrPerf} pieData={pieData} colorMap={colorMap} bgMap={bgMap} loading={loading} isDemo={isDemo} />
                    )}
                    {page === 1 && (
                        <PageMeetings key="p1" meetings={SEED_MEETINGS} campaigns={SEED_CAMPAIGNS} tags={SEED_TAGS} isDemo={true} />
                    )}
                    {page === 2 && (
                        <PageProductivity key="p2" sdrs={sdrPerf} timeline={timeline} isDemo={isDemo} />
                    )}
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

/* ══════════════════════════════════════════
   PAGE 0 — Visão Geral
══════════════════════════════════════════ */
function PageOverview({ kpis, timeline, sdrPerf, pieData, colorMap, bgMap }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="p-8 space-y-8"
        >
            {/* KPI Strip */}
            <div className="grid grid-cols-4 gap-5">
                {kpis.map((kpi: any, i: number) => (
                    <motion.div
                        key={kpi.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        className="bg-white border border-slate-100 rounded-[1.75rem] p-7 shadow-sm shadow-slate-200/50 hover:shadow-lg hover:shadow-slate-200/60 transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            style={{ background: `radial-gradient(circle at 70% 30%, ${colorMap[kpi.color]}10, transparent 60%)` }} />
                        <div className="flex items-start justify-between mb-5">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${bgMap[kpi.color]} shadow-sm`}>
                                <kpi.icon size={22} />
                            </div>
                            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${kpi.up ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-500 border border-red-100'}`}>
                                {kpi.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                {kpi.trend}
                            </div>
                        </div>
                        <div className="text-[13px] font-black text-slate-400 uppercase tracking-wider mb-1">{kpi.label}</div>
                        <div className="text-4xl font-black text-slate-800 tracking-tight leading-none" style={{ fontFamily: 'Comfortaa, cursive' }}>
                            {kpi.value.toLocaleString()}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Chart Row */}
            <div className="grid grid-cols-12 gap-6">
                {/* Timeline Chart */}
                <div className="col-span-8 bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm shadow-slate-200/40">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>Fluxo de Performance</h3>
                            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-1">Interações diárias no período selecionado</p>
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
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timeline} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                                <defs>
                                    <linearGradient id="gCalls" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gMeets" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gWA" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} dy={8} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '1rem', color: '#1e293b', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '13px', fontWeight: 700 }}
                                />
                                <Area type="monotone" dataKey="calls" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#gCalls)" name="Ligações" />
                                <Area type="monotone" dataKey="meetings" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#gMeets)" name="Reuniões" />
                                <Area type="monotone" dataKey="whatsapp" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#gWA)" name="WhatsApp" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="col-span-4 bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm shadow-slate-200/40 flex flex-col">
                    <div className="mb-4">
                        <h3 className="text-xl font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>Canais</h3>
                        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-1">Mix de interações</p>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <PieChart width={190} height={190}>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                                {pieData.map((entry: any, i: number) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Pie>
                        </PieChart>
                        <div className="flex flex-col gap-2.5 w-full mt-4">
                            {pieData.map((d: any) => (
                                <div key={d.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                                        <span className="text-[13px] font-bold text-slate-600">{d.name}</span>
                                    </div>
                                    <span className="text-[13px] font-black text-slate-800">{d.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* SDR Leaderboard */}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm shadow-slate-200/40">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>Ranking de SDRs</h3>
                        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-1">Performance por ligações, reuniões e fechamentos</p>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-xl text-amber-600 text-[11px] font-black uppercase tracking-wider">
                        <Award size={13} /> Ranking do Período
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="pb-4 pr-4 text-[11px] font-black text-slate-400 uppercase tracking-wider w-8">#</th>
                                <th className="pb-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">SDR</th>
                                <th className="pb-4 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">Ligações</th>
                                <th className="pb-4 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">Reuniões</th>
                                <th className="pb-4 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">Cadências</th>
                                <th className="pb-4 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">Negócios</th>
                                <th className="pb-4 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">Taxa Conv.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {(sdrPerf as any[]).map((sdr: any, i: number) => (
                                <motion.tr
                                    key={sdr.name}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.06 }}
                                    className="group hover:bg-slate-50/80 transition-colors"
                                >
                                    <td className="py-5 pr-4">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${i === 0 ? 'bg-amber-400 text-amber-950' : i === 1 ? 'bg-slate-200 text-slate-500' : i === 2 ? 'bg-orange-100 text-orange-500' : 'bg-slate-50 text-slate-400'}`}>
                                            {i + 1}
                                        </div>
                                    </td>
                                    <td className="py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white font-black text-sm shadow-sm">
                                                {sdr.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-[15px] font-black text-slate-800 leading-none">{sdr.name}</div>
                                                <div className="text-[11px] text-slate-400 font-bold mt-1 flex items-center gap-1">
                                                    {sdr.trend === 'up' ? <ArrowUpRight size={11} className="text-emerald-500" /> : <ArrowDownRight size={11} className="text-red-400" />}
                                                    {sdr.trend === 'up' ? 'Em alta' : 'Em queda'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    {[sdr.calls, sdr.meetings, sdr.cadences, sdr.deals].map((val: number, j: number) => (
                                        <td key={j} className="py-5 px-6 text-center">
                                            <span className="text-[16px] font-black text-slate-700">{val}</span>
                                        </td>
                                    ))}
                                    <td className="py-5 text-right">
                                        <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-[13px] font-black">{sdr.rate}</span>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
}

/* ══════════════════════════════════════════
   PAGE 1 — Reuniões & Conversões
══════════════════════════════════════════ */
function PageMeetings({ meetings, campaigns, tags }: any) {
    const [outcomeFilter, setOutcomeFilter] = useState('all');

    const filteredMeetings = useMemo(() => {
        return meetings.filter((m: any) => {
            if (outcomeFilter !== 'all' && m.outcome !== outcomeFilter) return false;
            return true;
        });
    }, [meetings, outcomeFilter]);

    const outcomeColor: Record<string, string> = {
        oportunidade: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        conectado: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        rejeitado: 'bg-red-50 text-red-600 border-red-100',
        agendada: 'bg-orange-50 text-orange-600 border-orange-100',
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-8 space-y-8"
        >
            {/* Summary KPIs */}
            <div className="grid grid-cols-4 gap-5">
                {[
                    { label: 'Total Agendadas', value: meetings.length, icon: Calendar, color: 'orange' },
                    { label: 'Realizadas', value: meetings.filter((m: any) => m.status === 'realizada').length, icon: CheckCircle2, color: 'emerald' },
                    { label: 'Oportunidades', value: meetings.filter((m: any) => m.outcome === 'oportunidade').length, icon: Target, color: 'indigo' },
                    { label: 'Tx. Conversão', value: `${Math.round((meetings.filter((m: any) => m.outcome === 'oportunidade').length / meetings.length) * 100)}%`, icon: TrendingUp, color: 'violet' },
                ].map((k: any, i: number) => (
                    <motion.div key={i} whileHover={{ y: -3 }} className="bg-white border border-slate-100 rounded-[1.75rem] p-7 shadow-sm hover:shadow-md transition-all">
                        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-5 ${
                            ({ orange: 'bg-orange-50 border-orange-100 text-orange-600', emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600', indigo: 'bg-indigo-50 border-indigo-100 text-indigo-600', violet: 'bg-violet-50 border-violet-100 text-violet-600' } as Record<string,string>)[k.color]
                        }`}>
                            <k.icon size={22} />
                        </div>
                        <div className="text-[12px] font-black text-slate-400 uppercase tracking-wider mb-2">{k.label}</div>
                        <div className="text-4xl font-black text-slate-800 leading-none" style={{ fontFamily: 'Comfortaa, cursive' }}>{k.value}</div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Meetings Table */}
                <div className="col-span-7 bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-black text-slate-800" style={{ fontFamily: 'Comfortaa, cursive' }}>Lista de Reuniões</h3>
                            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-1">Reuniões e seus resultados</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                            <Filter size={13} className="text-slate-400" />
                            <select value={outcomeFilter} onChange={e => setOutcomeFilter(e.target.value)} className="text-[12px] font-bold text-slate-700 outline-none bg-transparent cursor-pointer">
                                <option value="all">Todos resultados</option>
                                <option value="oportunidade">Oportunidade</option>
                                <option value="conectado">Conectado</option>
                                <option value="rejeitado">Rejeitado</option>
                            </select>
                        </div>
                    </div>
                    <div className="overflow-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="pb-3 text-[11px] font-black text-slate-400 uppercase tracking-wider">Lead / Empresa</th>
                                    <th className="pb-3 px-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">SDR</th>
                                    <th className="pb-3 px-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Data/Hora</th>
                                    <th className="pb-3 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredMeetings.map((m: any, i: number) => (
                                    <tr key={i} className="group hover:bg-slate-50 transition-colors">
                                        <td className="py-4">
                                            <div className="font-bold text-[14px] text-slate-800">{m.lead}</div>
                                            <div className="text-[12px] text-slate-500 font-medium mt-0.5">{m.company}</div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-[10px] font-black">{m.sdr.charAt(0)}</div>
                                                <span className="text-[13px] font-bold text-slate-700">{m.sdr}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="text-[13px] font-bold text-slate-700">{m.time}</div>
                                            <div className="text-[11px] text-slate-400 font-medium">{m.date}</div>
                                        </td>
                                        <td className="py-4 text-right">
                                            {m.outcome ? (
                                                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black border uppercase tracking-wider ${outcomeColor[m.outcome] || 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                                    {m.outcome}
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-lg text-[11px] font-black border bg-orange-50 text-orange-600 border-orange-100 uppercase tracking-wider">agendada</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Conversion by Tag */}
                <div className="col-span-5 space-y-5">
                    <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
                        <div className="flex items-center gap-2 mb-5">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500"><Tag size={16} /></div>
                            <div>
                                <h3 className="text-[16px] font-black text-slate-800">Taxa por Tag</h3>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Conversão por segmento</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {tags.map((t: any, i: number) => (
                                <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${t.bg} ${t.border}`}>
                                    <span className={`text-[13px] font-black ${t.text}`}>{t.tag}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[12px] font-bold text-slate-500">{t.leads} leads</span>
                                        <span className={`px-2.5 py-1 rounded-lg border text-[12px] font-black ${t.bg} ${t.text} ${t.border}`}>{t.taxa}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Campaign Conversion Table */}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500">
                        <Layers size={18} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800" style={{ fontFamily: 'Comfortaa, cursive' }}>Conversão por Campanha</h3>
                        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Funil completo por importação</p>
                    </div>
                </div>
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-100">
                            {['Campanha', 'Leads', 'Contatos', 'Reuniões', 'Fechamentos', 'Taxa Conv.'].map(h => (
                                <th key={h} className={`pb-4 text-[11px] font-black text-slate-400 uppercase tracking-wider ${h === 'Campanha' ? 'text-left' : 'text-center'}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {campaigns.map((c: any, i: number) => (
                            <motion.tr
                                key={i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.05 }}
                                className="group hover:bg-slate-50 transition-colors"
                            >
                                <td className="py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white font-black text-sm shadow-sm">{i + 1}</div>
                                        <span className="text-[14px] font-black text-slate-800">{c.name}</span>
                                    </div>
                                </td>
                                {[c.leads, c.contatos, c.reunioes, c.fechamentos].map((v: number, j: number) => (
                                    <td key={j} className="py-4 text-center text-[15px] font-black text-slate-700">{v}</td>
                                ))}
                                <td className="py-4 text-center">
                                    <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-[13px] font-black">{c.rate}</span>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
}

/* ══════════════════════════════════════════
   PAGE 2 — Produtividade Granular
══════════════════════════════════════════ */
function PageProductivity({ sdrs, timeline }: any) {
    const [selectedSdr, setSelectedSdr] = useState<number>(0);
    const sdr = sdrs[selectedSdr] || sdrs[0];

    const barData = useMemo(() => timeline.map((d: any) => ({
        date: d.date,
        Ligações: d.calls,
        WhatsApp: d.whatsapp,
        'E-mails': d.emails,
    })), [timeline]);

    const prodItems = [
        { label: 'Ligações feitas', value: sdr.calls, icon: Phone, color: 'bg-orange-50 text-orange-600 border-orange-100', progress: Math.min((sdr.calls / 200) * 100, 100) },
        { label: 'Reuniões conquistadas', value: sdr.meetings, icon: Handshake, color: 'bg-indigo-50 text-indigo-600 border-indigo-100', progress: Math.min((sdr.meetings / 50) * 100, 100) },
        { label: 'Cadências concluídas', value: sdr.cadences, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600 border-emerald-100', progress: Math.min((sdr.cadences / 30) * 100, 100) },
        { label: 'Negócios fechados', value: sdr.deals, icon: Award, color: 'bg-amber-50 text-amber-600 border-amber-100', progress: Math.min((sdr.deals / 20) * 100, 100) },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-8 space-y-8"
        >
            {/* SDR Selector */}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex items-center gap-4 overflow-x-auto">
                <div className="text-[12px] font-black text-slate-400 uppercase tracking-widest shrink-0 flex items-center gap-2 mr-2">
                    <Users size={14} /> Selecionar SDR:
                </div>
                {sdrs.map((s: any, i: number) => (
                    <button
                        key={i}
                        onClick={() => setSelectedSdr(i)}
                        className={`flex items-center gap-3 px-5 py-3 rounded-2xl border text-left transition-all shrink-0 ${selectedSdr === i ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white border-transparent shadow-lg shadow-orange-400/20' : 'bg-white border-slate-200 text-slate-700 hover:border-orange-200 hover:bg-orange-50'}`}
                    >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${selectedSdr === i ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-600'}`}>
                            {s.name.charAt(0)}
                        </div>
                        <div>
                            <div className="text-[13px] font-black leading-none">{s.name.split(' ')[0]}</div>
                            <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${selectedSdr === i ? 'text-orange-100' : 'text-slate-400'}`}>{s.rate} conv.</div>
                        </div>
                    </button>
                ))}
            </div>

            {/* 4 Big Metric Blocks */}
            <div className="grid grid-cols-4 gap-5">
                {prodItems.map((item: any, i: number) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="bg-white border border-slate-100 rounded-[2rem] p-7 shadow-sm hover:shadow-md transition-all"
                    >
                        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-5 ${item.color}`}>
                            <item.icon size={22} />
                        </div>
                        <div className="text-[12px] font-black text-slate-400 uppercase tracking-wider mb-2">{item.label}</div>
                        <div className="text-4xl font-black text-slate-800 leading-none mb-5" style={{ fontFamily: 'Comfortaa, cursive' }}>{item.value}</div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${item.progress}%` }}
                                transition={{ duration: 0.8, delay: 0.2 + i * 0.07, ease: 'easeOut' }}
                                className="h-full rounded-full bg-gradient-to-r from-orange-400 to-rose-500"
                            />
                        </div>
                        <div className="flex justify-between mt-2">
                            <span className="text-[10px] font-bold text-slate-400">Meta do período</span>
                            <span className="text-[11px] font-black text-slate-600">{Math.round(item.progress)}%</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Bar Chart by Channel */}
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-8 bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-black text-slate-800" style={{ fontFamily: 'Comfortaa, cursive' }}>Distribuição por Canal</h3>
                            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-1">Volume diário de interações por tipo</p>
                        </div>
                    </div>
                    <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} barSize={10}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} dy={8} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '13px', fontWeight: 700 }}
                                />
                                <Bar dataKey="Ligações" fill="#f97316" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="WhatsApp" fill="#10b981" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="E-mails" fill="#6366f1" radius={[6, 6, 0, 0]} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="col-span-4 bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm flex flex-col gap-5">
                    <h3 className="text-[16px] font-black text-slate-800" style={{ fontFamily: 'Comfortaa, cursive' }}>Resumo Executivo</h3>
                    {[
                        { label: 'Taxa de Conversão', value: sdr.rate, highlight: true },
                        { label: 'Média de Ligações/Dia', value: Math.round(sdr.calls / 14), highlight: false },
                        { label: 'Reunião por Ligação', value: `1 : ${Math.round(sdr.calls / Math.max(sdr.meetings, 1))}`, highlight: false },
                        { label: 'Negócio por Reunião', value: `1 : ${Math.round(sdr.meetings / Math.max(sdr.deals, 1))}`, highlight: false },
                        { label: 'Eficiência Global', value: `${Math.round((sdr.deals / Math.max(sdr.calls, 1)) * 100)}%`, highlight: false },
                    ].map((row: any, i: number) => (
                        <div key={i} className={`flex items-center justify-between px-5 py-4 rounded-2xl border transition-all ${row.highlight ? 'bg-gradient-to-r from-orange-50 to-rose-50 border-orange-100' : 'bg-slate-50 border-slate-100'}`}>
                            <span className="text-[13px] font-bold text-slate-600">{row.label}</span>
                            <span className={`text-[16px] font-black ${row.highlight ? 'text-orange-600' : 'text-slate-800'}`}>{row.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
