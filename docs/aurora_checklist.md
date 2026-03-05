# Checklist: Integração Aurora Chat (Campaigns/Templates)

Para que possamos plugar os disparos via **Aurora Chat** diretamente no arraste do Kanban (focando apenas na aba "Campaign"), precisamos configurar os acessos. Abaixo está o checklist de dados necessários:

---

## 🟢 Integração Aurora Chat (API V3)

Utilizaremos o modelo **Backend-Driven**. Quando o SDR mover um lead ou acionar um disparo, o servidor Node.js chamará a API Oficial do AuroraChat.

### ✅ Checklist: O que precisamos configurar no `.env`

- [x] **AURORA_API_URL:** A URL base da API (Configurado no `.env` como `AURORA_API_BASE_URL`).
- [x] **AURORA_ACCESS_TOKEN:** Token configurado no `.env` como `AURORA_API_TOKEN`.
- [ ] **AURORA_CAMPAIGN_ID_DEFAULT:** (Opcional) ID padrão da campanha para testes de disparos, caso os IDs não venham dinamicamente.

### 🔄 Fluxo de Disparo de Template:

1. **Arraste ou Seleção:** O SDR seleciona um template (da nossa aba Preview) ou arrasta o card para enviar.
2. **Request Interno:** O frontend dispara para a nossa rota local `POST /api/v1/aurora/send`.
3. **Trigger:** O backend identifica o `lead.phone`, localiza o `Aurora User ID` do SDR responsável e chama a API do Aurora: `POST /v3/campaigns/:id/messages` (ou `/sms`).
4. **Feedback:** A API do Aurora responde confirmando o disparo, e gravamos na `interactions_log`.

### ⚠️ Notas sobre a Lista de Templates
> Na documentação fornecida pelo Postman, **não há uma rota documentada para LIstar as Campanhas/Templates** (como por exemplo `GET /v3/campaigns`). Implementaremos a estrutura do nosso lado assumindo que seja essa a rota (ou deixaremos mockada no Frontend até termos a confirmação do endpoint correto para listagem).

---
**Próximos passos:**
Fornecer esse token único de acesso para adicionarmos ao arquivo `.env` seguro do backend.
