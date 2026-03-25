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
  
  const R = 6371; // Dünya'nın yarıçapı (KM)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // KM cinsinden
  
  return distance;
}

/**
 * Yardim talebinin oncelik skorunu hesaplar.
 * Formül: (Aciliyet * 0.6) + ((1 / (Mesafe + 1)) * 0.4)
 * Aciliyet seviyesi: acil=100, yuksek=75, orta=50, dusuk=25
 */
function calculatePriorityScore(oncelik_enum, distance_km) {
  let aciliyetSkoru = 0;
  
  switch(oncelik_enum) {
    case 'acil': aciliyetSkoru = 100; break;
    case 'yuksek': aciliyetSkoru = 75; break;
    case 'orta': aciliyetSkoru = 50; break;
    case 'dusuk': aciliyetSkoru = 25; break;
    default: aciliyetSkoru = 50;
  }
  
  // Mesafenin matematikte sonsuza veya tanımsıza gitmemesi için (Mesafe + 1) yapıyoruz.
  // En yakın mesafe en yüksek skoru verecek.
  const mesafeNormalize = (1 / (distance_km + 1)) * 100; 
  
  return (aciliyetSkoru * 0.6) + (mesafeNormalize * 0.4);
}

/**
 * Greedy Algorithm Tabanlı Atama Motoru
 * Kurallar:
 * 1. Talepler, her bir gönüllü için öncelik skoruna göre hesaplanır.
 * 2. Her talep için sistemdeki en uygun (en yüksek skorlu ve kapasitesi olan) gönüllü seçilir.
 * 3. Gönüllünün kapasitesi atama yapıldıkça azalır.
 * 
 * @param {Array} talepler - Bekleyen talepler listesi [{id, enlem, boylam, oncelik}]
 * @param {Array} gonulluler - Müsait gönüllüler listesi [{id, enlem, boylam, kapasite, ...}]
 * @returns {Array} Atama sonuçları [{talep_id, gonullu_id, mesafe_km, oncelik_skoru}]
 */
function assignRequestsGreedy(talepler, gonulluler) {
  let assignments = [];
  
  // Gönüllülerin kopya referanslarını alalım ki kapasitelerini işlem esnasında düşürebilelim.
  // Kapasitesi 0 veya boş olanları filtreliyoruz
  let availableVolunteers = gonulluler
    .filter(g => g.kapasite && g.kapasite > 0)
    .map(g => ({ ...g }));
    
  // Talepleri teker teker dolaşıyoruz
  // Her talep için mevcut gönüllülerle olan skorunu hesaplayıp en yüksek skorluyu buluyoruz.
  // Öncelik Skoru, o anki mesafeye ve aciliyete bağımlı olduğundan dinamik hesaplanır.
  
  for (let talep of talepler) {
    if (availableVolunteers.length === 0) {
      break; // Atanacak gönüllü kalmadı
    }
    
    let bestMatch = null;
    let bestScore = -1;
    let bestDistance = Infinity;
    let selectedVolunteerIndex = -1;
    
    for (let i = 0; i < availableVolunteers.length; i++) {
      let v = availableVolunteers[i];
      let distance = calculateHaversineDistance(talep.enlem, talep.boylam, v.enlem, v.boylam);
      let score = calculatePriorityScore(talep.oncelik, distance);
      
      if (score > bestScore) {
        bestScore = score;
        bestDistance = distance;
        bestMatch = v;
        selectedVolunteerIndex = i;
      }
    }
    
    // Eğer uygun bir gönüllü bulduysak atama yapalım
    if (bestMatch) {
      assignments.push({
        talep_id: talep.id,
        gonullu_id: bestMatch.id,
        mesafe_km: bestDistance.toFixed(2),
        oncelik_skoru: bestScore.toFixed(2)
      });
      
      // Gönüllünün kapasitesini 1 azaltıyoruz
      availableVolunteers[selectedVolunteerIndex].kapasite -= 1;
      
      // Kapasitesi 0'a ulaştıysa müsait gönüllülerden çıkartıyoruz
      if (availableVolunteers[selectedVolunteerIndex].kapasite <= 0) {
        availableVolunteers.splice(selectedVolunteerIndex, 1);
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
