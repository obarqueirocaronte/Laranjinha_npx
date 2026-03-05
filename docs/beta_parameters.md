# Parâmetros Base - Inside Sales Pipeline Beta

Este documento resume os parâmetros fundamentais para a estrutura e execução do sistema Beta.

## ⚙️ Configurações de Ambiente (.env)

| Parâmetro | Valor Sugerido | Descrição |
|-----------|----------------|-----------|
| `PORT` | `3000` | Porta padrão para o backend (se aplicável). |
| `DATABASE_URL` | `postgresql://...` | String de conexão com o banco de dados. |
| `NODE_ENV` | `development` | Ambiente de execução. |

## 🌐 Configurações de Frontend (Vite)

- **Porta Dinâmica:** A aplicação não possui mais uma porta fixa (anteriormente 8065), permitindo execução simultânea em múltiplas portas.
- **Mattermost Proxy:** Desativado na versão Beta para simplificação.

## 📂 Estrutura de Pastas

- `/frontend`: Aplicação React (interface principal).
- `/src`: Lógica central do sistema.
- `/docs`: Documentação técnica e guias.
- `/database`: Scripts e esquemas de dados.

## 🎯 Escopo Beta

| Módulo | Status |
|--------|--------|
| Kanban Board | Ativo (Principal) |
| Lead Zone (Cadastro) | Ativo (Admin) |
| Cadence Zone | Ativo (Admin) |
| User Control | Inativo |
| Automations & Data | Inativo |
| Chat (Mattermost) | Removido |
