CREATE DATABASE afet_koordinasyon COLLATE Turkish_CI_AS;
GO
USE afet_koordinasyon;
GO

-- Kullanıcılar Tablosu
CREATE TABLE users (
  id INT IDENTITY(1,1) PRIMARY KEY,
  ad NVARCHAR(100) NOT NULL,
  soyad NVARCHAR(100) NOT NULL,
  email NVARCHAR(100) UNIQUE NOT NULL,
  telefon NVARCHAR(20),
  sifre NVARCHAR(255) NOT NULL,
  rol NVARCHAR(20) DEFAULT 'user' CHECK (rol IN ('admin', 'operator', 'user', 'gonullu', 'yetkili', 'kazazede')),
  durum NVARCHAR(20) DEFAULT 'aktif' CHECK (durum IN ('aktif', 'pasif', 'askida')),
  olusturulma_tarihi DATETIME DEFAULT GETDATE(),
  guncellenme_tarihi DATETIME DEFAULT GETDATE()
);
GO

-- İller Tablosu
CREATE TABLE iller (
  id INT IDENTITY(1,1) PRIMARY KEY,
  ad NVARCHAR(100) NOT NULL UNIQUE,
  kod NVARCHAR(10)
);
GO

-- İlçeler Tablosu
CREATE TABLE ilceler (
  id INT IDENTITY(1,1) PRIMARY KEY,
  il_id INT NOT NULL,
  ad NVARCHAR(100) NOT NULL,
  kod NVARCHAR(10),
  FOREIGN KEY (il_id) REFERENCES iller(id) ON DELETE CASCADE
);
GO

-- Yardım Talepleri Tablosu
CREATE TABLE yardim_talepleri (
  id INT IDENTITY(1,1) PRIMARY KEY,
  kullanici_id INT NOT NULL,
  il_id INT NOT NULL,
  ilce_id INT NOT NULL,
  enlem DECIMAL(10, 8),
  boylam DECIMAL(11, 8),
  baslik NVARCHAR(255) NOT NULL,
  aciklama NVARCHAR(MAX),
  durum NVARCHAR(20) DEFAULT 'yeni' CHECK (durum IN ('yeni', 'devam_ediyor', 'tamamlandi', 'iptal_edildi')),
  oncelik NVARCHAR(20) DEFAULT 'orta' CHECK (oncelik IN ('dusuk', 'orta', 'yuksek', 'acil')),
  olusturulma_tarihi DATETIME DEFAULT GETDATE(),
  guncellenme_tarihi DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (il_id) REFERENCES iller(id),
  FOREIGN KEY (ilce_id) REFERENCES ilceler(id)
);
GO

-- Yardım Talebi Geçmişi Tablosu
CREATE TABLE yardim_talep_gecmisi (
  id INT IDENTITY(1,1) PRIMARY KEY,
  talep_id INT NOT NULL,
  eski_durum NVARCHAR(50),
  yeni_durum NVARCHAR(50),
  not_metni NVARCHAR(MAX),
  degistiren_kullanici_id INT,
  degisim_tarihi DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (talep_id) REFERENCES yardim_talepleri(id) ON DELETE CASCADE,
  FOREIGN KEY (degistiren_kullanici_id) REFERENCES users(id)
);
GO