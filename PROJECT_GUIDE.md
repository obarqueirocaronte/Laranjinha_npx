# Inside Sales Pipeline - Guia Beta

Este guia descreve como executar o projeto **Inside Sales Pipeline (Beta)** em diferentes ambientes e portas.

## 📍 Localização do Projeto e Portas

O Inside Sales Pipeline é dividido em duas partes que devem rodar simultaneamente:

1. **Backend (API + Banco de Dados)**
   - **Diretório:** Raiz do projeto (`inside-sales-pipeline-beta/`)
   - **Comando:** `npm run dev` (ou `node src/app.js`)
   - **Porta:** **3001** (`http://localhost:3001`)
2. **Frontend (Interface React/Vite)**
   - **Diretório:** `inside-sales-pipeline-beta/frontend/`
   - **Comando:** `npm run dev`
   - **Porta:** **3000** (`http://localhost:3000`) - *O Vite está configurado explicitamente no arquivo `vite.config.ts` para iniciar na porta 3000, fazendo ponte/proxy das APIs com o backend na porta 3001.*

---

## 🚀 Como Executar Passo a Passo

### 1. Iniciar o Backend (API)
Abra um terminal, vá para a **raiz do projeto** e execute:
```bash
npm install     # Caso não tenha instalado antes
npm run dev     # Inicia o servidor na porta 3001
```
*(Se for a sua primeira vez, ou se o banco de dados estiver zerado, você pode rodar `npm run db:init` para recriar as tabelas mockadas)*

### 2. Iniciar o Frontend (Interface React)
Abra um **novo terminal**, vá para a pasta **`frontend`** e execute:
```bash
cd frontend
npm install     # Caso não tenha instalado antes
npm run dev     # Inicia a interface na porta 3000
```

### 👉 Acessando a Aplicação
Após iniciar ambos os terminais, clique no link abaixo no seu navegador:
**[http://localhost:3000](http://localhost:3000)**

---

## 🛡️ Funcionalidades Beta Disponíveis

Esta versão foca na simplicidade e na operação principal de vendas.

### 1. Kanban Sales
- Visualização de pipeline padrão.
- Gestão de leads por colunas de status.

### 2. Administração (Acesso Manager)
Acesse via o ícone de engrenagem no **Control Hub**:

-   **Lead Zone (Cadastro):** Importação e higienização de leads.
-   **Regras de Cadência (Desenho):** Configuração de protocolos e sequências de vendas.

---

## 🛠 Status de Desenvolvimento (Março 2026)

-   **Backend:** Rodando na porta **3001**.
-   **Frontend:** Rodando na porta **3000** (com proxy para o backend).
-   **Integração Aurora Chat:** Checklist disponível em `docs/aurora_checklist.md`. Variáveis de ambiente configuradas no `.env`.
-   **Correções Recentes:** Estabilização de rotas de Administração e Kanban.

> [!TIP]
> Sempre verifique se ambos os terminais estão ativos para garantir que o fluxo de dados entre Frontend e Backend funcione corretamente.

---

## 🛠 Configuração de Testes e Futuro

-   **Backend:** Certifique-se de que a `DATABASE_URL` no `.env` da raiz está apontando para o banco de dados correto.
-   **Portas:** Você pode rodar múltiplas instâncias (Beta, Dev, Staging) mudando apenas a porta no comando de inicialização.
