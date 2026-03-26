import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, Phone, Mail } from 'lucide-react';
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
    taxa_pendentes?: number;
    workload?: {
        total_interactions: number;
        unique_leads: number;
        avg_per_lead: number;
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
