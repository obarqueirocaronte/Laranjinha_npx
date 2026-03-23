import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    AlertTriangle, Activity, CheckCircle2, Clock, Phone, Mail
} from 'lucide-react';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';

import clsx from 'clsx';
import { cadencesAPI } from '../../lib/api';

// --- Types ---
type PeriodFilter = 'today' | '7d' | '30d';

interface CadenceLog {
    id: string;
    step: number;
    canal: string;
    acao: string;
    resultado: string;
    notas: string;
    timestamp: string;
    sdr_name: string;
    lead_name: string;
}


interface DashboardData {
    zona_critica: {
        total: number;
        leads: any[];
    };
    zona_progresso: {
        total: number;
        por_step: Record<string, number>;
        leads: any[];
    };
    zona_conversao: {
        total_concluidas: number;
        atendeu: number;
        esgotado: number;
        numero_invalido: number;
        taxa_conversao: string;
    };
    zona_sdr: any[];
    activity_stats?: {
        total_ligacoes: number;
        total_emails: number;
        total_whatsapp: number;
        total_atividades: number;
    };
    cadencias_pendentes?: number;
    activity_by_sdr?: {
        sdr_id: string;
        sdr_name: string;
        ligacoes: number;
        emails: number;
        whatsapp: number;
        total: number;
    }[];
    average_completion?: {
        percentage: number;
        average_steps: number;
        avg_hours_to_finish: number;
    };
}

interface CadencesDashboardProps {
    sdrId?: string;
    period?: PeriodFilter;
}

export const CadencesDashboard: React.FC<CadencesDashboardProps> = ({ 
    sdrId = 'all', 
    period = 'today' 
}) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<DashboardData | null>(null);
    const [logs, setLogs] = useState<CadenceLog[]>([]);

    const mapPeriod = (p: string): 'today' | '7d' | '30d' => {
        if (p === 'hoje') return 'today';
        if (p === 'semana') return '7d';
        if (p === 'mes') return '30d';
        return 'today';
    };

    useEffect(() => {
        fetchDashboard();
        fetchLogs();

    }, [period, sdrId]);

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const apiPeriod = mapPeriod(period);
            const res = await cadencesAPI.getDashboard(apiPeriod, sdrId === 'all' ? undefined : sdrId);
            if (res.success) {
                setData(res.data);
            }
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        try {
            const apiPeriod = mapPeriod(period);
            const res = await cadencesAPI.getLogs({ sdr_id: sdrId === 'all' ? undefined : sdrId, period: apiPeriod });
            if (res.success && res.data?.logs) {
                setLogs(res.data.logs);
            } else if (res.success && Array.isArray(res.data)) {
                setLogs(res.data);
            } else {
                setLogs([]);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        }
    };

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const getOutcomeColor = (outcome: string) => {
        switch (outcome) {
            case 'success': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'no_answer': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'busy': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'invalid_number': return 'bg-red-100 text-red-700 border-red-200';
            case 'reschedule': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getCanalIcon = (canal: string) => {
        switch (canal) {
            case 'call': return <Phone size={12} />;
            case 'email': return <Mail size={12} />;
            case 'whatsapp': return <WhatsAppIcon size={12} />;
            default: return <Activity size={12} />;
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6 min-h-full font-sans text-slate-800">
            {/* Header Simplified */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>Painel Operacional</h2>
                    <p className="text-xs text-slate-500 font-bold tracking-widest uppercase mt-1">Status de Cadências e Atividade de SDR</p>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                
                {/* 1. ZONA CRÍTICA */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="col-span-12 md:col-span-4 bg-white/80 backdrop-blur-2xl rounded-[2.5rem] border border-red-100 shadow-xl shadow-red-500/10 p-7 relative overflow-hidden group"
                >
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-400/20 rounded-full blur-3xl group-hover:bg-red-500/30 transition-colors pointer-events-none" />
                    
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/40 group-hover:scale-110 transition-transform">
                                <AlertTriangle size={26} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 text-xl tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>Zona Crítica</h3>
                                <p className="text-[10px] text-red-500 font-bold uppercase mt-1 tracking-widest">Ações Atrasadas (&gt;24h)</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-rose-500 leading-none">{data?.zona_critica.total}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">LEADS PARADOS</span>
                        </div>
                    </div>
                    
                    <div className="space-y-3 mt-6 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
                        {data?.zona_critica?.leads?.map((lead) => (
                            <div key={lead.id} className="group/item bg-white/60 backdrop-blur-sm p-3.5 rounded-2xl border border-red-100/50 shadow-sm hover:bg-white hover:border-red-200 hover:shadow-md transition-all flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-800 truncate">{lead.lead_name}</p>
                                    <p className="text-[10px] text-slate-500 truncate mt-1 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                        {lead.sdr_name || 'Sem SDR'} <span className="w-1 h-1 rounded-full bg-slate-300" /> Step {lead.step_atual}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="bg-red-50 text-red-600 text-[10px] font-black px-2.5 py-1.5 rounded-xl border border-red-100 shadow-sm shrink-0">
                                        {lead.horas_parada}h
                                    </span>
                                </div>
                            </div>
                        ))}
                        {(!data?.zona_critica.leads || data.zona_critica.leads.length === 0) && (
                            <div className="text-center py-10 opacity-40">
                                <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhum gargalo</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* 2. ZONA PROGRESSO */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="col-span-12 md:col-span-4 bg-white/80 backdrop-blur-2xl rounded-[2.5rem] border border-amber-100 shadow-xl shadow-amber-500/10 p-7 relative overflow-hidden group"
                >
                     <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl group-hover:bg-amber-500/30 transition-colors pointer-events-none" />
                     
                     <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/40 group-hover:scale-110 transition-transform">
                                <Activity size={26} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 text-xl tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>Em Andamento</h3>
                                <p className="text-[10px] text-amber-600 font-bold uppercase mt-1 tracking-widest">Distribuição Ativa</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-500 leading-none">{data?.zona_progresso.total}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">LEADS EM FLUXO</span>
                        </div>
                    </div>

                    <div className="mt-8 space-y-4 relative z-10">
                        {(() => {
                            const steps = Object.keys(data?.zona_progresso.por_step || {})
                                .map(s => parseInt(s.replace('step_', '')))
                                .sort((a, b) => a - b);
                            
                            // Ensure at least steps 1, 2, 3 are shown if no data
                            const displaySteps = steps.length > 0 ? steps : [1, 2, 3];
                            const max = Math.max(...Object.values(data?.zona_progresso.por_step || {}), 1);

                            return displaySteps.map((step) => {
                                const count = data?.zona_progresso.por_step[`step_${step}`] || 0;
                                const pct = (count / max) * 100;
                                
                                return (
                                    <div key={step} className="group/step">
                                        <div className="flex justify-between items-end mb-2 px-1">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Step {step}</span>
                                            <span className="text-[11px] font-black text-amber-600">{count} leads</span>
                                        </div>
                                        <div className="flex-1 bg-slate-100/50 rounded-full h-3 overflow-hidden p-[1px] shadow-inner group-hover/step:bg-amber-50/50 transition-colors">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full shadow-[0_1px_3px_rgba(245,158,11,0.3)]"
                                            />
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </motion.div>

                {/* 3. ZONA CONVERSÃO */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="col-span-12 md:col-span-4 bg-white/80 backdrop-blur-2xl rounded-[2.5rem] border border-emerald-100 shadow-xl shadow-emerald-500/10 p-7 relative overflow-hidden group"
                >
                     <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl group-hover:bg-emerald-500/30 transition-colors pointer-events-none" />

                     <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/40 group-hover:scale-110 transition-transform">
                                <CheckCircle2 size={26} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 text-xl tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>Concluídas</h3>
                                <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1 tracking-widest">Desempenho Final</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-500 leading-none">{data?.zona_conversao.taxa_conversao}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">TAXA DE SUCESSO</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-8 relative z-10">
                        {[
                            { label: 'Total Concluído', value: data?.zona_conversao.total_concluidas, color: 'slate' },
                            { label: 'Conversão (Won)', value: data?.zona_conversao.atendeu, color: 'emerald' },
                            { label: 'Fluxo Esgotado', value: data?.zona_conversao.esgotado, color: 'amber' },
                            { label: 'Contatos Inválidos', value: data?.zona_conversao.numero_invalido, color: 'red' },
                        ].map((item) => (
                            <div key={item.label} className={clsx("bg-white/60 backdrop-blur-sm p-4 rounded-2xl border shadow-sm flex flex-col items-center hover:bg-white hover:shadow-md transition-all", `border-${item.color}-100`)}>
                                <span className={clsx("text-3xl font-black", `text-${item.color}-600`)}>{item.value}</span>
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1 text-center">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* 3.1. MÉTRICAS DE CONCLUSÃO (NOVA) */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }}
                    className="col-span-12 md:col-span-12 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-100 rounded-[2.5rem] p-8 shadow-inner overflow-hidden"
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Progresso Médio</p>
                            <div className="relative inline-flex items-center justify-center">
                                <svg className="w-24 h-24 transform -rotate-90">
                                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - (data?.average_completion?.percentage || 0) / 100)} className="text-indigo-500" />
                                </svg>
                                <span className="absolute text-xl font-black text-indigo-700">{data?.average_completion?.percentage}%</span>
                            </div>
                        </div>
                        <div className="flex flex-col justify-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Média de Passos</p>
                            <span className="text-4xl font-black text-slate-800 tracking-tighter">{data?.average_completion?.average_steps}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sessões por Lead</span>
                        </div>
                        <div className="flex flex-col justify-center border-l border-indigo-100/50">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Tempo Médio Conclusão</p>
                            <span className="text-4xl font-black text-purple-600 tracking-tighter">{data?.average_completion?.avg_hours_to_finish}h</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Desde a Atribuição</span>
                        </div>
                    </div>
                </motion.div>

                {/* 3.5. RELATÓRIO DE ATIVIDADES (DB) */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                    className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                    {[
                        { label: 'Ligações', value: data?.activity_stats?.total_ligacoes || 0, icon: <Phone size={20} />, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20', text: 'text-blue-700' },
                        { label: 'Emails', value: data?.activity_stats?.total_emails || 0, icon: <Mail size={20} />, gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/20', text: 'text-violet-700' },
                        { label: 'WhatsApp', value: data?.activity_stats?.total_whatsapp || 0, icon: <WhatsAppIcon size={20} />, gradient: 'from-emerald-500 to-green-600', shadow: 'shadow-emerald-500/20', text: 'text-emerald-700' },
                        { label: 'Cadências Pendentes', value: data?.cadencias_pendentes || 0, icon: <Clock size={20} />, gradient: 'from-orange-500 to-rose-500', shadow: 'shadow-orange-500/20', text: 'text-orange-700' },
                    ].map((item) => (
                        <div key={item.label} className={clsx("bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/60 p-5 relative overflow-hidden group hover:shadow-xl transition-all", item.shadow)}>
                            <div className="flex items-center justify-between mb-3">
                                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br shadow-lg", item.gradient)}>
                                    {item.icon}
                                </div>
                                <span className={clsx("text-3xl font-black tracking-tight", item.text)}>{item.value}</span>
                            </div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">{item.label}</p>
                        </div>
                    ))}
                </motion.div>

                {/* 3.6. ATIVIDADES POR SDR (DB) */}
                {data?.activity_by_sdr && data.activity_by_sdr.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
                        className="col-span-12 bg-white/80 backdrop-blur-2xl border border-sky-100 rounded-[2.5rem] p-7 shadow-xl shadow-sky-500/10 relative overflow-hidden"
                    >
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="flex items-center gap-4 mb-6 relative z-10">
                            <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/40">
                                <Activity size={22} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 text-lg tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>Atividades por SDR</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Detalhamento de contatos realizados no período</p>
                            </div>
                        </div>
                        <div className="space-y-2 relative z-10">
                            {data?.activity_by_sdr?.map((sdr) => (
                                <div key={sdr.sdr_id || sdr.sdr_name} className="flex items-center justify-between p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-sky-50 hover:bg-white hover:shadow-md transition-all group">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-100 to-blue-100 text-sky-700 flex items-center justify-center text-[11px] font-black uppercase shadow-inner shrink-0">
                                            {sdr.sdr_name?.charAt(0) || '?'}
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 truncate">{sdr.sdr_name || 'Sem SDR'}</span>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-1.5 text-blue-600">
                                            <Phone size={12} />
                                            <span className="text-sm font-black">{sdr.ligacoes || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-violet-600">
                                            <Mail size={12} />
                                            <span className="text-sm font-black">{sdr.emails || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-emerald-600">
                                            <WhatsAppIcon size={12} />
                                            <span className="text-sm font-black">{sdr.whatsapp || 0}</span>
                                        </div>
                                        <div className="bg-slate-100 px-3 py-1 rounded-xl">
                                            <span className="text-xs font-black text-slate-600">{sdr.total || 0} total</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* 4. DETALHAMENTO DE ATIVIDADES (LOGS) */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="col-span-12 bg-white/80 backdrop-blur-2xl border border-indigo-100 rounded-[2.5rem] p-8 shadow-xl shadow-indigo-500/10 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/40">
                                <Clock size={28} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 text-2xl tracking-tight leading-none" style={{ fontFamily: 'Comfortaa, cursive' }}>Detalhamento de Atividades</h3>
                                <p className="text-[11px] text-slate-500 font-bold uppercase mt-2 tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                                    Logs de Interação em Tempo Real
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm shadow-sm p-1.5 rounded-2xl border border-slate-200/50">
                            <span className="text-[10px] font-black text-slate-500 px-3 uppercase tracking-widest">Total: {logs.length}</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto relative z-10">
                        <table className="w-full text-left border-separate border-spacing-y-2">
                            <thead>
                                <tr>
                                    <th className="px-5 pb-4 font-black text-[11px] text-slate-400 uppercase tracking-widest">Data / Hora</th>
                                    <th className="px-5 pb-4 font-black text-[11px] text-slate-400 uppercase tracking-widest">Lead</th>
                                    <th className="px-5 pb-4 font-black text-[11px] text-slate-400 uppercase tracking-widest">SDR</th>
                                    <th className="px-5 pb-4 font-black text-[11px] text-slate-400 uppercase tracking-widest text-center">Step</th>
                                    <th className="px-5 pb-4 font-black text-[11px] text-slate-400 uppercase tracking-widest text-center">Canal</th>
                                    <th className="px-5 pb-4 font-black text-[11px] text-slate-400 uppercase tracking-widest text-right">Desfecho</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.id} className="group/row bg-white/40 hover:bg-white/80 backdrop-blur-sm transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md">
                                        <td className="py-4 px-5 rounded-l-2xl border-y border-l border-indigo-50/50 group-hover/row:border-indigo-100 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-700">{new Date(log.timestamp).toLocaleDateString('pt-BR')}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-5 border-y border-transparent group-hover/row:border-indigo-100 transition-colors">
                                            <span className="text-sm font-black text-slate-800">{log.lead_name}</span>
                                        </td>
                                        <td className="py-4 px-5 border-y border-transparent group-hover/row:border-indigo-100 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 flex items-center justify-center text-[10px] font-black uppercase shadow-inner">
                                                    {log.sdr_name?.charAt(0)}
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-600 truncate max-w-[100px]">{log.sdr_name?.split(' ')[0]}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-5 text-center border-y border-transparent group-hover/row:border-indigo-100 transition-colors">
                                            <span className="text-[11px] font-black text-indigo-700 bg-indigo-50/80 px-2.5 py-1.5 rounded-xl border border-indigo-100/50 shadow-sm"># {log.step}</span>
                                        </td>
                                        <td className="py-4 px-5 text-center border-y border-transparent group-hover/row:border-indigo-100 transition-colors">
                                            <div className="flex items-center justify-center text-slate-400 group-hover/row:text-indigo-500 transition-colors">
                                                {getCanalIcon(log.canal)}
                                            </div>
                                        </td>
                                        <td className="py-4 px-5 text-right rounded-r-2xl border-y border-r border-indigo-50/50 group-hover/row:border-indigo-100 transition-colors">
                                            <span className={clsx(
                                                "inline-block px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm",
                                                getOutcomeColor(log.resultado)
                                            )}>
                                                {log.resultado === 'success' ? 'Contato Feito' : 
                                                 log.resultado === 'no_answer' ? 'Sem Resposta' :
                                                 log.resultado === 'busy' ? 'Ocupado' :
                                                 log.resultado === 'invalid_number' ? 'Inválido' :
                                                 log.resultado === 'reschedule' ? 'Agendado' : log.resultado}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center">
                                            <div className="opacity-20 grayscale">
                                                <Activity size={48} className="mx-auto mb-4" />
                                            </div>
                                            <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Nenhuma atividade registrada</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
                
            </div>
        </div>
    );
};
