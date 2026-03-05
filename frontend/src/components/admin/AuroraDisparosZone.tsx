import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare, Plus, Search, Trash2, EyeOff, ShieldAlert,
    ShieldCheck, Zap, ArrowRight, Loader2, Info, AlertCircle
} from 'lucide-react';
import { auroraAPI, leadsAPI } from '../../lib/api';
import { cn } from '../../lib/utils';

interface AuroraDisparosZoneProps {
    // No specific props needed for now as it handles its own state
}

interface TemplateRule {
    id: string;
    templateId: string;
    alias: string;
    columnId: string;
    status: 'active' | 'blocked' | 'hidden';
    lastModified: string;
}

export const AuroraDisparosZone: React.FC<AuroraDisparosZoneProps> = () => {
    const [rules, setRules] = useState<TemplateRule[]>([
        { id: '1', templateId: '1a2b3c', alias: 'Boas vindas Outbound', columnId: 'col-1', status: 'active', lastModified: '2024-03-03' }
    ]);
    const [columns, setColumns] = useState<any[]>([]);
    const [searchId, setSearchId] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [foundTemplate, setFoundTemplate] = useState<any>(null);
    const [newRuleData, setNewRuleData] = useState({ alias: '', columnId: '' });

    useEffect(() => {
        const fetchColumns = async () => {
            try {
                const response = await leadsAPI.getColumns();
                if (response.success && Array.isArray(response.data)) {
                    setColumns(response.data);
                } else {
                    setColumns([]);
                }
            } catch (err) {
                console.error('Erro ao buscar colunas do pipeline', err);
            }
        };
        fetchColumns();
    }, []);

    const handleSearch = async () => {
        if (!searchId) return;
        setIsSearching(true);
        try {
            const response = await auroraAPI.getTemplateById(searchId);
            if (response.success && response.data) {
                setFoundTemplate(response.data);
                setShowModal(true);
            }
        } catch (err) {
            console.error('Template não encontrado', err);
        } finally {
            setIsSearching(false);
        }
    };

    const addRule = () => {
        const newRule: TemplateRule = {
            id: Math.random().toString(36).substr(2, 9),
            templateId: foundTemplate.id,
            alias: newRuleData.alias || foundTemplate.name,
            columnId: newRuleData.columnId,
            status: 'active',
            lastModified: new Date().toISOString().split('T')[0]
        };
        setRules([...rules, newRule]);
        setShowModal(false);
        setSearchId('');
        setFoundTemplate(null);
        setNewRuleData({ alias: '', columnId: '' });
    };

    const toggleStatus = (id: string, newStatus: TemplateRule['status']) => {
        setRules(rules.map(r => r.id === id ? { ...r, status: newStatus } : r));
    };

    const deleteRule = (id: string) => {
        setRules(rules.filter(r => r.id !== id));
    };

    return (
        <div className="flex flex-col gap-6 p-2 animate-in fade-in duration-500">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[32px] shadow-glass relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-xl">
                        <Zap size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Registro de Disparos</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Vincule IDs do Aurora a Gatilhos do Pipeline</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-initial">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="ID do Template Aurora..."
                            value={searchId}
                            onChange={(e) => setSearchId(e.target.value)}
                            className="pl-10 pr-4 py-3 bg-white/70 border border-slate-200 rounded-2xl w-full md:w-64 text-sm font-bold shadow-sm focus:ring-2 focus:ring-violet-300 outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={isSearching || !searchId}
                        className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                        {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        Configurar ID
                    </button>
                </div>
            </div>

            {/* Rules List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                    {rules.map((rule) => {
                        const column = columns.find(c => c.id === rule.columnId);
                        return (
                            <motion.div
                                key={rule.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={cn(
                                    "p-6 bg-white/60 backdrop-blur-md border rounded-[32px] shadow-glass flex flex-col gap-4 relative overflow-hidden transition-all duration-300",
                                    rule.status === 'blocked' ? "border-red-100 grayscale-[0.3]" :
                                        rule.status === 'hidden' ? "border-slate-100 opacity-60" : "border-white/60"
                                )}
                            >
                                <div className="flex items-start justify-between relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shadow-sm",
                                            rule.status === 'active' ? "bg-violet-500" : "bg-slate-400"
                                        )}>
                                            <MessageSquare size={18} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-800 text-sm tracking-tight">{rule.alias}</h4>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">ID: {rule.templateId}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => toggleStatus(rule.id, rule.status === 'hidden' ? 'active' : 'hidden')}
                                            className={cn("p-2 rounded-lg transition-colors", rule.status === 'hidden' ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-100")}
                                            title={rule.status === 'hidden' ? "Mostrar" : "Ocultar da Interface"}
                                        >
                                            <EyeOff size={16} />
                                        </button>
                                        <button
                                            onClick={() => toggleStatus(rule.id, rule.status === 'blocked' ? 'active' : 'blocked')}
                                            className={cn("p-2 rounded-lg transition-colors border", rule.status === 'blocked' ? "bg-red-500 text-white border-red-500" : "text-slate-400 hover:bg-red-50 hover:text-red-500 border-transparent")}
                                            title={rule.status === 'blocked' ? "Desbloquear" : "Bloquear Gatilho"}
                                        >
                                            {rule.status === 'blocked' ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                                        </button>
                                        <button
                                            onClick={() => deleteRule(rule.id)}
                                            className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-white/40 p-3 rounded-2xl border border-white/50 border-dashed relative z-10">
                                    <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                        <Zap size={14} />
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Gatilho Selecionado</span>
                                        <span className="text-xs font-bold text-slate-700">Ao mover para: {column?.name || (rule.columnId === 'all' ? 'Qualquer Coluna' : 'Não definido')}</span>
                                    </div>
                                    <ArrowRight size={14} className="text-slate-300" />
                                </div>

                                {rule.status === 'blocked' && (
                                    <div className="flex items-center gap-2 text-[9px] font-black text-red-500 uppercase tracking-widest bg-red-50/50 p-2 rounded-lg border border-red-100">
                                        <AlertCircle size={10} /> Disparo Bloqueado Temporariamente
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* API Search Modal (Premium Liquid Glass) */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white/90 backdrop-blur-2xl border border-white/60 shadow-glass rounded-[40px] w-full max-w-md p-8 relative z-10 flex flex-col gap-6"
                        >
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-xl mx-auto mb-4">
                                    <MessageSquare size={32} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Template Encontrado</h3>
                                <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">Configuramos o ID <strong>{foundTemplate?.id}</strong>. Agora defina a regra de disparo abaixo.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Preview do Conteúdo</h4>
                                    <p className="text-xs text-slate-600 font-medium line-clamp-2 italic">"{foundTemplate?.content}"</p>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1 text-left">Nome da Regra (Apelido)</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Boas-vindas SDRs"
                                        value={newRuleData.alias}
                                        onChange={(e) => setNewRuleData({ ...newRuleData, alias: e.target.value })}
                                        className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 shadow-sm focus:ring-2 focus:ring-violet-300 outline-none font-bold text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1 text-left">Acionar Quando Mover Para</label>
                                    <select
                                        value={newRuleData.columnId}
                                        onChange={(e) => setNewRuleData({ ...newRuleData, columnId: e.target.value })}
                                        className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 shadow-sm focus:ring-2 focus:ring-violet-300 outline-none font-bold text-sm appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236B7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-no-repeat bg-[right_1rem_center]"
                                    >
                                        <option value="">Selecione uma etapa...</option>
                                        <option value="all">Todas as etapas</option>
                                        {columns.map(col => (
                                            <option key={col.id} value={col.id}>{col.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-[20px] font-black text-xs hover:bg-slate-200 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={addRule}
                                    disabled={!newRuleData.columnId}
                                    className="flex-2 px-6 py-4 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-[20px] font-black text-xs shadow-xl shadow-violet-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                >
                                    Confirmar Regra
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-3">
                <Info size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-indigo-700 font-medium leading-relaxed">
                    <strong>Dica Premium:</strong> Templates bloqueados não serão disparados automaticamente, mesmo que o lead seja movido. Use "Ocultar" para remover da listagem de visualização rápida sem apagar a regra.
                </p>
            </div>
        </div>
    );
};
