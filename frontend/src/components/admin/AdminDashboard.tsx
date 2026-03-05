import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Database, Activity, ArrowRight, Settings, Shield, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { LeadZone } from './LeadZone';
import { UserZone } from './UserZone';
import { CadenceZone } from './CadenceZone';
import { AutomationZone } from './AutomationZone';
import { ManagerLeadsZone } from './ManagerLeadsZone';

interface AdminDashboardProps {
    onNavigateBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateBack }) => {
    const [selectedZone, setSelectedZone] = useState<string | null>(null);

    // Se Manager Leads estiver selecionada
    if (selectedZone === 'manager-leads') {
        return <ManagerLeadsZone onClose={() => setSelectedZone(null)} />;
    }

    // Se Lead Zone estiver selecionada
    if (selectedZone === 'lead-zone') {
        return <LeadZone onClose={() => setSelectedZone(null)} />;
    }

    // Se User Zone estiver selecionada
    if (selectedZone === 'user-zone') {
        return <UserZone onClose={() => setSelectedZone(null)} />;
    }

    // Se Cadence Zone estiver selecionada
    if (selectedZone === 'cadence-zone') {
        return <CadenceZone onClose={() => setSelectedZone(null)} />;
    }

    // Se Automation Zone estiver selecionada
    if (selectedZone === 'automation-zone') {
        return <AutomationZone onClose={() => setSelectedZone(null)} />;
    }

    const zones = [
        {
            id: 'manager-leads',
            title: 'Manager Leads',
            description: 'Visualize e gerencie a lista completa de leads da base.',
            icon: Users,
            color: 'from-emerald-500 to-teal-500',
            status: 'Pronto'
        },
        {
            id: 'lead-zone',
            title: 'Lead Zone',
            description: 'Importe, mapeie e higienize sua base de prospecção.',
            icon: Database,
            color: 'from-blue-500 to-cyan-500',
            status: 'Pronto'
        },
        {
            id: 'user-zone',
            title: 'Usuários',
            description: 'Gestão de permissões e perfis de acesso.',
            icon: Shield,
            color: 'from-purple-500 to-indigo-500',
            status: 'Pronto'
        },
        {
            id: 'cadence-zone',
            title: 'Regras de Cadência',
            description: 'Desenho de sequências e protocolos de contato.',
            icon: Activity,
            color: 'from-orange-500 to-orange-600',
            status: 'Disponível'
        },
        {
            id: 'automation-zone',
            title: 'Automações',
            description: 'Configuração de réguas e gatilhos.',
            icon: Zap,
            color: 'from-rose-500 to-rose-600',
            status: 'Em breve'
        }
    ];

    return (
        <div className="h-full flex flex-col p-8 overflow-y-auto">
            {/* Header - Compact */}
            <div className="flex items-center justify-between mb-8 max-w-6xl mx-auto w-full">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow shadow-slate-300/50 bg-gradient-to-br from-slate-700 to-slate-800">
                            <Settings size={20} />
                        </div>
                        Administração
                    </h1>
                    <p className="text-slate-600 mt-1 text-sm font-medium">Gerencie seu time, dados e regras.</p>
                </div>
                <button
                    onClick={onNavigateBack}
                    className="px-4 py-2 bg-gradient-soft border border-orange-200/50 shadow-glass text-slate-600 rounded-xl hover:bg-orange-50/80 hover:text-orange-600 transition-colors font-bold text-xs flex items-center gap-2"
                    style={{ fontFamily: 'Comfortaa, cursive' }}
                >
                    <ArrowRight className="rotate-180" size={14} />
                    Voltar
                </button>
            </div>

            {/* Zones Grid - Compact */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto w-full">
                {zones.map((zone, index) => (
                    <motion.div
                        key={zone.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group relative bg-gradient-soft border border-orange-200/50 shadow-glass rounded-3xl p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md"
                        onClick={() => setSelectedZone(zone.id)}
                    >
                        {/* Hover Gradient Background */}
                        <div className={cn(
                            "absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 bg-gradient-to-br",
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
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                    {zone.status}
                                </span>
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-1 shadow-sm",
                                    "bg-orange-50/80 text-orange-400 group-hover:bg-gradient-to-br group-hover:from-orange-400 group-hover:to-orange-500 group-hover:text-white group-hover:shadow-orange-500/30"
                                )}>
                                    <ArrowRight size={14} />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Selected Zone Placeholder (For next steps) */}
            {
                selectedZone && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setSelectedZone(null)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-gradient-soft border border-orange-100 shadow-glass p-8 rounded-2xl shadow-2xl max-w-md w-full text-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-2xl font-bold mb-4">Em Construção</h2>
                            <p className="text-slate-600 mb-6">A <strong>{zones.find(z => z.id === selectedZone)?.title}</strong> estará disponível em breve.</p>
                            <button
                                className="bg-slate-900 text-white px-6 py-2 rounded-xl font-medium"
                                onClick={() => setSelectedZone(null)}
                            >
                                Fechar
                            </button>
                        </motion.div>
                    </div>
                )
            }
        </div >
    );
};
