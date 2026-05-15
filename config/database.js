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

let mssqlPool = null;
let connectingPromise = null;
let dbType = 'mssql';

async function initDb() {
    // Eğer havuz varsa ve bağlantı açıksa dön
    if (mssqlPool && mssqlPool.connected) return mssqlPool;

    // Eğer şu an bir bağlantı kurulmaya çalışılıyorsa o işlemi bekle (Race condition önlemi)
    if (connectingPromise) return connectingPromise;

    connectingPromise = (async () => {
        try {
            if (mssqlPool) {
                try { await mssqlPool.close(); } catch(e) {}
            }
            mssqlPool = await sql.connect(mssqlConfig);
            console.log('✅ MSSQL Veritabanına BAĞLANDI!');
            connectingPromise = null;
            return mssqlPool;
        } catch (err) {
            console.error('❌ MSSQL BAĞLANTI HATASI!', err.message);
            connectingPromise = null;
            throw err;
        }
    })();

    return connectingPromise;
}

const queryExecuter = async (query, params = []) => {
    try {
        const pool = await initDb();
        const request = pool.request();
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
    } catch (err) {
        console.error('❌ SQL Sorgu Hatası:', err.message);
        // Eğer bağlantı hatasıysa havuzu temizle ki bir sonraki seferde yeniden bağlansın
        if (err.code === 'ECONNCLOSED' || err.message.includes('connection')) {
            mssqlPool = null;
        }
        throw err;
    }
};

module.exports = {
  execute: queryExecuter,
  query: queryExecuter,
  getDbType: () => dbType,
  initDb // Export for manual triggers if needed
};