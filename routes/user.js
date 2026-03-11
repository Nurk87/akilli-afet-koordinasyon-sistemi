const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.get("/profile", authMiddleware, (req, res) => {
    res.json({
        message: "Korunan veri - Profilinize hoş geldiniz",
        user: req.user
    });
});

router.get("/admin-panel", authMiddleware, roleMiddleware(['afad', 'admin']), (req, res) => {
    res.json({
        message: "Koordinasyon merkezine giriş yaptınız.",
        user: req.user
    });
});

module.exports = router;