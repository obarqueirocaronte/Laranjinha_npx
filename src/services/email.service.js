/**
 * Email Integration Stub Service
 * Prepara o terreno para no futuro conectarmos SMTP/SendGrid.
 */
class EmailService {
    async sendEmail(to, subject, body, options = {}) {
        console.log(`[EmailService] Simulando envio de email para ${to}`);
        console.log(`Assunto: ${subject}`);

        // TODO: Implementar integração com Nodemailer, AWS SES ou SendGrid aqui.
        return { success: true, messageId: `msg-${Date.now()}` };
    }
}

module.exports = new EmailService();
