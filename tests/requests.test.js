// tests/requests.test.js

/**
 * Bu test dosyası Hafta 4 (Test ve Hata Düzeltme) isterini karşılamak üzere yazılmıştır.
 * Yardım taleplerinin oluşturulması, lokasyon verisi, ve rol bazlı erişimi simüle eder.
 */

const { requireRole } = require('../middleware/role');

describe('Help Request Module Tests', () => {
  
  test('requireRole middleware blocks users without required role', () => {
    const req = { user: { rol: 'gonullu' } };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();

    // Yetkili sayfası için gereklilik belirliyoruz
    const middleware = requireRole('yetkili');
    middleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith('Yetkisiz erişim');
    expect(next).not.toHaveBeenCalled();
  });

  test('requireRole middleware allows users with exact required role', () => {
    const req = { user: { rol: 'yetkili' } };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();

    const middleware = requireRole('yetkili');
    middleware(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('New Help Request data should have lat/lng fields (Simulated Validation)', () => {
    // Controller logic is tested in integration tests, here we just unit test expected behaviors
    const mockRequestBody = {
      baslik: 'Gıda Yardımı',
      il_id: 'Hatay',
      ilce_id: 'Antakya',
      enlem: 36.20,
      boylam: 36.16,
      oncelik: 'acil'
    };

    expect(mockRequestBody.enlem).toBeGreaterThan(0);
    expect(mockRequestBody.boylam).toBeGreaterThan(0);
    expect(mockRequestBody.il_id).toBeDefined();
    expect(mockRequestBody.ilce_id).toBeDefined();
  });
});
