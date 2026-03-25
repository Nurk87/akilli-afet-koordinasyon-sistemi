# Afet Koordinasyon Sistemi - Veritabanı Tasarımı Başlangıç Dokümanı

## Tablolar ve Gerekçeleri

**1. users (Kullanıcılar)**
*   **Amaç**: Sisteme kayıt olan tüm bireylerin (Kazazedeler, Gönüllüler, Operatörler/Yetkililer) giriş bilgilerini ve kişisel detaylarını tutar.
*   **Kritik Alanlar**: `email` (login için benzersiz), `sifre` (bcrypt hash'li), `rol` (kullanıcının yetkisini belirler: admin, operator, user vb.).

**2. iller & ilceler (Lokasyon Bilgileri)**
*   **Amaç**: Türkiye'deki il ve ilçelerin listesini tutarak, yardım talepleri sırasında standart ve filtrelenebilir form verisi sunmak.
*   **İlişki**: Her ilçe bir `il_id` ile ile bağlıdır.

**3. yardim_talepleri (Yardım Talepleri)**
*   **Amaç**: Kazazedelerin oluşturduğu aktif ve geçmiş yardım isteklerini barındırır.
*   **Kritik Alanlar**: `enlem`, `boylam` (harita üzerinden tam nokta atışı yardım için), `durum` (talebin şu anki süreci: yeni, devam_ediyor, tamamlandi, iptal_edildi), `oncelik` (kriz anında triyaj için).

**4. yardim_talep_gecmisi (Talep Logları)**
*   **Amaç**: Hangi talebin ne zaman, kim tarafından (hangi yetkili ya da gönüllü) durumunun değiştirildiğinin logunu (izini) tutar. Denetlenebilirlik (Audit) açısından kritiktir.

## Güvenlik Önlemleri
1.  **Parola Şifreleme**: Parolalar düz metin (plain text) olarak saklanmaz, kayıt esnasında `bcrypt` algoritması ile şifrelenir (hash+salt).
2.  **SQL Enjeksiyonu Koruması**: Veritabanı bağlantılarında `mysql2` paketinin parameterized queries (hazırlanmış ifadeler `?`) yapısı kullanılarak SQL enjeksiyon açıklarına karşı önlem alınmıştır.
