# Referência de API (Beta) - Inside Sales Pipeline

Esta referência foca nos endpoints essenciais para a operação do sistema Beta, incluindo gestão de leads e pipeline.

## 📡 Endpoints de Leads

### `POST /leads/ingest`
- **Descrição:** Ingestão de novos leads via fontes externas.
- **Campos Principais:** `full_name`, `email` (obrigatório), `company_name`, `job_title`.

### `GET /leads/:lead_id`
- **Descrição:** Recupera detalhes completos de um lead.

---

## 🛤 Endpoints de Pipeline

### `GET /pipeline/columns`
- **Descrição:** Lista todas as colunas (estágios) do pipeline.

### `POST /leads/:lead_id/move`
- **Descrição:** Move um lead para outra coluna, disparando automações simples se houver.
- **Payload:** `{ "to_column_id": "UUID", "notes": "Texto opcional" }`

---

## 📋 Regras de Cadência

### `GET /cadences`
- **Descrição:** Recupera as cadências configuradas no acesso manager.

### `POST /cadences/:id/apply`
- **Descrição:** Aplica uma cadência específica a um lote de leads selecionados.

---

## 🔐 Autenticação
- Todas as requisições requerem o Header `Authorization: Bearer <token>`.
- O token pode ser configurado nas variáveis de ambiente do backend.

---

## 🔍 Segmentação de Leads

### `GET /leads/segments`
- **Descrição:** Filtra leads com base em critérios dinâmicos para ações rápidas.
- **Parâmetros (Query):**
  - `type`: O tipo de critério (`status`, `tier`, `tag`, `company`).
  - `value`: O valor para filtrar.
- **Exemplo:** `GET /leads/segments?type=status&value=Novo`

---

## 🔌 Integrações (Webhooks)

### `POST /integrations/chat/webhook`
- **Descrição:** Endpoint para receber eventos do sistema de Chat interno.
- **Payload:**
  ```json
  {
    "event": "message_received",
    "data": { "lead_email": "...", "message": "..." }
  }
  ```

### `POST /integrations/pabx/webhook`
- **Descrição:** Endpoint para receber eventos do sistema de PABX.
- **Payload:**
  ```json
  {
    "call_id": "12345",
    "status": "completed",
    "duration": 120
  }
  ```
