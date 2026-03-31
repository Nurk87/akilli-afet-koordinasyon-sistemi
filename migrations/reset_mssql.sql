-- Önce varsa eskiyi tamamen sil (Sıfırla)
USE [master];
GO
IF EXISTS (SELECT name FROM sys.databases WHERE name = N'afet_koordinasyon')
BEGIN
    ALTER DATABASE [afet_koordinasyon] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [afet_koordinasyon];
END
GO

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
  enlem DECIMAL(10, 8) NULL,
  boylam DECIMAL(11, 8) NULL,
  musaitlik_durumu NVARCHAR(20) DEFAULT 'musait' CHECK (musaitlik_durumu IN ('musait', 'mesgul', 'pasif')),
  kapasite INT DEFAULT 5,
  olusturulma_tarihi DATETIME DEFAULT GETDATE(),
  guncellenme_tarihi DATETIME DEFAULT GETDATE()
);

-- Iller Tablosu
CREATE TABLE iller (
  id INT IDENTITY(1,1) PRIMARY KEY,
  ad NVARCHAR(100) NOT NULL
);

-- Ilceler Tablosu
CREATE TABLE ilceler (
  id INT IDENTITY(1,1) PRIMARY KEY,
  il_id INT NOT NULL,
  ad NVARCHAR(100) NOT NULL
);

-- Talepler Tablosu
CREATE TABLE yardim_talepleri (
  id INT IDENTITY(1,1) PRIMARY KEY,
  kullanici_id INT NOT NULL,
  il_id INT,
  ilce_id INT,
  baslik NVARCHAR(255) NOT NULL,
  aciklama NVARCHAR(MAX),
  enlem DECIMAL(10, 8),
  boylam DECIMAL(11, 8),
  durum NVARCHAR(20) DEFAULT 'yeni' CHECK (durum IN ('yeni', 'atandi', 'tamamlandi', 'iptal')),
  oncelik NVARCHAR(20) DEFAULT 'orta' CHECK (oncelik IN ('dusuk', 'orta', 'yuksek', 'acil')),
  olusturulma_tarihi DATETIME DEFAULT GETDATE()
);

-- Atamaları tutacak tablo
CREATE TABLE yardim_atamalari (
  id INT IDENTITY(1,1) PRIMARY KEY,
  talep_id INT,
  gonullu_id INT NOT NULL,
  atama_tarihi DATETIME DEFAULT GETDATE(),
  durum NVARCHAR(20) DEFAULT 'atandi',
  mesafe_km DECIMAL(8, 2) NULL,
  oncelik_skoru DECIMAL(8, 2) NULL
);
GO

-- Temel Veriler
INSERT INTO iller (ad) VALUES (N'İstanbul'), (N'Ankara'), (N'İzmir'), (N'Hatay'), (N'Kahramanmaraş');
INSERT INTO ilceler (il_id, ad) VALUES (1, N'Kadıköy'), (1, N'Beşiktaş'), (2, N'Çankaya'), (4, N'Antakya'), (5, N'Pazarcık');

INSERT INTO users (ad, soyad, email, sifre, rol) VALUES (N'Admin', N'Sistem', 'admin@test.com', 'Admin123!', 'admin');
GO
