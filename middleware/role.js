function requireRole(role) {
  return function(req, res, next) {
    if (req.user && req.user.rol === role) return next();
    return res.status(403).send('Yetkisiz erişim');
  }
}
module.exports = { requireRole };