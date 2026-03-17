-- ============================================================================
-- 20260317_add_analytics_indexes.sql
-- Adiciona índices de performance para consultas de analytics e dashboard
-- ============================================================================

-- Log de interações (chamadas, emails, etc) - Ordenação por data
CREATE INDEX IF NOT EXISTS idx_interactions_log_created_at ON interactions_log(created_at DESC);

-- Histórico de movimentações no pipeline - Ordenação por data
CREATE INDEX IF NOT EXISTS idx_pipeline_history_moved_at ON lead_pipeline_history(moved_at DESC);

-- Conclusão de cadências - Ordenação por data
CREATE INDEX IF NOT EXISTS idx_cadence_completions_completed_at ON cadence_completions(completed_at DESC);

-- ÍNDICES DE AGREGAÇÃO (Críticos para o Dashboard do Gestor)
-- Melhora contagem de leads por SDR e status
CREATE INDEX IF NOT EXISTS idx_leads_qualification_status ON leads(qualification_status);

-- Melhora contagem de movimentos por SDR (usado no WITH movement_counts)
CREATE INDEX IF NOT EXISTS idx_pipeline_history_moved_by_sdr ON lead_pipeline_history(moved_by_sdr_id);

-- Melhora busca de histórico de interações por SDR
CREATE INDEX IF NOT EXISTS idx_interactions_log_sdr_id ON interactions_log(sdr_id, created_at DESC);
