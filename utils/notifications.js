const pool = require('../config/database');

/**
 * Kullanıcıya bildirim gönderir.
 * @param {number} userId - Alıcı kullanıcı ID
 * @param {string} title - Bildirim başlığı
 * @param {string} message - Bildirim içeriği
 * @param {string} type - 'info' | 'success' | 'warning' | 'danger'
 * @param {string} link - Tıklandığında gidilecek URL (Opsiyonel)
 */
async function sendNotification(userId, title, message, type = 'info', link = null) {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
      [userId, title, message, type, link]
    );
    return true;
  } catch (error) {
    console.error('Bildirim gönderilirken hata:', error);
    return false;
  }
}

module.exports = { sendNotification };
