# 🐘 Guia Definitivo: PostgreSQL em Produção (Laranjinha)

> Este documento cobre **tudo** que você precisa saber para configurar, migrar e manter o banco de dados PostgreSQL em produção, de forma segura e sem surpresas.

---

## 📋 Visão Geral da Arquitetura

| Ambiente      | Banco                  | Host              | Status        |
|---------------|------------------------|-------------------|---------------|
| **Teste**     | Supabase (cloud)       | `aws-0-us-west-2.pooler.supabase.com:6543` | ✅ Ativo  |
| **Produção**  | PostgreSQL local        | `127.0.0.1:5432`  | ✅ Ativo       |

O backend usa `pg` (node-postgres) com `DATABASE_URL` no arquivo `.env`. A aplicação é **agnóstica de provedor** — funciona com Supabase e PostgreSQL local sem mudança de código.

---

## 🔑 1. Conectar ao Servidor de Produção

```bash
ssh -p 55535 rodrigo@178.156.234.198
# Senha: Esseanoemeu@2026

cd /opt/laranjinha
```

---

## 🗄️ 2. Verificar o Banco de Dados

```bash
# Entrar no psql como superusuário
sudo -u postgres psql

# Listar bancos
\l

# Conectar ao banco da aplicação
\c inside_sales_pipeline

# Listar tabelas existentes
\dt

# Sair
\q
```

### Tabelas que devem existir:
| Tabela                    | Descrição                                    |
|---------------------------|----------------------------------------------|
| `teams`                   | Times / organizações                         |
| `sdrs`                    | Vendedores internos                          |
| `users`                   | Usuários de acesso (auth)                    |
| `user_sessions`           | Sessões de autenticação                      |
| `pipeline_columns`        | Colunas dinâmicas do Kanban                  |
| `leads`                   | Leads (entidade principal)                   |
| `lead_pipeline_history`   | Histórico de movimentos do lead              |
| `workflow_triggers`       | Regras de automação                          |
| `templates`               | Templates de mensagens                       |
| `interactions_log`        | Log completo de interações                   |
| `notifications`           | Sistema de notificações                      |

---

## ⚠️ 3. Aplicar Migrações (INCREMENTAL — Sem Apagar Dados)

> [!CAUTION]
> **NUNCA** execute o `schema.sql` completo em produção se já houver dados. Ele usa `CREATE TABLE IF NOT EXISTS`, mas os triggers têm `DROP TRIGGER IF EXISTS` que pode afetar operações em curso. **Use os comandos abaixo individualmente.**

### 3.1 — Adicionar coluna `settings` na tabela `teams` (NOVA)

Esta é a alteração mais recente. Se o banco já tem a tabela `teams` sem esta coluna, rode:

```sql
-- Conectar ao banco
sudo -u postgres psql -d inside_sales_pipeline

-- Adicionar coluna settings (idempotente — não falha se já existir)
ALTER TABLE teams ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"allow_return_to_queue": true}';

-- Verificar
SELECT column_name, data_type, column_default FROM information_schema.columns
WHERE table_name = 'teams' AND column_name = 'settings';
```

### 3.2 — Verificar e criar extensões necessárias

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### 3.3 — Verificar índices críticos

```sql
-- Verificar se os índices existem
SELECT indexname FROM pg_indexes WHERE tablename = 'leads';

-- Se faltar algum, criar individualmente:
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_sdr ON leads(assigned_sdr_id);
CREATE INDEX IF NOT EXISTS idx_leads_metadata ON leads USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
```

### 3.4 — Verificar e criar trigger de pipeline movement

```sql
-- Verificar se o trigger existe
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'leads';

-- Recriar a função (safe to run multiple times)
CREATE OR REPLACE FUNCTION log_pipeline_movement()
RETURNS TRIGGER AS $$
DECLARE
    time_in_column INTEGER;
BEGIN
    IF OLD.current_column_id IS DISTINCT FROM NEW.current_column_id THEN
        IF OLD.updated_at IS NOT NULL THEN
            time_in_column := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - OLD.updated_at))::INTEGER;
        END IF;
        INSERT INTO lead_pipeline_history (
            lead_id, from_column_id, to_column_id, time_in_previous_column_seconds
        ) VALUES (NEW.id, OLD.current_column_id, NEW.current_column_id, time_in_column);
        NEW.last_interaction_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_pipeline_movement ON leads;
CREATE TRIGGER track_pipeline_movement BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION log_pipeline_movement();
```

---

## 🔧 4. Configuração do `.env` em Produção

Arquivo localizado em `/opt/laranjinha/.env`:

```bash
# Ver configuração atual
cat /opt/laranjinha/.env
```

### Parâmetros essenciais:

```env
PORT=3001
NODE_ENV=production

# ⚠️ ATENÇÃO: Em produção usa PostgreSQL LOCAL (127.0.0.1), não Supabase
DATABASE_URL=postgresql://laranjinha:SENHA_DO_POSTGRES@127.0.0.1:5432/inside_sales_pipeline

FRONTEND_URL=https://laranjinha.npx.com.br

JWT_SECRET=seu_jwt_secret_aqui
JWT_EXPIRES_IN=7d
SESSION_SECRET=seu_session_secret_aqui

# Google OAuth (requerido para login)
GOOGLE_CLIENT_ID=seu_google_client_id
GOOGLE_CLIENT_SECRET=seu_google_client_secret

# Mattermost (opcional)
MATTERMOST_WEBHOOK_URL=https://chat.npx.com.br/hooks/SEU_HOOK_AQUI
```

> [!IMPORTANT]
> A diferença crítica de ambiente: no `.env` local (teste), `DATABASE_URL` aponta para o **Supabase**. Em produção, deve apontar para `127.0.0.1:5432`. **Nunca faça commit do `.env`.**

---

## 🔍 5. Diagnóstico Rápido (Pré-Deploy)

Execute estes comandos no servidor antes de fazer pull, para garantir que o banco está saudável:

```bash
# 1. Verificar conexão com PostgreSQL
sudo -u postgres psql -d inside_sales_pipeline -c "SELECT version();"

# 2. Verificar contagem de tabelas
sudo -u postgres psql -d inside_sales_pipeline -c "
SELECT schemaname, tablename, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;"

# 3. Verificar colunas do kanban (pipeline_columns)
sudo -u postgres psql -d inside_sales_pipeline -c "
SELECT id, name, position FROM pipeline_columns ORDER BY position;"

# 4. Verificar se a coluna settings existe em teams
sudo -u postgres psql -d inside_sales_pipeline -c "
SELECT column_name FROM information_schema.columns
WHERE table_name='teams' AND column_name='settings';"

# 5. Verificar processo do backend
pm2 list
# ou
ps aux | grep "node src/app.js"
```

---

## 🚀 6. Fluxo Completo de Deploy

> [!NOTE]
> Ordem importa. Sempre: pull → install → migrate → build frontend → restart.

### Passo a passo no servidor:

```bash
# 1. Acessar o servidor
ssh -p 55535 rodrigo@178.156.234.198

# 2. Ir para o projeto
cd /opt/laranjinha

# 3. Fazer backup do banco antes de qualquer coisa
sudo -u postgres pg_dump inside_sales_pipeline > /tmp/backup_$(date +%Y%m%d_%H%M).sql
echo "Backup criado em /tmp/"

# 4. Puxar as últimas alterações
git pull origin main

# 5. Instalar dependências do backend
npm install

# 6. Aplicar migrações pendentes (idempotente)
sudo -u postgres psql -d inside_sales_pipeline -c \
  "ALTER TABLE teams ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{\"allow_return_to_queue\": true}';"

# 7. Sincronizar SDRs (script de manutenção)
node scripts/fix_sdrs_sync.js

# 8. Build do frontend
cd /opt/laranjinha/frontend
npm install
npm run build

# 9. Reiniciar servidor
cd /opt/laranjinha

# Se usando PM2 (recomendado):
pm2 restart laranjinha

# Se usando nohup:
pkill -f "node src/app.js"
nohup node src/app.js > app.log 2>&1 &
echo "Backend reiniciado. PID: $!"

# 10. Verificar se voltou
sleep 3
curl -s http://localhost:3001/api/v1/health | head -c 200
```

---

## 🛡️ 7. Gestão com PM2 (Recomendado)

O PM2 garante que o backend reinicia automaticamente em caso de falha:

```bash
# Instalar PM2 globalmente (se não tiver)
npm install -g pm2

# Iniciar o backend com PM2 (primeira vez)
cd /opt/laranjinha
pm2 start src/app.js --name "laranjinha" --env production

# Salvar configuração para sobreviver a reboots
pm2 save
pm2 startup

# Comandos úteis
pm2 list           # ver status
pm2 logs laranjinha # ver logs em tempo real
pm2 restart laranjinha  # reiniciar
pm2 stop laranjinha     # parar
```

---

## 🔎 8. Verificação Pós-Deploy

Após reiniciar, verificar se tudo está OK:

```bash
# 1. Status do processo
pm2 list

# 2. Health check da API
curl -s https://laranjinha.npx.com.br/api/v1/health

# 3. Ver últimas linhas do log
pm2 logs laranjinha --lines 50

# 4. Testar endpoint de leads (deve retornar 200 ou 401 sem token)
curl -s -o /dev/null -w "%{http_code}" https://laranjinha.npx.com.br/api/v1/leads

# 5. Verificar frontend (deve retornar HTML)
curl -s https://laranjinha.npx.com.br | head -5
```

---

## 🔄 9. Rollback de Emergência

Se algo der errado após o deploy:

```bash
# Voltar ao commit anterior
cd /opt/laranjinha
git log --oneline -5    # identificar commit anterior
git checkout HASH_COMMIT_ANTERIOR

# Reiniciar
pm2 restart laranjinha

# Se precisar restaurar backup do banco
sudo -u postgres psql inside_sales_pipeline < /tmp/backup_YYYYMMDD_HHMM.sql
```

---

## 📊 10. Diferenças Supabase vs. PostgreSQL Local

| Feature                   | Supabase (Teste)               | PostgreSQL Local (Prod)     |
|---------------------------|-------------------------------|-----------------------------|
| `DATABASE_URL`            | pooler.supabase.com:6543      | 127.0.0.1:5432              |
| Autenticação SSL          | Requer `?sslmode=require`     | Não requer SSL              |
| UUID extension            | Pré-instalada                 | Requer `CREATE EXTENSION`   |
| `pg_trgm`                 | Pré-instalada                 | Requer `CREATE EXTENSION`   |
| Acesso direto ao psql     | Via Supabase Studio/CLI       | `sudo -u postgres psql`     |
| Backup automático         | Gerenciado pelo Supabase      | Manual / cron               |

### Ajuste necessário no `.env` ao trocar de ambiente:
```bash
# TESTE (Supabase)
DATABASE_URL=postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require

# PRODUÇÃO (PostgreSQL local)
DATABASE_URL=postgresql://laranjinha:[PASSWORD]@127.0.0.1:5432/inside_sales_pipeline
```

---

## 🌟 11. Checklist Final de Deploy

- [ ] Backup do banco criado (`pg_dump`)
- [ ] `git pull origin main` executado no servidor
- [ ] `npm install` executado (raiz e frontend)
- [ ] Migração `settings` na tabela `teams` aplicada
- [ ] `npm run build` no frontend concluído
- [ ] `pm2 restart laranjinha` executado
- [ ] Health check da API retornou 200
- [ ] Frontend carregando corretamente em `https://laranjinha.npx.com.br`
- [ ] Login com Google funcional
- [ ] Kanban carregando leads corretamente
