-- Migration: Link schedules table to lead_cadence
-- Date: 2026-03-19
-- Responsável: Claude
-- Vincula agendamentos manuais do SDR à cadência correspondente

ALTER TABLE schedules
    ADD COLUMN IF NOT EXISTS lead_cadence_id UUID REFERENCES lead_cadence(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS cadence_step INTEGER;

-- Índice para buscar agendamentos de uma cadência específica
CREATE INDEX IF NOT EXISTS idx_schedules_lead_cadence ON schedules(lead_cadence_id)
    WHERE lead_cadence_id IS NOT NULL;

-- Índice para o scheduler: buscar schedules pendentes de cadência
CREATE INDEX IF NOT EXISTS idx_schedules_cadence_pending ON schedules(scheduled_at, status)
    WHERE type = 'cadence' AND status = 'pending';

-- Comentários de documentação
COMMENT ON COLUMN schedules.lead_cadence_id IS
    'Preenchido quando o SDR agenda retorno manualmente para uma cadência ativa (intervalo_retorno_horas = null ou allow_sdr_override = true). Liga o agendamento à cadência para rastreamento.';
COMMENT ON COLUMN schedules.cadence_step IS
    'Step da cadência no momento do agendamento manual. Permite rastrear em qual etapa o SDR interveio.';
