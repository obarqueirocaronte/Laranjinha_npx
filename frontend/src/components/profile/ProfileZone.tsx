import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { User as UserIcon, Mail, Shield, Camera, Lock, ArrowLeft, Save, CheckCircle2, Phone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserAvatar } from '../common/UserAvatar';

interface ProfileZoneProps {
    onClose: () => void;
}

export const ProfileZone: React.FC<ProfileZoneProps> = ({ onClose }) => {
    const { user } = useAuth();
    const [name, setName] = useState(user?.email?.split('@')[0].replace(/[^a-zA-Z]/g, ' ') || 'Usuário');
    const [profilePictureUrl, setProfilePictureUrl] = useState(user?.profile_picture_url || '');
    const [password, setPassword] = useState('');
    const [extension, setExtension] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Photo Editor State
    const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
    const [isEditingPhoto, setIsEditingPhoto] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const editorContainerRef = useRef<HTMLDivElement>(null);

    // Load voice/extension config on mount
    React.useEffect(() => {
        if (!user?.id) return;
        import('../../lib/api').then(async (apiModule) => {
            try {
                // Using a direct axios call if not in the object, or accessing the instance
                const res = await apiModule.default.get(`/users/${user.id}/voice-config`);
                if (res.data?.success) {
                    setExtension(res.data.data.extension || '');
                }
            } catch (error) {
                console.error('Failed to load voice config', error);
            }
        });
    }, [user?.id]);

    const isManager = user?.role === 'manager';
    const accentColor = isManager ? '#FF8C00' : '#10B981';
    const gradient = isManager ? 'linear-gradient(135deg, #FF8C00, #FF6347)' : 'linear-gradient(135deg, #10B981, #059669)';

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert('A imagem deve ter no máximo 2MB.');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setTempImageUrl(reader.result as string);
                setIsEditingPhoto(true);
                setZoom(1);
                setPosition({ x: 0, y: 0 });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleConfirmPhoto = async () => {
        if (!tempImageUrl || !user?.id) return;

        setIsSaving(true);
        
        // Use canvas to crop/zoom
        const canvas = document.createElement('canvas');
        const img = new Image();
        img.src = tempImageUrl;
        
        await new Promise((resolve) => { img.onload = resolve; });

        const size = 400; // Final size
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, size, size);

            // Calculate draw parameters
            const aspectRatio = img.width / img.height;
            let drawWidth, drawHeight;

            if (aspectRatio > 1) {
                drawHeight = size * zoom;
                drawWidth = drawHeight * aspectRatio;
            } else {
                drawWidth = size * zoom;
                drawHeight = drawWidth / aspectRatio;
            }

            // Center + Offset
            const x = (size - drawWidth) / 2 + (position.x * (size / 160)); // factor based on UI size
            const y = (size - drawHeight) / 2 + (position.y * (size / 160));

            ctx.drawImage(img, x, y, drawWidth, drawHeight);
        }

        const croppedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        setProfilePictureUrl(croppedBase64);
        setIsEditingPhoto(false);

        // Upload
        try {
            const { usersAPI } = await import('../../lib/api');
            const response = await usersAPI.updateProfile(user.id, { profile_picture_url: croppedBase64 });
            if (response.success) {
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    const parsedUser = JSON.parse(storedUser);
                    const updatedUser = { ...parsedUser, ...response.data };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    window.location.reload();
                }
            }
        } catch (error) {
            console.error('Failed to save cropped photo', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) return;

        setIsSaving(true);
        try {
            import('../../lib/api').then(async ({ usersAPI }) => {
                const data: any = {};
                if (name !== (user as any).name && name !== user.email?.split('@')[0]) data.name = name;
                if (profilePictureUrl !== user.profile_picture_url) data.profile_picture_url = profilePictureUrl;
                if (password) data.password = password;

                const hasProfileUpdates = Object.keys(data).length > 0;
                
                if (hasProfileUpdates) {
                    const profileRes = await usersAPI.updateProfile(user.id, data);
                    if (profileRes.success) {
                        const storedUser = localStorage.getItem('user');
                        if (storedUser) {
                            const parsedUser = JSON.parse(storedUser);
                            const updatedUser = { ...parsedUser, ...profileRes.data };
                            localStorage.setItem('user', JSON.stringify(updatedUser));
                        }
                    }
                }

                // Save Voice/Extension integration
                const integrationData = {
                    voice: {
                        enabled: true,
                        extension: extension.trim()
                    }
                };
                await usersAPI.saveIntegrations(user.id, integrationData);

                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
                setPassword('');
                
                if (hasProfileUpdates) {
                    // Force page reload only if profile (name/photo) changed to update AuthContext
                    window.location.reload(); 
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

                        {/* Photo Editor UI */}
                        {isEditingPhoto && tempImageUrl && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
                                <motion.div 
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-white/20"
                                >
                                    <h3 className="text-xl font-black text-slate-800 mb-6 text-center" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                        Ajustar Foto de Perfil
                                    </h3>
                                    
                                    <div className="relative w-64 h-64 mx-auto bg-slate-100 rounded-full border-4 border-slate-200 overflow-hidden cursor-move mb-8" ref={editorContainerRef}>
                                        <motion.img 
                                            src={tempImageUrl}
                                            drag
                                            dragConstraints={editorContainerRef}
                                            onDrag={(_, info) => setPosition(p => ({ x: p.x + info.delta.x, y: p.y + info.delta.y }))}
                                            style={{ 
                                                scale: zoom,
                                                x: position.x,
                                                y: position.y,
                                            }}
                                            className="w-full h-full object-contain pointer-events-none"
                                        />
                                        {/* Viewport guide */}
                                        <div className="absolute inset-0 rounded-full border-2 border-orange-500/30 pointer-events-none shadow-[0_0_0_100px_rgba(255,255,255,0.4)]" />
                                    </div>

                                    <div className="space-y-6">
                                        <div className="px-4">
                                            <div className="flex justify-between mb-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zoom</span>
                                                <span className="text-[10px] font-black text-orange-500">{(zoom * 100).toFixed(0)}%</span>
                                            </div>
                                            <input 
                                                type="range"
                                                min="1"
                                                max="3"
                                                step="0.01"
                                                value={zoom}
                                                onChange={(e) => setZoom(parseFloat(e.target.value))}
                                                className="w-full accent-orange-500 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>

                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => setIsEditingPhoto(false)}
                                                className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                            >
                                                Cancelar
                                            </button>
                                            <button 
                                                onClick={handleConfirmPhoto}
                                                disabled={isSaving}
                                                className="flex-1 py-4 rounded-2xl bg-orange-600 text-white text-xs font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20"
                                            >
                                                {isSaving ? 'Salvando...' : 'Confirmar'}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}
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

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                                                Configuração de Voz (Ramal)
                                            </label>
                                            <div className="relative">
                                                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input
                                                    type="text"
                                                    value={extension}
                                                    onChange={(e) => setExtension(e.target.value.replace(/\D/g, ''))}
                                                    className="w-full bg-white/60 border border-slate-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 rounded-2xl pl-12 pr-5 py-3.5 outline-none font-bold text-slate-700 transition-all placeholder:text-slate-400"
                                                    placeholder="Digite seu ramal (ex: 11012)"
                                                />
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1.5 ml-1 font-medium">Configure seu ramal para realizar chamadas diretamente do Kanban.</p>
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
