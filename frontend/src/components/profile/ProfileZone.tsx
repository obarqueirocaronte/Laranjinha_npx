import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User as UserIcon, Mail, Shield, Camera, Lock, ArrowLeft, Save, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserAvatar } from '../common/UserAvatar';

interface ProfileZoneProps {
    onClose: () => void;
}

export const ProfileZone: React.FC<ProfileZoneProps> = ({ onClose }) => {
    const { user } = useAuth();
    const [name, setName] = useState(user?.email?.split('@')[0].replace(/[^a-zA-Z]/g, ' ') || 'Usuário');
    const [profilePictureUrl, setProfilePictureUrl] = useState(user?.profile_picture_url || '');
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isManager = user?.role === 'manager';
    const accentColor = isManager ? '#FF8C00' : '#10B981';
    const gradient = isManager ? 'linear-gradient(135deg, #FF8C00, #FF6347)' : 'linear-gradient(135deg, #10B981, #059669)';

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Check file size (limit to 2MB)
            if (file.size > 2 * 1024 * 1024) {
                alert('A imagem deve ter no máximo 2MB.');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePictureUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) return;

        setIsSaving(true);
        try {
            import('../../lib/api').then(async ({ usersAPI }) => {
                const data: any = {};
                if (name !== user.name && name !== user.email?.split('@')[0]) data.name = name;
                if (profilePictureUrl !== user.profile_picture_url) data.profile_picture_url = profilePictureUrl;
                if (password) data.password = password;

                if (Object.keys(data).length > 0) {
                    const response = await usersAPI.updateProfile(user.id, data);
                    if (response.success) {
                        // Update local storage user object if needed
                        const storedUser = localStorage.getItem('user');
                        if (storedUser) {
                            const parsedUser = JSON.parse(storedUser);
                            const updatedUser = { ...parsedUser, ...response.data };
                            localStorage.setItem('user', JSON.stringify(updatedUser));
                            // Force page reload to update AuthContext immediately (quick fix)
                            window.location.reload(); 
                        } else {
                            setShowSuccess(true);
                            setTimeout(() => setShowSuccess(false), 3000);
                            setPassword('');
                        }
                    }
                } else {
                     setShowSuccess(true);
                     setTimeout(() => setShowSuccess(false), 3000);
                }
            }).finally(() => {
                setIsSaving(false);
            });
        } catch (error) {
            console.error('Failed to update profile:', error);
            alert('Erro ao atualizar perfil.');
            setIsSaving(false);
        }
    };

    return (
        <div className="h-full flex flex-col font-sans max-w-4xl mx-auto p-8 w-full">
            {/* Header Area */}
            <div className="flex items-center gap-6 mb-10 pb-6 border-b border-orange-200/30">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/40 backdrop-blur-md border border-white/60 shadow-sm text-slate-700 hover:text-orange-600 transition-all group shrink-0">
                        <ArrowLeft className="transition-transform group-hover:-translate-x-1" size={24} strokeWidth={2.5} />
                    </button>
                    <UserAvatar 
                        src={profilePictureUrl || user?.profile_picture_url} 
                        name={name} 
                        size="lg" 
                        border={false}
                        className="!rounded-2xl !bg-white/20 !border-white/20" 
                    />
                    <div>
                        <h2 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-2" style={{ fontFamily: 'Comfortaa, cursive' }}>
                            <span className="text-slate-700 opacity-90">Meu</span>
                            <span>Perfil</span>
                        </h2>
                        <p className="text-[11px] text-slate-500 font-extrabold mt-1 tracking-[0.1em] uppercase" style={{ fontFamily: 'Comfortaa, cursive' }}>
                            Configurações de Conta
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 pb-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column - Avatar & Identity */}
                    <div className="md:col-span-1 flex flex-col items-center">
                        <div className="relative group mb-6">
                            <div className="absolute inset-[-4px] bg-gradient-to-br from-orange-400 to-rose-400 rounded-full blur-md opacity-30 group-hover:opacity-60 transition-opacity" />
                            <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-gradient-to-br from-orange-100 to-rose-50 flex items-center justify-center">
                                <UserAvatar 
                                    src={profilePictureUrl || user?.profile_picture_url} 
                                    name={name} 
                                    size="xl" 
                                    border={false}
                                    className="w-full h-full !rounded-none" 
                                />
                                {/* Overlay to change picture */}
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                                    <Camera size={32} className="mb-2" />
                                    <span className="text-xs font-bold tracking-widest uppercase">Alterar Foto</span>
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageChange}
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                />
                            </div>
                        </div>

                        <div className="text-center w-full">
                            <h3 className="text-2xl font-black text-slate-800 capitalize" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                {name}
                            </h3>
                            <div className="flex items-center justify-center gap-2 mt-2 bg-slate-100 py-1.5 px-4 rounded-full max-w-fit mx-auto border border-slate-200">
                                <div className="w-2 h-2 rounded-full" style={{ background: accentColor }} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                                    {isManager ? 'Manager' : 'SDR'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Forms */}
                    <div className="md:col-span-2">
                        <div className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-glass rounded-[32px] p-8 relative overflow-hidden">
                            {showSuccess && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute top-0 left-0 right-0 bg-emerald-500 text-white text-center py-3 text-sm font-bold flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={16} /> Perfil atualizado com sucesso!
                                </motion.div>
                            )}

                            <form onSubmit={handleSave} className="space-y-6 mt-2">
                                {/* Informações Pessoais */}
                                <div>
                                    <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-widest mb-4">
                                        <UserIcon size={16} style={{ color: accentColor }} /> Informações Pessoais
                                    </h4>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                                                Nome Completo
                                            </label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full bg-white/60 border border-slate-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 rounded-2xl px-5 py-3.5 outline-none font-bold text-slate-700 transition-all placeholder:text-slate-400"
                                                placeholder="Seu nome completo"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                                                E-mail Cadastrado
                                            </label>
                                            <div className="relative">
                                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input
                                                    type="email"
                                                    value={user?.email}
                                                    disabled
                                                    className="w-full bg-slate-100/50 border border-slate-200/60 rounded-2xl pl-12 pr-5 py-3.5 outline-none font-bold text-slate-500 cursor-not-allowed"
                                                />
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1.5 ml-1 font-medium">O e-mail é utilizado para login e não pode ser alterado.</p>
                                        </div>
                                    </div>
                                </div>

                                <hr className="border-slate-200/60 my-6" />

                                {/* Segurança */}
                                <div>
                                    <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-widest mb-4">
                                        <Shield size={16} style={{ color: accentColor }} /> Segurança
                                    </h4>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                                            Nova Senha
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full bg-white/60 border border-slate-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 rounded-2xl pl-12 pr-5 py-3.5 outline-none font-bold text-slate-700 transition-all placeholder:text-slate-400"
                                                placeholder="Digite para alterar a senha"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="w-full text-white rounded-2xl px-6 py-4 font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-orange-500/20 disabled:opacity-70 disabled:hover:scale-100"
                                        style={{ background: gradient }}
                                    >
                                        <Save size={18} /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
