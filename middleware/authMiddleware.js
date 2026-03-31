const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res.status(401).json({ message: "Yetkilendirme reddedildi. Token yok." });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, "gizliAnahtar", (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Geçersiz veya süresi dolmuş token." });
        }

        req.user = user; // Artık req.user içinde id, email ve role var
        next();
    });
}

module.exports = authMiddleware;