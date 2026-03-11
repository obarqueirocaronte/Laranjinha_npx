# De-Para: PostgreSQL Local vs Supabase

O banco de dados utilizado neste projeto atualmente é um **PostgreSQL padrão** puro, mas a base de arquitetura dele foi migrada ou inspirada no Supabase. Como o Supabase é essencialmente PostgreSQL sob o capô, a transição estrutural é 100% similar, existindo apenas diferenças nas *features nativas* do ecossistema Supabase, como os esquemas de Autenticação (`auth.users`) e Políticas de Segurança (`RLS`).

Abaixo está o mapeamento (de-para) validando a estrutura atual:

## Estrutura de Tabelas (Esquema Público)

| Tabela PostgreSQL Local | Tabela no Supabase (Histórico) | Similaridade | Observações |
| :--- | :--- | :--- | :--- |
| `teams` | `public.teams` | 🟢 100% | Idêntico. |
| `sdrs` | `public.sdrs` | 🟢 100% | Idêntico. Mapeamento de perfis de colaboradores. |
| `users` | `auth.users` / `public.users` | 🟡 80% | No Supabase, o sistema nativo cria a tabela `auth.users` automaticamente e usamos `public.users` como uma tabela atrelada via trigger. Aqui, consolidamos uma tabela `users` própria gerenciando tokens locais (`email`, `password_hash`). |
| `user_sessions` | JWTs Nativos do Supabase | 🟡 80% | No Supabase isso é gerenciado pela engine do Gotrue. Aqui temos a tabela `user_sessions` para os tokens manuais JWT e controle de refresh. |
| `pipeline_columns` | `public.pipeline_columns` | 🟢 100% | Idêntico. |
| `leads` | `public.leads` | 🟢 100% | Estrutura de colunas base idênticas. Mantivemos o campo `metadata` `JSONB` que funciona de maneira idêntica. |
| `lead_pipeline_history` | `public.lead_pipeline_history` | 🟢 100% | Idêntico. |
| `workflow_triggers` | `public.workflow_triggers` | 🟢 100% | Idêntico. |
| `templates` | `public.templates` | 🟢 100% | Idêntico. |
| `interactions_log` | `public.interactions_log` | 🟢 100% | Idêntico. |
| `notifications` | `public.notifications` | 🟢 100% | Tabela de app notifications também idêntica. |

## Recursos e Extensões (Features Supabase)

| Recurso / Feature Postgres/Supabase | Status Atual no PostgreSQL Local | O que mudou? |
| :--- | :--- | :--- |
| **UUIDs** (`uuid-ossp`) | 🟢 Ativo | Habilitado nativamente (`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`). |
| **Row Level Security (RLS)** | 🔴 Inativo | O Supabase exige RLS para proteger APIs expostas (Data API). Como temos nosso próprio Backend (`Express.js` em `/src`) controlando as rotas, o RLS não está sendo usado no BD. A segurança de permissões é verificada pelos nossos Controllers no Node.js. |
| **PostgREST (Data API)** | 🔴 Inativo | Não usamos as rotas automáticas do Supabase (`supabase-js` client). Todas as APIs são Axios chamando o nosso backend de middlewares em `Express`. |
| **Realtime** | 🔴 Inativo | Supabase Realtime não está ativo aqui de forma nativa. Updates visuais em tempo real caso necessários usam os websockets tradicionais geridos pelo App se precisar, ou state local do React Query/Zustand. |
| **Triggers do Banco (ex: `updated_at`)**| 🟢 Ativo | Migrados com sucesso. O script carrega triggers que atualizam `updated_at` automaticamente (`update_updated_at_column`), igualzinho o dashboard da Supabase oferecia nas configurações do Editor. |
| **Functions (Ex: `log_pipeline_movement`)** | 🟢 Ativo | Migrado. Function em PL/pgSQL gerada e ativa perfeitamente nas triggers. |

### Resumo do Check de BD
Todo o armazenamento principal (CRM, Kanban Leads, Metadados JSONB, Tags) está preservado perfeitamente da forma como existia no Supabase. A diferença primária para o Supabase é a abstração da autenticação e das APIs automáticas: agora construímos nós mesmos a API e mantemos controle total de Auth rodando as coisas localmente (Macbook) e numa Cloud própria em Produção Ubuntu (sem travas tarifárias de Cloud do Supabase).
