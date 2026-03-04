const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");

const router = express.Router();

/* REGISTER */
router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Eksik alan var" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  db.run(
    `INSERT INTO users (name, email, password, role)
     VALUES (?, ?, ?, ?)`,
    [name, email, hashedPassword, role || "user"],
    function (err) {
      if (err) {
        return res.status(500).json({ message: "Kayıt başarısız" });
      }
      res.json({ message: "Kayıt başarılı", userId: this.lastID });
    }
  );
});

/* LOGIN */
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.get(
    `SELECT * FROM users WHERE email = ?`,
    [email],
    async (err, user) => {
      if (err || !user) {
        return res.status(400).json({ message: "Kullanıcı bulunamadı" });
      }

      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        return res.status(400).json({ message: "Şifre yanlış" });
      }

      res.json({
        message: "Giriş başarılı",
        user: {
          id: user.id,
          name: user.name,
          role: user.role
        }
      });
    }
  );
});

module.exports = router;