USE afet_koordinasyon;
GO

ALTER TABLE users ADD enlem DECIMAL(10, 8) NULL;
ALTER TABLE users ADD boylam DECIMAL(11, 8) NULL;
ALTER TABLE users ADD musaitlik_durumu NVARCHAR(20) DEFAULT 'musait' CHECK (musaitlik_durumu IN ('musait', 'mesgul', 'pasif'));
ALTER TABLE users ADD kapasite INT DEFAULT 1;
ALTER TABLE users ADD uzmanlik NVARCHAR(MAX);
GO

-- Atamaları tutacak tablo
CREATE TABLE yardim_atamalari (
  id INT IDENTITY(1,1) PRIMARY KEY,
  talep_id INT NOT NULL,
  gonullu_id INT NOT NULL,
  atayan_yetkili_id INT NULL,
  atama_tarihi DATETIME DEFAULT GETDATE(),
  tamamlanma_tarihi DATETIME NULL,
  durum NVARCHAR(20) DEFAULT 'atandi' CHECK (durum IN ('atandi', 'yolda', 'tamamlandi', 'iptal')),
  mesafe_km DECIMAL(8, 2) NULL,
  oncelik_skoru DECIMAL(8, 2) NULL,
  FOREIGN KEY (talep_id) REFERENCES yardim_talepleri(id) ON DELETE CASCADE,
  FOREIGN KEY (gonullu_id) REFERENCES users(id),
  FOREIGN KEY (atayan_yetkili_id) REFERENCES users(id)
);
GO

-- Yardım Talepleri tablosuna algoritmanın hesapladığı Aciliyet skoru sütunu eklenebilir
ALTER TABLE yardim_talepleri ADD hesaplanan_oncelik_skoru DECIMAL(8, 2) NULL;
GO
