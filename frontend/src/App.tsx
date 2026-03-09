/**
 * Componente Raiz da Aplicação (App.tsx)
 * 
 * Este arquivo define a espinha dorsal de navegação (Roteamento) do Frontend.
 * Todas as rotas (URLs) que o usuário acessa são configuradas aqui.
 * Também envelopamos tudo com o `AuthProvider` para termos acesso
 * aos dados do usuário logado em qualquer lugar do sistema.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { VerifyEmailPage } from './components/auth/VerifyEmailPage';
import { AcceptInvitePage } from './components/auth/AcceptInvitePage';
import { Dashboard } from './components/layout/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rotas Públicas (Qualquer um acessa) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />

          {/* Rotas Protegidas (Requer login e autenticação) 
              Envolvemos nosso Dashboard principal na <ProtectedRoute>
          */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Rota Coringa - Redireciona tudo que não existe para a tela inicial */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
