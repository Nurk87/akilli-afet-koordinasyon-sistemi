const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 1,
    multipleStatements: true
  });

  try {
    const sqlPath = path.join(__dirname, 'migrations', '02_atamalar.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running 02_atamalar.sql...');
    await pool.query(sql);
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

runMigration();
