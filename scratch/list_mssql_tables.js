const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function listTables() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query("SELECT name FROM sys.tables");
    console.log('Tables in MSSQL:');
    result.recordset.forEach(row => console.log(` - ${row.name}`));
    await pool.close();
  } catch (err) {
    console.error(err);
  }
}

listTables();
