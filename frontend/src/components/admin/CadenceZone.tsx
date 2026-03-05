import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Phone, Mail, MessageSquare, Plus, Minus, ArrowLeft,
    Zap, Target, Check, Clock3, Tags, Search, Activity, GitBranch,
    CheckCircle2, Filter, X, User, AlertTriangle, RotateCcw,
    ListFilter, Users, Building2, Briefcase, ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { leadsAPI } from '../../lib/api';
import { SchedulingRuleModal } from './SchedulingRuleModal';

interface CadenceZoneProps { onClose: () => void; }

// ─── Types ─────────────────────────────────────────────────────────────────
type Channel = 'phone' | 'whatsapp' | 'email';
interface ChannelConfig { active: boolean; rolls: number; }
interface CadenceConfig {
    name: string;
    phone: ChannelConfig;
    whatsapp: ChannelConfig;
    email: ChannelConfig;
    gaps: string[];
    schedulingRule?: string;
}
interface ActiveFilter { type: 'tag' | 'lead' | 'all_pending'; label: string; count?: number; }
interface LeadPreview { id: string; full_name: string; company_name: string; email: string; job_title: string; qualification_status: string; }
interface SDR { id: string; full_name: string; email: string; total_leads: number; }
interface SDRAssignment { sdr_id: string; sdr_name: string; percentage: number; }

// ─── Constants ──────────────────────────────────────────────────────────────
const PRESETS = [
    { name: 'Agressiva', config: { phone: 5, whatsapp: 5, email: 5 }, icon: Zap, color: 'text-orange-500', bgColor: 'bg-orange-50' },
    { name: 'Nutrição', config: { phone: 0, whatsapp: 2, email: 5 }, icon: Target, color: 'text-blue-500', bgColor: 'bg-blue-50' },
    { name: 'Fechamento', config: { phone: 3, whatsapp: 3, email: 1 }, icon: CheckCircle2, color: 'text-emerald-500', bgColor: 'bg-emerald-50' },
];
const GAP_OPTIONS = ['Imediato', '1 dia', '2 dias', '3 dias', '5 dias'];
const STEPS = ['Público-Alvo', 'Regras de Cadência', 'Atribuição SDR', 'Confirmar'];

// ─── Sub-Components ──────────────────────────────────────────────────────────
const StepIndicator: React.FC<{ current: number }> = ({ current }) => (
    <div className="flex items-center gap-0 mb-8">
        {STEPS.map((label, i) => (
            <React.Fragment key={label}>
                <div className="flex flex-col items-center gap-1.5">
                    <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all',
                        i < current ? 'bg-slate-900 text-white' :
                            i === current ? 'bg-orange-500 text-white ring-4 ring-orange-100' :
                                'bg-slate-100 text-slate-600'
                    )}>
                        {i < current ? <Check size={14} strokeWidth={3} /> : i + 1}
                    </div>
                    <span className={cn('text-[10px] font-black uppercase tracking-wider whitespace-nowrap',
                        i === current ? 'text-orange-600' : i < current ? 'text-slate-700' : 'text-slate-600'
                    )}>{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                    <div className={cn('flex-1 h-0.5 mx-2 mb-5 transition-all', i < current ? 'bg-slate-900' : 'bg-slate-100')} />
                )}
            </React.Fragment>
        ))}
    </div>
);

const ChannelRow: React.FC<{
    label: string; icon: React.ReactNode; iconBg: string;
    config: ChannelConfig; onToggle: () => void; onUpdate: (delta: number) => void;
}> = ({ label, icon, iconBg, config, onToggle, onUpdate }) => (
    <div className={cn('flex items-center justify-between p-2.5 bg-gradient-soft border border-orange-100 shadow-glass border rounded-xl transition-all',
        config.active ? 'border-slate-200 shadow-sm' : 'border-slate-100 opacity-50 bg-slate-50/50 grayscale')}>
        <div className="flex items-center gap-2">
            <div onClick={onToggle} className={cn(
                'cursor-pointer w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                config.active ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-200 hover:border-slate-400'
            )}>
                {config.active && <Check size={11} strokeWidth={4} />}
            </div>
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shadow-sm', iconBg)}>{icon}</div>
            <div className="flex flex-col justify-center">
                <span className="text-xs font-black text-slate-800 block -mb-0.5">{label}</span>
                <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{config.active ? 'Ativo' : 'Pausado'}</span>
            </div>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-100">
            <button onClick={() => onUpdate(-1)} disabled={!config.active}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gradient-soft border border-orange-100 shadow-glass text-slate-600 hover:text-slate-900 disabled:opacity-0 transition-all">
                <Minus size={13} strokeWidth={3} />
            </button>
            <span className="w-6 text-center font-black text-base text-slate-900 tabular-nums">{config.rolls}</span>
            <button onClick={() => onUpdate(1)} disabled={!config.active}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gradient-soft border border-orange-100 shadow-glass text-slate-600 hover:text-slate-900 disabled:opacity-0 transition-all">
                <Plus size={13} strokeWidth={3} />
            </button>
        </div>
    </div>
);

const GapRow: React.FC<{ val: string; active: boolean; onChange: (v: string) => void }> = ({ val, active, onChange }) => {
    const [open, setOpen] = useState(false);
    if (!active) return <div className="h-2" />;
    return (
        <div className="relative flex justify-center py-1">
            <div className="absolute top-0 bottom-0 left-[2.2rem] w-0.5 bg-slate-100 -z-10" />
            <div className="relative">
                <button onClick={() => setOpen(!open)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-gradient-soft border border-orange-100 shadow-glass border border-slate-200 rounded-full text-[9px] font-black text-slate-600 uppercase tracking-widest hover:border-orange-200 hover:text-orange-600 transition-all shadow-sm">
                    <Clock3 size={9} />{val}
                </button>
                <AnimatePresence>
                    {open && (
                        <motion.div initial={{ opacity: 0, y: -4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute top-full mt-1 left-1/2 -translate-x-1/2 w-28 bg-gradient-soft border border-orange-100 shadow-glass rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 p-1">
                            {GAP_OPTIONS.map(opt => (
                                <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
                                    className="w-full text-left px-3 py-1.5 text-[10px] font-black text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all">
                                    {opt}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────
export const CadenceZone: React.FC<CadenceZoneProps> = ({ onClose }) => {
    const [step, setStep] = useState(0);

    // Step 1: Audience
    const [tags, setTags] = useState<Array<{ name: string; count: number }>>([]);
    const [filterTab, setFilterTab] = useState<'status' | 'tag' | 'unitary'>('status');
    const [activeFilter, setActiveFilter] = useState<ActiveFilter | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [leadsPreview, setLeadsPreview] = useState<LeadPreview[]>([]);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [stats, setStats] = useState<any>(null);

    const [config, setConfig] = useState<CadenceConfig>({
        name: 'Cadência Padrão',
        phone: { active: true, rolls: 3 },
        whatsapp: { active: true, rolls: 3 },
        email: { active: true, rolls: 3 },
        gaps: ['2 dias', '1 dia'],
        schedulingRule: 'Sugerido Pela Plataforma'
    });
    const [infinityMode, setInfinityMode] = useState(true);
    const [showSchedulingModal, setShowSchedulingModal] = useState(false);
    const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>(['morning', 'afternoon']);

    // Step 3: SDR Assignment
    const [sdrs, setSDRs] = useState<SDR[]>([]);
    const [assignments, setAssignments] = useState<SDRAssignment[]>([]);

    // Step 4: Applying
    const [isApplying, setIsApplying] = useState(false);
    const [result, setResult] = useState<any>(null);

    // ── Data fetching ──────────────────────────────────────────────────────
    useEffect(() => {
        leadsAPI.getCadenceStats().then(r => r.success && setStats(r.data)).catch(() => { });
        leadsAPI.getTags().then(r => r.success && setTags(r.data)).catch(() => { });
    }, []);

    const fetchPreview = useCallback(async (filter: ActiveFilter) => {
        setPreviewLoading(true);
        try {
            const r = await leadsAPI.getLeadsPreview(filter.type, filter.label !== 'Todos Pendentes' ? filter.label : undefined, 15);
            if (r.success) setLeadsPreview(r.data);
        } catch { setLeadsPreview([]); }
        finally { setPreviewLoading(false); }
    }, []);

    const fetchSDRs = useCallback(async () => {
        try {
            const r = await leadsAPI.getAllSDRs();
            if (r.success) {
                setSDRs(r.data);
                // Init equal distribution
                if (r.data.length > 0 && assignments.length === 0) {
                    const pct = Math.floor(100 / r.data.length);
                    setAssignments(r.data.map((s: SDR, i: number) => ({
                        sdr_id: s.id,
                        sdr_name: s.full_name,
                        percentage: i === r.data.length - 1 ? 100 - pct * (r.data.length - 1) : pct,
                    })));
                }
            }
        } catch { }
    }, []);

    useEffect(() => { if (step === 2) fetchSDRs(); }, [step, fetchSDRs]);

    const selectFilter = (f: ActiveFilter) => {
        setActiveFilter(f);
        fetchPreview(f);
    };

    // ── Cadence helpers ────────────────────────────────────────────────────
    const toggleChannel = (ch: Channel) =>
        setConfig(c => ({ ...c, [ch]: { ...c[ch], active: !c[ch].active } }));

    const updateRoll = (ch: Channel, delta: number) =>
        setConfig(c => {
            const n = Math.max(0, Math.min(10, c[ch].rolls + delta));
            return { ...c, [ch]: { ...c[ch], rolls: n, active: n > 0 } };
        });

    const updateGap = (idx: number, val: string) =>
        setConfig(c => { const g = [...c.gaps]; g[idx] = val; return { ...c, gaps: g }; });

    // ── Assignment helpers ─────────────────────────────────────────────────
    const toggleSDR = (sdr: SDR) => {
        const existing = assignments.find(a => a.sdr_id === sdr.id);
        if (existing) {
            setAssignments(prev => prev.filter(a => a.sdr_id !== sdr.id));
        } else {
            const newAssignments = [...assignments, { sdr_id: sdr.id, sdr_name: sdr.full_name, percentage: 0 }];
            const equal = Math.floor(100 / newAssignments.length);
            setAssignments(newAssignments.map((a, i) => ({
                ...a, percentage: i === newAssignments.length - 1 ? 100 - equal * (newAssignments.length - 1) : equal
            })));
        }
    };

    const updatePercentage = (sdr_id: string, val: number) => {
        setAssignments(prev => prev.map(a => a.sdr_id === sdr_id ? { ...a, percentage: val } : a));
    };

    const totalPct = assignments.reduce((s, a) => s + a.percentage, 0);

    // ── Apply ──────────────────────────────────────────────────────────────
    const handleApply = async () => {
        if (!activeFilter || assignments.length === 0) return;
        setIsApplying(true);
        try {
            const r = await leadsAPI.bulkAssignWithCadence(
                config.name,
                activeFilter.type,
                activeFilter.type !== 'all_pending' ? activeFilter.label : undefined,
                assignments,
                config.schedulingRule || 'Sugerido Pela Plataforma'
            );
            if (r.success) setResult(r.data);
        } catch (err: any) {
            alert('Erro ao aplicar: ' + (err?.response?.data?.error?.message || err.message));
        } finally { setIsApplying(false); }
    };

    const handleResetLeads = async () => {
        if (!confirm('Isso vai resetar leads qualificados sem SDR para "pendente". Confirma?')) return;
        await leadsAPI.resetLeadsToPending();
        const r = await leadsAPI.getCadenceStats();
        if (r.success) setStats(r.data);
        alert('Leads resetados.');
    };

    const totalLeads = activeFilter?.count ?? 0;
    const canAdvanceStep0 = !!activeFilter;
    const canAdvanceStep1 = config.phone.active || config.whatsapp.active || config.email.active;
    const canAdvanceStep2 = assignments.length > 0 && totalPct === 100;

    // ─── Render ────────────────────────────────────────────────────────────
    return (
        <>
            <div className="h-full flex flex-col overflow-y-auto text-slate-900 font-sans bg-transparent">
                <div className="w-full max-w-5xl mx-auto flex flex-col p-6 gap-0">

                    {/* Alert */}
                    {stats && (stats.no_cadence_count > 0 || stats.pending_count > 0) && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-full">
                                    <AlertTriangle size={18} />
                                </div>
                                <div>
                                    <p className="font-bold text-amber-900 text-sm">Leads sem cadência detectados</p>
                                    <p className="text-xs text-amber-700 mt-0.5">
                                        <strong>{stats.no_cadence_count}</strong> qualificados sem cadência &bull; <strong>{stats.pending_count}</strong> pendentes
                                    </p>
                                </div>
                            </div>
                            <button onClick={handleResetLeads}
                                className="px-3 py-2 bg-gradient-soft border border-orange-100 shadow-glass border border-amber-200 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-100 flex items-center gap-1.5 transition-colors">
                                <RotateCcw size={13} /> Resetar
                            </button>
                        </motion.div>
                    )}

                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <button onClick={onClose} className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/40 backdrop-blur-md border border-white/60 shadow-sm text-slate-700 hover:text-orange-600 transition-all group shrink-0">
                                <ArrowLeft className="transition-transform group-hover:-translate-x-1" size={24} strokeWidth={2.5} />
                            </button>
                            <div
                                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow border border-white/20 shrink-0"
                                style={{ background: 'linear-gradient(135deg, #FF8C00, #FF6347)' }}
                            >
                                <Activity size={28} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h2 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-2" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                    <span className="text-slate-700 opacity-90">Manager</span>
                                    <span>Cadência</span>
                                </h2>
                                <p className="text-[11px] text-slate-500 font-extrabold mt-1 tracking-[0.1em] uppercase" style={{ fontFamily: 'Comfortaa, cursive' }}>Configuração Operacional</p>
                            </div>
                        </div>
                    </div>

                    {/* Step Indicator */}
                    <StepIndicator current={step} />

                    {/* ── STEP 0: Audience ─── */}
                    {step === 0 && (
                        <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <div className="bg-gradient-soft border border-orange-200/50 shadow-glass rounded-[32px] shadow-sm overflow-hidden">
                                {/* Tabs */}
                                <div className="flex border-b border-orange-100/60 bg-gradient-to-b from-orange-50/60 to-transparent">
                                    {(['status', 'tag', 'unitary'] as const).map(tab => (
                                        <button key={tab} onClick={() => setFilterTab(tab)}
                                            className={cn('flex-1 py-3.5 text-xs font-black uppercase tracking-wider transition-all',
                                                filterTab === tab ? 'bg-gradient-soft border border-orange-100 shadow-glass text-orange-600 border-b-2 border-orange-500' : 'text-slate-600 hover:text-slate-800')}>
                                            {tab === 'status' ? 'Por Status' : tab === 'tag' ? 'Por Tag' : 'Seleção Única'}
                                        </button>
                                    ))}
                                </div>

                                <div className="p-6 grid grid-cols-12 gap-6">
                                    {/* Left: filter options */}
                                    <div className="col-span-5">
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">Selecionar Audiência</p>

                                        {filterTab === 'status' && (
                                            <div className="space-y-2">
                                                <button onClick={() => selectFilter({ type: 'all_pending', label: 'Todos Pendentes', count: stats?.pending_count || 0 })}
                                                    className={cn('w-full flex items-center justify-between p-3.5 rounded-xl border transition-all group',
                                                        activeFilter?.type === 'all_pending'
                                                            ? 'border-orange-300 bg-orange-50 ring-2 ring-orange-200'
                                                            : 'border-slate-200 bg-gradient-soft border border-orange-100 shadow-glass hover:border-orange-200 hover:bg-orange-50/50')}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center',
                                                            activeFilter?.type === 'all_pending' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600 group-hover:bg-orange-100 group-hover:text-orange-600')}>
                                                            <Filter size={16} />
                                                        </div>
                                                        <div className="text-left">
                                                            <span className="block text-sm font-bold text-slate-800">Todos Pendentes</span>
                                                            <span className="block text-[10px] text-slate-600">Aguardando regras de entrada</span>
                                                        </div>
                                                    </div>
                                                    <span className={cn('px-2.5 py-1 rounded-lg text-xs font-black',
                                                        activeFilter?.type === 'all_pending' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600')}>
                                                        {stats?.pending_count ?? 0}
                                                    </span>
                                                </button>
                                            </div>
                                        )}

                                        {filterTab === 'tag' && (
                                            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                                {tags.length === 0 && (
                                                    <p className="text-xs text-slate-600 text-center py-6">Nenhuma tag encontrada na base.</p>
                                                )}
                                                {tags.map(tag => (
                                                    <button key={tag.name} onClick={() => selectFilter({ type: 'tag', label: tag.name, count: Number(tag.count) })}
                                                        className={cn('w-full flex items-center justify-between p-3 rounded-xl border transition-all group',
                                                            activeFilter?.label === tag.name
                                                                ? 'border-orange-300 bg-orange-50 ring-2 ring-orange-200'
                                                                : 'border-slate-200 bg-gradient-soft border border-orange-100 shadow-glass hover:border-orange-200 hover:bg-orange-50/50')}>
                                                        <div className="flex items-center gap-2">
                                                            <Tags size={14} className={activeFilter?.label === tag.name ? 'text-orange-500' : 'text-slate-600 group-hover:text-orange-400'} />
                                                            <span className="text-sm font-bold text-slate-700">{tag.name}</span>
                                                        </div>
                                                        <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-black',
                                                            activeFilter?.label === tag.name ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600')}>
                                                            {tag.count}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {filterTab === 'unitary' && (
                                            <div>
                                                <div className="relative mb-3">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={15} />
                                                    <input type="text" placeholder="Nome, email ou empresa..."
                                                        className="w-full pl-9 pr-3 py-2.5 bg-gradient-soft border border-orange-100 shadow-glass border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-orange-100 outline-none placeholder:text-slate-600"
                                                        value={searchTerm}
                                                        onChange={e => setSearchTerm(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter' && searchTerm) {
                                                                selectFilter({ type: 'lead', label: searchTerm, count: 1 });
                                                            }
                                                        }} />
                                                </div>
                                                <p className="text-[10px] text-slate-600 font-medium">Pressione Enter para buscar e visualizar.</p>
                                            </div>
                                        )}

                                        {/* Selected Filter */}
                                        {activeFilter && (
                                            <div className="mt-4 pt-4 border-t border-slate-100">
                                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Selecionado</p>
                                                <div className="flex items-center gap-2 p-2.5 bg-slate-900 rounded-xl text-white">
                                                    {activeFilter.type === 'all_pending' ? <ListFilter size={13} className="text-slate-600" /> :
                                                        activeFilter.type === 'tag' ? <Tags size={13} className="text-slate-600" /> :
                                                            <User size={13} className="text-slate-600" />}
                                                    <span className="text-xs font-black flex-1">{activeFilter.label}</span>
                                                    <span className="text-[10px] text-slate-600 font-bold">{activeFilter.count} leads</span>
                                                    <button onClick={() => { setActiveFilter(null); setLeadsPreview([]); }}
                                                        className="p-0.5 hover:bg-slate-700 rounded text-slate-600 hover:text-red-400 transition-colors">
                                                        <X size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Lead preview */}
                                    <div className="col-span-7 bg-gradient-soft border border-orange-200/50 shadow-glass rounded-3xl p-4 min-h-[280px]">
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">Preview dos Leads</p>
                                        {!activeFilter && (
                                            <div className="flex flex-col items-center justify-center h-48 text-center gap-2 text-slate-600">
                                                <Users size={28} strokeWidth={1.5} />
                                                <p className="text-xs font-medium">Selecione um filtro para ver<br />um preview dos leads</p>
                                            </div>
                                        )}
                                        {activeFilter && previewLoading && (
                                            <div className="flex items-center justify-center h-48">
                                                <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        )}
                                        {activeFilter && !previewLoading && leadsPreview.length === 0 && (
                                            <div className="flex flex-col items-center justify-center h-48 text-center gap-2 text-slate-600">
                                                <CheckCircle2 size={24} />
                                                <p className="text-xs font-medium">Nenhum lead encontrado para este filtro</p>
                                            </div>
                                        )}
                                        {!previewLoading && leadsPreview.length > 0 && (
                                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                                {leadsPreview.map(lead => (
                                                    <div key={lead.id} className="flex items-center gap-3 p-2.5 bg-gradient-soft border border-orange-100 shadow-glass rounded-lg border border-slate-100 shadow-sm">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 text-xs font-black">
                                                            {lead.full_name?.charAt(0) ?? '?'}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-bold text-slate-800 truncate">{lead.full_name}</p>
                                                            <p className="text-[10px] text-slate-600 truncate flex items-center gap-1">
                                                                <Building2 size={9} />{lead.company_name || '—'}
                                                            </p>
                                                        </div>
                                                        <span className={cn('px-2 py-0.5 rounded-md text-[9px] font-black uppercase shrink-0',
                                                            lead.qualification_status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>
                                                            {lead.qualification_status}
                                                        </span>
                                                    </div>
                                                ))}
                                                {activeFilter?.count && activeFilter.count > 15 && (
                                                    <p className="text-center text-[10px] text-slate-600 py-1 font-medium">
                                                        +{activeFilter.count - 15} leads adicionais
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer nav */}
                            <div className="flex justify-end mt-4">
                                <button onClick={() => setStep(1)} disabled={!canAdvanceStep0}
                                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-sm hover:bg-slate-800 disabled:opacity-40 transition-all shadow-sm">
                                    Próximo: Regras de Cadência <ChevronRight size={16} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── STEP 1: Cadence Config ─── */}
                    {step === 1 && (
                        <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <div className="grid grid-cols-12 gap-5">
                                {/* Left: flow */}
                                <div className="col-span-8 bg-gradient-soft border border-orange-100 shadow-glass border border-slate-200 rounded-2xl p-5 shadow-sm">
                                    <div className="flex items-center justify-between mb-5">
                                        <div>
                                            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                                <GitBranch size={18} className="text-slate-600" /> Fluxo Operacional
                                            </h3>
                                            <p className="text-[10px] text-slate-600 font-medium mt-0.5">Configure os canais e intervalos de contato</p>
                                        </div>
                                        <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 text-emerald-700">
                                            <Target size={13} />
                                            <span className="text-xs font-black">Impacto: {totalLeads} Leads</span>
                                        </div>
                                    </div>

                                    {/* Cadence name */}
                                    <div className="mb-4">
                                        <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Nome da Cadência</label>
                                        <input type="text" value={config.name} onChange={e => setConfig(c => ({ ...c, name: e.target.value }))}
                                            className="w-full px-3 py-2.5 bg-white/50 border border-orange-200/50 rounded-2xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-orange-300 outline-none" />
                                    </div>

                                    <div className="space-y-1">
                                        <ChannelRow label="Cold Call Telefone" icon={<Phone size={15} />} iconBg="bg-blue-50 text-blue-600"
                                            config={config.phone} onToggle={() => toggleChannel('phone')} onUpdate={d => updateRoll('phone', d)} />
                                        <GapRow val={config.gaps[0]} active={config.phone.active && config.whatsapp.active} onChange={v => updateGap(0, v)} />
                                        <ChannelRow label="Mensagem WhatsApp" icon={<MessageSquare size={15} />} iconBg="bg-emerald-50 text-emerald-600"
                                            config={config.whatsapp} onToggle={() => toggleChannel('whatsapp')} onUpdate={d => updateRoll('whatsapp', d)} />
                                        <GapRow val={config.gaps[1]} active={config.whatsapp.active && config.email.active} onChange={v => updateGap(1, v)} />
                                        <ChannelRow label="Direct Mail / Marketing" icon={<Mail size={15} />} iconBg="bg-purple-50 text-purple-600"
                                            config={config.email} onToggle={() => toggleChannel('email')} onUpdate={d => updateRoll('email', d)} />
                                    </div>

                                    {/* Infinity mode */}
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-slate-700">Modo Infinito</p>
                                            <p className="text-[10px] text-slate-600">A cadência se repete até o lead responder</p>
                                        </div>
                                        <button onClick={() => setInfinityMode(!infinityMode)}
                                            className={cn('relative w-11 h-6 rounded-full transition-all', infinityMode ? 'bg-slate-900' : 'bg-slate-200')}>
                                            <div className={cn('absolute top-1 w-4 h-4 bg-gradient-soft border border-orange-100 shadow-glass rounded-full shadow transition-all', infinityMode ? 'left-6' : 'left-1')} />
                                        </button>
                                    </div>
                                </div>

                                {/* Right: presets */}
                                <div className="col-span-4 space-y-3">
                                    <div className="bg-gradient-soft border border-orange-100 shadow-glass border border-slate-200 rounded-2xl p-5 shadow-sm">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Zap size={15} className="text-orange-500" />
                                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Modelos Rápidos</h4>
                                        </div>
                                        <div className="space-y-2">
                                            {PRESETS.map(p => (
                                                <button key={p.name} onClick={() => setConfig(c => ({
                                                    ...c, name: p.name,
                                                    phone: { ...c.phone, rolls: p.config.phone, active: p.config.phone > 0 },
                                                    whatsapp: { ...c.whatsapp, rolls: p.config.whatsapp, active: p.config.whatsapp > 0 },
                                                    email: { ...c.email, rolls: p.config.email, active: p.config.email > 0 },
                                                }))}
                                                    className={cn('w-full p-3 border rounded-xl hover:shadow-md transition-all flex items-center gap-3',
                                                        config.name === p.name ? 'border-slate-900 bg-slate-900 text-white shadow-md' : 'border-slate-100 bg-slate-50 hover:bg-gradient-soft border border-orange-100 shadow-glass hover:border-slate-200')}>
                                                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', config.name === p.name ? 'bg-gradient-soft border border-orange-100 shadow-glass/10' : `${p.bgColor} ${p.color}`)}>
                                                        <p.icon size={14} />
                                                    </div>
                                                    <span className="font-black text-xs">{p.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Resumo Card e Regras de Agendamento */}
                                    <div className="space-y-3">
                                        {/* Resumo card */}
                                        <div className="bg-gradient-soft border border-orange-200/50 rounded-3xl p-4 shadow-glass text-xs space-y-2">
                                            <p className="font-black text-slate-600 uppercase tracking-widest text-[9px] mb-2">Resumo</p>
                                            {[
                                                { label: 'Telefone', val: config.phone.active ? `${config.phone.rolls}x` : 'Off', active: config.phone.active },
                                                { label: 'WhatsApp', val: config.whatsapp.active ? `${config.whatsapp.rolls}x` : 'Off', active: config.whatsapp.active },
                                                { label: 'Email', val: config.email.active ? `${config.email.rolls}x` : 'Off', active: config.email.active },
                                            ].map(r => (
                                                <div key={r.label} className="flex justify-between items-center">
                                                    <span className="text-slate-600 font-medium">{r.label}</span>
                                                    <span className={cn('font-black', r.active ? 'text-slate-800' : 'text-slate-300')}>{r.val}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Regras de Agendamento */}
                                        <div className="bg-gradient-soft border border-orange-100 shadow-glass border border-slate-200 rounded-2xl p-4 shadow-sm">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Clock3 size={14} className="text-indigo-500" />
                                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Agendamento</h4>
                                            </div>
                                            <div className="space-y-1.5">
                                                {[
                                                    { id: 'sugerido', label: 'Horários Definidos', desc: 'Configurável', val: 'Sugerido Pela Plataforma', hasConfig: true },
                                                    { id: 'automatico', label: 'Automático', desc: 'Por período', val: 'Automático Pelo Período', hasConfig: false },
                                                    { id: 'sdr', label: 'SDR define', desc: 'Livre', val: 'Editável Pelo SDR', hasConfig: false }
                                                ].map(rule => (
                                                    <div key={rule.id} className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setConfig(c => ({ ...c, schedulingRule: rule.val }))}
                                                            className={cn(
                                                                'flex-1 px-3 py-2 border rounded-xl text-left transition-all flex items-center gap-2.5',
                                                                config.schedulingRule === rule.val
                                                                    ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200 shadow-sm'
                                                                    : 'border-slate-100 bg-gradient-soft border border-orange-100 shadow-glass hover:border-slate-200 hover:bg-slate-50'
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                'w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                                                                config.schedulingRule === rule.val ? 'border-indigo-600' : 'border-slate-300'
                                                            )}>
                                                                {config.schedulingRule === rule.val && (
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <span className={cn(
                                                                    'block text-xs font-black leading-tight',
                                                                    config.schedulingRule === rule.val ? 'text-indigo-900' : 'text-slate-700'
                                                                )}>{rule.label}</span>
                                                                <span className="block text-[9px] text-slate-600 font-medium">{rule.desc}</span>
                                                            </div>
                                                        </button>
                                                        {rule.hasConfig && (
                                                            <button
                                                                onClick={() => setShowSchedulingModal(true)}
                                                                className={cn(
                                                                    'shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center transition-all',
                                                                    config.schedulingRule === rule.val
                                                                        ? 'border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                                                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-700'
                                                                )}
                                                                title="Configurar períodos"
                                                            >
                                                                <Clock3 size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            {config.schedulingRule === 'Sugerido Pela Plataforma' && selectedTimeSlots.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-slate-100">
                                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Períodos ativos</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {selectedTimeSlots.map(s => (
                                                            <span key={s} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[9px] font-black capitalize">{s}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between mt-5">
                                <button onClick={() => setStep(0)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-soft border border-orange-100 shadow-glass text-slate-600 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">
                                    <ArrowLeft size={15} /> Voltar
                                </button>
                                <button onClick={() => setStep(2)} disabled={!canAdvanceStep1}
                                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-sm hover:bg-slate-800 disabled:opacity-40 transition-all shadow-sm">
                                    Próximo: Atribuir SDRs <ChevronRight size={16} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── STEP 2: SDR Assignment ─── */}
                    {step === 2 && (
                        <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <div className="bg-gradient-soft border border-orange-100 shadow-glass border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-base font-black text-slate-900 flex items-center gap-2 mb-1">
                                    <Users size={18} className="text-slate-600" /> Atribuição de SDRs
                                </h3>
                                <p className="text-xs text-slate-600 mb-5">Selecione os SDRs e distribua a porcentagem dos <strong>{totalLeads} leads</strong>.</p>

                                {sdrs.length === 0 && (
                                    <div className="flex items-center justify-center h-32 text-slate-600">
                                        <div className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin mr-2" />
                                        Carregando SDRs...
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {sdrs.map(sdr => {
                                        const assignment = assignments.find(a => a.sdr_id === sdr.id);
                                        const isSelected = !!assignment;
                                        return (
                                            <div key={sdr.id} className={cn(
                                                'flex items-center gap-4 p-4 rounded-xl border transition-all',
                                                isSelected ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-200 bg-gradient-soft border border-orange-100 shadow-glass hover:border-slate-300')}>
                                                {/* Select toggle */}
                                                <div onClick={() => toggleSDR(sdr)} className={cn(
                                                    'cursor-pointer w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all shrink-0',
                                                    isSelected ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-200 hover:border-slate-400')}>
                                                    {isSelected && <Check size={12} strokeWidth={4} />}
                                                </div>

                                                {/* Avatar */}
                                                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black text-sm shrink-0">
                                                    {sdr.full_name?.charAt(0)}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-black text-slate-800 truncate">{sdr.full_name}</p>
                                                    <p className="text-[10px] text-slate-600 truncate flex items-center gap-1">
                                                        <Briefcase size={9} /> {sdr.total_leads ?? 0} leads ativos
                                                    </p>
                                                </div>

                                                {/* Percentage */}
                                                {isSelected && (
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <input type="number" min={0} max={100}
                                                            value={assignment!.percentage}
                                                            onChange={e => updatePercentage(sdr.id, Number(e.target.value))}
                                                            className="w-16 text-center py-1.5 bg-gradient-soft border border-orange-100 shadow-glass border border-slate-200 rounded-lg text-sm font-black outline-none focus:ring-2 focus:ring-orange-100" />
                                                        <span className="text-slate-600 font-bold text-sm">%</span>
                                                    </div>
                                                )}

                                                {/* Impact */}
                                                {isSelected && (
                                                    <div className="text-right shrink-0">
                                                        <span className="text-xs font-black text-slate-700">
                                                            ~{Math.round(totalLeads * (assignment!.percentage / 100))} leads
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {assignments.length > 0 && (
                                    <div className={cn('mt-4 pt-4 border-t border-slate-100 flex items-center justify-between')}>
                                        <span className="text-xs font-bold text-slate-600">Total distribuído:</span>
                                        <span className={cn('text-sm font-black', totalPct === 100 ? 'text-emerald-600' : 'text-red-500')}>
                                            {totalPct}% {totalPct !== 100 && `(faltam ${100 - totalPct}%)`}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between mt-5">
                                <button onClick={() => setStep(1)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-soft border border-orange-100 shadow-glass text-slate-600 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">
                                    <ArrowLeft size={15} /> Voltar
                                </button>
                                <button onClick={() => setStep(3)} disabled={!canAdvanceStep2}
                                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-sm hover:bg-slate-800 disabled:opacity-40 transition-all shadow-sm">
                                    Próximo: Confirmar <ChevronRight size={16} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── STEP 3: Confirm & Apply ─── */}
                    {step === 3 && (
                        <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            {!result ? (
                                <div className="bg-gradient-soft border border-orange-100 shadow-glass border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                                    <h3 className="text-base font-black text-slate-900">Confirmar Distribuição</h3>
                                    <p className="text-sm text-slate-600">Verifique o resumo antes de aplicar. Essa ação será <strong>irreversível</strong> para os leads afetados.</p>

                                    <div className="grid grid-cols-3 gap-4">
                                        {[
                                            { label: 'Público', value: activeFilter?.label, icon: <Filter size={16} /> },
                                            { label: 'Cadência', value: config.name, icon: <GitBranch size={16} /> },
                                            { label: 'Total de Leads', value: `${totalLeads} leads`, icon: <Users size={16} /> },
                                        ].map(item => (
                                            <div key={item.label} className="p-4 bg-white/40 shadow-glass rounded-2xl border border-orange-200/50">
                                                <div className="flex items-center gap-2 text-slate-600 mb-1.5">{item.icon}<span className="text-[10px] font-black uppercase tracking-wider">{item.label}</span></div>
                                                <p className="text-sm font-black text-slate-800">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                                        <div className="bg-gradient-to-b from-orange-50/60 to-transparent px-4 py-2.5 border-b border-orange-100/60 flex items-center gap-2">
                                            <Users size={14} className="text-slate-600" />
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Distribuição por SDR</span>
                                        </div>
                                        {assignments.map(a => (
                                            <div key={a.sdr_id} className="flex items-center justify-between px-4 py-3 border-b border-slate-50 last:border-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black text-xs">
                                                        {a.sdr_name?.charAt(0)}
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-700">{a.sdr_name}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                        <div className="bg-slate-900 h-full rounded-full transition-all" style={{ width: `${a.percentage}%` }} />
                                                    </div>
                                                    <span className="text-xs font-black text-slate-600 w-12 text-right">{a.percentage}% · ~{Math.round(totalLeads * a.percentage / 100)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Cadence details */}
                                    <div className="flex gap-3">
                                        {[
                                            { ch: 'Telefone', rolls: config.phone.rolls, active: config.phone.active, color: 'blue' },
                                            { ch: 'WhatsApp', rolls: config.whatsapp.rolls, active: config.whatsapp.active, color: 'emerald' },
                                            { ch: 'Email', rolls: config.email.rolls, active: config.email.active, color: 'purple' },
                                        ].map(c => (
                                            <div key={c.ch} className={cn('flex-1 p-3 rounded-xl text-center border',
                                                c.active ? 'border-slate-200 bg-gradient-soft border border-orange-100 shadow-glass' : 'border-slate-100 bg-slate-50 opacity-40')}>
                                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{c.ch}</p>
                                                <p className="text-xl font-black text-slate-800 mt-1">{c.active ? `${c.rolls}x` : '—'}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-between">
                                        <button onClick={() => setStep(2)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-soft border border-orange-100 shadow-glass text-slate-600 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">
                                            <ArrowLeft size={15} /> Voltar
                                        </button>
                                        <button onClick={handleApply} disabled={isApplying}
                                            className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-sm hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md shadow-emerald-200">
                                            {isApplying ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={18} strokeWidth={3} />}
                                            {isApplying ? 'Aplicando...' : 'Aplicar Cadência Agora'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Success State */
                                <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                    className="bg-gradient-soft border border-orange-100 shadow-glass border border-emerald-200 rounded-2xl p-8 shadow-sm text-center space-y-4">
                                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                        <CheckCircle2 size={32} className="text-emerald-600" />
                                    </div>
                                    <h2 className="text-xl font-black text-slate-900">Cadência Aplicada com Sucesso!</h2>
                                    <p className="text-slate-600 text-sm">
                                        <strong className="text-slate-800">{result.assigned_count} leads</strong> foram distribuídos e já contam nas métricas dos SDRs.
                                    </p>

                                    <div className="flex justify-center gap-8 pt-2">
                                        {result.sdr_breakdown?.map((b: any) => {
                                            const sdr = sdrs.find(s => s.id === b.sdr_id);
                                            return (
                                                <div key={b.sdr_id} className="text-center">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black text-sm mx-auto mb-1">
                                                        {sdr?.full_name?.charAt(0)}
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-700">{sdr?.full_name?.split(' ')[0]}</p>
                                                    <p className="text-lg font-black text-emerald-600">+{b.assigned}</p>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="flex gap-3 justify-center pt-2">
                                        <button onClick={() => { setStep(0); setActiveFilter(null); setLeadsPreview([]); setResult(null); setAssignments([]); leadsAPI.getCadenceStats().then(r => r.success && setStats(r.data)); }}
                                            className="px-5 py-2.5 bg-gradient-soft border border-orange-200/50 shadow-glass text-slate-700 rounded-xl font-bold text-sm hover:bg-orange-50 transition-all font-[Comfortaa]">
                                            Nova Regra
                                        </button>
                                        <button onClick={onClose}
                                            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all">
                                            Fechar
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                </div>
            </div>

            <SchedulingRuleModal
                isOpen={showSchedulingModal}
                onClose={() => setShowSchedulingModal(false)}
                selectedSlots={selectedTimeSlots}
                onSave={(slots) => setSelectedTimeSlots(slots)}
            />
        </>
    );
};
