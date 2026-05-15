// utils/afad-api.js
// Bu modül, AFAD ve yerel yönetimlerin (İBB, vb.) açık veri portalı API'lerinden 
// güncel toplanma alanlarını canlı olarak çekmek için kullanılır.

/**
 * AFAD/İBB sisteminden güncel toplanma alanlarını çeker.
 * Şu an İBB Açık Veri Portalı (CKAN API) üzerinden İstanbul verilerini çekmektedir.
 * Tüm Türkiye için AFAD merkezi bir API sunduğunda link buraya entegre edilebilir.
 */
async function fetchAfadToplanmaAlanlari() {
    try {
        console.log('📡 AFAD/İBB Açık Veri Sistemine bağlanılıyor...');
        
        // İstanbul Büyükşehir Belediyesi Açık Veri Portalı - Toplanma Alanları API
        const IBB_API_URL = 'https://data.ibb.gov.tr/api/3/action/datastore_search?resource_id=c0b5e582-7f72-46a2-9442-5f653423719a&limit=500';
        
        const response = await fetch(IBB_API_URL);
        
        if (!response.ok) {
            throw new Error(`API Hatası: ${response.status}`);
        }

        const data = await response.json();
        const records = data.result.records;

        console.log(`✅ ${records.length} adet veri çekildi.`);

        // Gelen veriyi kendi sistem yapımıza dönüştürüyoruz
        const mappedData = records.map(item => ({
            ad: item.ALAN_ADI || 'Bilinmeyen Alan',
            tip: 'Toplanma Alanı', // İBB verisi sadece toplanma alanlarını içerir
            enlem: parseFloat(item.ENLEM),
            boylam: parseFloat(item.BOYLAM),
            kapasite: item.KAPASITE_KISI || 0,
            aciklama: `${item.ILCE_ADI} ilçesi, ${item.MAHALLE_ADI} mahallesi resmi toplanma alanı.`,
            aktif: 1
        }));

        return mappedData;

    } catch (error) {
        console.error('❌ AFAD/İBB Verisi Çekilemedi:', error.message);
        
        // Hata durumunda sistemin durmaması için boş dizi dönebilir 
        // veya son başarılı veriyi (cache) kullanabilirsiniz.
        throw error;
    }
}

module.exports = { fetchAfadToplanmaAlanlari };
