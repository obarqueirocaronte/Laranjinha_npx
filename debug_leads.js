const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkLeads() {
    try {
        const sql = `
            SELECT l.id, l.full_name, l.company_name, l.qualification_status, l.current_column_id, 
                   s.full_name as assigned_sdr_name, pc.name as column_name, pc.position
            FROM leads l
            LEFT JOIN sdrs s ON l.assigned_sdr_id = s.id
            LEFT JOIN pipeline_columns pc ON l.current_column_id = pc.id
            ORDER BY pc.position, l.created_at DESC
        `;
        const res = await pool.query(sql);
        console.log("--- Current Leads in DB ---");
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkLeads();
