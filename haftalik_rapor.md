# ÖDEV RAPORU: Akıllı Afet Koordinasyon ve Kaynak Optimizasyon Sistemi

**Tarih:** 16 Nisan 2026
**Rapor Dönemi:** 9 Nisan - 15 Nisan 2026
**Hazırlayan:** Antigravity (Yapay Zeka Asistanı)

## 1. Proje Özeti
Bu hafta yürütülen çalışmalar, sistemin temel altyapısının kurulması, veritabanı tutarlılığının sağlanması, kullanıcı deneyiminin (UX) iyileştirilmesi ve afet koordinasyon algoritmasının modernize edilmesi üzerine yoğunlaşmıştır. Sistem, hem bir eğitim platformu (öğrenci/öğretmen paneli) hem de kapsamlı bir afet yönetim aracı olarak çift yönlü geliştirilmiştir.

---

## 2. Yapılan Geliştirmeler

### A. Backend ve Algoritma Geliştirmeleri
*   **Haversine Mesafe Hesaplama:** Gönüllülerin en yakın yardım taleplerine yönlendirilmesi için küresel mesafe hesaplama algoritması entegre edildi.
    *   *Teknik Detay:* İki koordinat arasındaki eğrisel mesafeyi Dünya'nın yarıçapını (6371 km) baz alarak hesaplar. Bu, kuş uçuşu mesafeyi en hassas şekilde verir ve lojistik planlamanın temelini oluşturur.
*   **Akıllı Öncelik Skoru (Multi-Factor Scoring):** Taleplerin aciliyetini belirlemek için üç katmanlı bir puanlama sistemi geliştirildi:
    1.  **Aciliyet Katsayısı (%50):** Talebin tipine göre (Acil, Yüksek, Orta, Düşük) verilen sabit puan.
    2.  **Mesafe Katsayısı (%30):** Gönüllüye olan mesafe arttıkça puanın hiperbolik olarak azaldığı sistem ($1 / (d+1)$).
    3.  **Zaman (Aging) Katsayısı (%20):** Talebin sistemde bekleme süresi arttıkça puanı yükselten "yaşlandırma" mekanizması. Her saat için +10 puan eklenerek eski taleplerin öne çıkması sağlanır.
*   **Otomatik Atama Motoru (Greedy Engine):** 
    *   Sistem, tüm talepleri ve uygun gönüllüleri tarayarak en yüksek "Öncelik Skoru"na sahip eşleşmeleri otomatik olarak gerçekleştirir.
    *   **Greedy (Açgözlü) Yaklaşım:** En kritik ve en yakın vaka, o anki en uygun gönüllüye atanır ve gönüllü kapasitesi dolana kadar işlem devam eder.
*   **Gerçek Zamanlı Bildirim Sistemi:** Öğrencilerin ve gönüllülerin atamaları anında görebilmesi için backend bildirim mekanizması kuruldu.

### B. Veritabanı ve Modernizasyon
*   **Lokasyon Senkronizasyonu:** Türkiye'nin 81 il ve ilçesi MSSQL veritabanına aktarıldı (`seed-turkiye.js`). Bu veriler Haversine hesaplamaları için koordinat bazlı (Lat/Lon) olarak yapılandırıldı.
*   **Şema İyileştirmeleri:** 
    *   Eksik sütunlar (örneğin: `fotograf_yolu`) ve veri tipi uyumsuzlukları giderildi.
    *   Nullable (boş bırakılabilir) alanlar için şema güncellemeleri yapıldı.

### C. Frontend ve Tasarım (UI/UX)
*   **Kurumsal Kimlik (AFAD Branding):** Sisteme AFAD renk paleti ve logoları entegre edilerek profesyonel bir görünüm kazandırıldı.
*   **Görsel Optimizasyon:** Gerçekçi afet etki görselleri ve yüksek çözünürlüklü UI bileşenleri kullanılarak "premium" bir his oluşturuldu.
*   **Panel Yoğunluk Ayarı:** Öğrenci ve yönetici panellerindeki gereksiz boşluklar (whitespace) azaltılarak, bilginin daha kompakt ve okunabilir şekilde sunulması sağlandı.

---

## 3. Hata Giderimleri (Bug Fixes)
*   **Kimlik Doğrulama (Auth):** Şifre hashleme uyumsuzlukları giderildi, kullanıcı girişindeki hatalı yönlendirmeler düzeltildi.
*   **Sunucu Başlatma Hataları:** `express is not defined` gibi temel modül yükleme ve Express başlatma hataları çözüldü.
*   **Veri Doğrulama:** Afet talebi gönderirken oluşan "Geçersiz ilçe" hatası, veritabanı senkronizasyonu ile tamamen ortadan kaldırıldı.
*   **Bağımlılık Yönetimi:** `package.json` dosyası güncellenerek eksik paketler (mssql, bcrypt, express vb.) düzene sokuldu.

---

## 4. Teknik Altyapı
Sistemde kullanılan teknolojiler ve araçlar:
*   **Backend:** Node.js, Express.js
*   **Veritabanı:** MSSQL (Ana veri deposu), SQLite (Test/Hafif kullanım)
*   **Güvenlik:** Bcrypt şifreleme, JWT tabanlı yetkilendirme yapıları.
*   **Algoritmalar:** Haversine Proximity, Zaman Ağırlıklı Önceliklendirme.
*   **Frontend:** Vanilla CSS, JavaScript, Modern HTML5.

---

## 5. Sonuç
Bu haftalık çalışma sonucunda "Akıllı Afet Koordinasyon ve Kaynak Optimizasyon Sistemi" prototip aşamasından, gerçek verilerle (il/ilçe) çalışabilen ve akıllı karar destek mekanizmalarına sahip profesyonel bir platform aşamasına getirilmiştir. Sistem artık hem masaüstü hem de mobil senaryolarda gönüllü koordinasyonunu minimum hata ile yönetebilecek durumdadır.

---
> [!NOTE]
> Projenin son hali bulut tabanlı depolama (GitHub) üzerine başarıyla aktarılmış ve sürüm kontrolü sağlanmıştır.
