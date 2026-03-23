/**
 * db_ensure_tables.js
 * 
 * Auto-migração: garante que todas as tabelas existam no banco.
 * Funciona com Supabase (teste) e PostgreSQL nativo (produção).
 * 
 * Uso: chamado automaticamente no startup quando DB_AUTO_MIGRATE=true
 * 
 * REGRA: Usa CREATE TABLE IF NOT EXISTS + ALTER TABLE ADD COLUMN IF NOT EXISTS
 * Nunca faz DROP nem modifica colunas existentes — seguro para produção.
 */

const db = require('./db');

// ─── Ordem de criação respeita dependências de FK ────────────────────────────

const TABLE_DEFINITIONS = [
  // 1. Teams (sem dependências)
  {
    name: 'teams',
    sql: `CREATE TABLE IF NOT EXISTS teams (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      settings JSONB DEFAULT '{"allow_return_to_queue": true}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`
  },

  // 2. SDRs (depende de teams)
  {
    name: 'sdrs',
    sql: `CREATE TABLE IF NOT EXISTS sdrs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
      user_id UUID,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(50),
      is_active BOOLEAN DEFAULT true,
      total_leads_assigned INTEGER DEFAULT 0,
      last_lead_assigned_at TIMESTAMP WITH TIME ZONE,
      goal_calls INTEGER DEFAULT 0,
      goal_emails INTEGER DEFAULT 0,
      goal_whatsapp INTEGER DEFAULT 0,
      goal_completed INTEGER DEFAULT 0,
      goal_points INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`
  },

  // 3. Users (sem dep forte)
  {
    name: 'users',
    sql: `CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      is_verified BOOLEAN DEFAULT false,
      verification_token VARCHAR(255),
      verification_token_expires TIMESTAMP WITH TIME ZONE,
      reset_password_token VARCHAR(255),
      reset_password_expires TIMESTAMP WITH TIME ZONE,
      name VARCHAR(255),
      role VARCHAR(50) DEFAULT 'sdr',
      sdr_id UUID,
      profile_picture_url TEXT,
      google_id VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`
  },

  // 4. User Sessions (depende de users)
  {
    name: 'user_sessions',
    sql: `CREATE TABLE IF NOT EXISTS user_sessions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(500) NOT NULL UNIQUE,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`
  },

  // 5. Invites (depende de users)
  {
    name: 'invites',
    sql: `CREATE TABLE IF NOT EXISTS invites (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      role VARCHAR(50) DEFAULT 'sdr',
      token VARCHAR(255) NOT NULL UNIQUE,
      invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
      accepted_at TIMESTAMP WITH TIME ZONE,
      expires_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`
  },

  // 6. User Integrations
  {
    name: 'user_integrations',
    sql: `CREATE TABLE IF NOT EXISTS user_integrations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      integration_type VARCHAR(50) NOT NULL,
      config JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, integration_type)
    )`
  },

  // 7. Pipeline Columns
  {
    name: 'pipeline_columns',
    sql: `CREATE TABLE IF NOT EXISTS pipeline_columns (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      position INTEGER NOT NULL,
      color VARCHAR(7),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(position)
    )`
  },
  
  // 7.5 Lead Batches (Imports)
  {
    name: 'lead_batches',
    sql: `CREATE TABLE IF NOT EXISTS lead_batches (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      import_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      total_leads INTEGER DEFAULT 0,
      processed_leads INTEGER DEFAULT 0,
      tags JSONB DEFAULT '[]',
      status VARCHAR(50) DEFAULT 'new',
      origin VARCHAR(255),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`
  },

  // 8. Leads (depende de pipeline_columns, sdrs)
  {
    name: 'leads',
    sql: `CREATE TABLE IF NOT EXISTS leads (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      external_id VARCHAR(255),
      full_name VARCHAR(255) NOT NULL,
      company_name VARCHAR(255),
      job_title VARCHAR(255),
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      linkedin_url TEXT,
      current_column_id UUID REFERENCES pipeline_columns(id) ON DELETE SET NULL,
      assigned_sdr_id UUID REFERENCES sdrs(id) ON DELETE SET NULL,
      lead_batch_id UUID REFERENCES lead_batches(id) ON DELETE SET NULL,
      metadata JSONB DEFAULT '{}',
      qualification_status VARCHAR(50) DEFAULT 'pending',
      cadence_name VARCHAR(100),
      quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      last_interaction_at TIMESTAMP WITH TIME ZONE,
      UNIQUE(email),
      UNIQUE(external_id)
    )`
  },

  // 9. Lead Pipeline History
  {
    name: 'lead_pipeline_history',
    sql: `CREATE TABLE IF NOT EXISTS lead_pipeline_history (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      from_column_id UUID REFERENCES pipeline_columns(id) ON DELETE SET NULL,
      to_column_id UUID REFERENCES pipeline_columns(id) ON DELETE SET NULL,
      moved_by_sdr_id UUID REFERENCES sdrs(id) ON DELETE SET NULL,
      moved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      time_in_previous_column_seconds INTEGER,
      notes TEXT
    )`
  },

  // 10. Templates
  {
    name: 'templates',
    sql: `CREATE TABLE IF NOT EXISTS templates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL,
      subject VARCHAR(500),
      content TEXT NOT NULL,
      language VARCHAR(10) DEFAULT 'pt-BR',
      is_active BOOLEAN DEFAULT true,
      usage_count INTEGER DEFAULT 0,
      external_id VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`
  },

  // 11. Workflow Triggers
  {
    name: 'workflow_triggers',
    sql: `CREATE TABLE IF NOT EXISTS workflow_triggers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      from_column_id UUID REFERENCES pipeline_columns(id) ON DELETE CASCADE,
      to_column_id UUID REFERENCES pipeline_columns(id) ON DELETE CASCADE,
      action_type VARCHAR(50) NOT NULL,
      template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
      config JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(from_column_id, to_column_id, action_type)
    )`
  },

  // 12. Interactions Log
  {
    name: 'interactions_log',
    sql: `CREATE TABLE IF NOT EXISTS interactions_log (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      sdr_id UUID REFERENCES sdrs(id) ON DELETE SET NULL,
      action_type VARCHAR(50) NOT NULL,
      channel VARCHAR(50),
      content TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`
  },

  // 13. Call Logs
  {
    name: 'call_logs',
    sql: `CREATE TABLE IF NOT EXISTS call_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      sdr_id UUID NOT NULL REFERENCES sdrs(id) ON DELETE CASCADE,
      duration_seconds INTEGER,
      status VARCHAR(50),
      notes TEXT,
      recording_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`
  },

  // 14. Cadence Completions
  {
    name: 'cadence_completions',
    sql: `CREATE TABLE IF NOT EXISTS cadence_completions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      sdr_id UUID NOT NULL REFERENCES sdrs(id) ON DELETE CASCADE,
      cadence_name VARCHAR(100),
      final_outcome VARCHAR(50),
      completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`
  },

  // 15. SDR Stats
  {
    name: 'sdr_stats',
    sql: `CREATE TABLE IF NOT EXISTS sdr_stats (
      sdr_id UUID PRIMARY KEY REFERENCES sdrs(id) ON DELETE CASCADE,
      calls INTEGER DEFAULT 0,
      emails INTEGER DEFAULT 0,
      whatsapp INTEGER DEFAULT 0,
      completed_leads INTEGER DEFAULT 0,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`
  },

  // 16. Management Report Config
  {
    name: 'management_report_config',
    sql: `CREATE TABLE IF NOT EXISTS management_report_config (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      webhook_url TEXT,
      schedule_times JSONB DEFAULT '["09:00", "18:00"]',
      is_active BOOLEAN DEFAULT true,
      last_sent_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`
  },

  // 17. Notifications
  {
    name: 'notifications',
    sql: `CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      message TEXT,
      type VARCHAR(50),
      is_read BOOLEAN DEFAULT false,
      link VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`
  },

  // 18. Schedules
  {
    name: 'schedules',
    sql: `CREATE TABLE IF NOT EXISTS schedules (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      sdr_id UUID REFERENCES sdrs(id) ON DELETE SET NULL,
      scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
      type VARCHAR(50) DEFAULT 'manual',
      notes TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      lead_cadence_id UUID,
      cadence_step INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`
  },

  // 19. Cadence Configs
  {
    name: 'cadence_configs',
    sql: `CREATE TABLE IF NOT EXISTS cadence_configs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(100) NOT NULL,
      phone_rolls INTEGER NOT NULL DEFAULT 3,
      whatsapp_rolls INTEGER NOT NULL DEFAULT 3,
      email_rolls INTEGER NOT NULL DEFAULT 1,
      intervalo_retorno_horas INTEGER,
      allow_sdr_override BOOLEAN NOT NULL DEFAULT true,
      infinity_mode BOOLEAN NOT NULL DEFAULT false,
      cycles_config JSONB DEFAULT '[{"type": "call", "rolls": 3, "label": "Telefonemas"}, {"type": "whatsapp", "rolls": 3, "label": "WhatsApp"}, {"type": "marketing", "rolls": 3, "label": "Social/Marketing"}]',
      created_by UUID REFERENCES sdrs(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`
  },

  // 20. Lead Cadence (depende de cadence_configs)
  {
    name: 'lead_cadence',
    sql: `CREATE TABLE IF NOT EXISTS lead_cadence (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      cadence_config_id UUID,
      sdr_id UUID REFERENCES sdrs(id) ON DELETE SET NULL,
      step_atual INTEGER NOT NULL DEFAULT 1,
      max_steps INTEGER NOT NULL DEFAULT 3,
      status VARCHAR(50) NOT NULL DEFAULT 'ativa',
      canal_proximo VARCHAR(50),
      resultado_anterior VARCHAR(50),
      intervalo_retorno_horas INTEGER,
      proxima_acao_em TIMESTAMP WITH TIME ZONE,
      current_percentage INTEGER DEFAULT 0,
      total_cycles INTEGER DEFAULT 3,
      completed_cycles INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`
  },

  // 21. Cadence Logs (depende de lead_cadence)
  {
    name: 'cadence_logs',
    sql: `CREATE TABLE IF NOT EXISTS cadence_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      lead_cadence_id UUID,
      sdr_id UUID REFERENCES sdrs(id) ON DELETE SET NULL,
      step INTEGER NOT NULL,
      canal VARCHAR(50) NOT NULL,
      acao VARCHAR(50) NOT NULL,
      resultado VARCHAR(50),
      notes TEXT,
      retorno_agendado_em TIMESTAMP WITH TIME ZONE,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`
  },

  // 22. Cadence Tasks
  {
    name: 'cadence_tasks',
    sql: `CREATE TABLE IF NOT EXISTS cadence_tasks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      cadence_config_id UUID NOT NULL REFERENCES cadence_configs(id) ON DELETE CASCADE,
      sequence_order INTEGER NOT NULL DEFAULT 1,
      task_type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      protocol TEXT,
      document_url VARCHAR(500),
      document_name VARCHAR(255),
      integration_type VARCHAR(100),
      integration_id VARCHAR(255),
      estimated_duration_minutes INTEGER DEFAULT 5,
      is_required BOOLEAN NOT NULL DEFAULT true,
      allow_manual_completion BOOLEAN NOT NULL DEFAULT true,
      days_offset_from_start INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`
  },

  // 23. Cadence Task Completions
  {
    name: 'cadence_task_completions',
    sql: `CREATE TABLE IF NOT EXISTS cadence_task_completions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      lead_cadence_id UUID NOT NULL,
      cadence_task_id UUID NOT NULL REFERENCES cadence_tasks(id) ON DELETE CASCADE,
      sdr_id UUID REFERENCES sdrs(id) ON DELETE SET NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      notes TEXT,
      integration_result JSONB,
      completion_evidence VARCHAR(500),
      started_at TIMESTAMP WITH TIME ZONE,
      completed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`
  },

  // 24. Tags
  {
    name: 'tags',
    sql: `CREATE TABLE IF NOT EXISTS tags (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(100) NOT NULL UNIQUE,
      color VARCHAR(7) DEFAULT '#6366f1',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`
  },

  // 25. Lead Tags (junction)
  {
    name: 'lead_tags',
    sql: `CREATE TABLE IF NOT EXISTS lead_tags (
      lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (lead_id, tag_id)
    )`
  },

  // 26. Lead Custom Fields
  {
    name: 'lead_custom_fields',
    sql: `CREATE TABLE IF NOT EXISTS lead_custom_fields (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      field_name VARCHAR(100) NOT NULL,
      field_value TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(lead_id, field_name)
    )`
  }
];

// ─── Colunas extras adicionadas por migrations ──────────────────────────────

const COLUMN_MIGRATIONS = [
  // From 20260306_add_invites.sql
  { table: 'users', column: 'name', type: 'VARCHAR(255)' },
  { table: 'users', column: 'role', type: "VARCHAR(50) DEFAULT 'sdr'" },
  { table: 'users', column: 'sdr_id', type: 'UUID' },
  { table: 'users', column: 'profile_picture_url', type: 'TEXT' },
  // From 20260306_add_google_oauth.sql
  { table: 'users', column: 'google_id', type: 'VARCHAR(255)' },
  // From 20260320_fix_cadence_completions.sql
  { table: 'cadence_completions', column: 'cadence_name', type: 'VARCHAR(100)' },
  // From 20260319_update_schedules_cadence_link.sql
  { table: 'schedules', column: 'lead_cadence_id', type: 'UUID' },
  { table: 'schedules', column: 'cadence_step', type: 'INTEGER' },
  { table: 'templates', column: 'external_id', type: 'VARCHAR(255)' },
  // Cadence cycles support
  { table: 'cadence_configs', column: 'cycles_config', type: 'JSONB' },
  { table: 'lead_cadence', column: 'current_percentage', type: 'INTEGER DEFAULT 0' },
  { table: 'lead_cadence', column: 'total_cycles', type: 'INTEGER DEFAULT 3' },
  { table: 'lead_cadence', column: 'completed_cycles', type: 'INTEGER DEFAULT 0' },
  { table: 'management_report_config', column: 'sdr_id', type: 'UUID REFERENCES sdrs(id)' },
  { table: 'management_report_config', column: 'sdr_ids', type: "JSONB DEFAULT '[]'" },
  // Ensure cadence_logs.notes exists (handles rename from 'notas' if needed)
  { table: 'cadence_logs', column: 'notes', type: 'TEXT' },
  { table: 'leads', column: 'lead_batch_id', type: 'UUID REFERENCES lead_batches(id) ON DELETE SET NULL' },
  { table: 'cadence_logs', column: 'lead_cadence_id', type: 'UUID' },
];

// ─── Função principal ────────────────────────────────────────────────────────

async function ensureTables() {
  console.log('🔄 [DB AUTO-MIGRATE] Verificando tabelas...');
  
  let created = 0;
  let existed = 0;
  let errors = 0;

  // Garantir extensões
  try {
    await db.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await db.query('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
  } catch (err) {
    // Extensions might require superuser — skip silently on Supabase
    console.log('⚠️  [DB AUTO-MIGRATE] Extensões já existem ou requerem superuser (OK para Supabase)');
  }

  // Garantir função updated_at
  try {
    await db.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
  } catch (err) {
    console.log('⚠️  [DB AUTO-MIGRATE] Função update_updated_at_column já existe');
  }

  // Criar tabelas na ordem correta
  for (const table of TABLE_DEFINITIONS) {
    try {
      // Check if table exists
      const check = await db.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table.name]
      );

      if (check.rows[0].exists) {
        existed++;
      } else {
        await db.query(table.sql);
        created++;
        console.log(`  ✅ Tabela criada: ${table.name}`);
      }
    } catch (err) {
      // IF NOT EXISTS handles most cases, but log unexpected errors
      if (err.code === '42P07') {
        // relation already exists — fine
        existed++;
      } else {
        errors++;
        console.error(`  ❌ Erro ao criar ${table.name}:`, err.message);
      }
    }
  }

  // Garantir colunas de migrations
  let columnsAdded = 0;
  for (const col of COLUMN_MIGRATIONS) {
    try {
      await db.query(
        `ALTER TABLE ${col.table} ADD COLUMN IF NOT EXISTS ${col.column} ${col.type}`
      );
      // We can't easily check if it was actually added vs already existed,
      // so we just count attempts
      columnsAdded++;
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.error(`  ❌ Erro ao adicionar coluna ${col.table}.${col.column}:`, err.message);
      }
    }
  }

  console.log(`✅ [DB AUTO-MIGRATE] Concluído: ${created} criadas, ${existed} já existiam, ${columnsAdded} colunas verificadas, ${errors} erros`);
  
  return { created, existed, columnsAdded, errors };
}

module.exports = { ensureTables };
