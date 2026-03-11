const express = require("express");
const router = express.Router();
const db = require("../database/db"); // Yolu database klasörüne göre ayarlandı
const authMiddleware = require("../middleware/authMiddleware");

// Sadece giriş yapmış kullanıcılar talep oluşturabilir
router.post("/create", authMiddleware, (req, res) => {
    // Frontend'den gelecek veriler
    const { urgency, lat, lng } = req.body;
    
    // authMiddleware sayesinde isteği yapan kullanıcının ID'sini alabiliyoruz
    const userId = req.user.id; 

    // Gerekli verilerin kontrolü
    if (!urgency || !lat || !lng) {
        return res.status(400).json({ message: "Aciliyet durumu ve koordinat (enlem/boylam) bilgileri zorunludur." });
    }

    // Veritabanına kayıt işlemi (Varsayılan durum: 'waiting')
    const query = `INSERT INTO help_requests (user_id, urgency, lat, lng, status) VALUES (?, ?, ?, ?, 'waiting')`;
    
    db.run(query, [userId, urgency, lat, lng], function(err) {
        if (err) {
            console.error("Talep oluşturma hatası:", err.message);
            return res.status(500).json({ message: "Talep oluşturulurken sunucu kaynaklı bir hata meydana geldi." });
        }
        
        res.status(201).json({ 
            message: "Yardım talebiniz başarıyla sisteme kaydedildi.", 
            requestId: this.lastID 
        });
    });
});

module.exports = router;