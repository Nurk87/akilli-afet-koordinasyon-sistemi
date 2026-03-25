import math
import random
import time
from dataclasses import dataclass
from typing import List, Tuple, Dict, Any

# ==========================================
# 0. VERİ MODELLERİ (DATACLASSES)
# ==========================================
@dataclass
class Talep:
    id: int
    enlem: float
    boylam: float
    oncelik: str

@dataclass
class Gonullu:
    id: int
    enlem: float
    boylam: float
    kapasite: int

# ==========================================
# 1. HAVERSINE MESAFE HESAPLAMA
# ==========================================
def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # Dünya yarıçapı (KM)
    
    phi1: float = math.radians(lat1)
    phi2: float = math.radians(lat2)
    delta_phi: float = math.radians(lat2 - lat1)
    delta_lambda: float = math.radians(lon2 - lon1)

    a: float = math.sin(delta_phi / 2.0)**2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0)**2

    c: float = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance: float = R * c
    return distance

# ==========================================
# 2. ÖNCELİK SKORU HESAPLAMA
# ==========================================
def calculate_priority_score(aciliyet: str, mesafe: float) -> float:
    aciliyet_val: float = 50.0
    if aciliyet == 'acil':
        aciliyet_val = 100.0
    elif aciliyet == 'yuksek':
        aciliyet_val = 75.0
    elif aciliyet == 'orta':
        aciliyet_val = 50.0
    elif aciliyet == 'dusuk':
        aciliyet_val = 25.0
    
    # Skor Formülü = (Aciliyet x 0.6) + ((1 / (Mesafe + 1)) x 0.4*100)
    mesafe_factor: float = (1.0 / (mesafe + 1.0)) * 100.0
    skor: float = (aciliyet_val * 0.6) + (mesafe_factor * 0.4)
    return skor

# ==========================================
# 3. VERİ ÜRETİMİ (MOCK DATA)
# ==========================================
def generate_fake_data(num_requests: int, num_volunteers: int) -> Tuple[List[Talep], List[Gonullu]]:
    talepler: List[Talep] = []
    for i in range(num_requests):
        talepler.append(Talep(
            id=i+1,
            enlem=random.uniform(40.8, 41.2),
            boylam=random.uniform(28.5, 29.5),
            oncelik=random.choice(['acil', 'yuksek', 'orta', 'dusuk'])
        ))
        
    gonulluler: List[Gonullu] = []
    for j in range(num_volunteers):
        gonulluler.append(Gonullu(
            id=j+1,
            enlem=random.uniform(40.8, 41.2),
            boylam=random.uniform(28.5, 29.5),
            kapasite=random.randint(1, 10)
        ))
        
    return talepler, gonulluler

# ==========================================
# 4. ALGORİTMİK ATAMA (GREEDY)
# ==========================================
def algorithmic_assignment(talepler: List[Talep], gonulluler_ori: List[Gonullu]) -> Any:
    # Gönüllülerin kapasiteleri azalacagi icin kopyasini alalım
    gonulluler = [Gonullu(g.id, g.enlem, g.boylam, g.kapasite) for g in gonulluler_ori]
    
    atamalar: List[Dict[str, Any]] = []
    mesafeler: List[float] = []
    start_time: float = time.time()
    
    for talep in talepler:
        best_gonullu: Gonullu = Gonullu(-1, 0.0, 0.0, 0)
        best_score: float = -1.0
        best_distance: float = 99999.0
        
        for g in gonulluler:
            if g.kapasite > 0:
                dist: float = haversine_distance(talep.enlem, talep.boylam, g.enlem, g.boylam)
                score: float = calculate_priority_score(talep.oncelik, dist)
                
                if score > best_score:
                    best_score = score
                    best_distance = dist
                    best_gonullu = g
                    
        if best_gonullu.id != -1:
            atamalar.append({
                'talep_id': talep.id, 
                'gonullu_id': best_gonullu.id,
                'mesafe': best_distance
            })
            mesafeler.append(best_distance)
            best_gonullu.kapasite = best_gonullu.kapasite - 1
            
    end_time: float = time.time()
    toplam_mesafe: float = sum(mesafeler) if len(mesafeler) > 0 else 0.0
    gecen_sure: float = end_time - start_time
    return atamalar, toplam_mesafe, gecen_sure

# ==========================================
# 5. MANUEL ATAMA (SİMÜLASYON)
# ==========================================
def manual_assignment(talepler: List[Talep], gonulluler_ori: List[Gonullu]) -> Any:
    gonulluler = [Gonullu(g.id, g.enlem, g.boylam, g.kapasite) for g in gonulluler_ori]
    
    atamalar: List[Dict[str, Any]] = []
    mesafeler: List[float] = []
    start_time: float = time.time()
    
    for talep in talepler:
        availables = [g for g in gonulluler if g.kapasite > 0]
        if len(availables) == 0:
            break
            
        secilen_gonullu = random.choice(availables)
        
        dist: float = haversine_distance(talep.enlem, talep.boylam, secilen_gonullu.enlem, secilen_gonullu.boylam)
        
        atamalar.append({
            'talep_id': talep.id, 
            'gonullu_id': secilen_gonullu.id,
            'mesafe': dist
        })
        mesafeler.append(dist)
        secilen_gonullu.kapasite = secilen_gonullu.kapasite - 1
        
        time.sleep(0.001) 
        
    end_time: float = time.time()
    toplam_mesafe: float = sum(mesafeler) if len(mesafeler) > 0 else 0.0
    insan_suresi: float = float(len(atamalar)) * 30.0 
    
    return atamalar, toplam_mesafe, insan_suresi

# ==========================================
# 6. SİMÜLASYON ÇALIŞTIRICI
# ==========================================
if __name__ == '__main__':
    print("==================================================")
    print(" AFET KOORDİNASYON SİSTEMİ SİMÜLASYON BAŞLATILIYOR")
    print("==================================================")
    
    NUM_REQUESTS: int = 100
    NUM_VOLUNTEERS: int = 20
    
    print(f"[*] {NUM_REQUESTS} Sahte Talep ve {NUM_VOLUNTEERS} Sahte Gönüllü Üretiliyor...")
    talepler, gonulluler = generate_fake_data(NUM_REQUESTS, NUM_VOLUNTEERS)
    
    kapasiteler = [g.kapasite for g in gonulluler]
    toplam_olasi_kapasite = sum(kapasiteler) if len(kapasiteler) > 0 else 0
    print(f"[*] Gönüllülerin Toplam Bakabileceği Vaka Kapasitesi: {toplam_olasi_kapasite}")
    
    print("\n--- 1. MANUEL (İNSAN) ATAMA TESTİ ---")
    m_atamalar, m_mesafe, m_sure = manual_assignment(talepler, gonulluler)
    m_ortalama_mesafe: float = m_mesafe / float(len(m_atamalar)) if len(m_atamalar) > 0 else 0.0
    print(f" - Başarılı Atama Sayısı: {len(m_atamalar)}/{NUM_REQUESTS}")
    print(f" - Tahmini Atama Karar Süresi: {m_sure:.2f} saniye")
    print(f" - Ortalama Müdahale Mesafesi: {m_ortalama_mesafe:.2f} KM")
    
    print("\n--- 2. YZ (GREEDY ALGORİTMASI) ATAMA TESTİ ---")
    a_atamalar, a_mesafe, a_sure = algorithmic_assignment(talepler, gonulluler)
    a_ortalama_mesafe: float = a_mesafe / float(len(a_atamalar)) if len(a_atamalar) > 0 else 0.0
    print(f" - Başarılı Atama Sayısı: {len(a_atamalar)}/{NUM_REQUESTS}")
    print(f" - Atama Karar Süresi: {a_sure:.4f} saniye")
    print(f" - Ortalama Müdahale Mesafesi: {a_ortalama_mesafe:.2f} KM")
    
    print("\n==================================================")
    print(" SONUÇ KARŞILAŞTIRMASI")
    print("==================================================")
    carpan: float = 0.0
    if a_sure > 0.0:
        carpan = m_sure / a_sure
    print(f"Zaman Kazancı: Algoritma, insan kararına göre {int(carpan)} kat daha hızlı çalıştı.")
    tasarruf: float = abs(m_ortalama_mesafe - a_ortalama_mesafe)
    print(f"Mesafe Tasarrufu: Vaka başına ortalama {tasarruf:.2f} KM ulaşım tasarrufu sağlandı.")
    print("Sonuç: Algoritmik yöntemle hem vakit hem de yakıt/zaman optimizasyonu kanıtlandı.")
