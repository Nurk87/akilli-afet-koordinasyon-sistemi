const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

const hash = '$2a$10$etKmDlCMWP0i19kaDwpNHOdU/1AARNhy15ccG7MzyVv6BRjspCBxm';

async function run() {
  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('hash', sql.NVarChar, hash)
      .query('UPDATE users SET sifre = @hash WHERE email = \'admin@test.com\'');
    console.log('✅ HASH UPDATED SUCCESSFULLY WITH ARGS');
    
    const check = await pool.request().query('SELECT sifre FROM users WHERE email = \'admin@test.com\'');
    console.log('VERIFIED HASH IN DB:', check.recordset[0].sifre);
    
    await pool.close();
  } catch (err) {
    console.error(err);
  }
}

run();
