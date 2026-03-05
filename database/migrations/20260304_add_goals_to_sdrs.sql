-- Migration: Add goal fields to sdrs table
-- These fields define the daily targets for each SDR

ALTER TABLE sdrs 
ADD COLUMN IF NOT EXISTS goal_calls INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS goal_emails INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS goal_whatsapp INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS goal_completed INTEGER DEFAULT 5;

-- Update existing SDRs with these defaults if they were null
UPDATE sdrs 
SET goal_calls = 50, goal_emails = 20, goal_whatsapp = 30, goal_completed = 5
WHERE goal_calls IS NULL;
