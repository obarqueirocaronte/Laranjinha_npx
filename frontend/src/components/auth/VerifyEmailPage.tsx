import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function VerifyEmailPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { verifyEmail } = useAuth();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const verify = async () => {
            if (!token) {
                setStatus('error');
                setErrorMessage('Token de verificação não encontrado');
                return;
            }

            try {
                await verifyEmail(token);
                setStatus('success');
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            } catch (error: any) {
                setStatus('error');
                setErrorMessage(error.message);
            }
        };

        verify();
    }, [token, verifyEmail, navigate]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 px-4">
                <div className="max-w-md w-full bg-gradient-soft border border-orange-100 shadow-glass rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <svg className="w-8 h-8 text-orange-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Verificando Email...</h2>
                    <p className="text-gray-600">Por favor, aguarde enquanto verificamos sua conta.</p>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 px-4">
                <div className="max-w-md w-full bg-gradient-soft border border-orange-100 shadow-glass rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verificado!</h2>
                    <p className="text-gray-600 mb-6">
                        Sua conta foi verificada com sucesso. Você será redirecionado para a página de login em alguns segundos...
                    </p>
                    <Link
                        to="/login"
                        className="inline-block w-full px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
                    >
                        Ir para Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 px-4">
            <div className="max-w-md w-full bg-gradient-soft border border-orange-100 shadow-glass rounded-2xl shadow-xl p-8 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Verificação Falhou</h2>
                <p className="text-gray-600 mb-6">{errorMessage}</p>
                <div className="space-y-3">
                    <Link
                        to="/register"
                        className="block w-full px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
                    >
                        Criar Nova Conta
                    </Link>
                    <Link
                        to="/login"
                        className="block w-full px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Voltar para Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
