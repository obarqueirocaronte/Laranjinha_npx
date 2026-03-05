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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
