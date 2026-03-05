const axios = require('axios');

/**
 * AI Service
 * Handles communication with OpenAI and external integrations like Mattermost.
 */
class AIService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.mattermostWebhook = process.env.MATTERMOST_WEBHOOK_URL;
        this.openaiUrl = 'https://api.openai.com/v1/chat/completions';
    }

    async structureLeads(leadsData) {
        if (!this.apiKey) throw new Error('OpenAI API Key not configured');

        const prompt = `
            Você é um especialista em estruturação de dados de CRM. 
            Recebi uma lista de leads brutos. Sua tarefa é analisar cada um e decidir qual é o melhor modelo de card no Kanban:
            1. "FULL": Possui nome, empresa, telefone, email e pelo menos mais um dado (LinkedIn ou CNPJ).
            2. "PHONE_ONLY": Possui telefone, mas falta email pessoal ou empresa.
            3. "EMAIL_ONLY": Possui email, mas falta telefone.
            4. "MINIMAL": Faltam dados críticos como telefone ou email.

            Além disso, limpe os nomes (Capitalize), normalize telefones e remova duplicatas óbvias.
            Retorne um JSON puro no formato:
            { "leads": [ { "id": "original_id", "suggested_model": "MODEL", "cleaned_data": { ... } } ] }

            Dados dos leads:
            ${JSON.stringify(leadsData.slice(0, 20))}
        `;

        const response = await axios.post(this.openaiUrl, {
            model: "gpt-4-turbo-preview",
            messages: [{ role: "system", content: "Você é um assistente de dados de alta precisão." }, { role: "user", content: prompt }],
            response_format: { type: "json_object" }
        }, {
            headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }
        });

        return JSON.parse(response.data.choices[0].message.content);
    }

    async analyzeSales(data, query) {
        if (!this.apiKey) throw new Error('OpenAI API Key not configured');

        const prompt = `
            Atue como um Líder e Expert em Vendas, Gestão de Prospecção e Demanda (SDR Manager / Head of Sales).
            Analise os seguintes dados do CRM:
            ${JSON.stringify(data)}

            Pergunta do Gestor: "${query}"

            Forneça uma análise objetiva, estratégica e com perspectivas de melhoria. 
            Use um tom profissional, inspirador e direto.
            Formate a resposta em Markdown com seções claras: 📈 Overview, 💡 Insights, 🎯 Próximos Passos.
        `;

        const response = await axios.post(this.openaiUrl, {
            model: "gpt-4-turbo-preview",
            messages: [{ role: "system", content: "Você é um Head of Sales experiente." }, { role: "user", content: prompt }]
        }, {
            headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }
        });

        return response.data.choices[0].message.content;
    }

    async exportToMattermost(content) {
        if (!this.mattermostWebhook) throw new Error('Mattermost Webhook not configured');

        await axios.post(this.mattermostWebhook, {
            text: `### 🤖 Relatório da IA - Inside Sales Hub\n\n${content}`,
            username: "IA Sales Assistant",
            icon_url: "https://openai.com/content/images/2023/12/OpenAI-Logo-Icon.png"
        });

        return { success: true };
    }

    /**
     * Normaliza um número de telefone brasileiro usando GPT-4.
     * Garante que o DDD tenha o zero inicial (ex: 085 em vez de 85),
     * remove hífens, parênteses e espaços, e retorna apenas os dígitos.
     * 
     * Fallback inteligente: se o GPT falhar, normaliza localmente.
     */
    async normalizePhone(rawPhone) {
        if (!rawPhone) return { success: false, normalized: rawPhone };

        // Fast local pre-normalization (strip non-digits, add leading 0 if DDD is missing)
        const localNormalized = this._normalizePhoneBR(rawPhone);

        if (!this.apiKey) {
            // No API key — return local normalization
            return { success: true, normalized: localNormalized, method: 'local' };
        }

        try {
            const prompt = `
Você é um especialista em telefonia brasileiro.
Normalize o número de telefone a seguir para uso em sistemas de VoIP (formato SIP):
- Remova TODOS os caracteres que não sejam dígitos (parênteses, hífens, espaços, pontos)
- Se o DDD tiver 2 dígitos e não começar com 0, adicione o 0 na frente (ex: 85 → 085)
- O número deve conter apenas dígitos, sem qualquer formatação
- Retorne APENAS um JSON: { "normalized": "<número_apenas_dígitos>" }

Número original: "${rawPhone}"
Número pré-processado localmente: "${localNormalized}"
`;

            const response = await axios.post(this.openaiUrl, {
                model: "gpt-4-turbo-preview",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" },
                max_tokens: 50
            }, {
                headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
                timeout: 5000
            });

            const result = JSON.parse(response.data.choices[0].message.content);
            const normalized = result.normalized || localNormalized;

            console.log(`[AI Normalize] ${rawPhone} → ${normalized}`);
            return { success: true, normalized, method: 'gpt' };
        } catch (err) {
            console.warn('[AI Normalize] GPT failed, using local normalization:', err.message);
            return { success: true, normalized: localNormalized, method: 'local_fallback' };
        }
    }

    /**
     * Normalização local de telefone brasileiro (sem API).
     * Regras:
     * 1. Remove tudo que não for dígito
     * 2. Remove prefixo internacional +55 ou 55 se presente
     * 3. Se o DDD (2 primeiros dígitos) não começa com 0, adiciona 0
     */
    _normalizePhoneBR(phone) {
        let digits = phone.replace(/\D/g, '');

        // Remove +55 or 55 country code prefix
        if (digits.startsWith('55') && digits.length >= 12) {
            digits = digits.substring(2);
        }

        // If starts with a 2-digit DDD without leading 0 (e.g. 85987662628 → 085987662628)
        // Brazilian DDDs are 2 digits: 11-99. If total is 10-11 digits without leading 0, add it.
        if (digits.length >= 10 && !digits.startsWith('0')) {
            digits = '0' + digits;
        }

        return digits;
    }

    /**
     * Envia uma notificação de "Nova Oportunidade" para o Mattermost.
     * Canal: NOVOS NEGOCIOS (via webhook configurado).
     */
    async exportOpportunity(lead, notes) {
        if (!this.mattermostWebhook) throw new Error('Mattermost Webhook not configured');

        const message = `
### 🎯 **Nova Oportunidade Detectada!** 🚀
Um SDR acaba de qualificar um lead para o canal de **NOVOS NEGÓCIOS**.

**Dados do Cliente:**
- **Nome:** ${lead.full_name}
- **Empresa:** ${lead.company_name || 'Não informada'}
- **Cargo:** ${lead.job_title || 'Não informado'}
- **Telefone:** ${lead.phone || 'N/A'}
- **E-mail:** ${lead.email}

**Resumo da Etapa e Interesse:**
> ${notes || 'Sem anotações adicionais.'}

---
*Enviado automaticamente pelo Sales Pipeline Bot*
`;

        await axios.post(this.mattermostWebhook, {
            text: message,
            username: "Oportunidade Bot",
            channel: "novos-negocios", // Tenta forçar o canal se o webhook permitir override
            icon_url: "https://cdn-icons-png.flaticon.com/512/1162/1162983.png"
        });

        return { success: true };
    }

    /**
     * Valida e normaliza telefones de leads em lote via GPT.
     * Instruções ajustadas conforme pedido do usuário para tratar CSVs.
     */
    async normalizePhonesBatch(leadsData) {
        if (!leadsData || leadsData.length === 0) return leadsData;

        // Se a chave da API não estiver configurada, faz o fallback rápido local
        if (!this.apiKey) {
            console.warn('[AI Batch Convert] Missing OpenAI API Key. Using local parser.');
            return leadsData.map(lead => ({
                ...lead,
                phone: lead.phone ? this._normalizePhoneBR(lead.phone) : lead.phone
            }));
        }

        try {
            // Separa apenas os IDs (email como chave) e phones originais
            const phonesToProcess = leadsData
                .filter(l => Boolean(l.phone))
                .map(l => ({ email: l.email, phone: l.phone }));

            if (phonesToProcess.length === 0) return leadsData;

            const prompt = `
Você é um avançado sistema de parsing de CRM focado em telefonia no Brasil.
Recebi uma lista de contatos sujos. Sua tarefa é analisar o array de contatos fornecido e retornar **SÓ um JSON estruturado** contendo o número normalizado ("normalized") para habilitar discagem VoIP (Zoiper/Linphone).

Regras absolutas de limpeza:
1. Remova espaços, parênteses, hífens, pontos e quaisquer letras ou caracteres especiais; sobram só DÍGITOS.
2. Remova os prefixos de país "+55" ou "55".
3. Validação do Código de Área (DDD): DDDs brasileiros têm 2 dígitos. Se o número possuir o DDD (e mais 8 ou 9 dígitos do telefone) mas NÃO começar com "0", você DEVE ADICIONAR o "0" no início de todos eles. Por exemplo, de "85999990000" para "085999990000".
4. Se faltar DDD e o número for obviamente apenas o número terminal (8 ou 9 dígitos), devolva-o como está. Mas números com 10 ou 11 dígitos PRECISAM necessariamente iniciar com 0.

Você deve devolver EXATAMENTE a mesma quantidade de objetos informados, no formato:
{
  "results": [
    { "email": "email-do-lead", "normalized": "numero_limpo" }
  ]
}

Dados (JSON):
${JSON.stringify(phonesToProcess)}
`;

            const response = await axios.post(this.openaiUrl, {
                model: "gpt-4-turbo-preview", // Pode usar gpt-3.5-turbo para economia, mas 4 lida melhor com json longo
                messages: [{ role: "system", content: "You are an automated data normalizer returning strictly JSON." }, { role: "user", content: prompt }],
                response_format: { type: "json_object" }
            }, {
                headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
                timeout: 30000 // Aumentado o timeout por ser processamento em lote
            });

            const parsedResult = JSON.parse(response.data.choices[0].message.content);
            const normalizedMap = new Map((parsedResult.results || []).map(r => [r.email, r.normalized]));

            // Reconstrói a array de leads substituindo o `phone` pelo normalizado
            return leadsData.map(lead => {
                if (!lead.phone) return lead;

                // Se a IA gerou o normalizado, usa; senão faz o fallback de segurança para esse lead específico
                const gptNormalized = normalizedMap.get(lead.email);
                return {
                    ...lead,
                    phone: gptNormalized || this._normalizePhoneBR(lead.phone)
                };
            });

        } catch (err) {
            console.error('[AI Batch Convert] Falha na conversão com GPT. Causando fallback local.', err.message);
            return leadsData.map(lead => ({
                ...lead,
                phone: lead.phone ? this._normalizePhoneBR(lead.phone) : lead.phone
            }));
        }
    }
}

module.exports = new AIService();
