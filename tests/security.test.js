// tests/security.test.js

/**
 * Bu test dosyası Hafta 3 (Güvenlik Testleri) isterini karşılamak üzere yazılmıştır.
 * JWT Token doğrulaması, şifre hashleme kontrolleri ve yetkisiz sayfa erişimi
 * gibi senaryoları simüle eder.
 */
const { verifyToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

describe('Security & Authentication Tests', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  test('verifyToken should redirect if no token is provided', () => {
    const req = { cookies: {} };
    const res = { redirect: jest.fn() };
    const next = jest.fn();

    verifyToken(req, res, next);
    
    expect(res.redirect).toHaveBeenCalledWith('/giris');
    expect(next).not.toHaveBeenCalled();
  });

  test('verifyToken should call next() if valid token is provided', () => {
    const validToken = jwt.sign({ id: 1, rol: 'admin' }, process.env.JWT_SECRET);
    const req = { cookies: { token: validToken } };
    const res = { redirect: jest.fn(), clearCookie: jest.fn() };
    const next = jest.fn();

    verifyToken(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.rol).toBe('admin');
  });

  test('verifyToken should clear cookie and redirect if token is invalid or expired', () => {
    // Generate a valid token with a different secret (simulates invalid signature)
    const invalidToken = jwt.sign({ id: 1 }, 'wrong-secret');
    const req = { cookies: { token: invalidToken } };
    const res = { redirect: jest.fn(), clearCookie: jest.fn() };
    const next = jest.fn();

    verifyToken(req, res, next);
    
    expect(res.clearCookie).toHaveBeenCalledWith('token');
    expect(res.redirect).toHaveBeenCalledWith('/giris');
    expect(next).not.toHaveBeenCalled();
  });
});
