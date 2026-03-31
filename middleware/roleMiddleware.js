// Bu fonksiyon, sadece izin verilen rollere sahip kullanıcıların geçişine izin verir
function roleMiddleware(allowedRoles) {
    return (req, res, next) => {
        // req.user objesi authMiddleware tarafından doldurulmuş olmalıdır
        if (!req.user || !req.user.role) {
            return res.status(401).json({ message: "Kullanıcı rolü tespit edilemedi." });
        }

        // Kullanıcının rolü, izin verilen roller listesinde yoksa engelle
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: "Erişim reddedildi. Bu işlem için yetkiniz bulunmamaktadır." 
            });
        }

        next();
    };
}

module.exports = roleMiddleware;