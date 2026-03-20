# 🌍 Protocolo Unificado: Ambientes & Deploy

Este documento define oficialmente a separação entre os ambientes de **Produção** e **Teste** do sistema "Laranjinha", consolidando também as instruções de limpeza, processos e deploy.

---

## 🏗️ 1. Ambiente de Produção (Live)
<span style="color: red; font-weight: bold;">⚠️ O AMBIENTE DE PRODUÇÃO É EXTERNO E O DEPLOY DEVE SER FEITO REMOTAMENTE ⚠️</span>

Onde o sistema oficial roda e onde os clientes acessam. **Não altere código diretamente aqui sem antes testar localmente.**

- **Domínio**: [https://laranjinha.npx.com.br](https://laranjinha.npx.com.br)
- **Servidor**: Ubuntu Remote (`178.156.234.198`) | Porta SSH: `55535` | Usuário: `rodrigo` | Senha: `Esseanoemeu@2026`
- **Diretório da Aplicação**: `/opt/laranjinha`
- **Porta da Aplicação API**: `3001` (TCP)
- **Logs do Servidor**: `/opt/laranjinha/nohup.out`
- **Banco de Dados**: `inside_sales_pipeline` (PostgreSQL local no servidor remoto)

### ⚠️ Regras e Limpeza para Produção:
1. **Nunca** rode comandos de limpeza ou `npm run db:setup` em produção a menos que queira zerar tudo.
2. Mantenha os dados limpos sem informações de semente (seed).
3. O deploy deve ser sempre via git pull do repositório remoto.

---

## 💻 2. Ambiente de Teste / Local (Sua Máquina)
Em `/Users/rodrigodantas/Antigravity - Projetos/inside-sales-pipeline-beta`. Todo novo código deve ser desenvolvido e testado aqui primeiro.

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:3001](http://localhost:3001)
- **Banco de Dados**: `inside_sales_pipeline` (supabase local no Mac)

### 🧪 Testando e Validando no Mac (Local)
1. Inicie o Backend (porta 3001): `npm run dev` na raiz.
2. Inicie o Frontend (porta 3000): `npm run dev` na pasta `frontend/`.
3. Valide tudo em `http://localhost:3000`.

---

## 🚀 3. Fluxo Oficial de Deploy

Sempre siga a seguinte ordem: **Local -> GitHub -> Servidor Remoto**.

### Passo 1: Atualizar GitHub (Partindo do Local)
1. `git add .`
2. `git commit -m "Descricao da mudança"`
3. `git push origin main`

### Passo 2: Atualizar Servidor de Produção (Remoto)
1. **Acessar o servidor**:
   ```bash
   ssh -p 55535 rodrigo@178.156.234.198
   ```
2. **Atualizar Código e Dependências**:
   ```bash
   cd /opt/laranjinha
   git fetch origin main
   git reset --hard origin/main
   export HOME=/tmp  # Para permissões
   npm install
   ```
3. **Build do Frontend**:
   ```bash
   cd frontend
   rm -rf dist
   npm install
   npm run build
   cd ..
   ```
4. **Reiniciar o Backend**:
   ```bash
   sudo fuser -k 3001/tcp
   # ou pkill -9 node
   nohup npm start > nohup.out 2>&1 &
   ```

*(Nota para os Agentes: o deploy pode ser automatizado via um script expect usando a senha listada acima para garantir a continuidade dos serviços).*

---

## ⚙️ 4. Configuração de Portas

- **Backend (API)**: Variável `PORT` ou `3001`.
- **Frontend (Vite)**: Alterar script em `frontend/package.json` (`vite --port 5000`) se necessário.
Se mudar a porta da API, atualize `VITE_API_URL` no `.env` do frontend.

---

## 🔑 5. Arquivos de Configuração (.env)

| Variável | Teste (Local) | Produção (Remoto) |
| :--- | :--- | :--- |
| `NODE_ENV` | `development` | `production` |
| `API_BASE_URL` | `http://localhost:3001` | `https://laranjinha.npx.com.br/api/v1` |
| `FRONTEND_URL` | `http://localhost:3000` | `https://laranjinha.npx.com.br` |
| `DATABASE_URL` | `postgresql://localhost:5432/...` | `postgresql://...` |

*(Nunca envie o `.env` para o GitHub).*

---

## 📈 6. Monitoramento & Debug em Produção
- Logs em tempo real: `tail -f /opt/laranjinha/nohup.out`
- Health check: `curl -I http://localhost:3001/api/v1/health`
- Acessar DB: `psql -U postgres -d inside_sales_pipeline`
