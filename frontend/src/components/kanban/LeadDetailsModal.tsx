import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Phone, Edit3, Send, Layout, Linkedin, CalendarClock, Database, ShieldCheck, Building2 } from 'lucide-react';
import clsx from 'clsx';
import { TemplateSelector } from './TemplateSelector';
import type { Template } from './TemplateSelector';
import type { Lead } from '../../types';
import { useVoip } from '../../contexts/VoipContext';
import { leadsAPI } from '../../lib/api';

const ICON = { strokeWidth: 1.5 };

interface LeadDetailsModalProps {
    lead: Lead | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: (updatedLead: Lead) => void;
    onSchedule?: (lead: Lead) => void;
    columnColor?: string;
}

type TabType = 'email' | 'whatsapp' | 'logs';

export const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
    lead,
    isOpen,
    onClose,
    onUpdate,
    onSchedule,
    columnColor = '#F97316'
}) => {
    const [selectedEmailTemplate, setSelectedEmailTemplate] = useState<Template | null>(null);
    const [selectedWhatsAppTemplate, setSelectedWhatsAppTemplate] = useState<Template | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('email');
    const [customName, setCustomName] = useState('');
    const [interactions, setInteractions] = useState<any[]>([]);
    const [interactionsLoading, setInteractionsLoading] = useState(false);
    const voip = useVoip();

    useEffect(() => {
        if (lead && isOpen) {
            setCustomName(lead.full_name);
            setSelectedEmailTemplate(null);
            setSelectedWhatsAppTemplate(null);
            setActiveTab('email');
            fetchInteractions();
        }
    }, [lead, isOpen]);

    const fetchInteractions = async () => {
        if (!lead) return;
        setInteractionsLoading(true);
        try {
            const res = await leadsAPI.getInteractions(lead.id);
            if (res.success) {
                setInteractions(res.data);
            }
        } catch (err) {
            console.error('Error fetching interactions:', err);
        } finally {
            setInteractionsLoading(false);
        }
    };

    if (!lead) return null;

    const handleSave = () => {
        if (onUpdate) {
            onUpdate({
                ...lead,
                full_name: customName,
                selectedEmailTemplate: selectedEmailTemplate?.name,
                selectedWhatsAppTemplate: selectedWhatsAppTemplate?.name
            });
        }
        onClose();
    };

    const currentTemplate = activeTab === 'email' ? selectedEmailTemplate : activeTab === 'whatsapp' ? selectedWhatsAppTemplate : null;
    const accentColor = columnColor;
    const accentGlass = `${accentColor}10`;
    const accentBorder = `${accentColor}25`;

    const renderPreviewContent = () => {
        if (activeTab === 'logs') {
            return (
                <motion.div
                    key="logs-preview"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col h-full bg-white/40 border border-white/60 shadow-glass rounded-[32px] overflow-hidden p-6"
                >
                    <div className="flex-1 overflow-auto custom-scrollbar flex flex-col gap-4">
                        {/* ── Interaction History Section ── */}
                        <div className="flex flex-col gap-3">
                            <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                <Database size={14} className="text-orange-500" /> Histórico de Chamadas e Ações
                            </h4>
                            
                            {interactionsLoading ? (
                                <div className="py-8 flex flex-col items-center justify-center opacity-40">
                                    <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
                                    <span className="text-[10px] font-bold text-slate-400">Carregando histórico...</span>
                                </div>
                            ) : interactions.length === 0 ? (
                                <div className="py-8 flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                    <Phone size={24} className="text-slate-200 mb-2" strokeWidth={1} />
                                    <span className="text-[10px] font-bold text-slate-400">Nenhum registro encontrado</span>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {interactions.map((item, idx) => (
                                        <div key={idx} className="p-3 bg-white/80 border border-slate-100 rounded-2xl shadow-sm flex flex-col gap-1 hover:border-orange-200 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={clsx(
                                                        "text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider",
                                                        item.type === 'call' ? "bg-blue-50 text-blue-600" :
                                                        item.type === 'schedule' ? "bg-orange-50 text-orange-600" :
                                                        "bg-emerald-50 text-emerald-600"
                                                    )}>
                                                        {item.type === 'call' ? 'Chamada' : item.type === 'schedule' ? 'Agenda' : 'Cadência'}
                                                    </span>
                                                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">
                                                        {item.result === 'success' ? 'Sucesso' : 
                                                         item.result === 'busy' ? 'Ocupado' :
                                                         item.result === 'no-answer' ? 'Não Atendeu' :
                                                         item.result === 'invalid' ? 'Inválido' :
                                                         item.result === 'voicemail' ? 'Caixa Postal' :
                                                         item.result === 'reschedule' ? 'Reagendado' :
                                                         item.result}
                                                    </span>
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-400">
                                                    {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            {item.notes && (
                                                <p className="text-[11px] text-slate-600 font-medium leading-relaxed italic bg-slate-50/50 p-2 rounded-lg border border-slate-50 mt-1">
                                                    "{item.notes}"
                                                </p>
                                            )}
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                <span className="text-[9px] font-black text-slate-400 uppercase">Feito por: {item.author_name || 'Sistema'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-sm">
                            <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <ShieldCheck size={14} className="text-slate-400" /> System Metrics
                            </h4>
                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase">Score Qualidade</span>
                                    <div className="text-[11px] font-black text-emerald-600 mt-0.5">{lead.quality_score || 0}%</div>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase">Cadence ID</span>
                                    <div className="text-[11px] font-bold text-slate-600 mt-0.5">{lead.metadata?.cadence_selected || 'Nenhuma'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            );
        }

        if (!currentTemplate) {
            return (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 bg-white/20 border-2 border-dashed rounded-[32px]"
                    style={{ borderColor: accentBorder }}>
                    <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 shadow-glass flex items-center justify-center">
                        <Layout size={28} className="text-slate-200" strokeWidth={1} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-base font-black text-slate-700" style={{ fontFamily: 'Comfortaa, cursive' }}>Nenhum template</p>
                        <p className="text-[11px] font-bold text-slate-400 max-w-[180px]" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                            Escolha uma opção ao lado para visualizar o preview.
                        </p>
                    </div>
                </div>
            );
        }

        const previewText = currentTemplate.content
            .replace(/{nome}/g, customName)
            .replace(/{empresa}/g, lead.company_name);

        return (
            <motion.div
                key={`${activeTab}-${currentTemplate.id}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col h-full bg-white/40 border border-white/60 shadow-glass rounded-[32px] overflow-hidden"
            >
                <div className="flex-1 flex flex-col p-6 rounded-[24px] m-2 relative overflow-hidden"
                    style={{ border: `2px dashed ${accentBorder}`, background: `${accentGlass}` }}>

                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Preview Mensagem</span>
                        <div className="px-3 py-1 rounded-full text-[9px] font-black text-white shadow-sm"
                            style={{ background: accentColor }}>
                            {currentTemplate.name}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <p className="text-[14px] font-bold text-slate-700 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                            {previewText}
                        </p>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white/60 border border-white/80 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-sm active:scale-95" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                            Editar <Edit3 size={12} {...ICON} />
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/20 backdrop-blur-md"
                    />

                    {/* Modal Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-4xl bg-[#FCFAF7] shadow-[0_32px_80px_rgba(0,0,0,0.15)] rounded-[48px] overflow-hidden flex flex-col ring-1 ring-white/50"
                        style={{ maxHeight: 'calc(100vh - 80px)' }}
                    >
                        {/* Dynamic Glow */}
                        <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
                            style={{ background: `radial-gradient(circle at 20% 20%, ${accentColor} 0%, transparent 50%), radial-gradient(circle at 80% 80%, ${accentColor} 0%, transparent 50%)` }} />

                        <div className="px-10 py-7 flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-[28px] bg-white/60 flex items-center justify-center shrink-0 shadow-glass border border-white/80 backdrop-blur-md">
                                    <Building2 size={32} className="text-[#10B981]" strokeWidth={2.5} />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                            {lead.full_name || 'Sem Contato'}
                                        </h2>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onSchedule) onSchedule(lead);
                                            }}
                                            className="w-9 h-9 rounded-2xl flex items-center justify-center bg-white/70 text-orange-500 hover:bg-white hover:scale-110 hover:text-orange-600 transition-all shadow-sm border border-white/90"
                                            title="Agendar Retorno"
                                        >
                                            <CalendarClock size={16} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest" style={{ fontFamily: 'Quicksand, sans-serif' }}>{lead.company_name}</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                        <span className="text-[11px] font-bold text-slate-400" style={{ fontFamily: 'Quicksand, sans-serif' }}>{lead.metadata?.cnpj || 'CNPJ não informado'}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200/50 shadow-sm hover:shadow-md hover:border-slate-300 rounded-2xl transition-all text-slate-400 hover:text-slate-600"
                            >
                                <X size={20} {...ICON} />
                            </button>
                        </div>

                        {/* Content Grid */}
                        <div className="px-10 pb-6 flex gap-6 overflow-hidden relative z-10 flex-1">
                            {/* Left Panel: Contact & Selection */}
                            <div className="w-[300px] flex flex-col gap-4 flex-shrink-0">

                                {/* ── Contact Zone ── */}
                                <div className="bg-white/50 border border-white/60 shadow-glass rounded-[28px] p-4 backdrop-blur-md">
                                    <div className="flex items-center justify-between mb-3 px-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]" style={{ fontFamily: 'Quicksand, sans-serif' }}>Contato</span>
                                        <div className={clsx(
                                            "px-2 py-0.5 rounded-lg text-[8px] font-black border",
                                            (lead.quality_score || 0) > 70 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                                        )}>
                                            SCORE {lead.quality_score}%
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2.5 p-2 bg-slate-50/50 rounded-xl border border-slate-100/50 hover:bg-white hover:border-blue-100 transition-all">
                                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 shadow-sm">
                                                <Mail size={14} {...ICON} />
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-700 truncate flex-1" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                                                {(lead.email && !lead.email.includes('sem_email_')) ? lead.email : 'Sem e-mail'}
                                            </span>
                                        </div>

                                        <div
                                            className={clsx(
                                                "flex items-center gap-2.5 p-2 bg-slate-50/50 rounded-xl border border-slate-100/50 transition-all",
                                                lead.phone && !voip.isCallActive ? "hover:bg-emerald-50 hover:border-emerald-200 cursor-pointer" : ""
                                            )}
                                            onClick={() => {
                                                if (lead.phone && !voip.isCallActive) {
                                                    voip.initiateCall(lead.phone, lead.id, lead.full_name);
                                                }
                                            }}
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
                                                <Phone size={14} {...ICON} />
                                            </div>
                                            <span className={clsx(
                                                "text-[11px] font-bold truncate flex-1",
                                                lead.phone ? "text-slate-700" : "text-slate-400"
                                            )} style={{ fontFamily: 'Quicksand, sans-serif' }}>
                                                {lead.phone || 'Sem telefone'}
                                            </span>
                                            <a
                                                href={lead.metadata?.linkedin_url || '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className={clsx(
                                                    "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                                                    lead.metadata?.linkedin_url ? "bg-[#0A66C2] text-white shadow-md hover:bg-[#004182]" : "bg-slate-100 text-slate-300 pointer-events-none"
                                                )}
                                            >
                                                <Linkedin size={14} fill={lead.metadata?.linkedin_url ? "white" : "none"} {...ICON} />
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Selection Area ── */}
                                <div className="bg-white border border-slate-100 shadow-glass rounded-[28px] p-2 flex flex-col min-h-0 flex-1">
                                    <div className="flex p-1 bg-slate-50 rounded-[16px] mb-2">
                                        {(['email', 'whatsapp', 'logs'] as TabType[]).map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(tab)}
                                                className={clsx(
                                                    "flex-1 py-1.5 rounded-[14px] text-[9px] font-black uppercase tracking-widest transition-all",
                                                    activeTab === tab
                                                        ? "bg-white text-slate-900 shadow-glass border border-slate-100"
                                                        : "text-slate-400 hover:text-slate-600"
                                                )}
                                                style={{ fontFamily: 'Quicksand, sans-serif' }}
                                            >
                                                {tab === 'logs' ? 'Logs & Data' : tab}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="px-1 overflow-y-auto custom-scrollbar flex-1">
                                        {activeTab === 'logs' ? (
                                            <div className="flex flex-col gap-2 p-2">
                                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-1">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase">System ID</span>
                                                    <span className="text-[10px] font-mono font-bold text-slate-600 break-all">{lead.id}</span>
                                                </div>
                                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-1">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase">Registered At</span>
                                                    <span className="text-[10px] font-medium text-slate-600">{new Date(lead.created_at || Date.now()).toLocaleString('pt-BR')}</span>
                                                </div>
                                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-1">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase">Card Model</span>
                                                    <span className="text-[10px] font-black text-slate-600">{lead.metadata?.card_model || 'FULL'}</span>
                                                </div>
                                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-1">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase">Raw Metadata</span>
                                                    <pre className="text-[9px] font-mono text-slate-500 whitespace-pre-wrap mt-1 overflow-hidden">
                                                        {JSON.stringify(lead.metadata || {}, null, 2)}
                                                    </pre>
                                                </div>
                                            </div>
                                        ) : (
                                            <TemplateSelector
                                                type={activeTab as 'email' | 'whatsapp'}
                                                selectedId={activeTab === 'email' ? selectedEmailTemplate?.id || null : selectedWhatsAppTemplate?.id || null}
                                                onSelect={(t) => activeTab === 'email' ? setSelectedEmailTemplate(t) : setSelectedWhatsAppTemplate(t)}
                                                compact={true}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Panel: Preview & Info */}
                            <div className="flex-1 flex flex-col gap-4 min-w-0">
                                <div className="flex-1 min-h-0">
                                    <AnimatePresence mode="wait">
                                        {renderPreviewContent()}
                                    </AnimatePresence>
                                </div>

                                {/* Extra Info Bar */}
                                {(lead.metadata?.estado || lead.metadata?.cidade || lead.metadata?.telefone_empresa) && (
                                    <div className="bg-white/40 border border-slate-100 rounded-2xl p-4 flex items-center gap-6">
                                        {lead.metadata?.telefone_empresa && (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">TEL. EMPRESA</span>
                                                <span className="text-[10px] font-bold text-slate-600">{lead.metadata.telefone_empresa}</span>
                                            </div>
                                        )}
                                        {(lead.metadata?.cidade || lead.metadata?.estado) && (
                                            <div className="flex flex-col gap-0.5 border-l border-slate-200 pl-6">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">LOCALIZAÇÃO</span>
                                                <span className="text-[10px] font-bold text-slate-600">
                                                    {[lead.metadata.cidade, lead.metadata.estado].filter(Boolean).join(', ')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className="px-10 py-6 flex items-center justify-between relative z-10 border-t border-slate-100 bg-white/30 backdrop-blur-md">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">
                                    {activeTab === 'logs' ? 'Informação do Sistema' : 'Ação Recomendada'}
                                </span>
                                <div className="text-xs font-bold text-slate-700" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                                    {activeTab === 'logs' ? 'Os identificadores e logs são utilizados apenas internamente.' : `Enviar ${activeTab === 'email' ? 'E-mail Inicial' : 'WhatsApp de Follow-up'}.`}
                                </div>
                            </div>
                            {activeTab !== 'logs' ? (
                                <button
                                    className="px-8 py-3.5 text-white rounded-[20px] text-[13px] font-black shadow-lg transition-all active:scale-95 flex items-center gap-3 hover:-translate-y-0.5"
                                    onClick={handleSave}
                                    style={{
                                        fontFamily: 'Quicksand, sans-serif',
                                        background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}EE 100%)`,
                                        boxShadow: `0 8px 20px -4px ${accentColor}40`
                                    }}
                                >
                                    <Send size={16} {...ICON} />
                                    Enviar {activeTab === 'email' ? 'E-mail' : 'WhatsApp'}
                                </button>
                            ) : (
                                <button
                                    className="px-8 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-[20px] text-[13px] font-black shadow-sm transition-all active:scale-95 flex items-center gap-3 hover:-translate-y-0.5"
                                    onClick={onClose}
                                    style={{ fontFamily: 'Quicksand, sans-serif' }}
                                >
                                    Fechar
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
