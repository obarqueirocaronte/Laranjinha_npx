const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

/**
 * Função utilitária para executar um arquivo SQL completo no banco de dados.
 * @param {Client} client - Instância da conexão com o banco PostgreSQL.
 * @param {string} filePath - Caminho absoluto para o arquivo .sql.
 */
async function runSqlFile(client, filePath) {
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`[Banco de Dados] Executando rotina: ${path.basename(filePath)}...`);
    await client.query(sql);
}

/**
 * Função principal para inicializar o banco de dados.
 * Esta função irá rodar o arquivo de esquema principal (schema.sql)
 * e logo depois injetará os dados base de teste (seed-data.sql).
 * É útil para criar um ambiente do zero em desenvolvimento.
 */
async function initDb() {
    // Instancia o cliente puxando a URL padrão do banco de dados das variáveis de ambiente (.env)
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log('🔗 Conexão com o banco estabelecida com sucesso.');

        // 1. Criar toda a estrutura das tabelas (Schema)
        await runSqlFile(client, path.join(__dirname, '../database/schema.sql'));

        // 2. Inserir dados base iniciais (Seed)
        await runSqlFile(client, path.join(__dirname, '../database/seed-data.sql'));

        console.log('✅ Banco de dados inicializado com sucesso e pronto para uso!');
    } catch (err) {
        console.error('❌ Falha ao inicializar banco de dados:', err);
    } finally {
        // Encerra a conexão em todos os casos para não prender o processo
        await client.end();
        console.log('🔒 Conexão com o banco encerrada.');
    }
}

// Inicia o processo
initDb();
