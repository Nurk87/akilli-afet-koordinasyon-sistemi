const sql = require('mssql');
require('dotenv').config();

const baseConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: { encrypt: false, trustServerCertificate: true }
};

async function findData() {
  const pool = await sql.connect(baseConfig);
  const dbRes = await pool.request().query("SELECT name FROM sys.databases WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb')");
  const dbs = dbRes.recordset.map(r => r.name);
  
  console.log(`🔍 Searching in ${dbs.length} databases for 'Elif' or help request tables...`);
  
  for (const db of dbs) {
    try {
      await pool.request().query(`USE [${db}]`);
      // Look for tables that might contain requests or users
      const tableRes = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
      for (const t of tableRes.recordset) {
        const tableName = t.TABLE_NAME;
        
        // Check if table name matches "yardim" or "talep"
        if (tableName.toLowerCase().includes('yardim') || tableName.toLowerCase().includes('talep') || tableName.toLowerCase().includes('request')) {
          const countRes = await pool.request().query(`SELECT COUNT(*) as c FROM [${tableName}]`);
          console.log(`✅ FOUND Table [${tableName}] in [${db}]: ${countRes.recordset[0].c} rows`);
          
          if (countRes.recordset[0].c > 0) {
            const sample = await pool.request().query(`SELECT TOP 3 * FROM [${tableName}]`);
            console.log(`   Sample:`, sample.recordset);
          }
        }
        
        // Also check if any row in any table contains "Elif"
        // (Heavy operation, but let's try with small sample)
        try {
          const elifRes = await pool.request().query(`SELECT TOP 10 * FROM [${tableName}]`);
          const hasElif = elifRes.recordset.some(r => JSON.stringify(r).toLowerCase().includes('elif'));
          if (hasElif) {
            console.log(`✨ FOUND 'Elif' in [${db}].[${tableName}]`);
          }
        } catch (e) {}
      }
    } catch (e) {
      console.log(`⚠️ Error in [${db}]: ${e.message}`);
    }
  }
  
  console.log('\n--- SEARCH FINISHED ---');
  process.exit(0);
}

findData();
