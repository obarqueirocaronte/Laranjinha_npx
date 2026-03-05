import React, { useState, useEffect } from 'react';
import {
    Users, Search, Filter, Trash2, ExternalLink, ArrowRight, Building2, Mail, Phone, Pause, Play, UserMinus, CheckSquare, Square
} from 'lucide-react';
import { leadsAPI } from '../../lib/api';
import type { Lead } from '../../types';

interface ManagerLeadsZoneProps {
    onClose: () => void;
}

export const ManagerLeadsZone: React.FC<ManagerLeadsZoneProps> = ({ onClose }) => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const fetchLeads = async () => {
        setIsLoading(true);
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
        }
    };

    useEffect(() => {
        fetchLeads();
    }, [activeTab]);

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este lead?')) return;
        try {
            const response = await leadsAPI.deleteLead(id);
            if (response.success) {
                setLeads(prev => prev.filter(l => l.id !== id));
            }
        } catch (error) {
            console.error('Error deleting lead:', error);
            alert('Erro ao excluir lead.');
        }
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const filteredLeads = leads.filter(lead =>
        lead.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleAll = () => {
        if (selectedIds.size === filteredLeads.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredLeads.map(l => l.id)));
        }
    };

    const handleBulkAction = async (action: 'pause' | 'resume' | 'unassign') => {
        try {
            const response = await leadsAPI.bulkUpdateLeads(action, Array.from(selectedIds));
            if (response.success) {
                fetchLeads(); // Refresh list after bulk update
            }
        } catch (error) {
            console.error(`Error performing bulk action ${action}:`, error);
            alert('Erro ao processar ação em massa.');
        }
    };

    const isAllSelected = filteredLeads.length > 0 && selectedIds.size === filteredLeads.length;

    return (
        <div className="h-full flex flex-col relative bg-transparent">
            {/* Header Area */}
            <div className="p-8 pb-4">
                <div className="flex items-center justify-between mb-6 max-w-7xl mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/40 backdrop-blur-md border border-white/60 shadow-sm text-slate-700 hover:text-emerald-600 transition-all group shrink-0">
                            <ArrowRight className="rotate-180 transition-transform group-hover:-translate-x-1" size={24} strokeWidth={2.5} />
                        </button>
                        <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow border border-white/20 shrink-0"
                            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
                        >
                            <Users size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-2" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                <span className="text-slate-700 opacity-90">Manager</span>
                                <span>Leads</span>
                            </h2>
                            <p className="text-[11px] text-slate-500 font-extrabold mt-1 tracking-[0.1em] uppercase" style={{ fontFamily: 'Comfortaa, cursive' }}>Gestão de Base e Filtros</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar lead, empresa ou email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-gradient-soft border border-orange-200/50 shadow-sm rounded-xl text-sm focus:border-orange-400 outline-none transition-all w-64"
                                style={{ fontFamily: 'Comfortaa, cursive' }}
                            />
                        </div>
                        <button className="p-2 bg-gradient-soft border border-orange-200/50 shadow-sm rounded-xl text-slate-600 hover:bg-orange-50/80 transition-all">
                            <Filter size={20} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="max-w-7xl mx-auto w-full flex border-b border-orange-100/60 mb-2">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-6 py-3 font-semibold text-sm transition-colors relative ${activeTab === 'pending' ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-700'}`}
                    >
                        Leads Pendentes
                        {activeTab === 'pending' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-t-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-6 py-3 font-semibold text-sm transition-colors relative ${activeTab === 'active' ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-700'}`}
                    >
                        Em Cadência
                        {activeTab === 'active' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-t-full" />}
                    </button>
                </div>
            </div>

            {/* List Area */}
            <div className="flex-1 overflow-y-auto px-8 pb-24 custom-scrollbar">
                <div className="max-w-7xl mx-auto w-full bg-gradient-soft border border-orange-200/50 shadow-glass rounded-3xl overflow-hidden backdrop-blur-md">
                    <table className="w-full text-left">
                        <thead className="bg-gradient-to-b from-orange-50/60 to-transparent border-b border-orange-100/60">
                            <tr>
                                {activeTab === 'active' && (
                                    <th className="px-6 py-4 w-12 text-center">
                                        <button onClick={toggleAll} className="text-slate-600 hover:text-emerald-600 transition-colors">
                                            {isAllSelected ? <CheckSquare size={18} className="text-emerald-600" /> : <Square size={18} />}
                                        </button>
                                    </th>
                                )}
                                <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Lead / Empresa</th>
                                {activeTab === 'pending' && <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Contato</th>}
                                {activeTab === 'active' && <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Status da Cadência</th>}
                                {activeTab === 'active' && <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">SDR Responsável</th>}
                                <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-orange-100/40">
                            {isLoading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={activeTab === 'active' ? 5 : 3} className="px-6 py-8">
                                            <div className="h-4 bg-orange-100/30 rounded-lg w-1/3 mb-2" />
                                            <div className="h-3 bg-orange-50/40 rounded-lg w-1/4" />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={activeTab === 'active' ? 5 : 3} className="px-6 py-20 text-center text-slate-600 font-medium">
                                        Nenhum lead encontrado nesta visão.
                                    </td>
                                </tr>
                            ) : (
                                filteredLeads.map((lead) => (
                                    <tr
                                        key={lead.id}
                                        className={`group transition-all ${selectedIds.has(lead.id) ? 'bg-emerald-50/50' : 'hover:bg-orange-50/50'} ${lead.metadata?.is_paused ? 'opacity-60 saturate-50' : ''}`}
                                    >
                                        {activeTab === 'active' && (
                                            <td className="px-6 py-4 text-center">
                                                <button onClick={() => toggleSelection(lead.id)} className="text-slate-600 hover:text-emerald-600 transition-colors">
                                                    {selectedIds.has(lead.id) ? <CheckSquare size={18} className="text-emerald-600" /> : <Square size={18} />}
                                                </button>
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800 flex items-center gap-2" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                                {lead.full_name}
                                                {lead.metadata?.is_paused && (
                                                    <span className="bg-amber-100 text-amber-700 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">Pausado</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1 uppercase font-semibold">
                                                <Building2 size={12} className="text-slate-400" />
                                                {lead.company_name}
                                            </div>
                                        </td>

                                        {activeTab === 'pending' && (
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                                        <Mail size={12} className="text-slate-400" />
                                                        {lead.email}
                                                    </div>
                                                    {lead.phone && (
                                                        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                                            <Phone size={12} className="text-slate-400" />
                                                            {lead.phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        )}

                                        {activeTab === 'active' && (
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-sm text-slate-700">{lead.cadence_name}</div>
                                                <div className="text-xs text-slate-600 font-medium mt-1">Etapa: <span className="text-emerald-600 font-bold">{(lead as any).current_column || 'Iniciando'}</span></div>
                                            </td>
                                        )}

                                        {activeTab === 'active' && (
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-sm text-slate-700">{(lead as any).sdr_name || 'Desconhecido'}</div>
                                            </td>
                                        )}

                                        <td className="px-6 py-4 text-right">
                                            <div className={`flex items-center justify-end gap-2 transition-opacity ${selectedIds.has(lead.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                <button className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                                                    <ExternalLink size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(lead.id)}
                                                    className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Floating Bulk Action Bar */}
            {activeTab === 'active' && selectedIds.size > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gradient-to-br from-orange-600 to-orange-700 text-white px-6 py-4 rounded-[28px] shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-8 border border-orange-500/50 backdrop-blur-md">
                    <span className="font-bold text-sm bg-gradient-soft border border-orange-100 shadow-glass/10 px-3 py-1.5 rounded-lg border border-white/10">
                        {selectedIds.size} {selectedIds.size === 1 ? 'Lead' : 'Leads'}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleBulkAction('pause')}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white rounded-xl text-sm font-bold transition-all shadow-sm"
                            style={{ fontFamily: 'Comfortaa, cursive' }}
                        >
                            <Pause size={16} /> Pausar
                        </button>
                        <button
                            onClick={() => handleBulkAction('resume')}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-xl text-sm font-bold transition-all"
                        >
                            <Play size={16} /> Retomar
                        </button>
                        <div className="w-px h-6 bg-gradient-soft border border-orange-100 shadow-glass/20 mx-2" />
                        <button
                            onClick={() => handleBulkAction('unassign')}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white/80 hover:bg-red-500 hover:text-white rounded-xl text-sm font-bold transition-all"
                        >
                            <UserMinus size={16} /> Remover
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
