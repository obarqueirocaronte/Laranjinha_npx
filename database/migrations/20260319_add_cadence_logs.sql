-- Migration: Add cadence_logs table (imutável)
-- Date: 2026-03-19
-- Responsável: Claude
-- IMPORTANTE: Esta tabela é IMUTÁVEL — sem UPDATE, sem DELETE. Apenas INSERT.

CREATE TABLE IF NOT EXISTS cadence_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    lead_cadence_id UUID REFERENCES lead_cadence(id) ON DELETE SET NULL,
    sdr_id UUID REFERENCES sdrs(id) ON DELETE SET NULL,
    step INTEGER NOT NULL,
    canal VARCHAR(50) NOT NULL,     -- 'call', 'whatsapp', 'email'
    acao VARCHAR(50) NOT NULL,      -- 'tentativa', 'agendamento', 'encerramento'
    resultado VARCHAR(50),          -- 'atendeu', 'nao_atendeu', 'sem_resposta', 'voicemail', 'esgotado'
    notas TEXT,
    retorno_agendado_em TIMESTAMP WITH TIME ZONE,  -- preenchido quando acao='agendamento'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    -- SEM updated_at: log é imutável por design
);

-- Índices para queries de auditoria e dashboard
CREATE INDEX idx_cadence_logs_lead ON cadence_logs(lead_id);
CREATE INDEX idx_cadence_logs_lead_cadence ON cadence_logs(lead_cadence_id);
CREATE INDEX idx_cadence_logs_timestamp ON cadence_logs(timestamp DESC);
CREATE INDEX idx_cadence_logs_sdr ON cadence_logs(sdr_id);
CREATE INDEX idx_cadence_logs_resultado ON cadence_logs(resultado) WHERE resultado IS NOT NULL;

-- Comentários de documentação
COMMENT ON TABLE cadence_logs IS 'Log imutável de cada ação de cadência. Não permite UPDATE nem DELETE. Auditoria completa de tentativas, agendamentos e encerramentos.';
COMMENT ON COLUMN cadence_logs.acao IS 'tentativa=executou ação | agendamento=SDR agendou retorno | encerramento=cadência finalizada';
COMMENT ON COLUMN cadence_logs.resultado IS 'atendeu | nao_atendeu | sem_resposta | voicemail | esgotado (step=max_steps sem sucesso)';
COMMENT ON COLUMN cadence_logs.retorno_agendado_em IS 'Preenchido apenas quando acao=agendamento. Registra para quando o SDR agendou o retorno.';
