# Inside Sales Pipeline - Guia de Deploy & Setup Local

Este guia detalha como configurar e rodar o projeto do zero, utilizando o repositório oficial no GitHub.

---

## � 1. Primeiro Passo: Clonar o Repositório

Abra o terminal na pasta onde deseja salvar o projeto e execute:

```bash
git clone https://github.com/obarqueirocaronte/Laranjinha_npx.git
cd Laranjinha_npx
```

---

## 💻 2. Ambiente Local (Testes na sua máquina)

Siga os passos abaixo rigorosamente para configurar o ambiente de desenvolvimento:

### Passo 1: Configurar Variáveis do Backend
Crie um arquivo `.env` na RAIZ do projeto (`Laranjinha_npx/.env`) com o conteúdo:

```env
# Banco de Dados (PostgreSQL)
# Altere 'usuario' e 'senha' conforme sua configuração local
DATABASE_URL=postgresql://usuario:senha@localhost:5432/inside_sales_pipeline
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Configurações API
PORT=3001
API_BASE_URL=http://localhost:3001
API_VERSION=v1
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Segurança
JWT_SECRET=DEV_SECRET_KEY_AQUI
SESSION_SECRET=UMA_CHAVE_FORTE_PARA_SESSAO
API_KEY_HEADER=QUALQUER_STRING_PARA_VALIDACAO

# Google OAuth (Obtenha no Google Cloud Console)
GOOGLE_CLIENT_ID=SEU_CLIENT_ID_AQUI
GOOGLE_CLIENT_SECRET=SEU_CLIENT_SECRET_AQUI
GOOGLE_CALLBACK_URL=http://localhost:3001/api/v1/auth/google/callback
```

### Passo 2: Configurar Variáveis do Frontend
Crie o arquivo `.env` dentro da pasta `frontend/`:
```env
# O Vite (porta 3000) fará o proxy para o backend na porta 3001
VITE_API_URL=/api/v1
```

### Passo 3: Configurar Google Cloud Console (OAuth)
Para que o login funcione, configure seu Client ID no Google Console com:

**Origens JavaScript autorizadas:**
- `http://localhost:3000`
- `http://localhost:3001`

**URIs de redirecionamento autorizados:**
- `http://localhost:3001/api/v1/auth/google/callback`

---

## 🗄️ 3. Inicializar o Banco de Dados (Postgres)

1. Certifique-se de que o PostgreSQL está rodando e que você criou o banco `inside_sales_pipeline`.
2. Na RAIZ do projeto, execute:

```bash
npm install
npm run db:setup
```
*Este comando cria as 19 tabelas, insere dados de teste (seed) e aplica todas as migrações.*

---

## 🏃 4. Rodar o Sistema

Você precisará de **dois terminais** abertos:

**Terminal 1 (Backend):**
```bash
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm install
npm run dev
```

Acesse: **http://localhost:3000**

---

## 🔄 5. Fazendo Update do Sistema (MVP Seguro)

Se você já fez o setup inicial e apenas quer **atualizar o código** com o que está no GitHub (sem crashar o site ou perder dados atuais no banco), siga estes passos rápidos:

**1. No servidor (ou na máquina onde está rodando), puxe as alterações:**
```bash
git pull origin main
```

**2. Atualize dependências do Backend e rode novas Migrations (sem apagar o banco!):**
```bash
npm install
npm run db:migrate
```
*(Usamos `db:migrate` no lugar de `db:setup` para garantir que apenas as alterações novas na estrutura do banco sejam aplicadas, mantendo todos os seus leads a salvo).*

**3. Atualize o Frontend e crie a nova build (Se for Produção):**
```bash
cd frontend
npm install
npm run build
```

**4. Reinicie os serviços:**
Dependendo de como você roda o sistema (se no terminal com `npm run dev` ou usando um gerenciador como `pm2`), reinicie o aplicativo do backend e recarregue o servidor do frontend.

---

---

## 🌐 6. Ambiente de Produção vs. Teste

Para garantir a estabilidade do sistema, separamos rigorosamente o que é **Teste** do que é **Produção**.

- **Guia de Ambientes (Portas, .env)**: [docs/ENVIRONMENT_GUIDE.md](file:///Users/rodrigodantas/Antigravity - Projetos/inside-sales-pipeline-beta/docs/ENVIRONMENT_GUIDE.md)
- **Guia do Servidor de Produção (SSH, Caminhos, Deploy)**: [docs/PRODUCTION_SERVER_GUIDE.md](file:///Users/rodrigodantas/Antigravity - Projetos/inside-sales-pipeline-beta/docs/PRODUCTION_SERVER_GUIDE.md)

### Resumo de Fluxo:
1. Altere o código localmente.
2. Teste no Mac (`localhost:3000`).
3. Suba para o GitHub (`git push`).
4. Execute o deploy no servidor de produção seguindo o [Guia de Produção](file:///Users/rodrigodantas/Antigravity - Projetos/inside-sales-pipeline-beta/docs/PRODUCTION_SERVER_GUIDE.md).

---

**Equipe Advanced Agentic Coding - Antigravity**
