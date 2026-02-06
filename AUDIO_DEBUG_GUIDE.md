# Ovoz Chiqmasligi Muammosini Hal Qilish

## 🔍 Debug Qilish

### 1. Console'ni Oching
1. Brauzerda F12 ni bosing
2. "Console" tab'ini oching
3. Ovoz tugmasini bosing
4. Console'da quyidagi xabarlarni ko'ring:

```
🔘 toggleAudio clicked, current state: false
🔘 New audio state: true
🎵 Playing test sound...
🔊 playAlarmSound called
🎵 Creating audio with path: /sounds/soundreality-phone-ringtone-normal-444775.mp3
▶️ Attempting to play audio...
✅ Audio playing successfully!
```

### 2. Xatoliklarni Tekshirish

#### A. Agar "Audio play error" ko'rsatsa:
```
❌ Audio play error: NotAllowedError
```

**Sabab**: Brauzer ovozga ruxsat bermagan

**Yechim**:
1. Brauzer sozlamalarini oching
2. Site Settings → Sound → Allow
3. Sahifani yangilang va qayta urinib ko'ring

#### B. Agar "404 Not Found" ko'rsatsa:
```
❌ GET http://localhost:3001/sounds/soundreality-phone-ringtone-normal-444775.mp3 404
```

**Sabab**: Audio fayl topilmadi

**Yechim**:
1. Audio fayl joylashuvini tekshiring:
   ```
   frontend/public/sounds/soundreality-phone-ringtone-normal-444775.mp3
   ```
2. Fayl mavjudligini tekshiring
3. Frontend serverni qayta ishga tushiring

#### C. Agar hech narsa ko'rinmasa:
```
(Console bo'sh)
```

**Sabab**: JavaScript xatoligi yoki funksiya chaqirilmayapti

**Yechim**:
1. Sahifani yangilang (Ctrl+F5)
2. Cache'ni tozalang
3. Console'da xatolik bormi tekshiring

### 3. Audio Fayl Tekshirish

#### A. Fayl Mavjudligini Tekshirish
```bash
# Windows
dir frontend\public\sounds\

# Natija:
soundreality-phone-ringtone-normal-444775.mp3
```

#### B. Fayl Hajmini Tekshirish
- Agar fayl 0 KB bo'lsa, qayta yuklang
- Normal hajm: 50-200 KB

#### C. Fayl Formatini Tekshirish
- Format: MP3
- Agar boshqa format bo'lsa, MP3 ga o'zgartiring

### 4. Brauzer Ruxsatini Tekshirish

#### Chrome/Edge:
1. URL bar'da lock icon'ni bosing
2. Site settings
3. Sound → Allow
4. Sahifani yangilang

#### Firefox:
1. URL bar'da lock icon'ni bosing
2. Permissions
3. Autoplay → Allow Audio and Video
4. Sahifani yangilang

### 5. Audio Yo'lini Tekshirish

#### Network Tab'da Tekshirish:
1. F12 → Network tab
2. Ovoz tugmasini bosing
3. "soundreality-phone-ringtone-normal-444775.mp3" ni qidiring
4. Status: 200 OK bo'lishi kerak

Agar 404 bo'lsa:
- Fayl yo'li noto'g'ri
- Fayl mavjud emas

### 6. Audio Obyekt Tekshirish

Console'da:
```javascript
// Audio obyekt yaratish
const audio = new Audio('/sounds/soundreality-phone-ringtone-normal-444775.mp3');

// Audio xususiyatlarini tekshirish
console.log('Duration:', audio.duration);
console.log('Volume:', audio.volume);
console.log('Loop:', audio.loop);

// Ovozni boshlash
audio.play()
  .then(() => console.log('✅ Playing'))
  .catch(err => console.error('❌ Error:', err));
```

### 7. LocalStorage Tekshirish

Console'da:
```javascript
// Statsionar
localStorage.getItem('inpatient_audio_enabled')
// Natija: "true" yoki "false"

// Ambulatorxona
localStorage.getItem('ambulator_audio_enabled')
// Natija: "true" yoki "false"
```

Agar "null" bo'lsa:
- Ovoz hali yoqilmagan
- Tugmani bosing

### 8. WebSocket Tekshirish

Console'da:
```javascript
// WebSocket ulanishini tekshirish
// Quyidagi xabar ko'rinishi kerak:
✅ WebSocket connected
```

Agar ko'rinmasa:
- Backend ishlamayapti
- WebSocket ulanishi yo'q

## 🔧 Tez Yechimlar

### Yechim 1: Cache Tozalash
```
Ctrl + Shift + Delete
→ Cached images and files
→ Clear data
```

### Yechim 2: Hard Refresh
```
Ctrl + F5
```

### Yechim 3: Incognito Mode
```
Ctrl + Shift + N
```

Agar incognito'da ishlasa:
- Cache muammosi
- Extension muammosi

### Yechim 4: Boshqa Brauzer
- Chrome ishlamasa → Firefox
- Firefox ishlamasa → Edge

### Yechim 5: Frontend Qayta Ishga Tushirish
```bash
cd frontend
npm run dev
```

### Yechim 6: Audio Fayl Qayta Yuklash
1. Audio faylni o'chiring
2. Qayta yuklang
3. Frontend serverni qayta ishga tushiring

## 📋 Checklist

Quyidagilarni tekshiring:

- [ ] Audio fayl mavjud: `frontend/public/sounds/soundreality-phone-ringtone-normal-444775.mp3`
- [ ] Fayl hajmi: 50-200 KB
- [ ] Fayl formati: MP3
- [ ] Brauzer ovozga ruxsat bergan
- [ ] Console'da xatolik yo'q
- [ ] Network tab'da 200 OK
- [ ] WebSocket ulangan
- [ ] LocalStorage'da "true"
- [ ] Frontend server ishlayapti
- [ ] Backend server ishlayapti

## 🆘 Hali Ham Ishlamasa

### Console'dagi Barcha Xabarlarni Yuboring:
1. F12 → Console
2. Ovoz tugmasini bosing
3. Barcha xabarlarni copy qiling
4. Menga yuboring

### Network Tab'dagi Ma'lumotlarni Yuboring:
1. F12 → Network
2. Ovoz tugmasini bosing
3. "soundreality-phone-ringtone-normal-444775.mp3" ni toping
4. Screenshot oling
5. Menga yuboring

### Audio Fayl Ma'lumotlarini Yuboring:
```bash
# Windows
dir frontend\public\sounds\soundreality-phone-ringtone-normal-444775.mp3
```

Natijani menga yuboring.

---

**Eslatma**: Agar yuqoridagi yechimlarning hech biri ishlamasa, audio faylni boshqa formatda (WAV, OGG) sinab ko'ring yoki boshqa audio fayl ishlatib ko'ring.
