import React, { useState, useEffect, useMemo } from 'react';
import {
    Users, Search, Trash2, ExternalLink, ArrowLeft, Building2, Mail, Phone,
    Pause, Play, UserMinus, CheckSquare, Square, Undo2, Activity,
    Clock, RefreshCw, X, Box, PieChart, Layers, AlertCircle, ListPlus, Tag
} from 'lucide-react';
import { leadsAPI, batchesAPI } from '../../lib/api';
import type { Lead, LeadBatch } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface ManagerLeadsZoneProps {
    onClose: () => void;
}

type MainTab = 'leads' | 'lotes' | 'segmentos' | 'filtros';

export const ManagerLeadsZone: React.FC<ManagerLeadsZoneProps> = ({ onClose }) => {
    const [mainTab, setMainTab] = useState<MainTab>('leads');

    return (
        <div className="h-full flex flex-col" style={{ background: 'linear-gradient(135deg, #fdf6ec 0%, #fef3e2 50%, #fff8f0 100%)' }}>
            {/* ── HEADER ── */}
            <div className="shrink-0 px-8 pt-7 pb-0">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/70 backdrop-blur-md border border-white/80 shadow-sm text-slate-500 hover:text-slate-800 hover:bg-white hover:shadow-md transition-all"
                        >
                            <ArrowLeft size={18} strokeWidth={2.5} />
                        </button>

                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 shrink-0"
                            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                            <Users size={22} strokeWidth={2} />
                        </div>

                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                Manager <span className="text-emerald-600">Leads</span>
                            </h1>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-0.5">
                                Gestão de Base e Filtros
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Tabs */}
                <div className="flex items-center gap-2 mb-5">
                    {[
                        { id: 'leads', icon: Users, label: 'Leads' },
                        { id: 'lotes', icon: Box, label: 'Lotes (Imports)' },
                        { id: 'segmentos', icon: PieChart, label: 'Segmentos' },
                        { id: 'filtros', icon: Layers, label: 'Filtros Salvos' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setMainTab(tab.id as MainTab)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm ${
                                mainTab === tab.id
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/20 shadow-md transform scale-[1.02]'
                                    : 'bg-white/60 text-slate-500 border border-slate-200/50 hover:bg-white hover:text-slate-800 hover:scale-[1.02]'
                            }`}
                        >
                            <tab.icon size={15} />
                            {tab.label}
                        </button>
                    ))}
                </div>
                
                <div className="h-px bg-gradient-to-r from-transparent via-slate-200/60 to-transparent mb-5" />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    {mainTab === 'leads' && <LeadsView key="leads" />}
                    {mainTab === 'lotes' && <BatchesView key="lotes" />}
                    {mainTab === 'segmentos' && <PlaceholderView key="segmentos" title="Segmentos" icon={PieChart} />}
                    {mainTab === 'filtros' && <PlaceholderView key="filtros" title="Filtros Salvos" icon={Layers} />}
                </AnimatePresence>
            </div>
        </div>
    );
};

/* =========================================================
   Placeholder View
   ========================================================= */
function PlaceholderView({ title, icon: Icon }: { title: string, icon: any }) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-4 text-slate-400 bg-white/40 p-12 rounded-[2rem] border border-white max-w-sm text-center shadow-xl shadow-slate-200/20 backdrop-blur-sm">
                <div className="w-20 h-20 rounded-3xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                    <Icon size={32} className="text-slate-300" />
                </div>
                <div>
                    <div className="text-xl font-black text-slate-600 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>{title}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mt-2">Em desenvolvimento</div>
                    <p className="text-xs text-slate-500 mt-3 font-medium leading-relaxed">Esta seção será implementada em breve com os novos recursos avançados.</p>
                </div>
            </div>
        </motion.div>
    );
}

/* =========================================================
   Leads View Component
   ========================================================= */
function LeadsView() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isRefreshing, setIsRefreshing] = useState(false);

    const stats = useMemo(() => ({
        total: leads.length,
        paused: leads.filter(l => l.metadata?.is_paused).length,
        active: leads.filter(l => !l.metadata?.is_paused).length,
    }), [leads]);

    const fetchLeads = async (silent = false) => {
        if (!silent) setIsLoading(true);
        else setIsRefreshing(true);
        setSelectedIds(new Set());
        try {
            if (activeTab === 'pending') {
                const response = await leadsAPI.getSegments('status', 'Novo');
                if (response.success) setLeads(response.data);
            } else {
                const response = await leadsAPI.getActiveLeads();
                if (response.success) setLeads(response.data);
            }
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, [activeTab]);

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este lead?')) return;
        try {
            const response = await leadsAPI.deleteLead(id);
            if (response.success) setLeads(prev => prev.filter(l => l.id !== id));
        } catch (error) {
            console.error('Error deleting lead:', error);
        }
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const filteredLeads = useMemo(() => {
        let base = leads;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            base = base.filter(lead =>
                lead.full_name?.toLowerCase().includes(q) ||
                lead.company_name?.toLowerCase().includes(q) ||
                lead.email?.toLowerCase().includes(q)
            );
        }
        return base;
    }, [leads, searchQuery]);

    const toggleAll = () => {
        if (selectedIds.size === filteredLeads.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filteredLeads.map(l => l.id)));
    };

    const handleBulkAction = async (action: 'pause' | 'resume' | 'unassign') => {
        try {
            const response = await leadsAPI.bulkUpdateLeads(action, Array.from(selectedIds));
            if (response.success) fetchLeads();
        } catch (error) {
            console.error(`Error performing bulk action ${action}:`, error);
        }
    };

    const handlePullBackAll = async () => {
        if (!confirm('Isso vai remover os leads de TODOS os SDRs e devolvê-los para a fila. Confirmar?')) return;
        try {
            const response = await leadsAPI.pullBackAll();
            if (response.success) { fetchLeads(); }
        } catch (error) {
            console.error('Error pulling back leads:', error);
        }
    };

    const handleCleanAllLeads = async () => {
        const confirmPhrase = prompt('⚠️ AÇÃO IRREVERSÍVEL! Digite DELETARTUDO para confirmar a exclusão total:');
        if (confirmPhrase !== 'DELETARTUDO') return;
        try {
            const response = await leadsAPI.cleanAll();
            if (response.success) fetchLeads();
        } catch (error) {
            console.error('Error cleaning leads:', error);
        }
    };

    const isAllSelected = filteredLeads.length > 0 && selectedIds.size === filteredLeads.length;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
            <div className="shrink-0 px-8 pb-4">
                <div className="flex items-center justify-between mb-4">
                     {/* ── KPI Strip ── */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3 px-4 py-3 rounded-[1rem] border bg-white border-slate-100 shadow-sm min-w-[160px]">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-slate-500 to-slate-700 text-white shadow-sm shrink-0">
                                <Users size={18} />
                            </div>
                            <div>
                                <div className="text-xl font-black text-slate-800 leading-none">{stats.total}</div>
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mt-1">Total na visão</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3 rounded-[1rem] border bg-white border-slate-100 shadow-sm min-w-[160px]">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm shrink-0 bg-emerald-50">
                                <Activity size={18} />
                            </div>
                            <div>
                                <div className="text-xl font-black text-slate-800 leading-none">{stats.active}</div>
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mt-1">Em Cadência</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => fetchLeads(true)} className={`w-11 h-11 rounded-2xl flex items-center justify-center bg-white/70 border border-slate-100 text-slate-500 hover:text-emerald-600 shadow-sm hover:scale-[1.05] transition-transform ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} title="Atualizar">
                            <RefreshCw size={16} />
                        </button>
                        <button onClick={handlePullBackAll} className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-700 hover:bg-amber-100 transition-all text-[11px] font-black uppercase tracking-wider shadow-sm hover:scale-[1.02]">
                            <Undo2 size={15} /> Puxar Todos
                        </button>
                        <button onClick={handleCleanAllLeads} className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-50 border border-red-200/60 text-red-600 hover:bg-red-100 transition-all text-[11px] font-black uppercase tracking-wider shadow-sm hover:scale-[1.02]">
                            <Trash2 size={15} /> Limpar Base
                        </button>
                    </div>
                </div>

                {/* ── Tabs + Search Row ── */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center bg-white/60 border border-slate-100 rounded-[1.25rem] p-1 shadow-sm gap-1">
                        {([
                            { id: 'pending', label: 'Pendentes', icon: Clock },
                            { id: 'active', label: 'Em Cadência', icon: Activity },
                        ] as const).map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all ${activeTab === tab.id ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'}`}
                            >
                                <tab.icon size={13} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative flex-1 max-w-sm group">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar lead, empresa ou email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-10 py-3 bg-white/70 border border-slate-200/70 shadow-sm rounded-2xl text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100">
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Table */}
            <div className="flex-1 overflow-y-auto px-8 pb-20 custom-scrollbar">
                {selectedIds.size > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-emerald-50 border border-emerald-200/60 rounded-2xl shadow-sm"
                    >
                        <span className="text-xs font-black text-emerald-700">{selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}</span>
                        <div className="w-px h-4 bg-emerald-200" />
                        <button onClick={() => setSelectedIds(new Set())} className="text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors flex items-center gap-1">
                            <X size={11} /> Limpar seleção
                        </button>
                    </motion.div>
                )}

                <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-xl shadow-slate-200/30 rounded-3xl overflow-hidden min-h-[300px]">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100/80 bg-slate-50/50">
                                {activeTab === 'active' && (
                                    <th className="px-5 py-4 w-12 text-center">
                                        <button onClick={toggleAll} className="text-slate-400 hover:text-emerald-600 transition-colors">
                                            {isAllSelected ? <CheckSquare size={16} className="text-emerald-600" /> : <Square size={16} />}
                                        </button>
                                    </th>
                                )}
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Lead / Empresa</th>
                                {activeTab === 'pending' && <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Contato</th>}
                                {activeTab === 'active' && <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Cadência / SDR</th>}
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <tr key={i} className="border-b border-slate-50 animate-pulse">
                                        <td className="px-5 py-4" colSpan={activeTab === 'active' ? 4 : 3}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-slate-100" />
                                                <div className="flex-1">
                                                    <div className="h-3.5 bg-slate-100 rounded-lg w-40 mb-2" />
                                                    <div className="h-2.5 bg-slate-50 rounded-lg w-24" />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={activeTab === 'active' ? 4 : 3} className="px-5 py-20 text-center">
                                         <div className="flex flex-col items-center gap-3 text-slate-400">
                                            <div className="w-14 h-14 rounded-[1.5rem] bg-slate-50 border border-slate-100 flex items-center justify-center">
                                                <AlertCircle size={24} className="text-slate-300" />
                                            </div>
                                            <span className="text-sm font-bold">Nenhum lead encontrado nesta visão.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredLeads.map((lead, idx) => (
                                    <motion.tr 
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.02 }}
                                        key={lead.id} 
                                        className={`group border-b border-slate-50 transition-colors ${selectedIds.has(lead.id) ? 'bg-emerald-50/60' : 'hover:bg-slate-50/80'}`}
                                    >
                                        {activeTab === 'active' && (
                                            <td className="px-5 py-4 text-center">
                                                <button onClick={() => toggleSelection(lead.id)} className="text-slate-300 hover:text-emerald-600 transition-colors">
                                                    {selectedIds.has(lead.id) ? <CheckSquare size={16} className="text-emerald-600" /> : <Square size={16} />}
                                                </button>
                                            </td>
                                        )}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-black shadow-sm shrink-0">
                                                    {lead.full_name?.charAt(0)?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800 text-[13px]">{lead.full_name}</div>
                                                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium mt-0.5"><Building2 size={10} className="text-slate-400"/> {lead.company_name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        {activeTab === 'pending' && (
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5 leading-none"><Mail size={11} className="text-slate-400"/> {lead.email}</div>
                                                    {lead.phone && <div className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5 leading-none"><Phone size={11} className="text-slate-400"/> {lead.phone}</div>}
                                                </div>
                                            </td>
                                        )}
                                        {activeTab === 'active' && (
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="font-bold text-[12px] text-slate-700 leading-none">{lead.cadence_name || '—'}</div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none flex items-center gap-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        {(lead as any).sdr_name || 'Desconhecido'}
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex justify-end gap-1 opacity-100 group-hover:opacity-100 md:opacity-0 transition-opacity">
                                                <button className="w-8 h-8 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 inline-flex items-center justify-center transition-all">
                                                    <ExternalLink size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(lead.id)} className="w-8 h-8 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 inline-flex items-center justify-center transition-all">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

             {/* Bulk Action Bar */}
             <AnimatePresence>
             {activeTab === 'active' && selectedIds.size > 0 && (
                <motion.div 
                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-4 rounded-[1.5rem] shadow-2xl z-50 backdrop-blur-xl border border-white/20"
                    style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.98))' }}
                >
                    <div className="flex items-center gap-2 pr-5 border-r border-white/10">
                        <div className="w-7 h-7 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <CheckSquare size={14} className="text-emerald-400" />
                        </div>
                        <span className="text-base font-black text-white">{selectedIds.size}</span>
                        <span className="text-xs font-bold text-slate-400">lead{selectedIds.size > 1 ? 's' : ''}</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button onClick={() => handleBulkAction('pause')} className="px-4 py-2.5 rounded-xl bg-amber-500/15 text-amber-400 hover:bg-amber-500 hover:text-white text-xs font-black transition-all flex items-center gap-1.5 border border-amber-500/20">
                            <Pause size={13}/> Pausar
                        </button>
                        <button onClick={() => handleBulkAction('resume')} className="px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-white text-xs font-black transition-all flex items-center gap-1.5 border border-emerald-500/20">
                            <Play size={13}/> Retomar
                        </button>
                        <div className="w-px h-6 bg-white/10 mx-1" />
                        <button onClick={() => handleBulkAction('unassign')} className="px-4 py-2.5 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-white text-xs font-black transition-all flex items-center gap-1.5 border border-red-500/20">
                            <UserMinus size={13}/> Desatribuir
                        </button>
                    </div>
                    
                    <button onClick={() => setSelectedIds(new Set())} className="ml-2 w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                        <X size={15}/>
                    </button>
                </motion.div>
            )}
            </AnimatePresence>
        </motion.div>
    );
}

/* =========================================================
   Batches View Component (The new 'Lotes' implementation)
   ========================================================= */
function BatchesView() {
    const [batches, setBatches] = useState<LeadBatch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBatch, setSelectedBatch] = useState<LeadBatch | null>(null);

    const fetchBatches = async () => {
        setIsLoading(true);
        try {
            const res = await batchesAPI.list();
            if (res.success) setBatches(res.data);
        } catch (error) {
            console.error('Error fetching batches:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBatches();
    }, []);

    const filteredBatches = useMemo(() => {
        if (!searchQuery) return batches;
        const q = searchQuery.toLowerCase();
        return batches.filter(b => 
            b.name?.toLowerCase().includes(q) || 
            b.origin?.toLowerCase().includes(q) ||
            (b.tags || []).some(t => t.toLowerCase().includes(q))
        );
    }, [batches, searchQuery]);

    const handleDeleteBatch = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Deseja excluir este lote e TODOS OS LEADS vinculados a ele? Esta ação não pode ser desfeita.')) return;
        try {
            const res = await batchesAPI.delete(id, true);
            if (res.success) {
                setBatches(prev => prev.filter(b => b.id !== id));
                if (selectedBatch?.id === id) setSelectedBatch(null);
            }
        } catch (err) {
            console.error('Failed to delete batch:', err);
        }
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex relative">
            {/* Lotes List */}
            <div className={`flex flex-col h-full transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${selectedBatch ? 'w-[50%]' : 'w-full'} px-8 pb-8`}>
                <div className="flex items-center justify-between mb-5">
                    <div className="relative w-80 group">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar lotes, tags ou origem..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white/70 backdrop-blur-sm border border-slate-200/70 shadow-sm rounded-2xl text-[13px] font-bold text-slate-700 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    <div className="grid grid-cols-1 gap-3">
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="bg-white/50 border border-white rounded-[1.5rem] p-5 h-28 animate-pulse flex flex-col justify-between">
                                    <div className="flex gap-3"><div className="w-12 h-12 rounded-2xl bg-slate-100" /><div className="flex-1"><div className="h-4 bg-slate-100 rounded w-1/3 mb-2"/><div className="h-2 bg-slate-100 rounded w-1/4"/></div></div>
                                </div>
                            ))
                        ) : filteredBatches.length === 0 ? (
                            <div className="bg-white/40 border border-dashed border-slate-300 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center mt-4">
                                <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center shadow-sm mb-4">
                                    <Box size={28} className="text-slate-300" />
                                </div>
                                <h3 className="text-base font-black text-slate-700">Nenhum lote importado</h3>
                                <p className="text-[13px] font-medium text-slate-500 mt-2 max-w-[250px]">Os leads importados no LeadZone aparecerão aqui organizados por blocos.</p>
                            </div>
                        ) : (
                            filteredBatches.map((batch, idx) => {
                                const progressNum = batch.progress || (batch.total_leads > 0 ? Math.round((batch.processed_leads / batch.total_leads) * 100) : 0);
                                const isSelected = selectedBatch?.id === batch.id;
                                return (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        key={batch.id}
                                        onClick={() => setSelectedBatch(batch)}
                                        className={`group relative p-5 rounded-[1.5rem] border transition-all cursor-pointer overflow-hidden ${isSelected ? 'bg-white border-emerald-300 shadow-xl shadow-emerald-500/15 scale-[1.01]' : 'bg-white/60 border-white hover:bg-white hover:shadow-lg hover:shadow-slate-200/50'}`}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-sm transition-all ${isSelected ? 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30' : 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-400/20'}`}>
                                                    <Box size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-[15px] font-black text-slate-800 tracking-tight leading-none mb-1.5">{batch.name}</h3>
                                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-2">
                                                        <span>{new Date(batch.import_date).toLocaleDateString('pt-BR')}</span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                        <span>{batch.origin || 'Planilha'}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => handleDeleteBatch(batch.id, e)} className="w-9 h-9 rounded-[10px] bg-white border border-slate-100 shadow-sm hover:border-red-200 hover:bg-red-50 text-red-500 flex items-center justify-center transition-all z-10 hover:scale-105">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-5 bg-slate-50/50 rounded-xl p-3 border border-slate-100/50">
                                            <div className="flex items-center gap-2 shrink-0">
                                                <div className="w-6 h-6 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                                    <Users size={12} className="text-slate-500" />
                                                </div>
                                                <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider">{batch.total_leads} <span className="text-slate-400">leads</span></span>
                                            </div>
                                            
                                            {/* Progress Bar */}
                                            <div className="flex-1 flex items-center gap-3">
                                                <div className="flex-1 h-2.5 bg-slate-200/50 rounded-full overflow-hidden shadow-inner">
                                                    <div className={`h-full rounded-full transition-all duration-500 relative ${progressNum === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-400 to-orange-400'}`} style={{ width: `${progressNum}%` }}>
                                                        <div className="absolute inset-0 bg-white/20 w-full h-full" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)', backgroundSize: '1rem 1rem' }} />
                                                    </div>
                                                </div>
                                                <span className={`text-[12px] font-black w-10 text-right ${progressNum === 100 ? 'text-emerald-600' : 'text-slate-500'}`}>{progressNum}%</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Side Modal for Batch Details */}
            <AnimatePresence>
                {selectedBatch && (
                    <motion.div 
                        initial={{ x: '100%', opacity: 0, scale: 0.98 }}
                        animate={{ x: 0, opacity: 1, scale: 1 }}
                        exit={{ x: '100%', opacity: 0, transition: { duration: 0.2 } }}
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                        className="absolute right-0 top-0 bottom-0 w-[50%] bg-white/95 backdrop-blur-3xl shadow-[-20px_0_40px_rgba(0,0,0,0.08)] border-l border-white/80 z-20 flex flex-col rounded-l-[2.5rem] overflow-hidden"
                    >
                        <BatchDetailsPanel batch={selectedBatch} onClose={() => setSelectedBatch(null)} />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

/* =========================================================
   Batch Details Panel (Modal Component)
   ========================================================= */
function BatchDetailsPanel({ batch, onClose }: { batch: LeadBatch, onClose: () => void }) {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        // Mock fetch leads by batch 
        const fetchBatchLeads = async () => {
            setLoading(true);
            try {
                // Future Implementation: use a dedicated route like `/batches/${batch.id}/leads`
                // Defaulting to getActiveLeads to populate mock UI
                const res = await leadsAPI.getActiveLeads();
                if (res.success) {
                    setLeads(res.data.slice(0, batch.total_leads < 30 ? batch.total_leads : 30));
                }
            } catch (err) {
            } finally {
                setLoading(false);
            }
        }
        fetchBatchLeads();
    }, [batch.id]);

    const filtered = leads.filter(l => l.full_name?.toLowerCase().includes(search.toLowerCase()) || l.company_name?.toLowerCase().includes(search.toLowerCase()));

    const progress = batch.progress || (batch.total_leads > 0 ? Math.round((batch.processed_leads / batch.total_leads) * 100) : 0);

    return (
        <div className="h-full flex flex-col bg-slate-50/30">
            {/* Header */}
            <div className="p-8 pb-6 border-b border-slate-100 bg-white">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                {batch.name}
                            </h2>
                            {progress === 100 && (
                                <span className="px-2.5 py-1 rounded-[8px] bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                    <CheckSquare size={10} /> Concluído
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            <span>{new Date(batch.import_date).toLocaleDateString('pt-BR')}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className="text-slate-500">{batch.origin || 'Importação Manual'}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100/80 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors shadow-sm">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm shadow-slate-200/50 flex items-center justify-between">
                        <div>
                            <div className="text-3xl font-black text-slate-800 leading-none mb-2">{batch.total_leads}</div>
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Leads</div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                            <Users size={20} className="text-indigo-500" />
                        </div>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm shadow-slate-200/50 flex items-center justify-between">
                        <div>
                            <div className="text-3xl font-black text-slate-800 leading-none mb-2">{progress}%</div>
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Trabalhados</div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
                            <Activity size={20} className="text-emerald-500" />
                        </div>
                    </div>
                </div>

                {/* Tags Row */}
                <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm shadow-slate-200/50 mb-8">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-1.5">
                        <Tag size={12}/> Tags do Lote
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                        {batch.tags?.map((t, i) => (
                            <span key={i} className="px-3 py-1.5 bg-indigo-50/80 text-indigo-600 rounded-xl text-[11px] font-black uppercase tracking-wider border border-indigo-100/60 shadow-sm flex items-center gap-1">
                                <Tag size={10} className="opacity-50" />
                                {t}
                            </span>
                        ))}
                        <button className="px-3 py-1.5 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-[11px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors flex items-center gap-1.5 border-spacing-2">
                            <ListPlus size={12} /> Adicionar Tag
                        </button>
                    </div>
                </div>

                {/* Inner Leads Table */}
                <div>
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.15em] flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" /> Leads Vinculados
                        </h3>
                        <div className="relative w-64 group">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar neste lote..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 shadow-sm rounded-[12px] text-xs font-bold text-slate-700 outline-none focus:border-emerald-300 transition-all placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-[1.5rem] shadow-sm shadow-slate-200/40 relative overflow-hidden">
                        {/* Selected Actions Bar inside Modal */}
                        <AnimatePresence>
                        {selectedIds.size > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="absolute top-0 left-0 right-0 bg-slate-800 text-white px-5 py-3 flex items-center justify-between z-10 shadow-lg"
                            >
                                <span className="text-xs font-black">{selectedIds.size} selecionados</span>
                                <div className="flex items-center gap-2">
                                    <button className="px-3 py-1.5 bg-white/10 rounded-xl hover:bg-white/20 text-[11px] font-black uppercase tracking-wider transition-colors border border-white/5">Aplicar Tag</button>
                                    <button className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-emerald-500 hover:text-white transition-colors">Atribuir Cadência</button>
                                    <button onClick={() => setSelectedIds(new Set())} className="ml-2 bg-white/5 w-7 h-7 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"><X size={13}/></button>
                                </div>
                            </motion.div>
                        )}
                        </AnimatePresence>

                        <table className="w-full text-left">
                            <thead className="bg-slate-50/80 border-b border-slate-100">
                                <tr>
                                    <th className="px-5 py-4 w-12 text-center">
                                        <button className="text-slate-300 hover:text-emerald-500 transition-colors"
                                            onClick={() => {
                                                if (selectedIds.size === filtered.length) setSelectedIds(new Set());
                                                else setSelectedIds(new Set(filtered.map(l => l.id)));
                                            }}
                                        >
                                            {selectedIds.size === filtered.length && filtered.length > 0 ? <CheckSquare size={15} className="text-emerald-500"/> : <Square size={15}/>}
                                        </button>
                                    </th>
                                    <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Lead</th>
                                    <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Empresa</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="p-4" colSpan={3}><div className="h-4 bg-slate-100 rounded w-1/2"></div></td>
                                        </tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={3} className="px-5 py-12 text-center text-slate-400 text-xs font-bold">Nenhum lead encontrado neste lote.</td></tr>
                                ) : (
                                    filtered.map(lead => {
                                        const isSel = selectedIds.has(lead.id);
                                        return (
                                            <tr key={lead.id} className={`group hover:bg-slate-50/80 transition-colors cursor-pointer ${isSel ? 'bg-emerald-50/40' : ''}`}
                                                onClick={() => {
                                                    const newSet = new Set(selectedIds);
                                                    if(newSet.has(lead.id)) newSet.delete(lead.id); else newSet.add(lead.id);
                                                    setSelectedIds(newSet);
                                                }}
                                            >
                                                <td className="px-5 py-3.5 text-center">
                                                    <span className="text-slate-300 group-hover:text-emerald-400 transition-colors">
                                                        {isSel ? <CheckSquare size={15} className="text-emerald-500"/> : <Square size={15} />}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-500 font-black text-xs shadow-sm shadow-slate-200/50">
                                                            {lead.full_name?.charAt(0)?.toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="text-[13px] font-bold text-slate-800 leading-tight">{lead.full_name}</div>
                                                            <div className="text-[10px] text-slate-400 font-medium mt-0.5">{lead.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-[12px] text-slate-600 font-bold">{lead.company_name}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
