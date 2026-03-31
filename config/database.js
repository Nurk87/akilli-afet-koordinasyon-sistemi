const sql = require('mssql');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
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
let sqliteDb;
let dbType = 'none';

async function initDb() {
    if (dbType !== 'none') return;

    try {
        mssqlPool = await sql.connect(mssqlConfig);
        console.log('✅ MSSQL Veritabanına BAĞLANDI!');
        dbType = 'mssql';
    } catch (err) {
        console.warn('⚠️ MSSQL BAĞLANTI HATASI! SQLite yedeğine geçiliyor...');
        const dbPath = path.join(__dirname, '..', 'database.db');
        sqliteDb = new sqlite3.Database(dbPath);
        dbType = 'sqlite';
        console.log('✅ SQLite Veritabanı Aktif:', dbPath);
    }
}

const queryExecuter = async (query, params = []) => {
    await initDb();

    if (dbType === 'mssql') {
        const request = mssqlPool.request();
        let mssqlQuery = query;
        if (Array.isArray(params) && params.length > 0) {
            params.forEach((param, i) => {
                request.input(`p${i}`, param);
                mssqlQuery = mssqlQuery.replace('?', `@p${i}`);
            });
        }
        const result = await request.query(mssqlQuery);
        return [result.recordset || [], []];
    } else {
        // SQLite
        return new Promise((resolve, reject) => {
            const method = query.trim().toUpperCase().startsWith('SELECT') ? 'all' : 'run';
            sqliteDb[method](query, params, function(err, rows) {
                if (err) {
                    console.error('❌ SQLite Hata:', err.message, 'Sorgu:', query);
                    return reject(err);
                }
                if (method === 'run') {
                    resolve([{ id: this.lastID, changes: this.changes }, []]);
                } else {
                    resolve([rows, []]);
                }
            });
        });
    }
};

module.exports = {
  execute: queryExecuter,
  query: queryExecuter,
  getDbType: () => dbType
};