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
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool;

const getPool = async () => {
    if (pool) return pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ MSSQL Veritabanına BAĞLANDI!');
        return pool;
    } catch (err) {
        console.error('❌ MSSQL BAĞLANTI HATASI!');
        console.error('Hata Detayı:', err.message);
        throw err;
    }
};

const queryExecuter = async (query, params = []) => {
  const currentPool = await getPool();
  const request = currentPool.request();
  
  let mssqlQuery = query;
  
  if (Array.isArray(params) && params.length > 0) {
    let i = 0;
    while(mssqlQuery.indexOf('?') !== -1 && i < params.length) {
      request.input(`p${i}`, params[i]);
      mssqlQuery = mssqlQuery.replace('?', `@p${i}`);
      i++;
    }
  }

  const result = await request.query(mssqlQuery);
  return [result.recordset, []];
};

module.exports = {
  execute: queryExecuter,
  query: queryExecuter
};