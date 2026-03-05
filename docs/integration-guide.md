# Integration Guide - Inside Sales Pipeline

This guide walks you through setting up the Inside Sales Pipeline system, from database initialization to API integration and testing.

---

## Prerequisites

- **PostgreSQL 14+** installed and running
- **API Server** (Node.js, Python, etc.) with database connection
- **API Authentication** system (JWT, API keys, etc.)
- Basic knowledge of SQL and REST APIs

---

## 1. Database Setup

### Step 1.1: Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE inside_sales_pipeline;

# Connect to the new database
\c inside_sales_pipeline
```

### Step 1.2: Run Schema Migration

Execute the schema file to create all tables, indexes, and triggers:

```bash
psql -U postgres -d inside_sales_pipeline -f database/schema.sql
```

**Expected Output:**
```
CREATE EXTENSION
CREATE EXTENSION
CREATE TABLE
CREATE TABLE
...
CREATE INDEX
CREATE TRIGGER
COMMENT
```

### Step 1.3: Verify Schema

Check that all tables were created:

```sql
\dt

-- Should show:
-- teams
-- sdrs
-- pipeline_columns
-- leads
-- lead_pipeline_history
-- workflow_triggers
-- templates
-- interactions_log
```

### Step 1.4: Load Seed Data (Optional)

For testing and demonstration:

```bash
psql -U postgres -d inside_sales_pipeline -f database/seed-data.sql
```

**Verify seed data:**

```sql
-- Check pipeline columns
SELECT name, position FROM pipeline_columns ORDER BY position;

-- Check SDRs
SELECT full_name, email FROM sdrs;

-- Check sample leads
SELECT full_name, company_name, email FROM leads;

-- Check templates
SELECT name, category FROM templates;
```

---

## 2. Environment Configuration

### Step 2.1: Database Connection

Create a `.env` file in your project root:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/inside_sales_pipeline
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# API
API_PORT=3000
API_BASE_URL=https://api.yourdomain.com
API_VERSION=v1

# Authentication
JWT_SECRET=your-secret-key-here
API_KEY_HEADER=X-API-Key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Webhooks
WEBHOOK_TIMEOUT_MS=5000
WEBHOOK_RETRY_ATTEMPTS=3

# Email Integration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# WhatsApp Integration (optional)
WHATSAPP_API_URL=https://api.whatsapp.com/v1
WHATSAPP_API_TOKEN=your-token-here
```

### Step 2.2: Database Connection Code

**Node.js (with pg):**

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  min: parseInt(process.env.DATABASE_POOL_MIN),
  max: parseInt(process.env.DATABASE_POOL_MAX),
});

module.exports = pool;
```

**Python (with psycopg2):**

```python
import psycopg2
from psycopg2.pool import SimpleConnectionPool
import os

pool = SimpleConnectionPool(
    minconn=int(os.getenv('DATABASE_POOL_MIN', 2)),
    maxconn=int(os.getenv('DATABASE_POOL_MAX', 10)),
    dsn=os.getenv('DATABASE_URL')
)
```

---

## 3. API Implementation Examples

### Example 3.1: Lead Ingestion Endpoint

**Node.js (Express):**

```javascript
const express = require('express');
const pool = require('./db');
const router = express.Router();

router.post('/leads/ingest', async (req, res) => {
  const {
    external_id,
    full_name,
    company_name,
    job_title,
    email,
    phone,
    linkedin_url,
    metadata
  } = req.body;

  // Validation
  if (!full_name || !email) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'full_name and email are required',
        details: []
      }
    });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Check for duplicates
    const duplicateCheck = await client.query(
      'SELECT id, full_name FROM leads WHERE email = $1 OR (external_id = $2 AND external_id IS NOT NULL)',
      [email, external_id]
    );

    if (duplicateCheck.rows.length > 0) {
      // Update existing lead
      const existingLead = duplicateCheck.rows[0];
      
      await client.query(
        `UPDATE leads 
         SET metadata = metadata || $1::jsonb,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [JSON.stringify(metadata), existingLead.id]
      );

      await client.query('COMMIT');

      return res.status(200).json({
        success: true,
        data: {
          lead_id: existingLead.id,
          status: 'duplicate_updated',
          message: 'Lead already exists. Metadata updated.',
          duplicate_field: 'email'
        }
      });
    }

    // Get first pipeline column (Leads)
    const columnResult = await client.query(
      'SELECT id FROM pipeline_columns WHERE position = 1 LIMIT 1'
    );
    const firstColumnId = columnResult.rows[0].id;

    // Round Robin: Get SDR with lowest lead count
    const sdrResult = await client.query(
      `SELECT id, full_name, email 
       FROM sdrs 
       WHERE is_active = true 
       ORDER BY total_leads_assigned ASC, last_lead_assigned_at ASC NULLS FIRST
       LIMIT 1`
    );

    if (sdrResult.rows.length === 0) {
      throw new Error('No active SDRs available');
    }

    const assignedSDR = sdrResult.rows[0];

    // Create new lead
    const leadResult = await client.query(
      `INSERT INTO leads (
        external_id, full_name, company_name, job_title, 
        email, phone, linkedin_url, current_column_id, 
        assigned_sdr_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, created_at`,
      [
        external_id, full_name, company_name, job_title,
        email, phone, linkedin_url, firstColumnId,
        assignedSDR.id, JSON.stringify(metadata || {})
      ]
    );

    // Update SDR assignment count
    await client.query(
      `UPDATE sdrs 
       SET total_leads_assigned = total_leads_assigned + 1,
           last_lead_assigned_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [assignedSDR.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        lead_id: leadResult.rows[0].id,
        status: 'created',
        assigned_to: {
          sdr_id: assignedSDR.id,
          sdr_name: assignedSDR.full_name,
          sdr_email: assignedSDR.email
        },
        current_column: {
          id: firstColumnId,
          name: 'Leads'
        },
        created_at: leadResult.rows[0].created_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Lead ingestion error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create lead'
      }
    });
  } finally {
    client.release();
  }
});

module.exports = router;
```

### Example 3.2: Move Lead Between Columns

```javascript
router.post('/leads/:lead_id/move', async (req, res) => {
  const { lead_id } = req.params;
  const { to_column_id, notes } = req.body;
  const sdr_id = req.user.id; // From auth middleware

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get current lead state
    const leadResult = await client.query(
      'SELECT current_column_id FROM leads WHERE id = $1',
      [lead_id]
    );

    if (leadResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'LEAD_NOT_FOUND', message: 'Lead not found' }
      });
    }

    const from_column_id = leadResult.rows[0].current_column_id;

    // Update lead column
    await client.query(
      'UPDATE leads SET current_column_id = $1 WHERE id = $2',
      [to_column_id, lead_id]
    );
    // Note: Pipeline history is logged automatically via trigger

    // Check for workflow triggers
    const triggersResult = await client.query(
      `SELECT wt.*, t.name as template_name
       FROM workflow_triggers wt
       LEFT JOIN templates t ON wt.template_id = t.id
       WHERE wt.from_column_id = $1 
         AND wt.to_column_id = $2 
         AND wt.is_active = true`,
      [from_column_id, to_column_id]
    );

    const triggered_workflows = triggersResult.rows.map(trigger => ({
      workflow_id: trigger.id,
      action_type: trigger.action_type,
      template_id: trigger.template_id,
      template_name: trigger.template_name,
      status: 'pending_confirmation'
    }));

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      data: {
        lead_id,
        from_column: { id: from_column_id },
        to_column: { id: to_column_id },
        triggered_workflows,
        moved_at: new Date().toISOString()
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Move lead error:', error);
    
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to move lead' }
    });
  } finally {
    client.release();
  }
});
```

### Example 3.3: Render Template with Placeholders

```javascript
router.post('/templates/:template_id/render', async (req, res) => {
  const { template_id } = req.params;
  const { lead_id, custom_placeholders } = req.body;

  try {
    // Get template
    const templateResult = await pool.query(
      'SELECT * FROM templates WHERE id = $1',
      [template_id]
    );

    if (templateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' }
      });
    }

    const template = templateResult.rows[0];

    // Get lead data
    const leadResult = await pool.query(
      `SELECT l.*, s.full_name as sdr_name, s.phone as sdr_phone
       FROM leads l
       LEFT JOIN sdrs s ON l.assigned_sdr_id = s.id
       WHERE l.id = $1`,
      [lead_id]
    );

    if (leadResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'LEAD_NOT_FOUND', message: 'Lead not found' }
      });
    }

    const lead = leadResult.rows[0];

    // Build placeholders
    const placeholders = {
      first_name: lead.full_name.split(' ')[0],
      full_name: lead.full_name,
      company_name: lead.company_name,
      job_title: lead.job_title,
      email: lead.email,
      phone: lead.phone,
      sdr_name: lead.sdr_name,
      sdr_phone: lead.sdr_phone,
      ...custom_placeholders
    };

    // Replace placeholders in content
    let rendered_content = template.content;
    let rendered_subject = template.subject;

    Object.keys(placeholders).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered_content = rendered_content.replace(regex, placeholders[key] || '');
      if (rendered_subject) {
        rendered_subject = rendered_subject.replace(regex, placeholders[key] || '');
      }
    });

    res.status(200).json({
      success: true,
      data: {
        template_id,
        rendered_subject,
        rendered_content,
        placeholders_used: placeholders
      }
    });

  } catch (error) {
    console.error('Template render error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to render template' }
    });
  }
});
```

---

## 4. Testing the Integration

### Test 4.1: Create a Lead via API

```bash
curl -X POST http://localhost:3000/api/v1/leads/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "external_id": "TEST_001",
    "full_name": "Maria Silva",
    "company_name": "Test Company",
    "job_title": "CEO",
    "email": "maria.silva@testcompany.com",
    "phone": "+5511999999999",
    "metadata": {
      "utm_source": "test",
      "utm_campaign": "integration_test"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "lead_id": "uuid-here",
    "status": "created",
    "assigned_to": {
      "sdr_id": "uuid",
      "sdr_name": "Ana Silva",
      "sdr_email": "ana.silva@company.com"
    }
  }
}
```

### Test 4.2: Test Deduplication

Send the same request again:

```bash
# Same curl command as above
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "lead_id": "same-uuid-as-before",
    "status": "duplicate_updated",
    "message": "Lead already exists. Metadata updated."
  }
}
```

### Test 4.3: Move Lead and Trigger Workflow

```bash
curl -X POST http://localhost:3000/api/v1/leads/{lead_id}/move \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "to_column_id": "c0000002-0000-0000-0000-000000000002",
    "notes": "Lead showed interest"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "triggered_workflows": [
      {
        "workflow_id": "uuid",
        "action_type": "SEND_TEMPLATE",
        "template_id": "uuid",
        "template_name": "Script de Discovery Call",
        "status": "pending_confirmation"
      }
    ]
  }
}
```

### Test 4.4: Render Template

```bash
curl -X POST http://localhost:3000/api/v1/templates/{template_id}/render \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "lead_id": "{lead_id}",
    "custom_placeholders": {
      "value_proposition": "increase sales by 30%"
    }
  }'
```

---

## 5. Webhook Configuration

### Step 5.1: Implement Webhook Handler

```javascript
async function executeWorkflowWebhook(lead, config) {
  const { webhook_url, method = 'POST' } = config;

  const payload = {
    event: 'lead.moved',
    timestamp: new Date().toISOString(),
    data: {
      lead_id: lead.id,
      email: lead.email,
      company_name: lead.company_name,
      current_column: lead.current_column_id
    }
  };

  try {
    const response = await fetch(webhook_url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 5000
    });

    if (!response.ok) {
      console.error('Webhook failed:', response.status);
    }
  } catch (error) {
    console.error('Webhook error:', error);
  }
}
```

### Step 5.2: Test Webhook with RequestBin

1. Create a test endpoint at [requestbin.com](https://requestbin.com)
2. Add webhook trigger:

```sql
INSERT INTO workflow_triggers (
  name, from_column_id, to_column_id, action_type, config
) VALUES (
  'Test Webhook',
  'c0000001-0000-0000-0000-000000000001',
  'c0000002-0000-0000-0000-000000000002',
  'WEBHOOK',
  '{"webhook_url": "https://your-requestbin-url.com", "method": "POST"}'::jsonb
);
```

3. Move a lead and check RequestBin for the payload

---

## 6. Common Issues & Troubleshooting

### Issue 6.1: "relation does not exist"

**Cause:** Schema not properly created

**Solution:**
```bash
# Verify you're in the correct database
psql -U postgres -d inside_sales_pipeline -c "\dt"

# Re-run schema if needed
psql -U postgres -d inside_sales_pipeline -f database/schema.sql
```

### Issue 6.2: Duplicate key violation on email

**Cause:** Trying to insert lead with existing email

**Solution:** This is expected behavior. The API should handle this gracefully and return a duplicate response.

### Issue 6.3: No active SDRs available

**Cause:** No SDRs marked as `is_active = true`

**Solution:**
```sql
UPDATE sdrs SET is_active = true WHERE id = 'your-sdr-id';
```

### Issue 6.4: Triggers not firing

**Cause:** Workflow trigger conditions not met

**Solution:**
```sql
-- Check existing triggers
SELECT * FROM workflow_triggers WHERE is_active = true;

-- Verify column IDs match
SELECT id, name FROM pipeline_columns;
```

---

## 7. Performance Optimization

### Enable Query Logging (Development)

```sql
-- PostgreSQL config
ALTER DATABASE inside_sales_pipeline SET log_statement = 'all';
ALTER DATABASE inside_sales_pipeline SET log_duration = on;
```

### Monitor Slow Queries

```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Analyze Query Plans

```sql
EXPLAIN ANALYZE
SELECT * FROM leads 
WHERE metadata @> '{"utm_source": "linkedin"}';
```

---

## 8. Security Best Practices

1. **Never expose database credentials** in code
2. **Use environment variables** for all sensitive data
3. **Implement rate limiting** on all API endpoints
4. **Validate all input** before database queries
5. **Use parameterized queries** to prevent SQL injection
6. **Implement proper authentication** (JWT, OAuth)
7. **Log all API access** for audit trails
8. **Encrypt sensitive data** in `metadata` if needed

---

## Next Steps

- ✅ Database setup complete
- ✅ API endpoints implemented
- ✅ Testing successful
- 🔲 Deploy to staging environment
- 🔲 Configure production webhooks
- 🔲 Set up monitoring (Datadog, New Relic, etc.)
- 🔲 Implement frontend UI
- 🔲 Train SDR team

For manager configuration and UI setup, see [Manager Configuration Guide](manager-guide.md).
