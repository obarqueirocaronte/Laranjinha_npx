# API Contracts - Inside Sales Pipeline

This document defines the API contracts for the Inside Sales Pipeline system, focusing on lead ingestion, pipeline management, and template/messaging operations.

---

## Base URL

```
https://api.yourdomain.com/api/v1
```

## Authentication

All API requests require authentication via Bearer token:

```http
Authorization: Bearer <your_api_token>
```

---

## 1. Lead Ingestion API

### POST /leads/ingest

Receives new leads from external sources (forms, CRMs, webheets, etc.) with automatic deduplication and SDR assignment.

#### Request Body

```json
{
  "external_id": "FORM_2024_567",
  "full_name": "Ana Carolina Souza",
  "company_name": "Tech Solutions Brasil",
  "job_title": "Head of Engineering",
  "email": "ana.souza@techsolutions.com.br",
  "phone": "+5511987654321",
  "linkedin_url": "https://linkedin.com/in/anasouza",
  "metadata": {
    "utm_source": "linkedin",
    "utm_campaign": "tech_leaders_2024",
    "utm_medium": "sponsored",
    "company_size": "50-200",
    "industry": "SaaS",
    "pain_point": "Team scalability",
    "budget_range": "high",
    "form_responses": {
      "interested_in": "Enterprise plan",
      "timeline": "Next quarter"
    }
  }
}
```

#### Field Validation

| Field | Required | Validation |
|-------|----------|------------|
| `external_id` | No | Max 255 chars, unique if provided |
| `full_name` | **Yes** | Max 255 chars |
| `company_name` | No | Max 255 chars |
| `job_title` | No | Max 255 chars |
| `email` | **Yes** | Valid email format, unique |
| `phone` | No | E.164 format recommended |
| `linkedin_url` | No | Valid URL |
| `metadata` | No | Valid JSON object |

#### Success Response (201 Created)

```json
{
  "success": true,
  "data": {
    "lead_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "created",
    "assigned_to": {
      "sdr_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "sdr_name": "Ana Silva",
      "sdr_email": "ana.silva@company.com"
    },
    "current_column": {
      "id": "c0000001-0000-0000-0000-000000000001",
      "name": "Leads"
    },
    "created_at": "2024-02-04T19:20:00Z"
  }
}
```

#### Duplicate Detected Response (200 OK)

```json
{
  "success": true,
  "data": {
    "lead_id": "existing-lead-uuid",
    "status": "duplicate_updated",
    "message": "Lead already exists. Metadata updated.",
    "duplicate_field": "email",
    "assigned_to": {
      "sdr_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "sdr_name": "Ana Silva"
    },
    "updated_at": "2024-02-04T19:20:00Z"
  }
}
```

#### Error Response (400 Bad Request)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "full_name",
        "message": "This field is required"
      }
    ]
  }
}
```

---

## 2. Pipeline Management API

### GET /pipeline/columns

Retrieve all pipeline columns (stages) in order.

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "c0000001-0000-0000-0000-000000000001",
      "name": "Leads",
      "description": "New leads awaiting first contact",
      "position": 1,
      "color": "#94A3B8",
      "lead_count": 15,
      "is_active": true
    },
    {
      "id": "c0000002-0000-0000-0000-000000000002",
      "name": "Call",
      "description": "Leads scheduled or attempted for call",
      "position": 2,
      "color": "#3B82F6",
      "lead_count": 8,
      "is_active": true
    }
  ]
}
```

---

### POST /leads/:lead_id/move

Move a lead from one pipeline column to another, triggering configured workflow automations.

#### Request Body

```json
{
  "to_column_id": "c0000002-0000-0000-0000-000000000002",
  "notes": "Lead demonstrou interesse após email inicial"
}
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "lead_id": "l0000001-0000-0000-0000-000000000001",
    "from_column": {
      "id": "c0000001-0000-0000-0000-000000000001",
      "name": "Leads"
    },
    "to_column": {
      "id": "c0000002-0000-0000-0000-000000000002",
      "name": "Call"
    },
    "triggered_workflows": [
      {
        "workflow_id": "w0000001-0000-0000-0000-000000000001",
        "action_type": "SEND_TEMPLATE",
        "template_id": "t0000005-0000-0000-0000-000000000005",
        "template_name": "Script de Discovery Call",
        "status": "pending_confirmation"
      }
    ],
    "moved_at": "2024-02-04T19:25:00Z"
  }
}
```

---

### GET /leads/:lead_id

Retrieve complete lead details including history and interactions.

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "l0000001-0000-0000-0000-000000000001",
    "external_id": "FORM_2024_001",
    "full_name": "João Pedro Santos",
    "company_name": "TechCorp Brasil",
    "job_title": "CTO",
    "email": "joao.santos@techcorp.com.br",
    "phone": "+5511987654321",
    "linkedin_url": "https://linkedin.com/in/joaosantos",
    "quality_score": 95,
    "status": "active",
    "current_column": {
      "id": "c0000001-0000-0000-0000-000000000001",
      "name": "Leads"
    },
    "assigned_to": {
      "sdr_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "sdr_name": "Ana Silva",
      "sdr_email": "ana.silva@company.com"
    },
    "metadata": {
      "utm_source": "linkedin",
      "utm_campaign": "saas_cto_2024",
      "company_size": "50-200",
      "industry": "SaaS"
    },
    "created_at": "2024-02-04T10:00:00Z",
    "updated_at": "2024-02-04T19:20:00Z",
    "last_interaction_at": "2024-02-04T15:30:00Z"
  }
}
```

---

## 3. Templates & Messaging API

### GET /templates

Retrieve all available templates, optionally filtered by category.

#### Query Parameters

- `category` (optional): Filter by category (EMAIL, WHATSAPP, CALL_SCRIPT, LINKEDIN)
- `is_active` (optional): Filter by active status (true/false)

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "t0000001-0000-0000-0000-000000000001",
      "name": "Primeiro Contato - Email",
      "category": "EMAIL",
      "subject": "Olá {{first_name}}, vamos conversar sobre {{company_name}}?",
      "content": "Olá {{first_name}},\n\nMeu nome é {{sdr_name}}...",
      "placeholders": [
        "first_name",
        "company_name",
        "job_title",
        "sdr_name",
        "sdr_phone",
        "value_proposition"
      ],
      "usage_count": 127,
      "is_active": true
    }
  ]
}
```

---

### POST /templates/:template_id/render

Render a template with lead-specific data (placeholder replacement).

#### Request Body

```json
{
  "lead_id": "l0000001-0000-0000-0000-000000000001",
  "custom_placeholders": {
    "value_proposition": "otimizar seus processos de vendas",
    "calendar_link": "https://calendly.com/ana-silva"
  }
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "template_id": "t0000001-0000-0000-0000-000000000001",
    "rendered_subject": "Olá João Pedro, vamos conversar sobre TechCorp Brasil?",
    "rendered_content": "Olá João Pedro,\n\nMeu nome é Ana Silva e trabalho com soluções para empresas como a TechCorp Brasil.\n\nNotei que você atua como CTO e acredito que podemos ajudar a otimizar seus processos de vendas.\n\nVocê teria 15 minutos esta semana para uma conversa rápida?\n\nAbraços,\nAna Silva\n+5511999999001",
    "placeholders_used": {
      "first_name": "João Pedro",
      "company_name": "TechCorp Brasil",
      "job_title": "CTO",
      "sdr_name": "Ana Silva",
      "sdr_phone": "+5511999999001",
      "value_proposition": "otimizar seus processos de vendas"
    }
  }
}
```

---

### POST /interactions

Log an interaction (email sent, call made, WhatsApp message, etc.).

#### Request Body

```json
{
  "lead_id": "l0000001-0000-0000-0000-000000000001",
  "action_type": "EMAIL_SENT",
  "template_id": "t0000001-0000-0000-0000-000000000001",
  "content_snapshot": "Olá João Pedro,\n\nMeu nome é Ana Silva...",
  "metadata": {
    "email_id": "msg_abc123",
    "sent_via": "gmail_api",
    "scheduled_for": null
  }
}
```

#### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "interaction_id": "i0000001-0000-0000-0000-000000000001",
    "lead_id": "l0000001-0000-0000-0000-000000000001",
    "action_type": "EMAIL_SENT",
    "created_at": "2024-02-04T19:30:00Z"
  }
}
```

---

## 4. Analytics & Reporting API

### GET /analytics/pipeline-metrics

Get pipeline performance metrics.

#### Query Parameters

- `start_date` (required): ISO 8601 date
- `end_date` (required): ISO 8601 date
- `sdr_id` (optional): Filter by specific SDR
- `team_id` (optional): Filter by team

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "period": {
      "start_date": "2024-02-01",
      "end_date": "2024-02-04"
    },
    "metrics": {
      "total_leads_created": 45,
      "leads_qualified": 12,
      "conversion_rate": 26.67,
      "average_time_to_qualify_hours": 48.5,
      "by_column": [
        {
          "column_name": "Leads",
          "current_count": 15,
          "average_time_hours": 12.3
        },
        {
          "column_name": "Call",
          "current_count": 8,
          "average_time_hours": 24.7
        }
      ],
      "by_sdr": [
        {
          "sdr_name": "Ana Silva",
          "leads_assigned": 18,
          "leads_qualified": 5,
          "conversion_rate": 27.78
        }
      ]
    }
  }
}
```

---

## Deduplication Logic

The system implements the following deduplication strategy:

1. **Check by Email**: If a lead with the same email exists:
   - **Action**: Update the existing lead's metadata (merge new data)
   - **Response**: Return existing lead_id with `status: "duplicate_updated"`

2. **Check by External ID**: If `external_id` is provided and exists:
   - **Action**: Update metadata if email is different
   - **Response**: Return existing lead_id with warning

3. **No Duplicates Found**:
   - **Action**: Create new lead
   - **Response**: Return new lead_id with `status: "created"`

### Deduplication Configuration

Future versions will support configurable deduplication rules via Manager UI:
- Strict mode (reject all duplicates)
- Update mode (merge metadata)
- Create linked mode (create new lead with reference to original)

---

## Lead Distribution Logic

### Round Robin (Default)

Leads are distributed evenly among active SDRs in the team:

1. Query all active SDRs ordered by `total_leads_assigned` ASC
2. Assign lead to SDR with lowest count
3. Increment SDR's `total_leads_assigned` counter
4. Update `last_lead_assigned_at` timestamp

### Future Distribution Methods

- **Weighted**: Based on SDR performance metrics
- **Territory**: Based on company location or industry
- **Manual**: Manager assigns leads directly
- **Skill-based**: Match lead characteristics to SDR expertise

---

## Webhook Events

The system can send webhooks for key events:

### Event: `lead.created`

```json
{
  "event": "lead.created",
  "timestamp": "2024-02-04T19:30:00Z",
  "data": {
    "lead_id": "l0000001-0000-0000-0000-000000000001",
    "email": "joao.santos@techcorp.com.br",
    "assigned_sdr_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
  }
}
```

### Event: `lead.qualified`

```json
{
  "event": "lead.qualified",
  "timestamp": "2024-02-04T20:00:00Z",
  "data": {
    "lead_id": "l0000001-0000-0000-0000-000000000001",
    "qualified_by_sdr_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "time_to_qualify_hours": 48.5
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `DUPLICATE_LEAD` | 409 | Lead already exists (strict mode) |
| `LEAD_NOT_FOUND` | 404 | Lead ID not found |
| `TEMPLATE_NOT_FOUND` | 404 | Template ID not found |
| `UNAUTHORIZED` | 401 | Invalid or missing API token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

- **Lead Ingestion**: 100 requests/minute per API key
- **Pipeline Operations**: 200 requests/minute per API key
- **Analytics**: 20 requests/minute per API key

Exceeded limits return HTTP 429 with:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 60 seconds.",
    "retry_after": 60
  }
}
```
