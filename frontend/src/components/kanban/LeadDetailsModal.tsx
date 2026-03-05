import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Phone, Edit3, Send, Layout, Linkedin, CalendarClock } from 'lucide-react';
import clsx from 'clsx';
import { TemplateSelector } from './TemplateSelector';
import type { Template } from './TemplateSelector';
import type { Lead } from '../../types';
import { useVoip } from '../../contexts/VoipContext';

const ICON = { strokeWidth: 1.5 };

interface LeadDetailsModalProps {
    lead: Lead | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: (updatedLead: Lead) => void;
    onSchedule?: (lead: Lead) => void;
    columnColor?: string;
}

type TabType = 'email' | 'whatsapp';

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
    const voip = useVoip();

    useEffect(() => {
        if (lead && isOpen) {
            setCustomName(lead.full_name);
            setSelectedEmailTemplate(null);
            setSelectedWhatsAppTemplate(null);
            setActiveTab('email');
        }
    }, [lead, isOpen]);

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

    const currentTemplate = activeTab === 'email' ? selectedEmailTemplate : selectedWhatsAppTemplate;
    const accentColor = columnColor;
    const accentGlass = `${accentColor}10`;
    const accentBorder = `${accentColor}25`;

    const renderPreviewContent = () => {
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

                        {/* Header */}
                        <div className="px-10 py-7 flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                            {lead.full_name}
                                        </h2>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onSchedule) onSchedule(lead);
                                            }}
                                            className="w-8 h-8 rounded-xl flex items-center justify-center bg-orange-50 text-orange-500 hover:bg-orange-100 hover:text-orange-600 transition-all shadow-sm border border-orange-100"
                                            title="Agendar Retorno"
                                        >
                                            <CalendarClock size={16} {...ICON} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest" style={{ fontFamily: 'Quicksand, sans-serif' }}>{lead.company_name}</span>
                                        <div className="w-1 h-1 rounded-full bg-slate-300" />
                                        <span className="text-[10px] font-bold text-slate-400" style={{ fontFamily: 'Quicksand, sans-serif' }}>{lead.metadata?.cnpj || 'CNPJ não informado'}</span>
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
                                <div className="bg-white border border-slate-100 shadow-glass rounded-[28px] p-4">
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
                                        {(['email', 'whatsapp'] as TabType[]).map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(tab)}
                                                className={clsx(
                                                    "flex-1 py-2 rounded-[14px] text-[9px] font-black uppercase tracking-widest transition-all",
                                                    activeTab === tab
                                                        ? "bg-white text-slate-900 shadow-glass border border-slate-100"
                                                        : "text-slate-400 hover:text-slate-600"
                                                )}
                                                style={{ fontFamily: 'Quicksand, sans-serif' }}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="px-1 overflow-y-auto custom-scrollbar flex-1">
                                        <TemplateSelector
                                            type={activeTab}
                                            selectedId={activeTab === 'email' ? selectedEmailTemplate?.id || null : selectedWhatsAppTemplate?.id || null}
                                            onSelect={(t) => activeTab === 'email' ? setSelectedEmailTemplate(t) : setSelectedWhatsAppTemplate(t)}
                                            compact={true}
                                        />
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
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Ação Recomendada</span>
                                <div className="text-xs font-bold text-slate-700" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                                    Enviar {activeTab === 'email' ? 'E-mail Inicial' : 'WhatsApp de Follow-up'}.
                                </div>
                            </div>
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
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
