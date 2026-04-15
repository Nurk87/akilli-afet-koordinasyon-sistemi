const sql = require('mssql');
require('dotenv').config();

const mssqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 5000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let mssqlPool;
let dbType = 'mssql';

async function initDb() {
    if (mssqlPool) return;

    try {
        mssqlPool = await sql.connect(mssqlConfig);
        console.log('✅ MSSQL Veritabanına BAĞLANDI!');
    } catch (err) {
        console.error('❌ MSSQL BAĞLANTI HATASI! Lütfen veritabanı ayarlarını kontrol edin.');
        console.error(err.message);
        throw err;
    }
}

const queryExecuter = async (query, params = []) => {
    await initDb();

    const request = mssqlPool.request();
    let mssqlQuery = query;
    if (Array.isArray(params) && params.length > 0) {
        params.forEach((param, i) => {
            request.input(`p${i}`, param);
            const index = mssqlQuery.indexOf('?');
            if (index !== -1) {
                mssqlQuery = mssqlQuery.substring(0, index) + `@p${i}` + mssqlQuery.substring(index + 1);
            }
        });
    }
    const result = await request.query(mssqlQuery);
    return [result.recordset || [], []];
};

module.exports = {
  execute: queryExecuter,
  query: queryExecuter,
  getDbType: () => dbType
};