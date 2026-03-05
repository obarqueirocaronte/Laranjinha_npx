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
    const { login, loading } = useAuth();
    const [errorMessage, setErrorMessage] = useState('');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: 'visitante@npx.com.br',
            password: 'npx-visitante'
        }
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
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-800 text-sm">{errorMessage}</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Email Field */}
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

                    {/* Password Field */}
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

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white font-semibold rounded-full hover:from-orange-700 hover:to-orange-800 hover:shadow-[0_0_20px_rgba(255,109,0,0.45)] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ fontFamily: 'Quicksand, sans-serif' }}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Entrando...
                            </span>
                        ) : (
                            'Entrar'
                        )}
                    </button>
                </form>

                {/* Footer */}
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
