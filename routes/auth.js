const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const validator = require('validator');
const pool = require('../config/database');

const router = express.Router();

router.get('/kayit', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'auth', 'kayit.html'));
});

router.get('/giris', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'auth', 'giris.html'));
});

router.post('/kayit', async (req, res) => {
  const { ad, soyad, email, telefon, sifre, sifre_tekrar, rol, kapasite, uzmanlik } = req.body;
  if (!ad || !soyad || !email || !sifre || !rol) {
    return res.status(400).send('Tüm alanları doldurun.');
  }
  if (!validator.isEmail(email)) {
    return res.status(400).send('Geçersiz email adresi.');
  }
  if (sifre.length < 8 || !/[A-Z]/.test(sifre) || !/[0-9]/.test(sifre)) {
    return res.status(400).send('Şifre en az 8 karakter, bir büyük harf ve bir rakam içermeli.');
  }
  if (sifre !== sifre_tekrar) {
    return res.status(400).send(`<script>alert('Şifreler eşleşmiyor!');window.history.back();</script>`);
  }
  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows && rows.length > 0) {
      return res.status(400).send('Bu email zaten kayıtlı!');
    }
    const hashedPassword = await bcrypt.hash(sifre, 10);
        // Gönüllü için varsayılan koordinat
    const enlem = 41.0082;
    const boylam = 28.9784;

    await pool.query(
      'INSERT INTO users (ad, soyad, email, telefon, sifre, rol, kapasite, uzmanlik, enlem, boylam) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [ad, soyad, email, telefon, hashedPassword, rol, kapasite || 1, uzmanlik || '', enlem, boylam]
    );
    res.redirect('/giris');
  } catch (err) {
    console.error(err);
    res.status(500).send('Veritabanı hatası oluştu, lütfen daha sonra tekrar deneyin.');
  }
});

router.post('/giris', async (req, res) => {
  const { email, sifre } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows || rows.length === 0) return res.status(401).send('Email veya şifre yanlış');
    const user = rows[0];
    const validPassword = await bcrypt.compare(sifre, user.sifre);
    if (!validPassword) return res.status(401).send('Email veya şifre yanlış');
    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000
    });
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Veritabanı bağlantı hatası.');
  }
});

router.get('/cikis', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

const { verifyToken } = require('../middleware/auth');
router.get('/status', verifyToken, (req, res) => {
  res.json({ id: req.user.id, email: req.user.email, rol: req.user.rol });
});

module.exports = router;
