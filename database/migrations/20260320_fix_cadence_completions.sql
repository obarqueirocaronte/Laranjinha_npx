-- Fix missing column in cadence_completions
-- Date: 2026-03-20

ALTER TABLE cadence_completions ADD COLUMN IF NOT EXISTS cadence_name VARCHAR(100);
