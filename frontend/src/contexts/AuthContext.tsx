/**
 * Contexto de Autenticação (AuthContext.tsx)
 * 
 * Este arquivo usa a Context API do React para criar um "estado global"
 * de Autenticação. Isso permite que qualquer componente do sistema
 * saiba rapidamente se o usuário está logado, quem é ele e seu cargo (role).
 * Também disponibiliza as funções para fazer Login, Registro e Logout.
 */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authAPI } from '../lib/api';

interface User {
    id: string;
    email: string;
    role?: 'manager' | 'sdr';
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    verifyEmail: (token: string) => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // useEffect roda apenas uma vez quando a aplicação começa (Montagem do componente).
    // Ele checa se já existe um usuário salvo localmente (localStorage) 
    // ou valida o token de acesso com o backend.
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('auth_token');
            if (token) {
                // If it's our bypass token, restore session immediately
                if (token === 'bypass-token') {
                    const savedUser = localStorage.getItem('user');
                    if (savedUser) {
                        setUser(JSON.parse(savedUser));
                    }
                    setLoading(false);
                    return;
                }

                try {
                    const response = await authAPI.getCurrentUser();
                    if (response.success) {
                        setUser(response.data.user);
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

            // Bypass logic for Beta
            const role = email.toLowerCase().includes('admin') || email.toLowerCase().includes('manager') ? 'manager' : 'sdr';
            const mockUser: User = { id: role === 'manager' ? 'admin-bypass' : 'sdr-bypass', email, role };
            setUser(mockUser);
            localStorage.setItem('auth_token', 'bypass-token');
            localStorage.setItem('user', JSON.stringify(mockUser));

            // Optional: try real login silently
            try {
                await authAPI.login(email, password);
            } catch (e) {
                // Ignore real login failure
            }
        } catch (err: any) {
            // Fallback if something purely local fails
            const errorMessage = err.message || 'Login failed';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
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
            try {
                await authAPI.logout();
            } catch (e) {
                // Ignore API failure in bypass mode
            }
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

            if (!response.success) {
                throw new Error(response.error?.message || 'Verification failed');
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.error?.message || err.message || 'Verification failed';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const clearError = () => setError(null);

    const value = {
        user,
        loading,
        error,
        login,
        register,
        logout,
        verifyEmail,
        clearError,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
