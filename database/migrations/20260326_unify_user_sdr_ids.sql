-- Migration: Unify User and SDR IDs
-- Goal: Make sdrs.id equal to sdrs.user_id and update all references.

BEGIN;

-- 1. Drop Foreign Key Constraints
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_assigned_sdr_id_fkey;
ALTER TABLE lead_pipeline_history DROP CONSTRAINT IF EXISTS lead_pipeline_history_moved_by_sdr_id_fkey;
ALTER TABLE interactions_log DROP CONSTRAINT IF EXISTS interactions_log_sdr_id_fkey;
ALTER TABLE sdr_stats DROP CONSTRAINT IF EXISTS sdr_stats_sdr_id_fkey;
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_sdr_id_fkey;
ALTER TABLE call_logs DROP CONSTRAINT IF EXISTS call_logs_sdr_id_fkey;
ALTER TABLE cadence_completions DROP CONSTRAINT IF EXISTS cadence_completions_sdr_id_fkey;
ALTER TABLE cadence_configs DROP CONSTRAINT IF EXISTS cadence_configs_created_by_fkey;
ALTER TABLE lead_cadence DROP CONSTRAINT IF EXISTS lead_cadence_sdr_id_fkey;
ALTER TABLE cadence_logs DROP CONSTRAINT IF EXISTS cadence_logs_sdr_id_fkey;
ALTER TABLE cadence_task_completions DROP CONSTRAINT IF EXISTS cadence_task_completions_sdr_id_fkey;
ALTER TABLE management_report_config DROP CONSTRAINT IF EXISTS management_report_config_sdr_id_fkey;

-- 2. Create a mapping table for the update
CREATE TEMP TABLE sdr_id_mapping AS
SELECT id as old_id, user_id as new_id FROM sdrs;

-- 3. Update referencing tables
UPDATE leads SET assigned_sdr_id = m.new_id FROM sdr_id_mapping m WHERE assigned_sdr_id = m.old_id;
UPDATE lead_pipeline_history SET moved_by_sdr_id = m.new_id FROM sdr_id_mapping m WHERE moved_by_sdr_id = m.old_id;
UPDATE interactions_log SET sdr_id = m.new_id FROM sdr_id_mapping m WHERE sdr_id = m.old_id;
UPDATE sdr_stats SET sdr_id = m.new_id FROM sdr_id_mapping m WHERE sdr_id = m.old_id;
UPDATE schedules SET sdr_id = m.new_id FROM sdr_id_mapping m WHERE sdr_id = m.old_id;
UPDATE call_logs SET sdr_id = m.new_id FROM sdr_id_mapping m WHERE sdr_id = m.old_id;
UPDATE cadence_completions SET sdr_id = m.new_id FROM sdr_id_mapping m WHERE sdr_id = m.old_id;
UPDATE cadence_configs SET created_by = m.new_id FROM sdr_id_mapping m WHERE created_by = m.old_id;
UPDATE lead_cadence SET sdr_id = m.new_id FROM sdr_id_mapping m WHERE sdr_id = m.old_id;
UPDATE cadence_logs SET sdr_id = m.new_id FROM sdr_id_mapping m WHERE sdr_id = m.old_id;
UPDATE cadence_task_completions SET sdr_id = m.new_id FROM sdr_id_mapping m WHERE sdr_id = m.old_id;
UPDATE management_report_config SET sdr_id = m.new_id FROM sdr_id_mapping m WHERE sdr_id = m.old_id;

-- 4. Update the sdrs table itself
-- We need to handle potential conflicts if a user_id already exists as an id (unlikely but safe)
UPDATE sdrs SET id = user_id;

-- 5. Update users table sdr_id
UPDATE users u SET sdr_id = s.id FROM sdrs s WHERE u.id = s.user_id;

-- 6. Restore Foreign Key Constraints
ALTER TABLE leads ADD CONSTRAINT leads_assigned_sdr_id_fkey FOREIGN KEY (assigned_sdr_id) REFERENCES sdrs(id);
ALTER TABLE lead_pipeline_history ADD CONSTRAINT lead_pipeline_history_moved_by_sdr_id_fkey FOREIGN KEY (moved_by_sdr_id) REFERENCES sdrs(id);
ALTER TABLE interactions_log ADD CONSTRAINT interactions_log_sdr_id_fkey FOREIGN KEY (sdr_id) REFERENCES sdrs(id);
ALTER TABLE sdr_stats ADD CONSTRAINT sdr_stats_sdr_id_fkey FOREIGN KEY (sdr_id) REFERENCES sdrs(id);
ALTER TABLE schedules ADD CONSTRAINT schedules_sdr_id_fkey FOREIGN KEY (sdr_id) REFERENCES sdrs(id);
ALTER TABLE call_logs ADD CONSTRAINT call_logs_sdr_id_fkey FOREIGN KEY (sdr_id) REFERENCES sdrs(id);
ALTER TABLE cadence_completions ADD CONSTRAINT cadence_completions_sdr_id_fkey FOREIGN KEY (sdr_id) REFERENCES sdrs(id);
ALTER TABLE cadence_configs ADD CONSTRAINT cadence_configs_created_by_fkey FOREIGN KEY (created_by) REFERENCES sdrs(id);
ALTER TABLE lead_cadence ADD CONSTRAINT lead_cadence_sdr_id_fkey FOREIGN KEY (sdr_id) REFERENCES sdrs(id);
ALTER TABLE cadence_logs ADD CONSTRAINT cadence_logs_sdr_id_fkey FOREIGN KEY (sdr_id) REFERENCES sdrs(id);
ALTER TABLE cadence_task_completions ADD CONSTRAINT cadence_task_completions_sdr_id_fkey FOREIGN KEY (sdr_id) REFERENCES sdrs(id);
ALTER TABLE management_report_config ADD CONSTRAINT management_report_config_sdr_id_fkey FOREIGN KEY (sdr_id) REFERENCES sdrs(id);

COMMIT;
