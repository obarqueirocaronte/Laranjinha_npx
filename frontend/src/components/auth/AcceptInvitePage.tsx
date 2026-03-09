import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { authAPI } from '../../lib/api';

export const AcceptInvitePage = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(true);
    const [inviteData, setInviteData] = useState<{ email: string; name: string; role: string } | null>(null);
    const [error, setError] = useState('');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('Token de convite não encontrado na URL.');
            setIsLoading(false);
            return;
        }

        const validateToken = async () => {
            try {
                const res = await authAPI.validateInvite(token);
                if (res.success) {
                    setInviteData(res.data);
                } else {
                    setError('Convite não encontrado ou dados inválidos.');
                }
            } catch (err: any) {
                setError(err.response?.data?.error?.message || 'Erro ao validar o convite.');
            } finally {
                setIsLoading(false);
            }
        };

        validateToken();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        if (password.length < 8) {
            setError('A senha deve ter pelo menos 8 caracteres.');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await authAPI.acceptInvite(token as string, password);
            if (res.success) {
                // Redireciona para o dashboard após login automático
                navigate('/');
            }
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Erro ao aceitar o convite.');
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-orange-400" size={48} />
            </div>
        );
    }

    if (error && !inviteData) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">Convite Inválido</h2>
                    <p className="text-slate-600 mb-8">{error}</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors"
                    >
                        Ir para o Login
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-400/20 rounded-full blur-[100px] mix-blend-multiply" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400/20 rounded-full blur-[100px] mix-blend-multiply" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="w-full max-w-[440px] z-10"
            >
                <div className="bg-white/70 backdrop-blur-xl rounded-[32px] p-8 lg:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 relative overflow-hidden">
                    {/* Logo/Icon */}
                    <div className="mb-8 flex justify-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                            <Shield size={32} strokeWidth={2.5} />
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>Bem-vindo(a)!</h1>
                        <p className="text-slate-500 mt-2 font-medium text-sm">
                            Complete seu cadastro como <strong className="text-orange-600 uppercase tracking-wider">{inviteData?.role}</strong>.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Seu Nome</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={inviteData?.name}
                                    disabled
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-400/10 transition-all font-bold text-slate-700 outline-none disabled:opacity-70"
                                />
                                <Shield size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">E-mail Corporativo</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={inviteData?.email}
                                    disabled
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-400/10 transition-all font-bold text-slate-700 outline-none disabled:opacity-70"
                                />
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Crie sua Senha</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Mínimo 8 caracteres"
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-400/10 transition-all font-bold text-slate-700 outline-none"
                                />
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Confirme a Senha</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repita a senha"
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-400/10 transition-all font-bold text-slate-700 outline-none"
                                />
                                <CheckCircle2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 bg-red-50 border border-red-200 rounded-xl flex flex-col gap-1"
                            >
                                <div className="flex items-center gap-2 text-red-600 text-sm font-bold">
                                    <AlertCircle size={16} /> Erro
                                </div>
                                <p className="text-red-600 text-xs ml-6">{error}</p>
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
                        >
                            {isSubmitting ? (
                                <><Loader2 size={18} className="animate-spin" /> Processando...</>
                            ) : (
                                'Entrar no Pipeline'
                            )}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};
