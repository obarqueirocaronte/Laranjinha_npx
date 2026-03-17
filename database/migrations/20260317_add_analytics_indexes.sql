-- ============================================================================
-- 20260317_add_analytics_indexes.sql
-- Adiciona índices de performance para consultas de analytics e dashboard
-- ============================================================================

-- Log de interações (chamadas, emails, etc)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interactions_log_created_at ON interactions_log(created_at DESC);

-- Histórico de movimentações no pipeline
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pipeline_history_moved_at ON lead_pipeline_history(moved_at DESC);

-- Conclusão de cadências
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cadence_completions_completed_at ON cadence_completions(completed_at DESC);
