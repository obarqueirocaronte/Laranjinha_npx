-- Migration: Add cadence_configs table + presets
-- Date: 2026-03-19
-- Responsável: Claude

CREATE TABLE IF NOT EXISTS cadence_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    phone_rolls INTEGER NOT NULL DEFAULT 3,
    whatsapp_rolls INTEGER NOT NULL DEFAULT 3,
    email_rolls INTEGER NOT NULL DEFAULT 1,

    -- VARIÁVEL DE RETORNO: como tratar o intervalo entre tentativas
    -- null  = SDR sempre agenda manualmente (modo livre)
    -- 24    = sistema reagenda automaticamente em +24h
    -- 48    = sistema reagenda automaticamente em +48h
    intervalo_retorno_horas INTEGER,

    -- Se true, SDR pode sobrescrever o intervalo automático via reschedule
    allow_sdr_override BOOLEAN NOT NULL DEFAULT true,

    -- Infinity mode: após esgotar os steps, recomeça do step 1?
    infinity_mode BOOLEAN NOT NULL DEFAULT false,

    created_by UUID REFERENCES sdrs(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar FK em lead_cadence para cadence_configs (criada após essa migration)
ALTER TABLE lead_cadence
    ADD CONSTRAINT fk_lead_cadence_config
    FOREIGN KEY (cadence_config_id) REFERENCES cadence_configs(id) ON DELETE SET NULL;

-- Inserir presets padrão do sistema
INSERT INTO cadence_configs
    (name, phone_rolls, whatsapp_rolls, email_rolls, intervalo_retorno_horas, allow_sdr_override, infinity_mode)
VALUES
    -- Agressiva: muitas tentativas, retorno em 24h automático
    ('Agressiva',   5, 5, 5, 24,   true,  false),

    -- Nutrição: foco em whatsapp/email, ritmo mais lento (48h)
    ('Nutrição',    0, 2, 5, 48,   true,  false),

    -- Fechamento: balanceado, retorno em 24h
    ('Fechamento',  3, 3, 1, 24,   true,  false),

    -- SDR Livre: SDR controla 100% o ritmo de retorno
    ('SDR Livre',   3, 3, 1, NULL, true,  false);

-- Comentários de documentação
COMMENT ON TABLE cadence_configs IS 'Configurações de cadência pré-definidas (presets) criadas pelo manager.';
COMMENT ON COLUMN cadence_configs.intervalo_retorno_horas IS 'null=SDR define manualmente | 24=auto +24h | 48=auto +48h. Este valor é herdado por lead_cadence ao aplicar a config.';
COMMENT ON COLUMN cadence_configs.allow_sdr_override IS 'Permite que o SDR sobrescreva o intervalo automático com agendamento manual.';
COMMENT ON COLUMN cadence_configs.infinity_mode IS 'Se true, após esgotar max_steps recomeça do step 1 em vez de encerrar a cadência.';
