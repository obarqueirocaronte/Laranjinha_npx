import React, { useState, useEffect } from 'react';
import {
    ArrowRight,
    Save,
    Bell,
    Clock,
    Globe,
    ShieldCheck,
    Zap,
    ExternalLink,
    Play
} from 'lucide-react';
import { statsAPI } from '../../lib/api';
import { cn } from '../../lib/utils';

interface ManagementReportZoneProps {
    onClose: () => void;
}

export const ManagementReportZone: React.FC<ManagementReportZoneProps> = ({ onClose }) => {
    const [config, setConfig] = useState({
        webhook_url: '',
        schedule_times: ['11:30', '14:30', '17:00'],
        is_active: true
    });
    const [saving, setSaving] = useState(false);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        fetchConfig();
        fetchPreviewStats();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await statsAPI.getReportConfig();
            if (res.success && res.data) {
                setConfig(res.data);
            }
        } catch (error) {
            console.error('Error fetching config:', error);
        }
    };

    const fetchPreviewStats = async () => {
        try {
            const res = await statsAPI.getGlobalStats();
            if (res.success) {
                setStats(res.data);
            }
        } catch (error) {
            console.error('Error fetching global stats:', error);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await statsAPI.updateReportConfig(config);
            // Show toast or success indicator
        } catch (error) {
            console.error('Error saving config:', error);
        } finally {
            setSaving(false);
        }
    };

    const toggleTime = (time: string) => {
        setConfig(prev => ({
            ...prev,
            schedule_times: prev.schedule_times.includes(time)
                ? prev.schedule_times.filter(t => t !== time)
                : [...prev.schedule_times, time].sort()
        }));
    };

    const availableTimes = [
        '08:00', '09:00', '10:00', '11:00', '11:30', '12:00',
        '13:00', '14:00', '14:30', '15:00', '16:00', '17:00',
        '18:00', '19:00', '20:00'
    ];

    return (
        <div className="h-full flex flex-col p-8 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 max-w-6xl mx-auto w-full">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow shadow-orange-500/50 bg-gradient-to-br from-orange-500 to-amber-600">
                            <Bell size={20} />
                        </div>
                        Relatório de Gestão (Mattermost)
                    </h1>
                    <p className="text-slate-600 mt-1 text-sm font-medium">Automatize o envio de métricas para o seu canal de acompanhamento.</p>
                </div>
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gradient-soft border border-orange-200/50 shadow-glass text-slate-600 rounded-xl hover:bg-orange-50/80 hover:text-orange-600 transition-colors font-bold text-xs flex items-center gap-2"
                    style={{ fontFamily: 'Comfortaa, cursive' }}
                >
                    <ArrowRight className="rotate-180" size={14} />
                    Voltar
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto w-full mb-12">
                {/* Configuration Panel */}
                <div className="space-y-6">
                    <div className="bg-white/60 backdrop-blur-md border border-orange-100/50 rounded-3xl p-8 shadow-glass">
                        <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2" style={{ fontFamily: 'Comfortaa, cursive' }}>
                            <Globe size={18} className="text-orange-500" />
                            Configuração de Endpoint
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Webhook URL do Mattermost</label>
                                <input
                                    type="text"
                                    value={config.webhook_url}
                                    onChange={(e) => setConfig({ ...config, webhook_url: e.target.value })}
                                    placeholder="https://chat.npx.com.br/hooks/..."
                                    className="w-full px-4 py-3 bg-white/80 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-sm font-medium text-slate-700 shadow-sm"
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-orange-50/50 rounded-2xl border border-orange-100/50 mt-4">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700">Relatório Ativo</h4>
                                    <p className="text-xs text-slate-500">Habilita/Desabilita os envios automáticos.</p>
                                </div>
                                <button
                                    onClick={() => setConfig({ ...config, is_active: !config.is_active })}
                                    className={cn(
                                        "w-12 h-6 rounded-full transition-colors relative shadow-inner",
                                        config.is_active ? "bg-orange-500" : "bg-slate-300"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                                        config.is_active ? "translate-x-6" : "translate-x-0"
                                    )} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/60 backdrop-blur-md border border-orange-100/50 rounded-3xl p-8 shadow-glass">
                        <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2" style={{ fontFamily: 'Comfortaa, cursive' }}>
                            <Clock size={18} className="text-orange-500" />
                            Horários de Atualização
                        </h3>

                        <div className="grid grid-cols-4 gap-2">
                            {availableTimes.map(time => (
                                <button
                                    key={time}
                                    onClick={() => toggleTime(time)}
                                    className={cn(
                                        "px-2 py-2 rounded-xl text-xs font-bold transition-all border",
                                        config.schedule_times.includes(time)
                                            ? "bg-orange-500 text-white border-orange-600 shadow-md shadow-orange-500/20"
                                            : "bg-white/80 text-slate-600 border-slate-200 hover:border-orange-300 hover:bg-orange-50"
                                    )}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-slate-900/20 transition-all flex items-center justify-center gap-2 overflow-hidden relative group"
                        >
                            {saving ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save size={18} />
                                    Salvar Configurações
                                </>
                            )}
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                        </button>

                        <button
                            className="px-6 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
                        >
                            <Play size={18} />
                        </button>
                    </div>
                </div>

                {/* Live Preview (Liquid Glass) */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-4 flex items-center gap-2">
                        <Zap size={14} className="text-amber-500" />
                        Preview Real-time (Mattermost)
                    </h3>

                    <div className="bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 relative group">
                        {/* Mattermost Window Header */}
                        <div className="px-4 py-3 bg-slate-900 flex items-center gap-3 border-b border-slate-700">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/20 border border-rose-500/30" />
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/30" />
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/30" />
                            </div>
                            <span className="text-[10px] font-black text-slate-500 tracking-wider">CANAL-GESTAO</span>
                        </div>

                        {/* Message Content */}
                        <div className="p-6">
                            <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-orange-500/20">
                                    <Bell size={20} />
                                </div>
                                <div className="space-y-4 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-black text-white" style={{ fontFamily: 'Comfortaa, cursive' }}>Laranjinha Bot</span>
                                        <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">BOT</span>
                                        <span className="text-[10px] text-slate-400 font-medium">11:30</span>
                                    </div>

                                    {/* The Liquid Glass Template Content - Attachments Format */}
                                    <div className="space-y-4">
                                        <div className="bg-slate-700/30 border border-white/5 rounded-2xl p-4 backdrop-blur-sm space-y-1">
                                            <h3 className="text-slate-100 font-black text-sm flex items-center gap-2">
                                                🍊 Resumo de Gestão - Laranjinha
                                            </h3>
                                            <p className="text-[10px] text-slate-400 font-medium italic">Atualizado hoje às 11:30</p>
                                        </div>

                                        {/* Attachment 1 - Visão Geral */}
                                        <div className="bg-slate-800/80 border-y border-r border-white/5 border-l-4 border-l-orange-500 p-4 rounded-r-lg shadow-sm">
                                            <div className="text-[11px] font-black text-orange-400 uppercase tracking-widest mb-3">
                                                📊 Visão Geral da Produtividade
                                            </div>
                                            <ul className="text-[10px] text-slate-300 space-y-1">
                                                <li><span className="text-slate-500 mr-2">•</span><strong className="text-white">Cadências Finalizadas:</strong> {stats?.summary?.total_completed || 0}</li>
                                                <li><span className="text-slate-500 mr-2">•</span><strong className="text-white">Cadências Pendentes (Ativas):</strong> {stats?.summary?.total_pending || 0}</li>
                                            </ul>
                                        </div>

                                        {/* Attachment 2 - Produtividade por SDR */}
                                        <div className="bg-slate-800/80 border-y border-r border-white/5 border-l-4 border-l-emerald-500 p-4 rounded-r-lg shadow-sm">
                                            <div className="text-[11px] font-black text-emerald-400 uppercase tracking-widest mb-3">
                                                👥 Produtividade por SDR
                                            </div>
                                            <div className="space-y-3">
                                                {stats?.sdrs?.map((sdr: any) => {
                                                    const totalGoals = (sdr.goal_calls || 50) + (sdr.goal_whatsapp || 30) + (sdr.goal_emails || 20);
                                                    const totalAchieved = (sdr.calls || 0) + (sdr.whatsapp || 0) + (sdr.emails || 0);
                                                    const ratio = totalGoals > 0 ? totalAchieved / totalGoals : 0;
                                                    const signal = ratio >= 1.0 ? '✅' : ratio >= 0.7 ? '🟢' : ratio >= 0.4 ? '🟡' : '🔴';

                                                    let tratativaPct = 0;
                                                    if (sdr.total_leads_assigned > 0) {
                                                        const treated = sdr.total_leads_assigned - sdr.pending_leads;
                                                        tratativaPct = Math.round((treated / sdr.total_leads_assigned) * 100);
                                                    }

                                                    return (
                                                        <div key={sdr.full_name} className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-white text-xs font-bold flex items-center gap-2">
                                                                    {signal} {sdr.full_name}
                                                                </span>
                                                                <span className="text-[10px] text-slate-500 font-black">
                                                                    {Math.round(ratio * 100)}% DA META GERAL
                                                                </span>
                                                            </div>
                                                            <div className="grid grid-cols-5 gap-1 text-[9px] text-center mb-2 bg-black/30 rounded-lg p-1.5 border border-white/5">
                                                                <div><span className="text-slate-500 block mb-0.5">📞</span><span className="text-white font-bold">{sdr.calls || 0}</span>/{sdr.goal_calls || 50}</div>
                                                                <div><span className="text-slate-500 block mb-0.5">💬</span><span className="text-white font-bold">{sdr.whatsapp || 0}</span>/{sdr.goal_whatsapp || 30}</div>
                                                                <div><span className="text-slate-500 block mb-0.5">📧</span><span className="text-white font-bold">{sdr.emails || 0}</span>/{sdr.goal_emails || 20}</div>
                                                                <div><span className="text-slate-500 block mb-0.5">🔄</span><span className="text-white font-bold">{sdr.pipeline_movements || 0}</span></div>
                                                                <div><span className="text-slate-500 block mb-0.5">⚡</span><span className="text-white font-bold">{tratativaPct}%</span></div>
                                                            </div>
                                                            {/* Progress Bar */}
                                                            <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                                                                <div
                                                                    className={cn(
                                                                        "h-full rounded-full transition-all duration-500",
                                                                        ratio >= 1.0 ? "bg-emerald-500" : ratio >= 0.7 ? "bg-emerald-400" : ratio >= 0.4 ? "bg-amber-400" : "bg-rose-500"
                                                                    )}
                                                                    style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Attachment 3 - Feedback */}
                                        <div className="bg-slate-800/80 border-y border-r border-white/5 border-l-4 border-l-amber-500 p-4 rounded-r-lg shadow-sm">
                                            <div className="text-[11px] font-black text-amber-500 uppercase tracking-widest mb-3">
                                                💡 Alertas e Prioridades
                                            </div>
                                            <ul className="text-[10px] text-slate-300 space-y-1 mb-3">
                                                <li><span className="text-emerald-500 mr-2">🟢</span><strong>Destaques</strong> atingiram/superaram a meta!</li>
                                                <li><span className="text-rose-500 mr-2">🔴</span><strong>Atenção:</strong> Equipe abaixo do esperado no momento.</li>
                                            </ul>
                                            <div className="flex gap-2">
                                                <div className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-1 rounded text-[9px] font-bold">
                                                    🏆 DESTAQUE: SDR
                                                </div>
                                                <div className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2 py-1 rounded text-[9px] font-bold">
                                                    ⚠️ ATENÇÃO: SDR
                                                </div>
                                            </div>
                                        </div>

                                        {/* Attachment 4 - Pipeline */}
                                        <div className="bg-slate-800/80 border-y border-r border-white/5 border-l-4 border-l-blue-500 p-4 rounded-r-lg shadow-sm">
                                            <div className="text-[11px] font-black text-blue-400 uppercase tracking-widest mb-3">
                                                🚀 Status do Pipeline (Geral)
                                            </div>
                                            <div className="space-y-1.5 bg-slate-900/40 p-3 rounded-xl border border-white/5">
                                                {stats?.columns?.map((col: any) => (
                                                    <div key={col.name} className="flex items-center justify-between text-[10px]">
                                                        <span className="text-slate-400 flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                                            {col.name}
                                                        </span>
                                                        <span className="text-white font-black">{col.count} leads</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-2 flex items-center justify-between">
                                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Inside Sales Pipeline • Beta</div>
                                            <ExternalLink size={10} className="text-slate-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating Badge */}
                        <div className="absolute bottom-4 right-4 bg-orange-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                            <ShieldCheck size={12} />
                            TEMPLATE PREMIUM
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
