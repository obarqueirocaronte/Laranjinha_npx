const cron = require('node-cron');
const axios = require('axios');
const statsService = require('./stats.service');

class NotificationSchedulerService {
    constructor() {
        this.task = null;
    }

    /**
     * Start the scheduler.
     * Checks every minute if it's time to send a report.
     */
    start() {
        console.log('🚀 Starting Management Report Scheduler...');

        // Run every minute: * * * * *
        this.task = cron.schedule('* * * * *', async () => {
            await this.checkAndSendReports();
        });
    }

    /**
     * Core logic to check schedules and send to Mattermost.
     */
    async checkAndSendReports() {
        try {
            const config = await statsService.getReportConfig();
            if (!config || !config.is_active || !config.webhook_url) return;

            const now = new Date();
            const currentTime = now.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });

            // Check if current time matches any scheduled time
            if (config.schedule_times.includes(currentTime)) {
                console.log(`⏰ Schedule matched: ${currentTime}. Sending report...`);
                await this.sendManagementReport(config.webhook_url);
            }
        } catch (error) {
            console.error('❌ Error in NotificationScheduler:', error);
        }
    }

    /**
     * Formats and sends the "Liquid Glass" style report via Message Attachments
     */
    async sendManagementReport(webhookUrl, sdrIds = []) {
        try {
            const stats = await statsService.getGlobalStats('all', sdrIds);
            const { summary, columns, sdrs } = stats;

            const message = this.buildLiquidGlassMessage(summary, columns, sdrs);

            await axios.post(webhookUrl, message);

            // Get current config to preserve Webhook and other fields
            const currentConfig = await statsService.getReportConfig();
            await statsService.updateReportConfig({
                ...currentConfig,
                last_sent_at: new Date()
            });

            console.log('✅ Management report sent successfully to Mattermost.');
        } catch (error) {
            console.error('❌ Failed to send Mattermost report:', error.message);
        }
    }

    /**
     * Builds the Mattermost payload using attachments with colors.
     */
    buildLiquidGlassMessage(summary, columns, sdrs) {
        const dateStr = new Date().toLocaleDateString('pt-BR');
        const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const mainText = `### 🍊 **Resumo de Gestão - Laranjinha**\n*Auditoria gerada em ${dateStr} às ${timeStr}*`;
        const attachments = [];

        // 1. Visão Geral (using fields instead of text for better UX layout)
        attachments.push({
            color: '#f97316', // Laranja
            fallback: 'Visão Geral da Produtividade',
            title: '📊 Visão Geral e Volumetria',
            text: 'Monitoramento automatizado do fluxo de funil e engajamento.',
            fields: [
                {
                    short: true,
                    title: 'Cadências Finalizadas',
                    value: `**${summary.total_completed || 0}** leads`
                },
                {
                    short: true,
                    title: 'Cadências Pendentes',
                    value: `**${summary.total_pending || 0}** leads`
                }
            ],
            actions: [
                {
                    id: "status_geral",
                    name: (summary.total_pending || 0) > 100 ? "⚠️ ALTA DEMANDA PENDENTE" : "✅ DEMANDA CONTROLADA",
                    type: "button",
                    style: (summary.total_pending || 0) > 100 ? "danger" : "success",
                    integration: { url: "http://localhost", context: {} }
                }
            ]
        });

        // 2. Quadro de Produtividade Individual (Tabela)
        if (sdrs && sdrs.length > 0) {
            let sdrText = `| SDR | Resumo de Atividades (Real / Meta) | Movimentações | Tratativa |\n`;
            sdrText += `| :--- | :--- | :---: | :---: |\n`;

            let stars = [];
            let lows = [];

            sdrs.forEach(sdr => {
                const signal = this.calculateProductivitySignal(sdr);
                let tratativaPct = 0;
                if (sdr.total_leads_assigned > 0) {
                    const treated = sdr.total_leads_assigned - sdr.pending_leads;
                    tratativaPct = Math.round((treated / sdr.total_leads_assigned) * 100);
                }

                const totalGoals = (sdr.goal_calls || 50) + (sdr.goal_whatsapp || 30) + (sdr.goal_emails || 20);
                const totalAchieved = (sdr.calls || 0) + (sdr.whatsapp || 0) + (sdr.emails || 0);
                const ratio = totalGoals > 0 ? (totalAchieved / totalGoals) : 0;

                if (ratio >= 1.0) stars.push(sdr.full_name);
                else if (ratio < 0.4) lows.push(sdr.full_name);

                const formatGoals = (val, goal) => `**${val}**/${goal || 0}`;

                sdrText += `| ${signal} **${sdr.full_name}** | 📞 ${formatGoals(sdr.calls, sdr.goal_calls)} • 💬 ${formatGoals(sdr.whatsapp, sdr.goal_whatsapp)} • 📧 ${formatGoals(sdr.emails, sdr.goal_emails)} | **${sdr.pipeline_movements || 0}** | **${tratativaPct}%** |\n`;
            });

            attachments.push({
                color: '#10b981', // Verde
                fallback: 'Auditoria de SDRs',
                title: '👥 Controles por SDR',
                text: sdrText
            });

            // 3. Zona de Feedback Inteligente
            let feedbackActions = [];
            let feedbackText = ``;

            let mapped = sdrs.map(s => {
                const totalGoals = (s.goal_calls || 50) + (s.goal_whatsapp || 30) + (s.goal_emails || 20);
                const totalAchieved = (s.calls || 0) + (s.whatsapp || 0) + (s.emails || 0);
                const ratio = totalGoals > 0 ? (totalAchieved / totalGoals) : 0;
                return { ...s, ratio };
            });

            const mostLeads = [...mapped].sort((a, b) => (b.total_leads_assigned || 0) - (a.total_leads_assigned || 0))[0];
            const bestTratativa = [...mapped].sort((a, b) => {
                const calc = s => s.total_leads_assigned ? ((s.total_leads_assigned - (s.pending_leads || 0)) / s.total_leads_assigned) : 0;
                return calc(b) - calc(a);
            })[0];

            if (stars.length > 0) {
                feedbackText += `* 🟢 **${stars.join(', ')}** atingiram/superaram a meta!\n`;
                feedbackActions.push({
                    id: "destaque_positivo",
                    name: "🏆 DESTAQUE: " + stars[0],
                    type: "button",
                    style: "success",
                    integration: { url: "http://localhost", context: {} }
                });
            }
            if (lows.length > 0) {
                feedbackText += `* 🔴 **${lows.join(', ')}** estão com o ritmo abaixo do esperado no momento.\n`;
                feedbackActions.push({
                    id: "alerta_negativo",
                    name: "⚠️ ATENÇÃO: " + lows[0],
                    type: "button",
                    style: "danger",
                    integration: { url: "http://localhost", context: {} }
                });
            }
            if (stars.length === 0 && lows.length === 0) {
                feedbackText += `* 🟡 A equipe está operando de forma equilibrada.\n`;
                feedbackActions.push({
                    id: "eq",
                    name: "⚪ RITMO EQUILIBRADO",
                    type: "button",
                    style: "primary",
                    integration: { url: "http://localhost", context: {} }
                });
            }

            if (mostLeads && mostLeads.total_leads_assigned > 0) {
                feedbackText += `* 📈 **${mostLeads.full_name}** possui o maior volume (${mostLeads.total_leads_assigned} leads).\n`;
            }
            if (bestTratativa && bestTratativa.total_leads_assigned > 0) {
                const calc = s => s.total_leads_assigned ? ((s.total_leads_assigned - (s.pending_leads || 0)) / s.total_leads_assigned) * 100 : 0;
                feedbackText += `* ⚡ **${bestTratativa.full_name}** lidera conversão/tratativa (${Math.round(calc(bestTratativa))}%).\n`;
            }

            attachments.push({
                color: '#f59e0b', // Âmbar
                fallback: 'Auditoria e Feedback Otimizado',
                title: '💡 Alertas e Prioridades',
                text: feedbackText,
                actions: feedbackActions
            });
        }

        // 4. Status do Kanban
        let pipelineText = '';
        columns.forEach(col => {
            const emoji = this.getColumnEmoji(col.name);
            pipelineText += `* ${emoji} **${col.name}**: \`${col.count} leads\`\n`;
        });

        attachments.push({
            color: '#3b82f6', // Azul
            fallback: 'Status do Pipeline',
            title: '🚀 Fluxo do Pipeline (Kanban)',
            text: pipelineText
        });

        return {
            username: 'Laranjinha Bot',
            icon_emoji: ':tangerine:',
            text: mainText,
            attachments: attachments
        };
    }


    /**
     * Calculates a productivity signal based on goal achievement.
     */
    calculateProductivitySignal(sdr) {
        const totalGoals = (sdr.goal_calls || 50) + (sdr.goal_whatsapp || 30) + (sdr.goal_emails || 20);
        const totalAchieved = (sdr.calls || 0) + (sdr.whatsapp || 0) + (sdr.emails || 0);

        if (totalGoals === 0) return '⚪';

        const ratio = totalAchieved / totalGoals;

        if (ratio >= 1.0) return '✅'; // Meta atingida
        if (ratio >= 0.7) return '🟢'; // Ótimo desempenho
        if (ratio >= 0.4) return '🟡'; // Em evolução
        return '🔴'; // Abaixo do esperado
    }

    generateAiFeedback(sdrs) {
        if (!sdrs || sdrs.length === 0) return "> Nenhum SDR ativo encontrado.";

        // Ratios
        let mapped = sdrs.map(s => {
            const totalGoals = (s.goal_calls || 50) + (s.goal_whatsapp || 30) + (s.goal_emails || 20);
            const totalAchieved = (s.calls || 0) + (s.whatsapp || 0) + (s.emails || 0);
            const ratio = totalGoals > 0 ? (totalAchieved / totalGoals) : 0;
            return { ...s, ratio };
        });

        // 1. Quem recebeu mais leads
        const mostLeads = [...mapped].sort((a, b) => (b.total_leads_assigned || 0) - (a.total_leads_assigned || 0))[0];

        // 2. Quem tratou mais leads (%)
        const bestTratativa = [...mapped].sort((a, b) => {
            const calc = s => s.total_leads_assigned ? ((s.total_leads_assigned - (s.pending_leads || 0)) / s.total_leads_assigned) : 0;
            return calc(b) - calc(a);
        })[0];

        // 3. Destaca os bons, avisa os abaixo
        const stars = mapped.filter(s => s.ratio >= 1.0);
        const low = mapped.filter(s => s.ratio < 0.4);

        let feedbackText = "";

        if (stars.length > 0) {
            feedbackText += `🏆 Parabéns para **${stars.map(s => s.full_name).join(', ')}** por estarem acima da meta! `;
        }
        if (low.length > 0) {
            feedbackText += `⚠️ Atenção para **${low.map(s => s.full_name).join(', ')}**, a produtividade no momento está abaixo do ritmo esperado hoje. `;
        }
        if (stars.length === 0 && low.length === 0) {
            feedbackText += `A equipe está caminhando com resultados parecidos e equilibrados. `;
        }

        if (mostLeads && mostLeads.total_leads_assigned > 0) {
            feedbackText += `\n\n📈 **${mostLeads.full_name}** recebeu o maior volume de leads na base (${mostLeads.total_leads_assigned}). `;
        }

        if (bestTratativa && bestTratativa.total_leads_assigned > 0) {
            const calc = s => s.total_leads_assigned ? ((s.total_leads_assigned - (s.pending_leads || 0)) / s.total_leads_assigned) * 100 : 0;
            feedbackText += `⚡ **${bestTratativa.full_name}** é destaque na taxa de conversão (tratativa) com ${Math.round(calc(bestTratativa))}% dos leads abordados.`;
        } else {
            feedbackText += `⚡ Ainda sem taxas de tratativa consistentes hoje.`;
        }

        return `> ${feedbackText.trim()}`;
    }

    getColumnEmoji(name) {
        const map = {
            'Leads': '📥',
            'Call': '📞',
            'WhatsApp': '💬',
            'Email': '📧',
            'Qualified': '🔥',
            'Lost': '❄️'
        };
        return map[name] || '📍';
    }
}

module.exports = new NotificationSchedulerService();
