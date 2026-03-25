const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    const isApiRequest = req.xhr || (req.headers.accept && req.headers.accept.includes('json')) || req.path.includes('/api/');
    if (isApiRequest) {
      return res.status(401).json({ error: 'Oturum süresi doldu' });
    }
    return res.redirect('/giris');
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.clearCookie('token');
    const isApiRequest = req.xhr || (req.headers.accept && req.headers.accept.includes('json')) || req.path.includes('/api/');
    if (isApiRequest) {
      return res.status(401).json({ error: 'Geçersiz oturum' });
    }
    return res.redirect('/giris');
  }
}

module.exports = { verifyToken };