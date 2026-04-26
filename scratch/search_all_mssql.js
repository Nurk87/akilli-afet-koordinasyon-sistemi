const sql = require('mssql');
require('dotenv').config();

const baseConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: { encrypt: false, trustServerCertificate: true }
};

async function search() {
  const pool = await sql.connect(baseConfig);
  const dbRes = await pool.request().query('SELECT name FROM sys.databases WHERE name NOT IN (\'master\', \'tempdb\', \'model\', \'msdb\')');
  const dbs = dbRes.recordset.map(r => r.name);
  
  console.log(`🔍 Searching across ${dbs.length} databases...`);
  
  for (const db of dbs) {
    try {
      await pool.request().query(`USE [${db}]`);
      const tablesRes = await pool.request().query("SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE'");
      for (const t of tablesRes.recordset) {
        const tableName = t.table_name;
        try {
          const rows = await pool.request().query(`SELECT * FROM [${tableName}]`);
          const found = rows.recordset.filter(r => JSON.stringify(r).toLowerCase().includes('efe'));
          if (found.length > 0) {
            console.log(`✅ FOUND in [${db}].[${tableName}]:`);
            console.log(found);
          }
        } catch (e) {
          // Likely column issues or permissions
        }
      }
    } catch (e) {
      console.log(`⚠️ Database [${db}] error: ${e.message}`);
    }
  }
  
  console.log('\n--- SEARCH COMPLETE ---');
  process.exit(0);
}

search();
