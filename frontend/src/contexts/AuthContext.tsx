/**
 * Contexto de Autenticação (AuthContext.tsx)
 * 
 * Fluxo real de autenticação.
 * - Bypass mantido APENAS para o manager rodrigo.sergio@npx.com.br
 * - Todo o resto autentica via banco de dados real (JWT)
 * - Suporte a login via Google OAuth
 */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authAPI } from '../lib/api';

interface User {
    id: string;
    email: string;
    role?: 'manager' | 'sdr';
    isAdmin?: boolean;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    verifyEmail: (token: string) => Promise<void>;
    loginWithGoogle: () => void;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Manager bypass — SOMENTE este usuário tem acesso sem banco
const MANAGER_BYPASS = { email: 'rodrigo.sergio@npx.com.br', password: '505050' };

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Verifica autenticação ao carregar (token salvo ou retorno do Google)
    useEffect(() => {
        const checkAuth = async () => {
            // Verificar parâmetros na URL (retorno do Google OAuth)
            const params = new URLSearchParams(window.location.search);
            const tokenFromGoogle = params.get('token');
            const emailFromGoogle = params.get('email');
            const isAdminFromGoogle = params.get('isAdmin') === 'true';

            if (tokenFromGoogle && emailFromGoogle) {
                const googleUser: User = {
                    id: 'google-auth',
                    email: emailFromGoogle,
                    role: isAdminFromGoogle ? 'manager' : 'sdr',
                    isAdmin: isAdminFromGoogle
                };
                localStorage.setItem('auth_token', tokenFromGoogle);
                localStorage.setItem('user', JSON.stringify(googleUser));
                setUser(googleUser);
                // Limpar parâmetros da URL
                window.history.replaceState({}, '', '/');
                setLoading(false);
                return;
            }

            const token = localStorage.getItem('auth_token');
            if (token) {
                // Bypass token do manager
                if (token === 'bypass-token') {
                    const savedUser = localStorage.getItem('user');
                    if (savedUser) {
                        setUser(JSON.parse(savedUser));
                    }
                    setLoading(false);
                    return;
                }

                // Token JWT real — validar com o backend
                try {
                    const response = await authAPI.getCurrentUser();
                    if (response.success) {
                        const u = response.data.user;
                        setUser({
                            id: u.id,
                            email: u.email,
                            role: u.is_admin ? 'manager' : 'sdr',
                            isAdmin: u.is_admin
                        });
                    }
                } catch (err) {
                    console.error('Auth check failed:', err);
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user');
                }
            }
            setLoading(false);
        };

        checkAuth();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            setLoading(true);
            setError(null);

            // Bypass SOMENTE para o manager
            if (email === MANAGER_BYPASS.email && password === MANAGER_BYPASS.password) {
                const managerUser: User = { id: 'admin-bypass', email, role: 'manager', isAdmin: true };
                setUser(managerUser);
                localStorage.setItem('auth_token', 'bypass-token');
                localStorage.setItem('user', JSON.stringify(managerUser));
                return;
            }

            // Autenticação REAL via banco de dados para todos os outros
            const response = await authAPI.login(email, password);

            if (!response.success) {
                throw new Error(response.error?.message || 'Login failed');
            }

            const { token, user: apiUser } = response.data;
            const loggedUser: User = {
                id: apiUser.id,
                email: apiUser.email,
                role: apiUser.isAdmin ? 'manager' : 'sdr',
                isAdmin: apiUser.isAdmin
            };

            localStorage.setItem('auth_token', token);
            localStorage.setItem('user', JSON.stringify(loggedUser));
            setUser(loggedUser);

        } catch (err: any) {
            const errorMessages: Record<string, string> = {
                INVALID_CREDENTIALS: 'Email ou senha incorretos.',
                EMAIL_NOT_VERIFIED: 'Email não verificado. Verifique sua caixa de entrada.',
                EMAIL_DOMAIN_INVALID: 'Use seu email @npx.com.br.',
            };
            const code = err.response?.data?.error?.code || err.message;
            const errorMessage = errorMessages[code] || 'Erro ao fazer login. Tente novamente.';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Login com Google — redireciona para o backend OAuth
    const loginWithGoogle = () => {
        const backendUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';
        window.location.href = `${backendUrl}/api/v1/auth/google`;
    };

    const register = async (email: string, password: string) => {
        try {
            setLoading(true);
            setError(null);
            const response = await authAPI.register(email, password);

            if (!response.success) {
                throw new Error(response.error?.message || 'Registration failed');
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.error?.message || err.message || 'Registration failed';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            setLoading(true);
            try { await authAPI.logout(); } catch (e) { /* ignore */ }
            setUser(null);
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setLoading(false);
        }
    };

    const verifyEmail = async (token: string) => {
        try {
            setLoading(true);
            setError(null);
            const response = await authAPI.verifyEmail(token);
            if (!response.success) throw new Error(response.error?.message || 'Verification failed');
        } catch (err: any) {
            const errorMessage = err.response?.data?.error?.message || err.message || 'Verification failed';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const clearError = () => setError(null);

    return (
        <AuthContext.Provider value={{ user, loading, error, login, register, logout, verifyEmail, loginWithGoogle, clearError }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
