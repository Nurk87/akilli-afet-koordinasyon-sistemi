// public/js/pwa.js

// 1. Service Worker Kaydı
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('✅ Service Worker başarıyla kaydedildi. Kapsam:', reg.scope);
      })
      .catch(err => {
        console.error('❌ Service Worker kaydı başarısız:', err);
      });
  });
}

// 2. Masaüstü Bildirim İzni Talep Etme
if ('Notification' in window) {
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      console.log('🔔 Bildirim izni durumu:', permission);
    });
  }
}

// 3. Masaüstü Bildirim Tetikleme Yardımcısı
function showDesktopNotification(title, message, link = '') {
  if ('Notification' in window && Notification.permission === 'granted') {
    const options = {
      body: message,
      icon: '/images/logo.png',
      vibrate: [200, 100, 200],
      badge: '/images/logo.png'
    };
    
    const notification = new Notification(title, options);
    
    notification.onclick = function() {
      window.focus();
      if (link) {
        window.location.href = link;
      }
      notification.close();
    };
  }
}

// 4. Base64'ten Blob Oluşturma Yardımcısı
function base64ToBlob(base64, mime) {
  const byteString = atob(base64.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}

// 5. Çevrimdışı Yardım Taleplerini Eşitleme (Offline Sync)
async function syncOfflineRequests() {
  const pending = JSON.parse(localStorage.getItem('pending_requests') || '[]');
  if (pending.length === 0) return;

  console.log(`🌐 İnternet algılandı! ${pending.length} adet çevrimdışı talep eşitleniyor...`);

  // İlk istek gönderilmeye başlarken ses çalabiliriz (opsiyonel)
  for (let i = 0; i < pending.length; i++) {
    const req = pending[i];
    const formData = new FormData();

    // Metin alanlarını ekle
    for (const key in req) {
      if (key !== 'fotograf_base64' && key !== 'ses_base64' && key !== 'offline_tarih') {
        formData.append(key, req[key]);
      }
    }

    // Fotoğrafı dönüştür ve ekle
    if (req.fotograf_base64) {
      try {
        const blob = base64ToBlob(req.fotograf_base64, 'image/png');
        formData.append('fotograf', blob, 'offline_foto.png');
      } catch (e) {
        console.warn('Fotoğraf blob dönüştürme hatası:', e);
      }
    }

    // Ses kaydını dönüştür ve ekle
    if (req.ses_base64) {
      try {
        const blob = base64ToBlob(req.ses_base64, 'audio/webm');
        formData.append('ses_kaydi', blob, 'offline_ses.webm');
      } catch (e) {
        console.warn('Ses blob dönüştürme hatası:', e);
      }
    }

    try {
      const response = await fetch('/requests/olustur', {
        method: 'POST',
        body: formData
      });

      // Eğer sunucu bizi yönlendirirse veya başarılı dönerse
      if (response.ok) {
        console.log(`✅ Çevrimdışı talep #${i + 1} başarıyla sunucuya iletildi.`);
        
        // Kullanıcının takip edebilmesi için takip kodunu sunucudan alamıyorsak yönlendirildiği linkten çekebiliriz
        let finalKod = "KAYDEDİLDİ";
        if (response.redirected) {
          const urlObj = new URL(response.url);
          const urlKod = urlObj.searchParams.get('kod');
          if (urlKod) finalKod = urlKod;
        }

        // Yerel geçmişe ekle
        const history = JSON.parse(localStorage.getItem('afad_talepler') || '[]');
        history.push({
          kod: finalKod,
          baslik: req.baslik,
          tarih: req.offline_tarih || new Date().toLocaleString('tr-TR')
        });
        localStorage.setItem('afad_talepler', JSON.stringify(history));

        // Bildirim göster
        showDesktopNotification(
          'Yardım Talebiniz AFAD\'a Ulaştı!',
          `Çevrimdışı oluşturduğunuz "${req.baslik}" başlıklı talep başarıyla senkronize edildi. Kod: ${finalKod}`
        );
      } else {
        console.error(`❌ Çevrimdışı talep #${i + 1} gönderimi sunucu hatasıyla durdu.`);
      }
    } catch (err) {
      console.error(`❌ Çevrimdışı talep #${i + 1} gönderilirken bağlantı hatası:`, err);
    }
  }

  // Gönderilenleri listeden temizle
  localStorage.removeItem('pending_requests');
}

// 6. Bağlantı Durumu Takibi
window.addEventListener('online', () => {
  console.log('🟢 Cihaz çevrimiçi moda geçti.');
  syncOfflineRequests();
});

window.addEventListener('offline', () => {
  console.log('🔴 Cihaz çevrimdışı moda geçti.');
});

// Sayfa ilk yüklendiğinde de bağlantı varsa kalanları yolla
if (navigator.onLine) {
  document.addEventListener('DOMContentLoaded', syncOfflineRequests);
}

// Global olarak erişilebilir kılalım
window.showDesktopNotification = showDesktopNotification;
