CREATE DATABASE afet_koordinasyon;
GO
USE afet_koordinasyon;
GO

-- Kullanıcılar Tablosu
CREATE TABLE users (
  id INT IDENTITY(1,1) PRIMARY KEY,
  ad VARCHAR(100) NOT NULL,
  soyad VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  telefon VARCHAR(20),
  sifre VARCHAR(255) NOT NULL,
  rol VARCHAR(20) DEFAULT 'user' CHECK (rol IN ('admin', 'operator', 'user', 'gonullu', 'yetkili', 'kazazede')),
  durum VARCHAR(20) DEFAULT 'aktif' CHECK (durum IN ('aktif', 'pasif', 'askida')),
  olusturulma_tarihi DATETIME DEFAULT GETDATE(),
  guncellenme_tarihi DATETIME DEFAULT GETDATE()
);
GO

-- İller Tablosu
CREATE TABLE iller (
  id INT IDENTITY(1,1) PRIMARY KEY,
  ad VARCHAR(100) NOT NULL UNIQUE,
  kod VARCHAR(10)
);
GO

-- İlçeler Tablosu
CREATE TABLE ilceler (
  id INT IDENTITY(1,1) PRIMARY KEY,
  il_id INT NOT NULL,
  ad VARCHAR(100) NOT NULL,
  kod VARCHAR(10),
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
  baslik VARCHAR(255) NOT NULL,
  aciklama TEXT,
  durum VARCHAR(20) DEFAULT 'yeni' CHECK (durum IN ('yeni', 'devam_ediyor', 'tamamlandi', 'iptal_edildi')),
  oncelik VARCHAR(20) DEFAULT 'orta' CHECK (oncelik IN ('dusuk', 'orta', 'yuksek', 'acil')),
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
  eski_durum VARCHAR(50),
  yeni_durum VARCHAR(50),
  not_metni TEXT,
  degistiren_kullanici_id INT,
  degisim_tarihi DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (talep_id) REFERENCES yardim_talepleri(id) ON DELETE CASCADE,
  FOREIGN KEY (degistiren_kullanici_id) REFERENCES users(id)
);
GO