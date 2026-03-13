# 🚀 Guia do Servidor de Produção (Ubuntu)

Este guia contém todas as informações técnicas necessárias para gerenciar, atualizar e monitorar o servidor de produção do sistema **Laranjinha**.

---

## 📍 1. Informações de Acesso & Caminhos

- **IP do Servidor**: `178.156.234.198`
- **Porta SSH**: `55535`
- **Usuário**: `rodrigo`
- **Diretório da Aplicação**: `/opt/laranjinha`
- **Logs do Servidor (stdout/stderr)**: `/opt/laranjinha/nohup.out`
- **Porta da Aplicação**: `3001` (TCP)

---

## 🛠️ 2. Gerenciamento de Processos

A aplicação roda em background utilizando o comando `nohup`.

### Como Verificar se o Servidor está Online:
```bash
# Ver processos ativos do Node
ps aux | grep node

# Verificar se a porta 3001 está ocupada
netstat -tuln | grep 3001
```

### Como Reiniciar o Servidor Manualmente:
1. Acesse via SSH.
2. Mate o processo atual:
   ```bash
   sudo fuser -k 3001/tcp
   # ou
   pkill -9 node
   ```
3. Inicie novamente:
   ```bash
   cd /opt/laranjinha
   nohup npm start &
   ```

---

## 🔄 3. Fluxo de Atualização (Deploy)

Para subir novas versões do Git para a produção:

1. **Puxar o código mais recente**:
   ```bash
   git fetch origin main
   git reset --hard origin/main
   ```

2. **Instalar dependências (se houver novos pacotes)**:
   ```bash
   export HOME=/tmp  # Necessário para permissões de escrita em produção
   npm install
   ```

3. **Gerar Build do Frontend**:
   ```bash
   cd frontend
   rm -rf dist
   npm install
   npm run build
   cd ..
   ```

4. **Reiniciar o Backend**:
   ```bash
   sudo fuser -k 3001/tcp
   nohup npm start &
   ```

---

## 📈 4. Monitoramento & Debug

### Visualizar Logs em Tempo Real:
```bash
tail -f /opt/laranjinha/nohup.out
```

### Testar Health Check:
```bash
curl -I http://localhost:3001/api/v1/health
```

### Banco de Dados (PostgreSQL):
O banco de dados roda localmente no servidor.
- **Nome**: `inside_sales_pipeline`
- **Comando de acesso**: `psql -U postgres -d inside_sales_pipeline`

---

## ⚠️ Observações Importantes

- **Variáveis de Ambiente**: O arquivo `.env` em `/opt/laranjinha/.env` contém chaves sensíveis (Google OAuth, Tokens de API). **Nunca** apague este arquivo.
- **Permissões**: Sempre que rodar `npm install` ou `npm run build`, garanta que o comando tem permissão ou use `export HOME=/tmp`.
