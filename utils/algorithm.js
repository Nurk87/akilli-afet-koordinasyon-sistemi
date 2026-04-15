// utils/algorithm.js

/**
 * İki coğrafi koordinat arasındaki mesafeyi kilometre cinsinden hesaplar (Haversine Formülü).
 * @param {number} lat1 - Nokta 1 Enlem
 * @param {number} lon1 - Nokta 1 Boylam
 * @param {number} lat2 - Nokta 2 Enlem
 * @param {number} lon2 - Nokta 2 Boylam
 * @returns {number} Mesafe (KM)
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  
  // Koordinatları float'a çevir ve doğrula
  const pLat1 = parseFloat(String(lat1).replace(',', '.'));
  const pLon1 = parseFloat(String(lon1).replace(',', '.'));
  const pLat2 = parseFloat(String(lat2).replace(',', '.'));
  const pLon2 = parseFloat(String(lon2).replace(',', '.'));

  if (isNaN(pLat1) || isNaN(pLon1) || isNaN(pLat2) || isNaN(pLon2)) return Infinity;

  // Dünya sınırları kontrolü
  if (Math.abs(pLat1) > 90 || Math.abs(pLat2) > 90 || Math.abs(pLon1) > 180 || Math.abs(pLon2) > 180) {
    return Infinity;
  }

  const R = 6371; 
  const dLat = (pLat2 - pLat1) * (Math.PI / 180);
  const dLon = (pLon2 - pLon1) * (Math.PI / 180);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(pLat1 * (Math.PI / 180)) * Math.cos(pLat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}

/**
 * Yardım talebinin öncelik skorunu hesaplar.
 * Yeni Formül: (Aciliyet * 0.5) + (Mesafe_Skoru * 0.3) + (Bekleme_Suresi_Skoru * 0.2)
 * 
 * @param {string} oncelik_enum - acil|yuksek|orta|dusuk
 * @param {number} distance_km - Gönüllüye olan mesafe
 * @param {Date|string} createdAt - Talebin oluşturulma tarihi
 */
function calculatePriorityScore(oncelik_enum, distance_km, createdAt) {
  // 1. Aciliyet Skoru (%50)
  let aciliyetSkoru = 0;
  switch(oncelik_enum) {
    case 'acil': aciliyetSkoru = 100; break;
    case 'yuksek': aciliyetSkoru = 75; break;
    case 'orta': aciliyetSkoru = 50; break;
    case 'dusuk': aciliyetSkoru = 25; break;
    default: aciliyetSkoru = 50;
  }
  
  // 2. Mesafe Skoru (%30)
  // Mesafe arttıkça skor hiperbolik olarak düşer. 0 km = 100 puan.
  const mesafeSkoru = (1 / (distance_km + 1)) * 100; 
  
  // 3. Bekleme Süresi (Aging) Skoru (%20)
  let beklemeSkoru = 0;
  if (createdAt) {
    const start = new Date(createdAt);
    const now = new Date();
    const gecenDakika = Math.max(0, (now - start) / (1000 * 60));
    
    // Her saat için +10 puan, 10 saatte max 100 puana ulaşır.
    beklemeSkoru = Math.min(100, (gecenDakika / 60) * 10);
  }
  
  const toplamSkor = (aciliyetSkoru * 0.5) + (mesafeSkoru * 0.3) + (beklemeSkoru * 0.2);
  return parseFloat(toplamSkor.toFixed(2));
}

/**
 * Greedy Algorithm Tabanlı Atama Motoru
 * 
 * @param {Array} talepler - [{id, enlem, boylam, oncelik, olusturulma_tarihi}]
 * @param {Array} gonulluler - [{id, enlem, boylam, kapasite}]
 */
function assignRequestsGreedy(talepler, gonulluler) {
  let assignments = [];
  
  let availableVolunteers = gonulluler
    .filter(g => g.kapasite && g.kapasite > 0)
    .map(g => ({ ...g }));
    
  // Önce talepleri bir ön skorlamadan geçirelim (Mesafe bağımsız, sadece aciliyet ve bekleme süresi)
  // Bu, en kritik vakaların ilk işlenmesini sağlar.
  const sortedTalepler = [...talepler].sort((a, b) => {
    const rawScoreA = calculatePriorityScore(a.oncelik, 0, a.olusturulma_tarihi);
    const rawScoreB = calculatePriorityScore(b.oncelik, 0, b.olusturulma_tarihi);
    return rawScoreB - rawScoreA;
  });

  for (let talep of sortedTalepler) {
    if (availableVolunteers.length === 0) break;
    
    let bestMatch = null;
    let bestScore = -1;
    let bestDistance = Infinity;
    let selectedIndex = -1;
    
    for (let i = 0; i < availableVolunteers.length; i++) {
        const v = availableVolunteers[i];
        const distance = calculateHaversineDistance(talep.enlem, talep.boylam, v.enlem, v.boylam);
        const score = calculatePriorityScore(talep.oncelik, distance, talep.olusturulma_tarihi);
        
        if (score > bestScore) {
            bestScore = score;
            bestDistance = distance;
            bestMatch = v;
            selectedIndex = i;
        }
    }
    
    if (bestMatch) {
      assignments.push({
        talep_id: talep.id,
        gonullu_id: bestMatch.id,
        mesafe_km: bestDistance.toFixed(2),
        oncelik_skoru: bestScore
      });
      
      availableVolunteers[selectedIndex].kapasite -= 1;
      if (availableVolunteers[selectedIndex].kapasite <= 0) {
        availableVolunteers.splice(selectedIndex, 1);
      }
    }
  }
  
  return assignments;
}

module.exports = {
  calculateHaversineDistance,
  calculatePriorityScore,
  assignRequestsGreedy
};
