import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UserPlus, Mail, Shield, CheckCircle2, ArrowRight,
    Crown, Search, Filter, Briefcase, Zap, Settings, Phone, MessageSquare, Save, Loader2, Trash2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import api, { usersAPI } from '../../lib/api';

interface UserZoneProps {
    onClose: () => void;
}

type Role = 'sdr' | 'manager' | 'ops';
type UserStatus = 'active' | 'pending' | 'invited';

interface IntegrationConf {
    enabled: boolean;
    [key: string]: any;
}

interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    status: UserStatus;
    integrations?: {
        email: IntegrationConf;
        voice: IntegrationConf;
        aurora: IntegrationConf;
    };
}

const ROLES: Record<Role, any> = {
    sdr: { label: 'SDR', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Zap },
    manager: { label: 'Gestor', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Crown },
    ops: { label: 'Sales Ops', color: 'bg-orange-50 text-orange-700 border-orange-200/50', icon: Briefcase },
};

const CustomToggle = ({ enabled, onChange, colorClass }: { enabled: boolean, onChange: () => void, colorClass: string }) => (
    <div
        onClick={onChange}
        className={cn(
            "w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ease-in-out",
            enabled ? colorClass : "bg-slate-200"
        )}
    >
        <motion.div
            layout
            className="bg-white w-4 h-4 rounded-full shadow-sm"
            animate={{ x: enabled ? 24 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
    </div>
);

// --- Sub-Components Defined Outside to Prevent Remounting/Focus Loss ---

const InviteView = ({ newItem, setNewItem, handleInvite, inviteLoading, inviteError, setView }: any) => (
    <div className="flex flex-col lg:flex-row gap-8 h-full">
        <div className="flex-1 bg-gradient-soft border border-orange-200/50 shadow-glass p-8 rounded-[32px] flex flex-col backdrop-blur-md">
            <div className="mb-8">
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Convidar Membro</h3>
                <p className="text-slate-600">Configure níveis de acesso e envie instruções de onboarding.</p>
            </div>

            <div className="space-y-6 flex-1">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nome Completo</label>
                    <input
                        type="text"
                        className="w-full px-4 py-3 rounded-2xl bg-white/40 border border-orange-200/50 shadow-glass focus:border-orange-400 focus:ring-0 transition-all font-[Comfortaa] font-bold"
                        placeholder="ex: João Silva"
                        value={newItem.name}
                        onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">E-mail Corporativo</label>
                    <input
                        type="email"
                        className="w-full px-4 py-3 rounded-2xl bg-white/40 border border-orange-200/50 shadow-glass focus:border-orange-400 focus:ring-0 transition-all font-[Comfortaa] font-bold"
                        placeholder="ex: joao@empresa.com"
                        value={newItem.email}
                        onChange={e => setNewItem({ ...newItem, email: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Cargo & Autoridade</label>
                    <div className="grid grid-cols-3 gap-3">
                        {(Object.entries(ROLES) as [Role, typeof ROLES['sdr']][]).map(([key, config]) => (
                            <div
                                key={key}
                                onClick={() => setNewItem({ ...newItem, role: key })}
                                className={cn(
                                    "cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
                                    newItem.role === key
                                        ? "border-orange-500 bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-orange-500/20 shadow-md"
                                        : "border-orange-200/50 bg-gradient-soft shadow-glass text-slate-600 hover:border-orange-300"
                                )}
                            >
                                <config.icon size={20} />
                                <span className="text-xs font-bold uppercase tracking-wider">{config.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {inviteError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">{inviteError}</div>
            )}

            <div className="mt-8 flex items-center justify-between pt-6 border-t border-orange-100/60">
                <button onClick={() => setView('list')} className="text-slate-600 font-bold hover:text-slate-800">Cancelar</button>
                <button
                    onClick={handleInvite}
                    disabled={inviteLoading}
                    className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                    {inviteLoading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                    {inviteLoading ? 'Enviando...' : 'Enviar Convite'}
                </button>
            </div>
        </div>

        <div className="flex-1 bg-gradient-to-br from-orange-50/40 to-transparent p-8 rounded-[32px] border border-orange-200/50 flex flex-col backdrop-blur-sm">
            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-600 mb-4 uppercase tracking-wider"><Mail size={14} /> Preview do E-mail de Onboarding</h4>
            <div className="flex-1 bg-gradient-soft border border-orange-200/50 shadow-glass rounded-2xl shadow-sm p-8 font-sans overflow-y-auto">
                <div className="border-b border-orange-100/60 pb-4 mb-6">
                    <div className="text-xs text-slate-600 font-bold uppercase mb-1">Assunto</div>
                    <div className="text-lg font-bold text-slate-800">Bem-vindo(a) ao Time de Vendas! 🚀</div>
                </div>
                <div className="space-y-4 text-slate-600 leading-relaxed text-sm">
                    <p>Olá <strong>{newItem.name || 'Futuro SDR'}</strong>,</p>
                    <p>Você foi convidado para o workspace do <strong>Pipeline de Vendas</strong> como {ROLES[newItem.role as Role].label}.</p>
                    <div className="my-6 p-4 bg-orange-50 border border-orange-100 rounded-xl">
                        <h5 className="font-bold text-orange-900 mb-2 flex items-center gap-2"><Shield size={16} /> Acesso ao Laranjinha</h5>
                        <p className="text-xs text-orange-800 mb-3">O acesso ao sistema agora é feito diretamente com a sua conta Google corporativa.</p>
                        <ol className="list-decimal pl-4 space-y-2 text-xs text-orange-800 font-medium">
                            <li>Acesse a página de login do sistema.</li>
                            <li>Clique em <strong>Entrar com Google (@npx.com.br)</strong>.</li>
                            <li>Seu convite e permissões serão vinculados automaticamente!</li>
                        </ol>
                    </div>
                    <div className="py-4">
                        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold mx-auto block cursor-default">Acessar o Sistema</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const ListView = ({ users, isLoading, setView, setSelectedUser, handleCleanInvites }: any) => (
    <div className="flex flex-col h-full">
        <div className="flex-1 bg-white border border-orange-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-orange-100/60 flex items-center justify-between bg-gradient-to-b from-orange-50/60 to-transparent">
                <div className="flex items-center gap-2">
                    <div className="px-3 py-1 bg-white border border-orange-200/50 rounded-lg text-xs font-black text-slate-600 shadow-sm" style={{ fontFamily: 'Comfortaa, cursive' }}>{users.length} Membros</div>
                    <div className="h-4 w-px bg-orange-100/60" />
                    <span className="text-xs font-bold text-slate-600">Time de Vendas</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleCleanInvites} className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 shadow-sm rounded-lg transition-all" title="Limpar Convites Pendentes/Expirados"><Trash2 size={18} /></button>
                    <button className="p-2 text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-sm rounded-lg transition-all"><Search size={18} /></button>
                    <button className="p-2 text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-sm rounded-lg transition-all"><Filter size={18} /></button>
                </div>
            </div>

            <div className="overflow-x-auto overflow-y-auto">
                {isLoading ? (
                    <div className="p-12 flex justify-center items-center">
                        <Loader2 className="animate-spin text-orange-400" size={32} />
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 border-b border-orange-100/60 sticky top-0">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Usuário</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Cargo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {users.map((user: any) => (
                                <tr
                                    key={user.id}
                                    className="hover:bg-slate-50 transition-colors group cursor-pointer"
                                    onClick={() => { setSelectedUser(user); setView('profile'); }}
                                    style={{ fontFamily: 'Comfortaa, cursive' }}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-black text-sm border border-orange-200 shadow-sm transition-transform group-hover:scale-110">
                                                {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm whitespace-nowrap">{user.name || 'Sem Nome'}</div>
                                                <div className="text-xs text-slate-500 font-medium whitespace-nowrap">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase border tracking-wider", (user.role && ROLES[user.role as Role]) ? ROLES[user.role as Role].color : ROLES.sdr.color)}>
                                            {(user.role && ROLES[user.role as Role]) ? ROLES[user.role as Role].label : 'SDR'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-2 h-2 rounded-full ring-2 ring-white shadow-sm", user.status === 'active' ? "bg-emerald-500" : "bg-amber-500")} />
                                            <span className="text-xs font-bold text-slate-600 capitalize">{user.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-3">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedUser(user); setView('profile'); }}
                                                className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all lg:opacity-0 lg:group-hover:opacity-100 border border-transparent group-hover:border-orange-200"
                                            >
                                                <Settings size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    </div>
);

const SuccessView = ({ newItem, setView }: any) => (
    <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 text-emerald-600 shadow-emerald-200/50 shadow-xl">
            <CheckCircle2 size={48} />
        </div>
        <h3 className="text-2xl font-bold text-slate-800 mb-2">Convite Enviado!</h3>
        <p className="text-slate-600 mb-8"><strong>{newItem.name}</strong> foi adicionado ao time. <br /> O e-mail de onboarding deve chegar em instantes.</p>
        <button onClick={() => setView('list')} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all text-sm uppercase tracking-widest hover:shadow-lg active:scale-95" style={{ fontFamily: 'Comfortaa, cursive' }}>Voltar à Lista</button>
    </div>
);

const ProfileView = ({ selectedUser, setUsers, setSelectedUser, setView }: any) => {
    const [integrations, setIntegrations] = useState(() => {
        const defaults = {
            email: { enabled: false, host: '', port: '587', user: '', pass: '' },
            voice: { enabled: false, sipServer: 'tip2.npx.com.br', extension: '11012', password: '' },
            aurora: { enabled: false, auroraUserId: '', phoneNumber: '' }
        };
        return {
            ...defaults,
            ...(selectedUser?.integrations || {})
        };
    });

    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const toggleIntegration = (type: string) => {
        setIntegrations((prev: any) => ({ ...prev, [type]: { ...prev[type], enabled: !prev[type].enabled } }));
    };

    const updateConfig = (type: string, field: string, value: string) => {
        setIntegrations((prev: any) => ({ ...prev, [type]: { ...prev[type], [field]: value } }));
    };

    const handleSave = async () => {
        if (!selectedUser) return;
        setIsSaving(true);
        setSaveStatus('idle');
        try {
            await api.post(`/users/${selectedUser.id}/integrations`, integrations);
            setUsers((prev: any[]) => prev.map(u => u.id === selectedUser.id ? { ...u, integrations } : u));
            setSelectedUser({ ...selectedUser, integrations });
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (err) {
            console.error(err);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full gap-6 pb-6">
            <div className="bg-gradient-soft border border-orange-200/50 shadow-glass p-6 rounded-[32px] flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-black text-3xl shadow-lg border-2 border-white/50">
                        {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedUser.name}</h2>
                        <p className="text-slate-600 font-medium mb-2">{selectedUser.email}</p>
                        <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase border tracking-wider", (selectedUser.role && ROLES[selectedUser.role as Role]) ? ROLES[selectedUser.role as Role].color : ROLES.sdr.color)}>
                            {(selectedUser.role && ROLES[selectedUser.role as Role]) ? ROLES[selectedUser.role as Role].label : 'SDR'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <AnimatePresence>
                        {saveStatus === 'success' && (
                            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg text-sm font-bold border border-emerald-200">
                                <CheckCircle2 size={16} /> Salvo
                            </motion.div>
                        )}
                        {saveStatus === 'error' && (
                            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg text-sm font-bold border border-red-200">
                                Erro ao salvar
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button onClick={handleSave} disabled={isSaving} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-slate-900/10">
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Salvar
                    </button>
                    <button onClick={() => setView('list')} className="w-10 h-10 bg-white border border-slate-200 shadow-sm text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center justify-center">
                        <ArrowRight size={18} className="rotate-180" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {/* E-mail Config */}
                <div className={cn("bg-white border shadow-glass rounded-[32px] p-6 flex flex-col transition-all h-fit", integrations.email.enabled ? "border-orange-300 ring-2 ring-orange-100" : "border-slate-300 hover:border-slate-400 opacity-90")}>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className={cn("p-3 rounded-xl transition-colors", integrations.email.enabled ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-600")}>
                                <Mail size={24} />
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg">E-mail</h3>
                        </div>
                        <CustomToggle enabled={integrations.email.enabled} onChange={() => toggleIntegration('email')} colorClass="bg-orange-500" />
                    </div>
                    {integrations.email.enabled && (
                        <div className="space-y-4">
                            <div><label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">Servidor SMTP</label>
                                <input type="text" placeholder="smtp.gmail.com" value={integrations.email.host || ''} onChange={(e) => updateConfig('email', 'host', e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all text-sm font-bold text-slate-700 outline-none" /></div>
                            <div><label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">Porta</label>
                                <input type="text" placeholder="587" value={integrations.email.port || ''} onChange={(e) => updateConfig('email', 'port', e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all text-sm font-bold text-slate-700 outline-none" /></div>
                            <div><label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">Usuário</label>
                                <input type="email" placeholder="usuario@empresa.com" value={integrations.email.user || ''} onChange={(e) => updateConfig('email', 'user', e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all text-sm font-bold text-slate-700 outline-none" /></div>
                            <div><label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">Senha</label>
                                <input type="password" placeholder="••••••••" value={integrations.email.pass || ''} onChange={(e) => updateConfig('email', 'pass', e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all text-sm font-bold text-slate-700 outline-none" /></div>
                        </div>
                    )}
                </div>

                {/* Voice Config */}
                <div className={cn("bg-white border shadow-glass rounded-[32px] p-6 flex flex-col transition-all h-fit", integrations.voice.enabled ? "border-sky-300 ring-2 ring-sky-100" : "border-slate-300 hover:border-slate-400 opacity-90")}>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className={cn("p-3 rounded-xl transition-colors", integrations.voice.enabled ? "bg-sky-100 text-sky-600" : "bg-slate-100 text-slate-600")}>
                                <Phone size={24} />
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg">Voz / VoIP</h3>
                        </div>
                        <CustomToggle enabled={integrations.voice.enabled} onChange={() => toggleIntegration('voice')} colorClass="bg-sky-500" />
                    </div>
                    {integrations.voice.enabled && (
                        <div className="space-y-4">
                            <div><label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">Servidor SIP</label>
                                <input type="text" placeholder="tip3.npxtech.com.br" value={integrations.voice.sipServer || ''} onChange={(e) => updateConfig('voice', 'sipServer', e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all text-sm font-bold text-slate-700 outline-none" /></div>
                            <div><label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">Ramal</label>
                                <input type="text" placeholder="11012" value={integrations.voice.extension || ''} onChange={(e) => updateConfig('voice', 'extension', e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all text-sm font-bold text-slate-700 outline-none" /></div>
                            <div><label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">Senha Ramal</label>
                                <input type="password" placeholder="••••••••" value={integrations.voice.password || ''} onChange={(e) => updateConfig('voice', 'password', e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all text-sm font-bold text-slate-700 outline-none" /></div>
                        </div>
                    )}
                </div>

                {/* Aurora Config */}
                <div className={cn("bg-white border shadow-glass rounded-[32px] p-6 flex flex-col transition-all h-fit", integrations.aurora.enabled ? "border-violet-300 ring-2 ring-violet-100" : "border-slate-300 hover:border-slate-400 opacity-90")}>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className={cn("p-3 rounded-xl transition-colors", integrations.aurora.enabled ? "bg-violet-100 text-violet-600" : "bg-slate-100 text-slate-600")}>
                                <MessageSquare size={24} />
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg">Aurora</h3>
                        </div>
                        <CustomToggle enabled={integrations.aurora.enabled} onChange={() => toggleIntegration('aurora')} colorClass="bg-violet-500" />
                    </div>
                    {integrations.aurora.enabled && (
                        <div className="space-y-4">
                            <div><label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">ID Aurora</label>
                                <input type="text" placeholder="Ex: 2244" value={integrations.aurora.auroraUserId || ''} onChange={(e) => updateConfig('aurora', 'auroraUserId', e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 transition-all text-sm font-bold text-slate-700 outline-none" /></div>
                            <div><label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">Número WhatsApp</label>
                                <input type="text" placeholder="+55 11 99999-9999" value={integrations.aurora.phoneNumber || ''} onChange={(e) => updateConfig('aurora', 'phoneNumber', e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 transition-all text-sm font-bold text-slate-700 outline-none" /></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---

export const UserZone: React.FC<UserZoneProps> = ({ onClose }) => {
    const [view, setView] = useState<'list' | 'invite' | 'success' | 'profile'>('list');
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Invite Form State
    const [newItem, setNewItem] = useState({ name: '', email: '', role: 'sdr' as Role });
    const [inviteError, setInviteError] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await api.get('/users');
                if (Array.isArray(res.data)) {
                    setUsers(res.data);
                } else if (res.data && Array.isArray(res.data.data)) {
                    setUsers(res.data.data);
                } else {
                    console.error('Unexpected API response format for /users:', res.data);
                    setUsers([]);
                }
            } catch (err) {
                console.error('Failed to fetch users', err);
                setUsers([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const handleInvite = async () => {
        setInviteError('');
        setInviteLoading(true);
        try {
            if (!newItem.email || !newItem.name) {
                setInviteError('Nome e email são obrigatórios.');
                return;
            }
            const res = await usersAPI.createInvite({
                email: newItem.email,
                name: newItem.name,
                role: newItem.role,
            });
            if (res.success) {
                const newUser: User = {
                    id: res.data.id || Math.random().toString(),
                    name: newItem.name,
                    email: newItem.email,
                    role: newItem.role,
                    status: 'invited'
                };
                setUsers([...users, newUser]);
                setView('success');
            }
        } catch (err: any) {
            setInviteError(err.response?.data?.error || 'Erro ao criar convite.');
        } finally {
            setInviteLoading(false);
        }
    };

    const handleCleanInvites = async () => {
        if (!confirm('Tem certeza que deseja apagar todos os convites pendentes e expirados?')) return;
        try {
            const res = await usersAPI.cleanAllInvites();
            if (res.success) {
                alert('Convites limpos com sucesso.');
                setUsers(prev => prev.filter(u => u.status !== 'invited'));
            }
        } catch (err) {
            console.error('Erro ao limpar convites', err);
            alert('Erro ao limpar convites.');
        }
    };

    return (
        <div className="h-full flex flex-col overflow-hidden text-slate-900 font-sans items-center">
            <div className="w-full max-w-7xl h-full flex flex-col p-6">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/40 backdrop-blur-md border border-white/60 shadow-sm text-slate-700 hover:text-purple-600 transition-all group shrink-0">
                            <ArrowRight className="rotate-180 transition-transform group-hover:-translate-x-1" size={24} strokeWidth={2.5} />
                        </button>
                        <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow border border-white/20 shrink-0"
                            style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}
                        >
                            <Shield size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-2" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                <span className="text-slate-700 opacity-90">Manager</span>
                                <span>Acesso</span>
                            </h2>
                            <p className="text-[11px] text-slate-500 font-extrabold mt-1 tracking-[0.1em] uppercase" style={{ fontFamily: 'Comfortaa, cursive' }}>Gestão de Time e Integrações</p>
                        </div>
                    </div>

                    {view === 'list' && (
                        <button onClick={() => setView('invite')} className="px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl font-black text-xs shadow-orange-500/20 shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2" style={{ fontFamily: 'Comfortaa, cursive' }}>
                            <UserPlus size={16} /> Convidar Membro
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {view === 'list' && (
                            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                                <ListView users={users} isLoading={isLoading} setView={setView} setSelectedUser={setSelectedUser} handleCleanInvites={handleCleanInvites} />
                            </motion.div>
                        )}
                        {view === 'invite' && (
                            <motion.div key="invite" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full">
                                <InviteView
                                    newItem={newItem}
                                    setNewItem={setNewItem}
                                    handleInvite={handleInvite}
                                    inviteLoading={inviteLoading}
                                    inviteError={inviteError}
                                    setView={setView}
                                />
                            </motion.div>
                        )}
                        {view === 'success' && (
                            <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="h-full">
                                <SuccessView newItem={newItem} setView={setView} />
                            </motion.div>
                        )}
                        {view === 'profile' && (
                            <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full">
                                <ProfileView
                                    selectedUser={selectedUser}
                                    setUsers={setUsers}
                                    setSelectedUser={setSelectedUser}
                                    setView={setView}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
