import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';

const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha é obrigatória'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
    const navigate = useNavigate();
    const { login, loginWithGoogle, loading } = useAuth();
    const [errorMessage, setErrorMessage] = useState('');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' }
    });

    const onSubmit = async (data: LoginFormData) => {
        try {
            setErrorMessage('');
            await login(data.email, data.password);
            navigate('/');
        } catch (error: any) {
            setErrorMessage(error.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 px-4">
            <div className="max-w-md w-full bg-gradient-soft border border-orange-100 shadow-glass rounded-[30px] shadow-xl p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Comfortaa, cursive' }}>Bem-vindo</h1>
                    <p className="text-gray-600" style={{ fontFamily: 'Quicksand, sans-serif' }}>Faça login no Inside Sales Pipeline</p>
                </div>

                {/* Error Message */}
                {errorMessage && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-red-800 text-sm font-medium">{errorMessage}</p>
                    </div>
                )}

                {/* Google Login Button */}
                <button
                    onClick={loginWithGoogle}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-full font-semibold text-slate-700 hover:bg-slate-50 hover:shadow-md transition-all mb-6"
                    style={{ fontFamily: 'Quicksand, sans-serif' }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Entrar com Google (@npx.com.br)
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">ou</span>
                    <div className="flex-1 h-px bg-slate-200" />
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                            Email
                        </label>
                        <input
                            {...register('email')}
                            type="email"
                            id="email"
                            autoComplete="email"
                            className="w-full px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" style={{ fontFamily: 'Quicksand, sans-serif' }}
                            placeholder="seu.email@npx.com.br"
                        />
                        {errors.email && (
                            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label htmlFor="password" className="block text-sm font-semibold text-gray-700" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                                Senha
                            </label>
                            <Link to="/forgot-password" className="text-sm text-orange-600 hover:text-orange-700">
                                Esqueceu a senha?
                            </Link>
                        </div>
                        <input
                            {...register('password')}
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            className="w-full px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" style={{ fontFamily: 'Quicksand, sans-serif' }}
                            placeholder="••••••••"
                        />
                        {errors.password && (
                            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white font-semibold rounded-full hover:from-orange-700 hover:to-orange-800 hover:shadow-[0_0_20px_rgba(255,109,0,0.45)] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ fontFamily: 'Quicksand, sans-serif' }}
                    >
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Não tem uma conta?{' '}
                        <Link to="/register" className="text-orange-600 hover:text-orange-700 font-semibold">
                            Criar Conta
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
