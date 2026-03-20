-- Migration: Add lead_cadence table
-- Date: 2026-03-19
-- Responsável: Claude

-- Tabela principal de controle de cadências por lead
CREATE TABLE IF NOT EXISTS lead_cadence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    cadence_config_id UUID,    -- referenciado após criação de cadence_configs
    sdr_id UUID REFERENCES sdrs(id) ON DELETE SET NULL,
    step_atual INTEGER NOT NULL DEFAULT 1,        -- tentativa atual (1, 2, 3...)
    max_steps INTEGER NOT NULL DEFAULT 3,          -- máximo de tentativas configurado
    status VARCHAR(50) NOT NULL DEFAULT 'ativa',   -- 'ativa', 'concluida', 'parada'
    canal_proximo VARCHAR(50),                     -- 'call', 'whatsapp', 'email'
    resultado_anterior VARCHAR(50),                -- resultado da última tentativa

    -- VARIÁVEL DE RETORNO
    -- null  = SDR agenda manualmente (cria registro em schedules)
    -- 24    = sistema agenda +24h automaticamente após cada tentativa
    -- 48    = sistema agenda +48h automaticamente após cada tentativa
    intervalo_retorno_horas INTEGER,

    -- Quando executar a próxima tentativa
    -- null quando intervalo_retorno_horas = null e SDR ainda não agendou
    proxima_acao_em TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Garantia: um lead só pode ter uma cadência ativa por vez
    CONSTRAINT uq_lead_cadence_lead UNIQUE (lead_id)
);

-- Índices para performance nas queries do scheduler e dashboard
CREATE INDEX idx_lead_cadence_status ON lead_cadence(status);
CREATE INDEX idx_lead_cadence_proxima_acao ON lead_cadence(proxima_acao_em) WHERE proxima_acao_em IS NOT NULL;
CREATE INDEX idx_lead_cadence_sdr ON lead_cadence(sdr_id);
CREATE INDEX idx_lead_cadence_lead ON lead_cadence(lead_id);
CREATE INDEX idx_lead_cadence_status_acao ON lead_cadence(status, proxima_acao_em) WHERE status = 'ativa';

-- Trigger updated_at
CREATE TRIGGER update_lead_cadence_updated_at
    BEFORE UPDATE ON lead_cadence
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários de documentação
COMMENT ON TABLE lead_cadence IS 'Controle de cadências ativas por lead. Um lead = uma cadência ativa (UNIQUE constraint).';
COMMENT ON COLUMN lead_cadence.intervalo_retorno_horas IS 'null=SDR agenda manualmente | 24=auto +24h | 48=auto +48h. Definido pelo manager na criação da cadência.';
COMMENT ON COLUMN lead_cadence.proxima_acao_em IS 'Timestamp da próxima tentativa. null quando aguardando agendamento manual do SDR.';
