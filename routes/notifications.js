const express = require('express');
const pool = require('../config/database');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

// Bildirimleri Listele
router.get('/list', verifyToken, async (req, res) => {
  try {
    const [notifications] = await pool.query(
      'SELECT id, title, message, type, is_read, created_at, link FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Bildirimler alınamadı' });
  }
});

// Bildirimi Okundu Olarak İşaretle
router.post('/mark-as-read', verifyToken, async (req, res) => {
  try {
    const { id } = req.body;
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Okundu işaretlenemedi' });
  }
});

// Tümünü Okundu İşaretle
router.post('/mark-all-read', verifyToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

module.exports = router;
