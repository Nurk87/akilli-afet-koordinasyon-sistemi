const pool = require('./config/database');

async function cleanup() {
    try {
        console.log('🧹 Demo verileri temizleniyor...');
        
        // Atamaları sil
        await pool.query('DELETE FROM yardim_atamalari');
        console.log('- Atamalar silindi.');
        
        // Talepleri sil
        await pool.query('DELETE FROM yardim_talepleri');
        console.log('- Yardım talepleri silindi.');
        
        // Test kullanıcılarını sil
        await pool.query("DELETE FROM users WHERE rol IN ('gonullu', 'kazazede')");
        console.log('- Test kullanıcıları (gönüllü/kazazede) silindi.');
        
        console.log('✅ Sistem başarıyla temizlendi.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Temizlik hatası:', err.message);
        process.exit(1);
    }
}

cleanup();
