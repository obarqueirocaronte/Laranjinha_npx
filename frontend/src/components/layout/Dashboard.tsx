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
import { statsAPI } from '../../lib/api';
 import { useAuth } from '../../contexts/AuthContext';
import { VoipProvider } from '../../contexts/VoipContext';
import { ActiveCallBanner } from '../common/ActiveCallBanner';
import { LogOut, CalendarClock, TrendingUp, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProfileZone } from '../profile/ProfileZone';
import { UserAvatar } from '../common/UserAvatar';
import { cn } from '../../lib/utils';

type TabType = 'Hoje' | 'Semana' | 'Mês';

export function Dashboard() {
    const { user, logout } = useAuth();
    const [view, setView] = useState<'pipeline' | 'admin' | 'manager-dashboard'>(user?.role === 'manager' || user?.role === 'salesops' ? 'manager-dashboard' : 'pipeline');
    const [showProfile, setShowProfile] = useState(false);
    const [showSchedulePreview, setShowSchedulePreview] = useState(false);
    const [showControlHub, setShowControlHub] = useState(false);
    const [completedCount, setCompletedCount] = useState(0);
    const [scheduleCount, setScheduleCount] = useState(0);
    const [period, setPeriod] = useState<TabType>('Hoje');
    const [activityStats, setActivityStats] = useState({
        calls: 0,
        emails: 0,
        whatsapp: 0
    });

    // Fetch stats when period or user changes
    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Map 'Hoje' -> 'hoje', 'Semana' -> 'semana', 'Mês' -> 'mes'
                const periodMap: Record<string, string> = { 'Hoje': 'hoje', 'Semana': 'semana', 'Mês': 'mes' };
                const response = await statsAPI.getStats(undefined, periodMap[period]);
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
    }, [period, user]);

    const handleLeadComplete = async () => {
        try {
            await statsAPI.incrementCompleted();
            setCompletedCount(prev => prev + 1);
        } catch (error) {
            console.error('Error incrementing completed leads:', error);
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
                            isOpen={showControlHub}
                            onToggle={setShowControlHub}
                            activeTab={period}
                            onTabChange={setPeriod}
                        />

                        <div className="flex flex-col h-full min-h-0 relative">
                            {/* Premium Header Area - Raised and tighter */}
                            <div className="shrink-0 flex items-center justify-between pt-2 pb-4 pl-[6%] pr-[4%] relative z-[100]">
                                {/* 1. Brand & Stats Strip */}
                                <div className="flex flex-col gap-1">
                                    <h1
                                        className="text-[3.5rem] drop-shadow-sm tracking-tighter"
                                        style={{
                                            fontFamily: 'Comfortaa, cursive',
                                            fontWeight: 700,
                                            color: '#FF6D00',
                                            letterSpacing: '-0.04em',
                                        }}
                                    >
                                        Laranjinha
                                    </h1>
                                    <div className="h-2" />
                                </div>

                                {/* 2. Right Side: Trophy, Actions & Profile */}
                                <div className="flex items-center gap-4">
                                    {/* Golden Trophy results button */}
                                    <motion.button 
                                        whileHover={{ scale: 1.05, y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setShowControlHub(true)}
                                        className="group relative flex items-center gap-4 pl-4 pr-6 py-3 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_8px_20px_rgba(251,191,36,0.2)] border border-amber-300 transition-all hover:shadow-[0_12px_25px_rgba(251,191,36,0.3)] overflow-hidden h-14"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-sm shadow-inner group-hover:rotate-12 transition-transform">
                                            <Trophy size={20} strokeWidth={2.5} className="drop-shadow-md" />
                                        </div>
                                        <div className="flex flex-col items-start leading-none">
                                            <span className="text-[9px] font-black text-amber-50/80 uppercase tracking-widest mb-1 leading-none">Resultados</span>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xl font-black text-white drop-shadow-md leading-none" style={{ fontFamily: 'Comfortaa, cursive' }}>{completedCount}</span>
                                                <span className="text-[9px] font-black text-white/70 uppercase leading-none">Gols</span>
                                            </div>
                                        </div>
                                        {/* Shimmer effect */}
                                        <div className="absolute inset-0 w-1/4 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-21 -translate-x-full animate-[shimmer_2s_infinite]" />
                                    </motion.button>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2.5">
                                        {(user?.role === 'manager' || user?.role === 'salesops') && (
                                            <motion.button
                                                whileHover={{ scale: 1.05, backgroundColor: 'rgba(249, 115, 22, 0.1)' }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setView('manager-dashboard')}
                                                className="w-14 h-14 flex flex-col items-center justify-center rounded-2xl bg-white/40 border border-white/60 text-orange-600 shadow-sm hover:shadow-md transition-all group px-3"
                                                title="Gestão de Vendas"
                                            >
                                                <TrendingUp size={18} strokeWidth={2.5} className="mb-0.5" />
                                                <span className="text-[8px] font-black uppercase tracking-tighter" style={{ fontFamily: 'Comfortaa, cursive' }}>Gestão</span>
                                            </motion.button>
                                        )}

                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/40 hover:bg-white/60 border border-white/60 text-indigo-600 shadow-sm group relative"
                                            onClick={() => setShowSchedulePreview(true)}
                                        >
                                            <CalendarClock size={22} strokeWidth={2} />
                                            <AnimatePresence>
                                                {scheduleCount > 0 && (
                                                    <motion.span
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        exit={{ scale: 0 }}
                                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center text-[10px] font-black rounded-full text-white bg-orange-600 shadow-lg ring-2 ring-white"
                                                    >
                                                        {scheduleCount}
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </motion.button>

                                        <motion.button
                                            whileHover={{ scale: 1.05, backgroundColor: 'rgba(239, 68, 68, 0.05)' }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={logout}
                                            className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/40 hover:bg-white/60 border border-white/60 text-rose-500 shadow-sm"
                                            title="Sair"
                                        >
                                            <LogOut size={22} strokeWidth={2} />
                                        </motion.button>
                                    </div>

                                    {/* Profile Preview Card - Refined Size (-20%) */}
                                    <motion.div 
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={cn(
                                            "flex items-center gap-5 pl-4 pr-10 py-4 rounded-full backdrop-blur-3xl border shadow-2xl transition-all group cursor-pointer relative ml-4",
                                            user?.role === 'manager' 
                                                ? "bg-amber-50/40 border-amber-200/60 shadow-amber-500/10 hover:bg-amber-50/60" 
                                                : "bg-emerald-50/40 border-emerald-200/60 shadow-emerald-500/10 hover:bg-emerald-50/60"
                                        )}
                                        onClick={() => setShowProfile(true)}
                                    >
                                        <div className={cn(
                                            "absolute inset-0 rounded-full transition-opacity opacity-0 group-hover:opacity-100",
                                            user?.role === 'manager' 
                                                ? "bg-gradient-to-tr from-amber-500/10 to-transparent" 
                                                : "bg-gradient-to-tr from-emerald-500/10 to-transparent"
                                        )} />
                                        
                                        <div className="relative">
                                            {/* Role-based Glow - Scaled */}
                                            <div className={cn(
                                                "absolute inset-[-8px] rounded-full blur-xl opacity-30 group-hover:opacity-60 transition-opacity animate-pulse",
                                                user?.role === 'manager' 
                                                    ? "bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500" 
                                                    : "bg-gradient-to-br from-emerald-400 via-teal-400 to-blue-500"
                                            )} />
                                            
                                            <UserAvatar 
                                                src={user?.profile_picture_url} 
                                                name={user?.email?.split('@')[0]} 
                                                size="lg" 
                                                rounded={true}
                                                border={true}
                                                role={user?.role}
                                                className={cn(
                                                    "w-16 h-16 shadow-2xl relative z-10 transition-transform group-hover:scale-110 duration-500 border-4",
                                                    user?.role === 'manager' ? "border-amber-100" : "border-emerald-100"
                                                )}
                                            />
                                        </div>
                                        
                                        <div className="flex flex-col text-left">
                                            <span className={cn(
                                                "text-xl font-black leading-tight mb-0.5",
                                                user?.role === 'manager' ? "text-amber-900" : "text-emerald-900"
                                            )} style={{ fontFamily: 'Comfortaa, cursive' }}>
                                                {user?.email?.split('@')[0] || 'Gestor'}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                <span className={cn(
                                                    "w-2 h-2 rounded-full animate-[pulse_2s_infinite]",
                                                    user?.role === 'manager' ? "bg-amber-500" : "bg-emerald-500"
                                                )} />
                                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                    {user?.role === 'manager' ? 'Gestor de Vendas' : 'SDR Specialist'}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            </div>

                            {/* Kanban Board - Reverted negative margin to avoid overlap */}
                            <div className="flex-1 min-h-0 container mx-auto px-4">
                                <KanbanBoard
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
