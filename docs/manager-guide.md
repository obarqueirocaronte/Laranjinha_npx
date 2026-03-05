# Manager Configuration Guide - Inside Sales Pipeline

This guide is designed for **Sales Managers** and **Operations Teams** who need to configure and customize the Inside Sales Pipeline system without writing code.

---

## Overview

The Inside Sales Pipeline system is designed to be **highly configurable** through a future Manager UI. This document outlines what can be configured and how the system will support these configurations.

---

## 1. Pipeline Column Management

### What Are Pipeline Columns?

Pipeline columns represent the **stages** that leads move through in your sales process. Examples:
- Leads (new leads)
- Call (leads being contacted by phone)
- WhatsApp (leads contacted via WhatsApp)
- Email (leads in email nurture)
- Qualified (leads ready for sales)
- Lost (leads that didn't convert)

### Creating a New Column

**Via Future Manager UI:**
1. Navigate to **Settings → Pipeline Configuration**
2. Click **Add New Column**
3. Fill in:
   - **Name**: Display name (e.g., "Demo Scheduled")
   - **Description**: Purpose of this stage
   - **Position**: Where it appears in the pipeline (1, 2, 3...)
   - **Color**: Hex color for visual distinction (#3B82F6)
4. Click **Save**

**Via SQL (Current):**

```sql
INSERT INTO pipeline_columns (name, description, position, color, is_active)
VALUES (
  'Demo Scheduled',
  'Leads with confirmed product demo',
  7,
  '#06B6D4',
  true
);
```

### Reordering Columns

Simply update the `position` field:

```sql
-- Move "Demo Scheduled" to position 4
UPDATE pipeline_columns 
SET position = 4 
WHERE name = 'Demo Scheduled';

-- Shift other columns accordingly
UPDATE pipeline_columns 
SET position = position + 1 
WHERE position >= 4 AND name != 'Demo Scheduled';
```

### Archiving a Column

Instead of deleting (which would lose historical data), mark as inactive:

```sql
UPDATE pipeline_columns 
SET is_active = false 
WHERE name = 'Old Column Name';
```

Inactive columns won't appear in the UI but historical data remains intact.

---

## 2. Workflow Automation (Cadence Configuration)

### What Are Workflow Triggers?

Workflow triggers are **automated actions** that happen when a lead moves from one column to another. Examples:
- Send a WhatsApp template when moving to "WhatsApp" column
- Notify CRM when lead reaches "Qualified"
- Start a timer for follow-up reminders

### Available Action Types

| Action Type | Description | Configuration |
|-------------|-------------|---------------|
| `SEND_TEMPLATE` | Display a template for SDR to send | `template_id` |
| `WEBHOOK` | Call external API (CRM, Slack, etc.) | `webhook_url`, `method` |
| `UPDATE_STATUS` | Change lead status automatically | `new_status` |
| `START_TIMER` | Schedule a follow-up reminder | `delay_hours` |
| `ASSIGN_SDR` | Reassign lead to different SDR | `sdr_id` or `team_id` |

### Creating a Workflow Trigger

**Example: Send Email Template When Moving to "Email" Column**

**Via Future Manager UI:**
1. Go to **Settings → Workflow Automation**
2. Click **Create New Trigger**
3. Configure:
   - **Name**: "Send First Email"
   - **From Column**: Leads
   - **To Column**: Email
   - **Action**: Send Template
   - **Template**: "Primeiro Contato - Email"
   - **Require Confirmation**: Yes (SDR must approve before sending)
4. Click **Save & Activate**

**Via SQL (Current):**

```sql
INSERT INTO workflow_triggers (
  name,
  from_column_id,
  to_column_id,
  action_type,
  template_id,
  config,
  is_active
) VALUES (
  'Send First Email',
  (SELECT id FROM pipeline_columns WHERE name = 'Leads'),
  (SELECT id FROM pipeline_columns WHERE name = 'Email'),
  'SEND_TEMPLATE',
  (SELECT id FROM templates WHERE name = 'Primeiro Contato - Email'),
  '{"auto_open_modal": true, "require_confirmation": true}'::jsonb,
  true
);
```

### Example: Webhook to Notify CRM

```sql
INSERT INTO workflow_triggers (
  name,
  from_column_id,
  to_column_id,
  action_type,
  config,
  is_active
) VALUES (
  'Notify CRM - Lead Qualified',
  (SELECT id FROM pipeline_columns WHERE name = 'Email'),
  (SELECT id FROM pipeline_columns WHERE name = 'Qualified'),
  'WEBHOOK',
  '{
    "webhook_url": "https://your-crm.com/api/leads/qualified",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer YOUR_CRM_TOKEN"
    }
  }'::jsonb,
  true
);
```

### Example: Auto-Schedule Follow-Up

```sql
INSERT INTO workflow_triggers (
  name,
  from_column_id,
  to_column_id,
  action_type,
  config,
  is_active
) VALUES (
  'Schedule Follow-Up in 3 Days',
  (SELECT id FROM pipeline_columns WHERE name = 'Call'),
  (SELECT id FROM pipeline_columns WHERE name = 'Email'),
  'START_TIMER',
  '{
    "delay_hours": 72,
    "reminder_message": "Follow up with {{full_name}} from {{company_name}}"
  }'::jsonb,
  true
);
```

---

## 3. Template Management

### Template Categories

- **EMAIL**: Email messages with subject line
- **WHATSAPP**: WhatsApp messages (shorter, casual)
- **CALL_SCRIPT**: Phone call scripts with objection handling
- **LINKEDIN**: LinkedIn connection requests and messages

### Creating a New Template

**Via Future Manager UI:**
1. Navigate to **Content → Templates**
2. Click **Create New Template**
3. Fill in:
   - **Name**: "Follow-Up Email - Week 2"
   - **Category**: Email
   - **Subject**: "Re: {{company_name}} - Quick Question"
   - **Content**: (see placeholders below)
   - **Language**: pt-BR
4. Click **Save**

**Via SQL (Current):**

```sql
INSERT INTO templates (name, category, subject, content, language)
VALUES (
  'Follow-Up Email - Week 2',
  'EMAIL',
  'Re: {{company_name}} - Quick Question',
  'Oi {{first_name}},

Enviei um email há uma semana sobre como podemos ajudar a {{company_name}}.

Sei que você deve estar ocupado(a), mas queria saber: faz sentido conversarmos sobre {{value_proposition}}?

Se sim, que tal marcarmos 15min esta semana? Aqui está meu calendário: {{calendar_link}}

Abraços,
{{sdr_name}}
{{sdr_phone}}',
  'pt-BR'
);
```

### Available Placeholders

Placeholders are automatically replaced with lead-specific data:

| Placeholder | Source | Example |
|-------------|--------|---------|
| `{{first_name}}` | Lead's first name | "João" |
| `{{full_name}}` | Lead's full name | "João Pedro Santos" |
| `{{company_name}}` | Lead's company | "TechCorp Brasil" |
| `{{job_title}}` | Lead's position | "CTO" |
| `{{email}}` | Lead's email | "joao@techcorp.com" |
| `{{phone}}` | Lead's phone | "+5511987654321" |
| `{{sdr_name}}` | Assigned SDR name | "Ana Silva" |
| `{{sdr_phone}}` | SDR's phone | "+5511999999001" |
| `{{sdr_email}}` | SDR's email | "ana.silva@company.com" |

**Custom Placeholders:**
You can also use custom placeholders that the SDR fills in manually:
- `{{value_proposition}}` - What you're offering
- `{{calendar_link}}` - Scheduling link
- `{{case_study}}` - Relevant customer story
- `{{meeting_time}}` - Proposed meeting time

### Template Best Practices

1. **Keep it Short**: 3-5 sentences for emails, 2-3 for WhatsApp
2. **Personalize**: Always use `{{first_name}}` and `{{company_name}}`
3. **Clear CTA**: One specific call-to-action
4. **Test Placeholders**: Ensure all placeholders have fallback values
5. **A/B Test**: Create variations and track performance

---

## 4. Lead Distribution Configuration

### Current Strategy: Round Robin

Leads are automatically assigned to the SDR with the **lowest number of assigned leads**.

**How It Works:**
1. New lead arrives via API
2. System queries active SDRs ordered by `total_leads_assigned`
3. Assigns to SDR with lowest count
4. Increments their counter

### Alternative Strategies (Future)

#### Weighted Distribution

Assign more leads to top performers:

```sql
-- Add performance_weight column to sdrs table
ALTER TABLE sdrs ADD COLUMN performance_weight INTEGER DEFAULT 1;

-- High performers get weight 3 (3x more leads)
UPDATE sdrs SET performance_weight = 3 WHERE full_name = 'Ana Silva';

-- New SDRs get weight 1 (fewer leads)
UPDATE sdrs SET performance_weight = 1 WHERE full_name = 'New SDR';
```

#### Territory-Based Assignment

Assign based on lead's location or industry:

```sql
-- Add territory column to sdrs
ALTER TABLE sdrs ADD COLUMN territory VARCHAR(100);

UPDATE sdrs SET territory = 'SaaS' WHERE full_name = 'Ana Silva';
UPDATE sdrs SET territory = 'E-commerce' WHERE full_name = 'Bruno Costa';

-- Assign based on metadata
-- (Requires custom logic in API)
```

#### Manual Assignment Only

Disable automatic assignment:

```sql
-- Set all SDRs to inactive for auto-assignment
UPDATE sdrs SET is_active = false;

-- Manager assigns leads manually via UI
```

---

## 5. Analytics & Reporting

### Key Metrics to Track

#### Pipeline Velocity

**Average time leads spend in each column:**

```sql
SELECT 
  pc.name as column_name,
  AVG(lph.time_in_previous_column_seconds) / 3600 as avg_hours,
  COUNT(*) as total_movements
FROM lead_pipeline_history lph
JOIN pipeline_columns pc ON lph.to_column_id = pc.id
WHERE lph.moved_at >= NOW() - INTERVAL '30 days'
GROUP BY pc.name
ORDER BY pc.position;
```

#### Conversion Rate by Column

```sql
SELECT 
  pc.name,
  COUNT(DISTINCT lph.lead_id) as leads_reached,
  COUNT(DISTINCT CASE WHEN l.status = 'converted' THEN lph.lead_id END) as converted,
  ROUND(
    COUNT(DISTINCT CASE WHEN l.status = 'converted' THEN lph.lead_id END)::numeric / 
    COUNT(DISTINCT lph.lead_id) * 100, 
    2
  ) as conversion_rate
FROM lead_pipeline_history lph
JOIN pipeline_columns pc ON lph.to_column_id = pc.id
JOIN leads l ON lph.lead_id = l.id
GROUP BY pc.name;
```

#### SDR Performance

```sql
SELECT 
  s.full_name,
  COUNT(DISTINCT l.id) as total_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'converted' THEN l.id END) as converted,
  COUNT(DISTINCT il.id) as total_interactions,
  ROUND(
    COUNT(DISTINCT CASE WHEN l.status = 'converted' THEN l.id END)::numeric / 
    COUNT(DISTINCT l.id) * 100, 
    2
  ) as conversion_rate
FROM sdrs s
LEFT JOIN leads l ON s.id = l.assigned_sdr_id
LEFT JOIN interactions_log il ON s.id = il.sdr_id
WHERE l.created_at >= NOW() - INTERVAL '30 days'
GROUP BY s.full_name
ORDER BY conversion_rate DESC;
```

#### Template Performance

```sql
SELECT 
  t.name,
  t.category,
  COUNT(il.id) as times_used,
  COUNT(CASE WHEN il.was_replied = true THEN 1 END) as replies,
  ROUND(
    COUNT(CASE WHEN il.was_replied = true THEN 1 END)::numeric / 
    COUNT(il.id) * 100, 
    2
  ) as reply_rate
FROM templates t
LEFT JOIN interactions_log il ON t.id = il.template_id
WHERE il.created_at >= NOW() - INTERVAL '30 days'
GROUP BY t.name, t.category
ORDER BY reply_rate DESC;
```

### Recommended Dashboards

**Manager Daily View:**
- Leads in each column (current snapshot)
- New leads today
- Qualified leads this week
- SDR activity summary

**SDR Individual View:**
- My assigned leads by column
- My tasks for today
- My conversion rate this month
- Templates I use most

**Executive Monthly View:**
- Total leads processed
- Overall conversion rate
- Average time-to-qualify
- Top performing SDRs
- ROI by lead source (from metadata)

---

## 6. Quality Scoring System

### What Is Quality Score?

A **0-100 score** indicating how well a lead fits your ideal customer profile (ICP).

### Setting Up Quality Scoring

**Manual Scoring:**
Managers can manually set scores based on lead attributes:

```sql
UPDATE leads 
SET quality_score = 95 
WHERE job_title IN ('CTO', 'CEO', 'VP Engineering')
  AND metadata->>'company_size' = '50-200';

UPDATE leads 
SET quality_score = 70 
WHERE job_title IN ('Manager', 'Director')
  AND metadata->>'company_size' = '10-50';
```

**Automated Scoring (Future):**

Create a scoring formula based on attributes:

```javascript
function calculateQualityScore(lead) {
  let score = 50; // Base score
  
  // Job title scoring
  if (['CTO', 'CEO', 'Founder'].includes(lead.job_title)) score += 20;
  else if (['VP', 'Director'].includes(lead.job_title)) score += 10;
  
  // Company size scoring
  const companySize = lead.metadata.company_size;
  if (companySize === '50-200') score += 15;
  else if (companySize === '200-500') score += 10;
  
  // Industry fit
  if (['SaaS', 'Fintech'].includes(lead.metadata.industry)) score += 10;
  
  // Budget indicator
  if (lead.metadata.budget === 'high') score += 5;
  
  return Math.min(score, 100); // Cap at 100
}
```

### Using Quality Scores

**Prioritize High-Quality Leads:**

```sql
-- SDR view: Show highest quality leads first
SELECT full_name, company_name, quality_score
FROM leads
WHERE assigned_sdr_id = 'current-sdr-id'
  AND status = 'active'
ORDER BY quality_score DESC, created_at ASC;
```

**Alert on High-Quality Leads:**

```sql
-- Trigger webhook for leads with score > 90
INSERT INTO workflow_triggers (
  name, from_column_id, to_column_id, action_type, config
) VALUES (
  'Alert on High-Quality Lead',
  (SELECT id FROM pipeline_columns WHERE name = 'Leads'),
  NULL, -- Any destination
  'WEBHOOK',
  '{
    "webhook_url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
    "method": "POST",
    "condition": "quality_score > 90"
  }'::jsonb
);
```

---

## 7. Data Privacy & Compliance

### LGPD/GDPR Considerations

**Lead Data Retention:**

```sql
-- Archive leads older than 2 years
UPDATE leads 
SET status = 'archived',
    metadata = metadata || '{"archived_reason": "retention_policy"}'::jsonb
WHERE created_at < NOW() - INTERVAL '2 years'
  AND status != 'converted';
```

**Right to Deletion:**

```sql
-- Anonymize lead data (keep for analytics)
UPDATE leads 
SET full_name = 'DELETED',
    email = CONCAT('deleted_', id, '@example.com'),
    phone = NULL,
    linkedin_url = NULL,
    metadata = '{}'::jsonb
WHERE email = 'user-requested-deletion@example.com';
```

**Export Lead Data:**

```sql
-- Export all data for a specific lead
SELECT 
  l.*,
  json_agg(DISTINCT il.*) as interactions,
  json_agg(DISTINCT lph.*) as pipeline_history
FROM leads l
LEFT JOIN interactions_log il ON l.id = il.lead_id
LEFT JOIN lead_pipeline_history lph ON l.id = lph.lead_id
WHERE l.email = 'user@example.com'
GROUP BY l.id;
```

---

## 8. Future Manager UI Features

The following features are planned for the Manager UI:

- ✅ **Drag-and-Drop Pipeline Builder**: Visually create and reorder columns
- ✅ **Workflow Visual Editor**: No-code automation builder
- ✅ **Template Library**: Browse, edit, and test templates
- ✅ **Analytics Dashboard**: Real-time metrics and charts
- ✅ **SDR Performance Leaderboard**: Gamification and motivation
- ✅ **Lead Scoring Rules Engine**: Visual formula builder
- ✅ **A/B Testing**: Compare template performance
- ✅ **Bulk Import/Export**: CSV upload for leads
- ✅ **Role-Based Access**: Manager vs SDR permissions
- ✅ **Audit Logs**: Track all configuration changes

---

## Need Help?

For technical implementation questions, see the [Integration Guide](integration-guide.md).

For database schema details, see the [Entity Relationship Diagram](erd.md).

For API usage, see the [API Contracts](api-contracts.md).
