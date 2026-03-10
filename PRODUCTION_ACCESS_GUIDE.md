# 🚀 Guia de Acesso e Manutenção - Produção (Laranjinha)

Este guia centraliza todas as informações necessárias para acessar, manter e atualizar o sistema no servidor de produção remoto.

---

## 🖥️ 1. Detalhes do Servidor (SSH)

O sistema está hospedado em um servidor Ubuntu 24.04 LTS.

- **Endereço (IP)**: `178.156.234.198`
- **Porta SSH**: `55535`
- **Usuário**: `rodrigo`
- **Senha**: `Esseanoemeu@2026`
- **Pasta do Projeto**: `/opt/laranjinha`

### Como conectar (Terminal):
```bash
ssh -p 55535 rodrigo@178.156.234.198
```

---

## 🌐 2. Link do Sistema
- **URL Pública**: [https://laranjinha.npx.com.br](https://laranjinha.npx.com.br)
- **Status**: Produção Ativa

---

## 🗄️ 3. Banco de Dados (PostgreSQL)

O banco de dados roda localmente no servidor de produção.

- **Nome do Banco**: `inside_sales_pipeline`
- **Dono**: `laranjinha`
- **Configuração**: Gerenciada via arquivo `.env` localizado em `/opt/laranjinha/.env`.

> [!IMPORTANT]
> A URL de conexão no arquivo `.env` deve apontar para `127.0.0.1:5432`.

---

## ⚙️ 4. Fluxo de Atualização (Deploy)

Sempre que novas alterações forem feitas localmente e enviadas ao GitHub, siga estas etapas para atualizar o servidor:

1. **Acessar a pasta**:
   ```bash
   cd /opt/laranjinha
   ```
2. **Atualizar o código (Backend)**:
   ```bash
   git pull origin main
   npm install
   ```
3. **Atualizar a Interface (Frontend)**:
   ```bash
   cd /opt/laranjinha/frontend
   npm install
   npm run build
   ```
4. **Sincronizar SDRs e Limpeza**:
   ```bash
   cd /opt/laranjinha
   node scripts/fix_sdrs_sync.js
   ```
5. **Reiniciar o Servidor**:
   O sistema é gerenciado como um processo em segundo plano. Para reiniciar:
   ```bash
   # Identificar o processo
   ps aux | grep node
   # Matar o processo antigo
   sudo kill <PID>
   # O processo deve reiniciar automaticamente se estiver via nohup ou supervisor
   ```

---

## 📝 5. Logs e Depuração

Para visualizar o que está acontecendo no sistema (erros de envio, etc):
- **Arquivo de Log**: `/opt/laranjinha/app.log` (se iniciado via nohup)
- **Ver comando**: `tail -f /opt/laranjinha/app.log`
