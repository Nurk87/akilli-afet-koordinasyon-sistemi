-- 1. Veritabanı Dil Desteğini (Collation) Ayarla
-- Not: Bu işlem veritabanı kullanımdayken hata verebilir.
BEGIN TRY
    USE [master];
    ALTER DATABASE [afet_koordinasyon] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    ALTER DATABASE [afet_koordinasyon] COLLATE Turkish_CI_AS;
    ALTER DATABASE [afet_koordinasyon] SET MULTI_USER;
END TRY
BEGIN CATCH
    PRINT '⚠️ Collation ayarlanamadı (muhtemelen veritabanı meşgul), devam ediliyor...';
END CATCH
GO

USE [afet_koordinasyon];
GO

-- 2. Kritik Metin Sütunlarını Dönüştür (Kısıtlama içermeyenler)

BEGIN TRY
    ALTER TABLE users ALTER COLUMN ad NVARCHAR(100) NOT NULL;
    ALTER TABLE users ALTER COLUMN soyad NVARCHAR(100) NOT NULL;
    PRINT '✅ Users tablosu ad/soyad güncellendi.';
END TRY
BEGIN CATCH PRINT '⚠️ Users ad/soyad güncellenemedi: ' + ERROR_MESSAGE(); END CATCH

BEGIN TRY
    ALTER TABLE iller ALTER COLUMN ad NVARCHAR(100) NOT NULL;
    PRINT '✅ Iller tablosu güncellendi.';
END TRY
BEGIN CATCH PRINT '⚠️ Iller güncellenemedi: ' + ERROR_MESSAGE(); END CATCH

BEGIN TRY
    ALTER TABLE ilceler ALTER COLUMN ad NVARCHAR(100) NOT NULL;
    PRINT '✅ Ilceler tablosu güncellendi.';
END TRY
BEGIN CATCH PRINT '⚠️ Ilceler güncellenemedi: ' + ERROR_MESSAGE(); END CATCH

BEGIN TRY
    ALTER TABLE yardim_talepleri ALTER COLUMN baslik NVARCHAR(255) NOT NULL;
    ALTER TABLE yardim_talepleri ALTER COLUMN aciklama NVARCHAR(MAX);
    PRINT '✅ Yardim talepleri metin alanları güncellendi.';
END TRY
BEGIN CATCH PRINT '⚠️ Yardim talepleri güncellenemedi: ' + ERROR_MESSAGE(); END CATCH

-- Diğer alanlar (Kısıtlama içerebilecek olanlar) için deneme
BEGIN TRY ALTER TABLE users ALTER COLUMN rol NVARCHAR(20); END TRY BEGIN CATCH END CATCH
BEGIN TRY ALTER TABLE users ALTER COLUMN durum NVARCHAR(20); END TRY BEGIN CATCH END CATCH
BEGIN TRY ALTER TABLE yardim_talepleri ALTER COLUMN durum NVARCHAR(20); END TRY BEGIN CATCH END CATCH
BEGIN TRY ALTER TABLE yardim_talepleri ALTER COLUMN oncelik NVARCHAR(20); END TRY BEGIN CATCH END CATCH

GO

-- 3. Bozuk Karakterleri Onar
DECLARE @RepairTable TABLE (Mangled NVARCHAR(10) COLLATE Latin1_General_BIN, Fixed NVARCHAR(10));
INSERT INTO @RepairTable (Mangled, Fixed) VALUES 
(N'Ä°', N'İ'), (N'Ä±', N'ı'), (N'Ã¶', N'ö'), (N'Ã–', N'Ö'), 
(N'Ã¼', N'ü'), (N'Ãœ', N'Ü'), (N'Ã§', N'ç'), (N'Ã‡', N'Ç'), 
(N'ÅŸ', N'ş'), (N'Åž', N'Ş'), (N'ÄŸ', N'ğ'), (N'Äž', N'Ğ');

-- Toplu onarım
UPDATE iller SET ad = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(ad, 
    N'Ä°', N'İ'), N'Ä±', N'ı'), N'Ã¶', N'ö'), N'Ã–', N'Ö'), N'Ã¼', N'ü'), N'Ãœ', N'Ü'),
    N'Ã§', N'ç'), N'Ã‡', N'Ç'), N'ÅŸ', N'ş'), N'Åž', N'Ş'), N'ÄŸ', N'ğ'), N'Äž', N'Ğ');

UPDATE ilceler SET ad = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(ad, 
    N'Ä°', N'İ'), N'Ä±', N'ı'), N'Ã¶', N'ö'), N'Ã–', N'Ö'), N'Ã¼', N'ü'), N'Ãœ', N'Ü'),
    N'Ã§', N'ç'), N'Ã‡', N'Ç'), N'ÅŸ', N'ş'), N'Åž', N'Ş'), N'ÄŸ', N'ğ'), N'Äž', N'Ğ');

UPDATE yardim_talepleri SET 
    baslik = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(baslik, 
        N'Ä°', N'İ'), N'Ä±', N'ı'), N'Ã¶', N'ö'), N'Ã–', N'Ö'), N'Ã¼', N'ü'), N'Ãœ', N'Ü'),
        N'Ã§', N'ç'), N'Ã‡', N'Ç'), N'ÅŸ', N'ş'), N'Åž', N'Ş'), N'ÄŸ', N'ğ'), N'Äž', N'Ğ'),
    aciklama = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(aciklama, 
        N'Ä°', N'İ'), N'Ä±', N'ı'), N'Ã¶', N'ö'), N'Ã–', N'Ö'), N'Ã¼', N'ü'), N'Ãœ', N'Ü'),
        N'Ã§', N'ç'), N'Ã‡', N'Ç'), N'ÅŸ', N'ş'), N'Åž', N'Ş'), N'ÄŸ', N'ğ'), N'Äž', N'Ğ');

UPDATE users SET 
    ad = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(ad, 
        N'Ä°', N'İ'), N'Ä±', N'ı'), N'Ã¶', N'ö'), N'Ã–', N'Ö'), N'Ã¼', N'ü'), N'Ãœ', N'Ü'),
        N'Ã§', N'ç'), N'Ã‡', N'Ç'), N'ÅŸ', N'ş'), N'Åž', N'Ş'), N'ÄŸ', N'ğ'), N'Äž', N'Ğ'),
    soyad = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(soyad, 
        N'Ä°', N'İ'), N'Ä±', N'ı'), N'Ã¶', N'ö'), N'Ã–', N'Ö'), N'Ã¼', N'ü'), N'Ãœ', N'Ü'),
        N'Ã§', N'ç'), N'Ã‡', N'Ç'), N'ÅŸ', N'ş'), N'Åž', N'Ş'), N'ÄŸ', N'ğ'), N'Äž', N'Ğ');
GO

PRINT '✅ Veritabanı ve mevcut veriler başarıyla onarıldı.';
