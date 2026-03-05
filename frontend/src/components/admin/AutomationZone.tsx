import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Zap,
    ArrowRight,
    Workflow,
    GitBranch,
    MessageSquare,
    Webhook,
    Bell
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { AuroraDisparosZone } from './AuroraDisparosZone';
import { ManagementReportZone } from './ManagementReportZone';

interface AutomationZoneProps {
    onClose: () => void;
}

export const AutomationZone: React.FC<AutomationZoneProps> = ({ onClose }) => {
    const [selectedSubZone, setSelectedSubZone] = useState<string | null>(null);

    // Render Sub-Zones
    if (selectedSubZone === 'management-report') {
        return <ManagementReportZone onClose={() => setSelectedSubZone(null)} />;
    }

    if (selectedSubZone === 'aurora') {
        return (
            <div className="h-full flex flex-col p-8 overflow-y-auto">
                <div className="flex items-center justify-between mb-8 max-w-6xl mx-auto w-full">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow shadow-violet-500/50 bg-gradient-to-br from-violet-500 to-indigo-600">
                                <MessageSquare size={20} />
                            </div>
                            Aurora Chat Automations
                        </h1>
                        <p className="text-slate-600 mt-1 text-sm font-medium">Configure regras de disparo para templates do Aurora Chat.</p>
                    </div>
                    <button
                        onClick={() => setSelectedSubZone(null)}
                        className="px-4 py-2 bg-gradient-soft border border-orange-200/50 shadow-glass text-slate-600 rounded-xl hover:bg-orange-50/80 hover:text-orange-600 transition-colors font-bold text-xs flex items-center gap-2"
                        style={{ fontFamily: 'Comfortaa, cursive' }}
                    >
                        <ArrowRight className="rotate-180" size={14} />
                        Voltar para Regras
                    </button>
                </div>
                <div className="max-w-6xl mx-auto w-full">
                    <AuroraDisparosZone />
                </div>
            </div>
        );
    }

    if (selectedSubZone === 'triggers') {
        return (
            <div className="h-full flex flex-col p-8 overflow-y-auto">
                <div className="flex items-center justify-between mb-8 max-w-6xl mx-auto w-full">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow shadow-rose-500/50 bg-gradient-to-br from-rose-500 to-rose-600">
                                <Zap size={20} />
                            </div>
                            Gatilhos do Sistema
                        </h1>
                        <p className="text-slate-600 mt-1 text-sm font-medium">Eventos nativos do pipeline e CRM.</p>
                    </div>
                    <button
                        onClick={() => setSelectedSubZone(null)}
                        className="px-4 py-2 bg-gradient-soft border border-orange-200/50 shadow-glass text-slate-600 rounded-xl hover:bg-orange-50/80 hover:text-orange-600 transition-colors font-bold text-xs flex items-center gap-2"
                        style={{ fontFamily: 'Comfortaa, cursive' }}
                    >
                        <ArrowRight className="rotate-180" size={14} />
                        Voltar para Regras
                    </button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-white/40 border border-orange-200/50 shadow-glass backdrop-blur-sm rounded-3xl flex items-center justify-center mb-4 text-orange-400">
                        <Workflow size={32} />
                    </div>
                    <h3 className="text-xl font-black text-slate-700">Painel em Evolução</h3>
                    <p className="text-slate-600 text-sm max-w-sm mx-auto mt-2">
                        As configurações de gatilhos padrão estão sendo migradas para este novo painel.
                    </p>
                </div>
            </div>
        );
    }

    const automationZones = [
        {
            id: 'triggers',
            title: 'Gatilhos Nativos',
            description: 'Eventos como mudança de coluna, inatividade e ações de sistema.',
            icon: Zap,
            color: 'from-amber-400 to-orange-500',
            status: 'Parcial'
        },
        {
            id: 'aurora',
            title: 'Aurora Chat',
            description: 'Regras de disparo automático para templates vinculados.',
            icon: MessageSquare,
            color: 'from-violet-500 to-indigo-600',
            status: 'Pronto'
        },
        {
            id: 'management-report',
            title: 'Relatório de Gestão',
            description: 'Envio automático de métricas e performance para Mattermost.',
            icon: Bell,
            color: 'from-orange-500 to-amber-600',
            status: 'Novo'
        },
        {
            id: 'hooks',
            title: 'Webhooks In/Out',
            description: 'Integrações externas com sistemas de terceiros.',
            icon: Webhook,
            color: 'from-emerald-400 to-teal-500',
            status: 'Em Breve'
        },
        {
            id: 'rules',
            title: 'Regras de Negócio',
            description: 'Validações, sla e lógicas complexas de roteamento.',
            icon: GitBranch,
            color: 'from-blue-500 to-cyan-500',
            status: 'Em Breve'
        }
    ];

    return (
        <div className="h-full flex flex-col p-8 overflow-y-auto">
            {/* Header - Identical to AdminDashboard */}
            <div className="flex items-center justify-between mb-8 max-w-6xl mx-auto w-full">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow shadow-rose-500/50 bg-gradient-to-br from-rose-500 to-rose-600">
                            <Workflow size={20} />
                        </div>
                        Central de Automações
                    </h1>
                    <p className="text-slate-600 mt-1 text-sm font-medium">Configure as réguas e gatilhos que movem o seu pipeline automaticamente.</p>
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

            {/* Sub-Zones Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto w-full">
                {automationZones.map((zone, index) => (
                    <motion.div
                        key={zone.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group relative bg-gradient-soft border border-orange-200/50 shadow-glass rounded-3xl p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md"
                        onClick={() => setSelectedSubZone(zone.id)}
                    >
                        {/* Hover Gradient Background */}
                        <div className={cn(
                            "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-br",
                            zone.color
                        )} />

                        {/* Content */}
                        <div className="relative z-10 flex flex-col h-full">
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-white shadow-md bg-gradient-to-br",
                                zone.color
                            )}>
                                <zone.icon size={20} />
                            </div>

                            <h3 className="text-base font-black text-slate-800 mb-2 group-hover:text-slate-900 leading-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                {zone.title}
                            </h3>

                            <p className="text-xs text-slate-600 leading-relaxed mb-6 flex-1 text-pretty">
                                {zone.description}
                            </p>

                            <div className="flex items-center justify-between pt-4 border-t border-orange-100/60 mt-auto">
                                <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-wider",
                                    zone.status === 'Pronto' ? "text-emerald-600" :
                                        zone.status === 'Novo' ? "text-orange-500" :
                                            zone.status === 'Parcial' ? "text-amber-500" : "text-slate-400"
                                )}>
                                    {zone.status}
                                </span>
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-1 shadow-sm",
                                    "bg-white/60 border border-white/80 text-slate-400 group-hover:text-white group-hover:border-transparent",
                                    zone.status === 'Pronto' || zone.status === 'Novo' ? "group-hover:bg-orange-500 group-hover:shadow-orange-500/30" : "group-hover:bg-slate-400"
                                )}>
                                    <ArrowRight size={14} />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Visual Flair in Empty Space */}
            <div className="mt-auto pt-16 pb-8 mx-auto opacity-30 pointer-events-none select-none">
                <Workflow size={200} className="text-orange-200/50 mix-blend-multiply" />
            </div>
        </div>
    );
};
