const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../database/db"); 

router.post("/register", (req, res) => {
    const { name, email, password, role } = req.body;

    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, existingUser) => {
        if (existingUser) {
            return res.status(400).json({ message: "Bu e-posta zaten kullanımda!" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userRole = role ? role : "user"; 

        db.run(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
            [name, email, hashedPassword, userRole],
            function (err) {
                if (err) return res.status(500).json({ message: "Kayıt sırasında hata oluştu." });
                res.status(201).json({ message: "Kayıt başarılı", userId: this.lastID });
            }
        );
    });
});

router.post("/login", (req, res) => {
    const { email, password } = req.body;

    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (!user) {
            return res.status(400).json({ message: "Kullanıcı bulunamadı" });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(400).json({ message: "Şifre yanlış" });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            "gizliAnahtar",
            { expiresIn: "1h" }
        );

        res.json({
            message: "Login başarılı",
            token: token
        });
    });
});

module.exports = router;