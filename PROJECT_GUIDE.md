# Inside Sales Pipeline - Guia de Deploy & Setup Local

Este guia detalha como configurar e rodar o projeto em uma nova máquina (para testes locais) e como configurá-lo no ambiente final de produção.

---

## 💻 1. Ambiente Local (Testes na sua máquina)

Ao testar em uma nova máquina antes de subir para o domínio `laranjinha.npx.com.br`, você deve rodar os serviços apontando para o seu `localhost`. Siga os passos abaixo rigorosamente para evitar a "tela branca":

### Passo 1: Configurar Variáveis do Backend
Crie um arquivo `.env` na RAIZ do projeto (`inside-sales-pipeline-beta/.env`) com o conteúdo:

```env
# Banco de Dados
DATABASE_URL=postgresql://laranjinha:laranjinha-npx-tech@localhost:5432/inside_sales_pipeline
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Configurações API em Localhost
PORT=3001
API_BASE_URL=http://localhost:3001
API_VERSION=v1
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Autenticação e Segurança
JWT_SECRET=DEV_SECRET_KEY_AQUI
API_KEY_HEADER=SEU_CLIENT_ID_GOOGLE_AQUI
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000

# Google OAuth (Para Testes)
GOOGLE_CLIENT_ID=SEU_CLIENT_ID_AQUI
GOOGLE_CLIENT_SECRET=SEU_CLIENT_SECRET_AQUI
GOOGLE_CALLBACK_URL=http://localhost:3001/api/v1/auth/google/callback
```

### Passo 2: Configurar Variáveis do Frontend
Crie o arquivo `.env` dentro da pasta `frontend/` (`frontend/.env`) e deixe-o **vazio** ou com:
```env
# Em dev local, o Vite (porta 3000) já faz proxy automático para localhost:3001
VITE_API_URL=/api/v1
```

### Passo 3: Inicializar o Banco e Rodar tudo
1. Certifique-se de que o PostgreSQL está rodando.
2. Na RAIZ do projeto, abra um terminal e inicie o Backend:
```bash
npm install
npm run db:setup
npm run dev
```
*(O backend ficará ativo na porta 3001)*

3. Em um SEGUNDO terminal, entre na pasta `frontend` e inicie a Interface:
```bash
cd frontend
npm install
npm run dev
```
*(O frontend ficará ativo na porta 3000)*

Acesse: **http://localhost:3000**. Como `FRONTEND_URL` e a API não estão apontando para o domínio em produção, não haverá "tela branca" nem erro de conexão (CORS).

---

## 🌐 2. Ambiente de Produção (Domínio laranjinha)

Quando o sistema for hospedado na máquina definitiva do domínio `laranjinha.npx.com.br`, as configurações mudam ligeiramente.

### O arquivo `.env` na RAIZ do servidor ficará:
```env
DATABASE_URL=postgresql://laranjinha:laranjinha-npx-tech@localhost:5432/inside_sales_pipeline
PORT=3001
API_BASE_URL=https://laranjinha.npx.com.br
FRONTEND_URL=https://laranjinha.npx.com.br
NODE_ENV=production

JWT_SECRET=SUA_CHAVE_FORTE
API_KEY_HEADER=SEU_CLIENT_ID_GOOGLE_AQUI

GOOGLE_CALLBACK_URL=https://laranjinha.npx.com.br/api/v1/auth/google/callback
```

### O arquivo `frontend/.env` no servidor de compilação ficará:
```env
VITE_API_URL=https://laranjinha.npx.com.br/api/v1
```
Após configurar isso na máquina final, basta rodar `npm run build` na pasta frontend.

---

## 🗄️ Tabelas Sincronizadas (Postgres)
O projeto utilizará **19 tabelas**, sendo que todas são criadas ao rodar `npm run db:setup`:

1.  **Core**: `leads`, `sdrs`, `teams`, `users`, `user_sessions`.
2.  **Pipeline**: `pipeline_columns`, `lead_pipeline_history`, `workflow_triggers`.
3.  **Operação**: `interactions_log`, `notifications`, `templates`, `schedules`.
4.  **Config & Stats**: `sdr_stats`, `management_report_config`, `user_integrations`.
5.  **Dados & Tags**: `lead_custom_fields`, `tags`, `lead_tags`, `invites`.

---

**Equipe Advanced Agentic Coding - Antigravity**
