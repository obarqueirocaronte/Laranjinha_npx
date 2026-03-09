const nodemailer = require('nodemailer');

/**
 * Email Service — Integração real via Nodemailer.
 * Utiliza variáveis de ambiente para configuração SMTP.
 */
class EmailService {
    constructor() {
        this.transporter = null;
        this.fromEmail = process.env.EMAIL_USER;
        this.fromName = process.env.EMAIL_FROM_NAME || 'Laranjinha System';
    }

    /**
     * Inicializa o transportador apenas se as credenciais existirem.
     */
    getTransporter() {
        if (!this.transporter) {
            if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
                throw new Error('Email Service não configurado (EMAIL_USER/EMAIL_PASS faltando no .env).');
            }

            this.transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.EMAIL_PORT) || 587,
                secure: process.env.EMAIL_PORT === '465',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
                connectionTimeout: 10000, // Timeout de conexão
                socketTimeout: 10000,
            });
        }
        return this.transporter;
    }

    async sendEmail(to, subject, html, text = '') {
        const transporter = this.getTransporter();

        try {
            const info = await transporter.sendMail({
                from: `"${this.fromName}" <${this.fromEmail}>`,
                to,
                subject,
                text: text || html.replace(/<[^>]*>?/gm, ''), // Fallback text
                html,
            });

            console.log(`[EmailService] Email enviado: ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('[EmailService] Erro ao enviar email:', error);
            throw error;
        }
    }

    /**
     * Envia o template específico de convite para novos colaboradores.
     */
    async sendInviteEmail(to, name, role, token) {
        const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;

        const subject = `Convite: Junte-se ao time da Laranjinha como ${role.toUpperCase()}`;

        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h2 style="color: #ff8c00;">Olá, ${name}!</h2>
                <p>Você foi convidado para participar do nosso sistema de Inside Sales <strong>Laranjinha</strong> como <strong>${role}</strong>.</p>
                <p>Para configurar seu acesso e começar a usar a plataforma, faça o login utilizando a sua conta Google corporativa vinculada a este e-mail:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${url}" style="background-color: #ff8c00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                        Entrar com Google
                    </a>
                </div>
                <p style="font-size: 0.9em; color: #666;">Se o botão não funcionar, copie este link:</p>
                <p style="font-size: 0.8em; color: #666; word-break: break-all;">${url}</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
                <p style="font-size: 0.8em; color: #999;">Este convite expira em 7 dias.</p>
            </div>
        `;

        return this.sendEmail(to, subject, html);
    }

    /**
     * Envia email de verificação de conta.
     */
    async sendVerificationEmail(to, token) {
        const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
        const subject = `Verifique seu Email - Laranjinha`;

        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h2 style="color: #ff8c00;">Bem-vindo à Laranjinha!</h2>
                <p>Por favor, confirme seu endereço de email clicando no botão abaixo:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${url}" style="background-color: #ff8c00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                        Verificar Email
                    </a>
                </div>
                <p style="font-size: 0.9em; color: #666;">Se o botão não funcionar, copie este link:</p>
                <p style="font-size: 0.8em; color: #666; word-break: break-all;">${url}</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
                <p style="font-size: 0.8em; color: #999;">Gratos,<br>Equipe Laranjinha</p>
            </div>
        `;

        return this.sendEmail(to, subject, html);
    }

    /**
     * Envia email de redefinição de senha.
     */
    async sendPasswordResetEmail(to, token) {
        const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
        const subject = `Redefinição de Senha - Laranjinha`;

        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h2 style="color: #ff8c00;">Redefinição de Senha</h2>
                <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
                <p>Se você não fez essa solicitação, pode ignorar este email.</p>
                <p>Para redefinir sua senha, clique no botão abaixo:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${url}" style="background-color: #ff8c00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                        Redefinir Senha
                    </a>
                </div>
                <p style="font-size: 0.9em; color: #666;">Se o botão não funcionar, copie este link:</p>
                <p style="font-size: 0.8em; color: #666; word-break: break-all;">${url}</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
                <p style="font-size: 0.8em; color: #999;">Este link expira em 1 hora.</p>
            </div>
        `;

        return this.sendEmail(to, subject, html);
    }
}

module.exports = new EmailService();
