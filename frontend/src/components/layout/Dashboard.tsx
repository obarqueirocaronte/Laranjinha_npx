/**
 * Componente Principal Dashboard.tsx
 * 
 * O Dashboard é a tela principal que o SDR ou Gestor visualiza
 * logado no sistema. A partir dele, o Layout central é gerido e 
 * as "views" internas (ex: KanbanBoard, Admin) são alternadas dinamicamente.
 */
import { useState, useEffect } from 'react';
import { Layout } from './Shell';
import { KanbanBoard } from '../kanban/KanbanBoard';
import { FloatingActions } from './FloatingActions';
import { ControlHub } from './ControlHub';
import { AdminDashboard } from '../admin/AdminDashboard';
import { ManagerSalesDashboard } from '../manager/ManagerSalesDashboard';
import { statsAPI, leadsAPI } from '../../lib/api';
 import { useAuth } from '../../contexts/AuthContext';
import { VoipProvider } from '../../contexts/VoipContext';
import { ActiveCallBanner } from '../common/ActiveCallBanner';
import { User, LogOut, CalendarClock } from 'lucide-react';
import { motion } from 'framer-motion';
import { ProfileZone } from '../profile/ProfileZone';

export function Dashboard() {
    const [view, setView] = useState<'pipeline' | 'admin' | 'manager-dashboard'>('pipeline');
    const { user, logout } = useAuth();
    const [showProfile, setShowProfile] = useState(false);
    const [showSchedulePreview, setShowSchedulePreview] = useState(false);
    const [completedCount, setCompletedCount] = useState(0);
    const [scheduleCount, setScheduleCount] = useState(0);
    const [testLeadLoading, setTestLeadLoading] = useState(false);
    const [testLeadSuccess, setTestLeadSuccess] = useState(false);
    const [kanbanKey, setKanbanKey] = useState(0); // used to force kanban reload
    const [activityStats, setActivityStats] = useState({
        calls: 0,
        emails: 0,
        whatsapp: 0
    });

    // Fetch initial stats
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await statsAPI.getStats();
                if (response.success && response.data) {
                    setActivityStats({
                        calls: response.data.calls || 0,
                        emails: response.data.emails || 0,
                        whatsapp: response.data.whatsapp || 0
                    });
                    setCompletedCount(response.data.completed_leads || 0);
                }
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
        };
        fetchStats();
    }, []);

    const handleLeadComplete = async () => {
        try {
            await statsAPI.incrementCompleted();
            setCompletedCount(prev => prev + 1);
        } catch (error) {
            console.error('Error incrementing completed leads:', error);
        }
    };

    const handleCreateTestLead = async () => {
        if (testLeadLoading) return;
        setTestLeadLoading(true);
        try {
            await leadsAPI.createTestLead();
            setTestLeadSuccess(true);
            setKanbanKey(k => k + 1); // refresh kanban
            setTimeout(() => setTestLeadSuccess(false), 3000);
        } catch (err) {
            console.error('Erro ao criar lead teste:', err);
        } finally {
            setTestLeadLoading(false);
        }
    };

    const handleActivity = (type: 'call' | 'email' | 'whatsapp') => {
        const key = type === 'call' ? 'calls' : type === 'email' ? 'emails' : 'whatsapp';
        setActivityStats(prev => ({
            ...prev,
            [key]: prev[key] + 1
        }));
    };

    const handleReset = async () => {
        try {
            await statsAPI.resetStats();
            setActivityStats({ calls: 0, emails: 0, whatsapp: 0 });
            setCompletedCount(0);
        } catch (error) {
            console.error('Error resetting stats:', error);
        }
    };

    return (
        <VoipProvider>
            <Layout>
                {view === 'admin' && (user?.role === 'manager' || user?.role === 'salesops') ? (
                    <AdminDashboard onNavigateBack={() => setView('pipeline')} />
                ) : view === 'manager-dashboard' && (user?.role === 'manager' || user?.role === 'salesops') ? (
                    <div className="absolute inset-0 z-20 flex flex-col h-full bg-transparent">
                        <ManagerSalesDashboard
                            onAdminClick={() => setView('admin')}
                            onLogout={logout}
                            onNavigateBack={() => setView('pipeline')}
                        />
                    </div>
                ) : showProfile ? (
                    <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-xl">
                        <ProfileZone onClose={() => setShowProfile(false)} />
                    </div>
                ) : (
                    <>
                        {/* Active Call Banner — green indicator */}
                        <ActiveCallBanner />

                        <ControlHub
                            onAdminClick={() => setView(user?.role === 'manager' ? 'manager-dashboard' : 'admin')}
                            completedCount={completedCount}
                            activityStats={activityStats}
                            onReset={handleReset}
                            user={user}
                        />
                        <div className="flex flex-col gap-6 h-full min-h-0 relative">
                            {/* Header Area - Laranjinha Retro Branding & Top Right Actions */}
                            <div className="shrink-0 flex items-center justify-between mb-2 pl-[6%] pr-[2%]">
                                <h1
                                    className="text-6xl drop-shadow-sm tracking-tight px-1"
                                    style={{
                                        fontFamily: 'Comfortaa, cursive',
                                        fontWeight: 700,
                                        color: '#FF6D00',
                                        textShadow: '0 2px 12px rgba(255,109,0,0.18)',
                                        letterSpacing: '-0.02em',
                                    }}
                                >
                                    Laranjinha
                                </h1>

                                <div className="flex items-center gap-4">
                                    {/* Link for Manager / SalesOps to Dashboard */}
                                    {(user?.role === 'manager' || user?.role === 'salesops') && (
                                        <>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setView('manager-dashboard')}
                                            className="px-6 py-2.5 rounded-full bg-orange-600 text-white font-black text-sm shadow-lg shadow-orange-200"
                                            style={{ fontFamily: 'Comfortaa, cursive' }}
                                        >
                                            Dashboard de Gestão
                                        </motion.button>
                                        {/* Test Lead Button — SalesOps only */}
                                        {user?.role === 'salesops' && (
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={handleCreateTestLead}
                                                disabled={testLeadLoading}
                                                className={`px-5 py-2.5 rounded-full font-black text-sm shadow-lg flex items-center gap-2 transition-all ${
                                                    testLeadSuccess
                                                        ? 'bg-emerald-500 text-white shadow-emerald-200'
                                                        : 'bg-slate-800 text-white shadow-slate-300'
                                                }`}
                                                style={{ fontFamily: 'Comfortaa, cursive' }}
                                                title="Criar Lead Teste (SalesOps)"
                                            >
                                                {testLeadSuccess ? '✅ Criado!' : testLeadLoading ? '...' : '🧪 Lead Teste'}
                                            </motion.button>
                                        )}
                                        </>
                                    )}

                                    {/* Botão de Agendamentos de Retorno (Glassmorphism minimalista) */}
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="relative flex items-center justify-center p-2 rounded-xl bg-white/40 hover:bg-white/60 border border-orange-200/50 text-indigo-600 transition-colors shadow-sm"
                                        title="Agendamentos de Retorno"
                                        onClick={() => setShowSchedulePreview(true)}
                                    >
                                        <CalendarClock size={20} />
                                        {scheduleCount > 0 && (
                                            <motion.span
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 flex items-center justify-center text-[10px] font-black rounded-full text-white bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md"
                                                style={{ fontFamily: 'Comfortaa, cursive' }}
                                            >
                                                {scheduleCount}
                                            </motion.span>
                                        )}
                                    </motion.button>

                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setShowProfile(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-full text-sm font-bold text-white transition-colors shadow-lg shadow-emerald-500/20"
                                        style={{ fontFamily: 'Comfortaa, cursive' }}
                                        title="Meu Perfil"
                                    >
                                        <User size={16} />
                                        <span>Perfil</span>
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={logout}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/40 hover:bg-white/60 border border-orange-200/50 rounded-full text-sm font-bold text-orange-600 transition-colors shadow-sm"
                                        style={{ fontFamily: 'Comfortaa, cursive' }}
                                        title="Sair"
                                    >
                                        <LogOut size={16} />
                                        <span>Sair</span>
                                    </motion.button>
                                </div>
                            </div>

                            {/* Kanban Board */}
                            <div className="flex-1 min-h-0">
                                <KanbanBoard
                                    key={kanbanKey}
                                    onLeadComplete={handleLeadComplete}
                                    onActivity={handleActivity}
                                    onScheduleCountChange={setScheduleCount}
                                    showSchedulePreview={showSchedulePreview}
                                    onCloseSchedulePreview={() => setShowSchedulePreview(false)}
                                />
                            </div>
                        </div>
                        {/* Botões Flutuantes - Busca e Chat (Sempre visíveis para SDR) */}
                        <FloatingActions />
                    </>
                )}
            </Layout>
        </VoipProvider>
    );
}
