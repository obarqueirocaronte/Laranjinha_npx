/**
 * Ponto de Montagem do React (main.tsx)
 * 
 * Este arquivo "injeta" toda a nossa aplicação React (App.tsx)
 * dentro do arquivo index.html (no elemento com id 'root').
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css' // Importação de estilos globais
import App from './App.tsx'

// Global Error Tracking - Displays a notification on production crash
if (typeof window !== 'undefined') {
  const displayError = (msg: string) => {
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'fixed';
    errorDiv.style.bottom = '10px';
    errorDiv.style.right = '10px';
    errorDiv.style.backgroundColor = '#fee2e2';
    errorDiv.style.border = '1px solid #ef4444';
    errorDiv.style.color = '#991b1b';
    errorDiv.style.padding = '12px 16px';
    errorDiv.style.borderRadius = '12px';
    errorDiv.style.zIndex = '9999';
    errorDiv.style.fontSize = '12px';
    errorDiv.style.fontWeight = 'bold';
    errorDiv.style.fontFamily = 'Comfortaa, cursive';
    errorDiv.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
    errorDiv.innerHTML = `⚠️ Ops! Ocorreu um erro no navegador. <br/> <span style="font-weight: normal; opacity: 0.8">${msg}</span>`;
    document.body.appendChild(errorDiv);
  };

  window.onerror = (message) => {
    console.error('[Global Error]', message);
    displayError(String(message));
  };

  window.onunhandledrejection = (event) => {
    console.error('[Unhandled Rejection]', event.reason);
    displayError(event.reason?.message || 'Erro de rede ou promessa');
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

