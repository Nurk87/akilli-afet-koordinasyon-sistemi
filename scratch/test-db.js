require('dotenv').config({ path: '../.env' });
const pool = require('../config/database');
async function run() {
    await pool.query("DELETE FROM yardim_atamalari");
    await pool.query("UPDATE yardim_talepleri SET durum = 'yeni', hesaplanan_oncelik_skoru = NULL");
    await pool.query("UPDATE users SET kapasite = 5 WHERE rol = 'gonullu'");
    console.log("Sistem sıfırlandı!");
    process.exit(0);
}
run();
