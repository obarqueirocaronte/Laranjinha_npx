-- Migration: Add cadence_tasks + cadence_task_completions
-- Date: 2026-03-19
-- Responsável: Claude
-- Estrutura para KANBAN ATIVO com protocolo de atividades

-- ─────────────────────────────────────────────────────────────
-- Tabela: cadence_tasks (protocolo de cada cadência)
-- ─────────────────────────────────────────────────────────────
-- Define o checklist de atividades que devem ser executadas
-- quando uma cadência é aplicada a um lead

CREATE TABLE IF NOT EXISTS cadence_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cadence_config_id UUID NOT NULL REFERENCES cadence_configs(id) ON DELETE CASCADE,

    -- Ordem de execução no fluxo
    sequence_order INTEGER NOT NULL DEFAULT 1,

    -- Tipo de tarefa (ajuda no frontend a renderizar corretamente)
    task_type VARCHAR(50) NOT NULL,  -- 'checklist' | 'document' | 'form' | 'call' | 'email' | 'report' | 'integration'

    -- Descrição da atividade
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Instruções detalhadas / protocolo
    protocol TEXT,

    -- Documento/template linkado (URL ou UUID de arquivo)
    document_url VARCHAR(500),
    document_name VARCHAR(255),

    -- Tipo de integração (se task_type = 'integration')
    -- Ex: 'n8n_workflow' | 'zapier' | 'skill_bruno' | 'skill_leo' | 'jira_ticket'
    integration_type VARCHAR(100),
    integration_id VARCHAR(255),        -- ID do workflow, ticket, etc.

    -- Tempo estimado de execução (em minutos)
    estimated_duration_minutes INTEGER DEFAULT 5,

    -- Obrigatório concluir esta tarefa?
    is_required BOOLEAN NOT NULL DEFAULT true,

    -- Pode ser marcada como concluída manualmente pelo CS?
    allow_manual_completion BOOLEAN NOT NULL DEFAULT true,

    -- Após quanto tempo esta tarefa deve aparecer? (em dias após start da cadência)
    -- Ex: 0 = imediatamente, 3 = após 3 dias
    days_offset_from_start INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_cadence_tasks_config ON cadence_tasks(cadence_config_id);
CREATE INDEX idx_cadence_tasks_sequence ON cadence_tasks(cadence_config_id, sequence_order);

-- ─────────────────────────────────────────────────────────────
-- Tabela: cadence_task_completions (rastreamento de execução)
-- ─────────────────────────────────────────────────────────────
-- Log de quando cada tarefa foi completada por qual CS agent

CREATE TABLE IF NOT EXISTS cadence_task_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    lead_cadence_id UUID NOT NULL REFERENCES lead_cadence(id) ON DELETE CASCADE,
    cadence_task_id UUID NOT NULL REFERENCES cadence_tasks(id) ON DELETE CASCADE,
    sdr_id UUID REFERENCES sdrs(id) ON DELETE SET NULL,

    -- Status da execução
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed'

    -- Notas do CS agent ao completar
    notes TEXT,

    -- Resultado da integração (se task_type = 'integration')
    -- Ex: { "n8n_execution_id": "xyz", "status": "success" }
    integration_result JSONB,

    -- Evidência/resultado (URL de screenshot, ticket ID, etc.)
    completion_evidence VARCHAR(500),

    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para o kanban ativo
CREATE INDEX idx_task_completions_lead_cadence ON cadence_task_completions(lead_cadence_id, status);
CREATE INDEX idx_task_completions_pending ON cadence_task_completions(status) WHERE status = 'pending';
CREATE INDEX idx_task_completions_lead ON cadence_task_completions(lead_id);

-- Trigger para updated_at
CREATE TRIGGER update_cadence_task_completions_updated_at
    BEFORE UPDATE ON cadence_task_completions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────
-- Comentários
-- ─────────────────────────────────────────────────────────────
COMMENT ON TABLE cadence_tasks IS
    'Protocolo/checklist de atividades para cada cadência. Quando uma cadência é aplicada a um lead, cada tarefa gera um record em cadence_task_completions.';

COMMENT ON COLUMN cadence_tasks.days_offset_from_start IS
    'Determina quando a tarefa deve aparecer no kanban. 0 = imediatamente, 3 = após 3 dias do start da cadência.';

COMMENT ON COLUMN cadence_task_completions.integration_result IS
    'Resultado retornado pela integração (n8n, skill, etc.). Salvo para auditoria e troubleshooting.';
