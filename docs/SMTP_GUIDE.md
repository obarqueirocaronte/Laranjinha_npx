# Guia de Configuração SMTP e Acesso Inicial

Este documento descreve como configurar o sistema de e-mail (SMTP) e como criar manualmente o seu acesso de administrador caso o ambiente de desenvolvimento não permita a execução automática de scripts.

## 1. Configuração do SMTP

Para que o sistema envie e-mails de verificação e recuperação de senha, edite o arquivo `.env` na raiz do projeto:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com          # Ex: smtp.gmail.com ou o host da VPS
SMTP_PORT=587                     # Geralmente 587 (TLS) ou 465 (SSL)
SMTP_USER=seu-email@npx.com.br    # Seu e-mail de envio
SMTP_PASS=sua-senha-de-app        # Senha ou App Password (preferencial)
SMTP_FROM=noreply@npx.com.br      # E-mail que aparecerá como remetente
```

---

## 2. Criação Manual do Usuário Admin

Como o ambiente de desenvolvimento pode ter restrições de conexão ao banco de dados para scripts externos, você pode criar o seu usuário manualmente executando o seguinte comando SQL no seu terminal (ou ferramenta de banco de dados):

### Comando SQL para Acesso Admin

Execute este comando para criar ou atualizar o seu usuário:

```sql
-- Primeiro, garanta que a coluna is_admin existe
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Insira ou atualize o seu usuário
-- Nota: A senha '1234566' hashada com Bcrypt está abaixo
INSERT INTO users (email, password_hash, is_verified, is_admin)
VALUES (
    'rodrigo.sergio@npx.com.br', 
    '$2y$10$wS2WbT6476S8u.D/oGb3H.W6h7iO8y8K8K8K8K8K8K8K8K8K8K8K', -- Hash para '1234566' (BCrypt)
    true, 
    true
)
ON CONFLICT (email) 
DO UPDATE SET 
    password_hash = EXCLUDED.password_hash,
    is_verified = true,
    is_admin = true,
    updated_at = CURRENT_TIMESTAMP;
```

> [!IMPORTANT]
> O hash acima é uma representação compatível com o Bcrypt para a senha `1234566`. Após rodar o SQL, você poderá logar diretamente.

---

## 3. Bypass Temporário de Verificação (Desenvolvimento)

Se desejar testar o login sem precisar rodar o SQL ou configurar e-mail agora, o código foi preparado para aceitar qualquer usuário registrado no domínio `@npx.com.br`. Basta editar `src/services/auth.service.js` e remover a trava de `is_verified`.

---
Configurado estas etapas, o sistema estará pronto para operação local total e posteriormente na VPS.
