# Inside Sales Pipeline - Data Architecture

A comprehensive, scalable data structure for an Inside Sales pipeline system focused on high-quality, niche prospecting with configurable cadence automations.

---

## 🎯 Overview

This project provides a **complete database schema and API specification** for building a minimalist Inside Sales pipeline interface. The system is designed to:

- ✅ Support **high-quality lead management** with flexible metadata
- ✅ Enable **dynamic pipeline columns** configurable by managers
- ✅ Provide **workflow automation** triggered by drag-and-drop movements
- ✅ Offer **template-based messaging** with placeholder support
- ✅ Track **complete audit trails** for analytics and compliance
- ✅ Scale from **startup to enterprise** with PostgreSQL

---

## 📁 Project Structure

```
inside-sales-pipeline/
├── database/
│   ├── schema.sql           # Complete PostgreSQL schema
│   └── seed-data.sql        # Sample data for testing
├── docs/
│   ├── api-contracts.md     # REST API specifications
│   ├── environment-guide.md # Environment & Port configuration
│   ├── production-guide.md  # Production Server & Deploy guide
│   ├── erd.md              # Entity Relationship Diagram
│   ├── integration-guide.md # Developer setup guide
│   └── manager-guide.md     # Manager configuration guide
├── PROJECT_GUIDE.md        # Quick Setup & Deploy Entry Point
└── README.md               # This file
```

---

## 🚀 Quick Start

### Prerequisites

- PostgreSQL 14+
- Node.js 18+ or Python 3.9+ (for API implementation)
- Basic SQL knowledge

### 1. Create Database & Environment

```bash
# Clone the repository
git clone https://github.com/obarqueirocaronte/Laranjinha_npx.git
cd Laranjinha_npx

# Install dependencies
npm install

# Setup your environment variables (Copy example)
cp .env.example .env

# -> CRITICAL: Edit your .env file and insert your PostgreSQL URL <-
# DATABASE_URL=postgresql://user:pass@host:port/dbname
```

### 2. Run Migrations & Setup

We created an automated setup script that creates the core schema from scratch and runs all subsequent migrations correctly.

```bash
# Run complete database setup and migrations
npm run db:setup
```

### 3. Verify Installation

```sql
-- Connect to database
psql -d inside_sales_pipeline

-- Check tables
\dt

-- View sample pipeline columns
SELECT name, position FROM pipeline_columns ORDER BY position;

-- View sample leads
SELECT full_name, company_name, email FROM leads LIMIT 5;
```

### 3. Next Steps

- **Developers**: See [Integration Guide](docs/integration-guide.md) for API implementation
- **Managers**: See [Manager Guide](docs/manager-guide.md) for configuration
- **Architects**: See [ERD Documentation](docs/erd.md) for schema details

---

## 🏗️ Architecture Highlights

### Core Entities

```mermaid
graph LR
    A[Lead] --> B[Pipeline Column]
    A --> C[SDR]
    A --> D[Interactions Log]
    A --> E[Pipeline History]
    B --> F[Workflow Triggers]
    F --> G[Templates]
```

### Key Features

#### 1. Flexible Lead Metadata (JSONB)

Store any data from external sources without schema changes:

```json
{
  "utm_source": "linkedin",
  "utm_campaign": "tech_leaders_2024",
  "company_size": "50-200",
  "industry": "SaaS",
  "pain_point": "Team scalability",
  "custom_field": "any value"
}
```

#### 2. Dynamic Pipeline Columns

Managers can create new stages without code:

```sql
INSERT INTO pipeline_columns (name, position, color)
VALUES ('Demo Scheduled', 7, '#06B6D4');
```

#### 3. Workflow Automation

Trigger actions when leads move between columns:

- **SEND_TEMPLATE**: Display message template for SDR
- **WEBHOOK**: Notify external systems (CRM, Slack)
- **START_TIMER**: Schedule follow-up reminders
- **UPDATE_STATUS**: Auto-update lead status

#### 4. Template System

Personalized messages with placeholders:

```
Olá {{first_name}},

Meu nome é {{sdr_name}} e trabalho com {{company_name}}.

Notei que você é {{job_title}} e acredito que podemos ajudar...
```

#### 5. Complete Audit Trail

Every interaction and movement is logged:
- Who moved the lead
- When it was moved
- How long it stayed in each column
- What messages were sent
- Engagement metrics (opened, clicked, replied)

---

## 📊 Database Schema

### Main Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `leads` | Core lead entity | JSONB metadata, quality scoring, deduplication |
| `pipeline_columns` | Pipeline stages | Dynamic, reorderable, color-coded |
| `workflow_triggers` | Automation rules | Drag-and-drop triggered actions |
| `templates` | Message templates | Placeholder support, multi-category |
| `interactions_log` | Activity history | Complete audit trail, engagement tracking |
| `lead_pipeline_history` | Movement tracking | Time-in-stage analytics |
| `sdrs` | Sales reps | Lead assignment, performance tracking |
| `teams` | Team organization | Multi-team support |

### Performance Optimizations

- **UUID Primary Keys**: Global uniqueness, security
- **GIN Indexes**: Fast JSONB metadata queries
- **Full-Text Search**: Portuguese language support
- **Automatic Triggers**: Movement logging, timestamp updates
- **Composite Indexes**: Optimized for common query patterns

---

## 🔌 API Endpoints

### Lead Management

```http
POST   /api/v1/leads/ingest          # Create new lead
GET    /api/v1/leads/:id              # Get lead details
POST   /api/v1/leads/:id/move         # Move between columns
```

### Pipeline

```http
GET    /api/v1/pipeline/columns       # List all columns
```

### Templates

```http
GET    /api/v1/templates               # List templates
POST   /api/v1/templates/:id/render   # Render with placeholders
```

### Interactions

```http
POST   /api/v1/interactions           # Log interaction
```

### Analytics

```http
GET    /api/v1/analytics/pipeline-metrics  # Performance metrics
```

See [API Contracts](docs/api-contracts.md) for complete documentation.

---

## 🎨 Example Use Cases

### Use Case 1: Lead Ingestion from Form

```bash
curl -X POST /api/v1/leads/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Maria Silva",
    "company_name": "Tech Solutions",
    "job_title": "CTO",
    "email": "maria@techsolutions.com",
    "metadata": {
      "utm_source": "linkedin",
      "company_size": "50-200"
    }
  }'
```

**Result:**
- Lead created in "Leads" column
- Automatically assigned to SDR (Round Robin)
- Deduplication check performed

### Use Case 2: Drag-and-Drop Automation

**Scenario:** SDR drags lead from "Leads" to "WhatsApp"

**What Happens:**
1. Lead's `current_column_id` updated
2. Movement logged in `lead_pipeline_history`
3. Workflow trigger detected
4. WhatsApp template displayed for SDR approval
5. SDR edits and sends message
6. Interaction logged with content snapshot

### Use Case 3: Analytics Query

**Question:** What's our average time-to-qualify?

```sql
SELECT 
  AVG(time_in_previous_column_seconds) / 3600 as avg_hours
FROM lead_pipeline_history
WHERE to_column_id = (SELECT id FROM pipeline_columns WHERE name = 'Qualified')
  AND moved_at >= NOW() - INTERVAL '30 days';
```

---

## 🔧 Configuration Examples

### Add New Pipeline Column

```sql
INSERT INTO pipeline_columns (name, description, position, color)
VALUES ('Proposal Sent', 'Awaiting proposal review', 8, '#8B5CF6');
```

### Create Workflow Trigger

```sql
INSERT INTO workflow_triggers (
  name, from_column_id, to_column_id, action_type, template_id
) VALUES (
  'Send WhatsApp on Move',
  (SELECT id FROM pipeline_columns WHERE name = 'Leads'),
  (SELECT id FROM pipeline_columns WHERE name = 'WhatsApp'),
  'SEND_TEMPLATE',
  (SELECT id FROM templates WHERE name = 'Primeiro Contato - WhatsApp')
);
```

### Create Message Template

```sql
INSERT INTO templates (name, category, content)
VALUES (
  'Follow-Up WhatsApp',
  'WHATSAPP',
  'Oi {{first_name}}! 👋

Conseguiu dar uma olhada na proposta que enviei?

Qualquer dúvida, estou à disposição!

{{sdr_name}}'
);
```

---

## 📈 Analytics & Metrics

### Key Performance Indicators

- **Conversion Rate**: % of leads that reach "Qualified"
- **Time-to-Qualify**: Average hours from creation to qualification
- **Pipeline Velocity**: Average time in each column
- **SDR Performance**: Conversion rate per SDR
- **Template Effectiveness**: Reply rate per template
- **Lead Source ROI**: Conversion by `metadata.utm_source`

### Sample Analytics Queries

See [Manager Guide - Analytics Section](docs/manager-guide.md#5-analytics--reporting) for complete queries.

---

## 🔒 Security & Compliance

### Data Privacy

- **LGPD/GDPR Ready**: Right to deletion, data export
- **Anonymization**: PII removal while preserving analytics
- **Retention Policies**: Automatic archiving of old leads
- **Audit Logs**: Complete history of all changes

### Best Practices

- ✅ Use environment variables for credentials
- ✅ Implement rate limiting on API endpoints
- ✅ Validate all input before database queries
- ✅ Use parameterized queries (prevent SQL injection)
- ✅ Encrypt sensitive metadata fields
- ✅ Implement role-based access control

---

## 🚦 Deduplication Strategy

### Email-Based Deduplication (Default)

1. Check if email exists
2. If yes: Update metadata, return existing lead_id
3. If no: Create new lead

### External ID Deduplication

For leads from external systems:

```json
{
  "external_id": "CRM_12345",
  "email": "contact@example.com"
}
```

System checks both `email` AND `external_id` to prevent duplicates.

---

## 🎯 Lead Distribution

### Round Robin (Default)

Leads distributed evenly among active SDRs:

```sql
SELECT id FROM sdrs 
WHERE is_active = true 
ORDER BY total_leads_assigned ASC 
LIMIT 1;
```

### Future Strategies

- **Weighted**: More leads to top performers
- **Territory**: Based on location/industry
- **Skill-Based**: Match lead characteristics to SDR expertise

See [Manager Guide](docs/manager-guide.md#4-lead-distribution-configuration) for details.

---

## 📚 Documentation

| Document | Audience | Purpose |
|----------|----------|---------|
| [API Contracts](docs/api-contracts.md) | Developers | REST API specifications |
| [ERD](docs/erd.md) | Architects | Database schema details |
| [Integration Guide](docs/integration-guide.md) | Developers | Setup and implementation |
| [Manager Guide](docs/manager-guide.md) | Managers | Configuration and usage |

---

## 🛠️ Technology Stack

- **Database**: PostgreSQL 14+ (JSONB, GIN indexes, triggers)
- **API**: Framework-agnostic (Node.js, Python, etc.)
- **Authentication**: JWT or API keys (implementation-specific)
- **Integrations**: Webhooks for CRM, Slack, email, WhatsApp

---

## 🔮 Future Enhancements

- [ ] Manager UI for no-code configuration
- [ ] A/B testing for templates
- [ ] AI-powered lead scoring
- [ ] Predictive analytics (time-to-convert)
- [ ] Multi-language template support
- [ ] Advanced workflow conditions (if/then/else)
- [ ] Integration marketplace (Zapier, Make, etc.)
- [ ] Mobile app for SDRs

---

## 📝 Sample Data

The project includes comprehensive seed data:

- **2 Teams** (Outbound Team A & B)
- **4 SDRs** (Ana, Bruno, Carla, Daniel)
- **6 Pipeline Columns** (Leads → Qualified → Lost)
- **6 Templates** (Email, WhatsApp, Call Scripts, LinkedIn)
- **4 Workflow Triggers** (Automation examples)
- **5 Sample Leads** (Varied quality scores and metadata)

Load with:
```bash
psql -d inside_sales_pipeline -f database/seed-data.sql
```

---

## 🤝 Contributing

This is a data architecture project. Contributions welcome for:

- Additional workflow trigger types
- Performance optimization queries
- Integration examples (Python, Ruby, Go, etc.)
- Analytics dashboard queries
- Documentation improvements

---

## 📄 License

This project is provided as-is for educational and commercial use.

---

## 🆘 Support

- **Technical Issues**: See [Integration Guide](docs/integration-guide.md#6-common-issues--troubleshooting)
- **Configuration Help**: See [Manager Guide](docs/manager-guide.md)
- **Schema Questions**: See [ERD Documentation](docs/erd.md)

---

## 🎉 Getting Started Checklist

- [ ] PostgreSQL 14+ installed
- [ ] Database created
- [ ] Schema loaded (`schema.sql`)
- [ ] Seed data loaded (optional)
- [ ] Environment variables configured
- [ ] API server connected to database
- [ ] First test lead created via API
- [ ] Deduplication tested
- [ ] Workflow trigger tested
- [ ] Template rendering tested

**Next:** Build your frontend UI or integrate with existing systems!

---

**Built with ❤️ for high-performance Inside Sales teams**
