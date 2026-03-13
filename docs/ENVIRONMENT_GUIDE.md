# 🌍 Guia de Ambientes: Produção vs. Teste

Este documento define oficialmente a separação entre o ambiente de **Produção** (onde os clientes acessam) e o ambiente de **Teste** (sua máquina local).

---

## 🏗️ 1. Ambiente de Produção (Live)
Este é o ambiente onde o sistema "Laranjinha" está rodando oficialmente. **Não altere código diretamente aqui sem antes testar localmente.**

- **Domínio**: [https://laranjinha.npx.com.br](https://laranjinha.npx.com.br)
- **Servidor**: Ubuntu Remote (Porta SSH: 55535)
- **Banco de Dados**: `inside_sales_pipeline` (PostgreSQL no servidor remoto)
- **Status**: Limpo, sem dados de semente (seed), apenas usuários reais e convites pendentes.

### ⚠️ Regras para Produção:
1. **Nunca** rode `npm run db:setup` ou comandos de limpeza em produção a menos que queira zerar tudo.
2. Sempre use `git pull origin main` para trazer as mudanças testadas localmente.
3. Se houver mudanças no banco de dados, use `npm run db:migrate`.

---

## 💻 2. Ambiente de Teste / Local (Sua Máquina)
Este ambiente em `/Users/rodrigodantas/Antigravity - Projetos/inside-sales-pipeline-beta` é onde todas as novas funcionalidades e correções devem ser feitas.

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:3001](http://localhost:3001)
- **Banco de Dados**: `inside_sales_pipeline` (PostgreSQL Local)

### 🛠️ Fluxo de Trabalho (Workflow):
1. **Faça a alteração** no código local.
2. **Teste** a funcionalidade no seu Mac.
3. **Commit & Push** para o GitHub:
   ```bash
   git add .
   git commit -m "Descricao da mudança"
   git push origin main
   ```
4. **Deploy em Produção**:
   Acesse o servidor via SSH e rode o pull (veja o `PROJECT_GUIDE.md` para detalhes).

### 🧪 Testando e Validando no Mac (Local)
Para rodar a aplicação localmente e realizar validações (por exemplo, testar a importação de CSV/XLSX):
1. Abra um terminal na pasta raiz do projeto.
2. Inicie o Backend (porta 3001):
   `npm run dev`
3. Abra outro terminal na pasta `frontend/`.
4. Inicie o Frontend (porta 3000):
   `npm run dev`
5. Acesse `http://localhost:3000` no navegador, faça o login e navegue até a tela de importação para validar a inserção de novos leads e o funcionamento do Kanban.
6. Acompanhe os logs nos dois terminais para verificar eventuais erros de processamento ou parse de dados.

---

## ⚙️ 4. Configuração de Portas (Port Mapping)

Se você desejar rodar o sistema em uma porta diferente da padrão, siga estas instruções:

### Backend (API)
A porta do backend é controlada pela variável de ambiente `PORT` ou pelo padrão `3001`.
- **Como mudar**: No arquivo `.env`, adicione ou altere:
  ```bash
  PORT=4000
  ```
- **Importante**: Se mudar a porta do backend, você **também** deve atualizar o frontend para que ele saiba onde chamar a API. No `.env` do frontend (ou root), altere `VITE_API_URL` (ou `API_BASE_URL` - verifique qual está em uso).

### Frontend (Vite)
O frontend usa a porta `3000` por padrão via Vite.
- **Como mudar**: No arquivo `frontend/package.json`, altere o script `dev`:
  ```json
  "dev": "vite --port 5000"
  ```
- Alternativamente, você pode rodar via terminal: `npm run dev -- --port 5000`.

---

## 🔑 5. Arquivos de Configuração (.env)

| Variável | Teste (Local) | Produção (Remoto) |
| :--- | :--- | :--- |
| `NODE_ENV` | `development` | `production` |
| `API_BASE_URL` | `http://localhost:3001` | `https://laranjinha.npx.com.br/api/v1` |
| `FRONTEND_URL` | `http://localhost:3000` | `https://laranjinha.npx.com.br` |
| `DATABASE_URL` | `postgresql://localhost:5432/...` | `postgresql://localhost:5432/inside_sales_pipeline` |

> [!IMPORTANT]
> O arquivo `.env` **nunca** deve ser enviado ao GitHub. Mantenha os seus arquivos locais e remotos sincronizados manualmente apenas quando necessário.
