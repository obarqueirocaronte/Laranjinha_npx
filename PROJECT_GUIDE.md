# Inside Sales Pipeline - Guia de Produção & Deploy

Este guia detalha como configurar e rodar o projeto em um ambiente de produção ou em uma nova máquina, garantindo que o Banco de Dados e a API funcionem corretamente.

## 📍 Configuração de Ambiente (.env)

O arquivo `.env` na raiz do projeto deve conter as seguintes definições fundamentais (verifique os valores reais no seu terminal ou painel de controle):

```env
# Database
DATABASE_URL=postgresql://laranjinha:laranjinha-npx-tech@localhost:5432/inside_sales_pipeline
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# API
PORT=3001
API_BASE_URL=https://laranjinha.npx.com.br
API_VERSION=v1
NODE_ENV=production

# Authentication
JWT_SECRET=SUA_CHAVE_AQUI
API_KEY_HEADER=SEU_CLIENT_ID_GOOGLE_AQUI

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🗄️ Estrutura do Banco de Dados (Postgres)

A versão atual foi expandida para suportar toda a operação de Inside Sales, contando com **19 tabelas** integradas via PostgreSQL:

1.  **Core**: `leads`, `sdrs`, `teams`, `users`, `user_sessions`.
2.  **Pipeline**: `pipeline_columns`, `lead_pipeline_history`, `workflow_triggers`.
3.  **Operação**: `interactions_log`, `notifications`, `templates`, `schedules`.
4.  **Config & Stats**: `sdr_stats`, `management_report_config`, `user_integrations`.
5.  **Dados & Tags**: `lead_custom_fields`, `tags`, `lead_tags`, `invites`.

---

## 🚀 Passo a Passo para Nova Máquina

Se você clonou o projeto em uma nova máquina e está vendo uma tela branca ou erros, siga estes passos:

### 1. Preparar o Banco de Dados (PostgreSQL)
Certifique-se de que o Postgres está instalado e rodando.
Abra um terminal na raiz e execute o comando de inicialização (isso cria as **19 tabelas** e insere dados iniciais):
```bash
npm run db:setup
```
*Atenção: Garanta que o usuário 'laranjinha' existe ou ajuste a `DATABASE_URL` no seu `.env`.*

### 2. Rodar o Backend
```bash
npm install
npm start
```
O servidor deve reportar: `🚀 API Server running on port 3001`.

### 3. Build do Frontend (Opcional se já estiver no Git)
O frontend foi compilado para falar com `https://laranjinha.npx.com.br`. Se você estiver rodando localmente na outra máquina e quiser testar via `localhost`, precisará alterar o arquivo `frontend/.env` e rodar:
```bash
cd frontend
npm install
npm run build
```

---

## 🛠 Solução de Problemas (FAQ)

### ❓ Tela Branca ao Acessar
*   **Causa:** O build do frontend pode estar tentando acessar `localhost:3001` de dentro de um navegador em outra máquina.
*   **Solução:** Já atualizamos o build do Git para apontar para `https://laranjinha.npx.com.br`. Basta dar um `git pull` na outra máquina.

### ❓ Erro de Conexão com Banco de Dados
*   **Causa:** O PostgreSQL não está rodando ou as credenciais no `.env` estão incorretas.
*   **Solução:** Verifique se consegue se conectar via `psql` ou `TablePlus` usando os dados da `DATABASE_URL`.

### ❓ Login Não Funciona (Google Auth)
*   **Causa:** As URLs de callback no Google Console precisam incluir `https://laranjinha.npx.com.br/api/v1/auth/google/callback`.
*   **Solução:** Adicione a URL acima como "Authorized redirect URIs" no Google Cloud Console.

---

**Equipe Advanced Agentic Coding - Antigravity**
