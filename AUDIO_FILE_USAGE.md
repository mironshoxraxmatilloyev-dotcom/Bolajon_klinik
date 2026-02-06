# Audio Fayl Ishlatish - Yo'riqnoma

## 📁 Audio Fayl Ma'lumotlari

**Fayl nomi**: `soundreality-phone-ringtone-normal-444775.mp3`
**Joylashuv**: `frontend/public/sounds/`
**To'liq yo'l**: `frontend/public/sounds/soundreality-phone-ringtone-normal-444775.mp3`

## 🎵 Audio Parametrlari

```javascript
const audio = new Audio('/sounds/soundreality-phone-ringtone-normal-444775.mp3');
audio.volume = 0.7; // 70% ovoz balandligi
audio.loop = true; // Takrorlansin (30 soniya davomida)
```

## 🔧 Qanday Ishlaydi?

### 1. Audio Obyekt Yaratish
```javascript
const audio = new Audio('/sounds/soundreality-phone-ringtone-normal-444775.mp3');
```

### 2. Ovoz Balandligini Sozlash
```javascript
audio.volume = 0.7; // 0.0 (jim) dan 1.0 (maksimal) gacha
```

### 3. Loop (Takrorlash)
```javascript
audio.loop = true; // Ovoz takrorlanadi
```

### 4. Ovozni Boshlash
```javascript
audio.play().catch(error => {
  console.error('Audio play error:', error);
});
```

### 5. Ovozni To'xtatish
```javascript
audio.pause();
audio.currentTime = 0; // Boshiga qaytarish
```

### 6. 30 Soniyadan Keyin Avtomatik To'xtatish
```javascript
setTimeout(() => {
  audio.pause();
  audio.currentTime = 0;
}, 30000); // 30 seconds
```

## 📊 Statsionar va Ambulatorxona

Har ikkala sahifada ham xuddi shu audio fayl ishlatiladi:
- `frontend/src/pages/Inpatient.jsx` - Statsionar
- `frontend/src/pages/AmbulatorRoom.jsx` - Ambulatorxona

## 🎯 Test Qilish

### 1. Ovozni Yoqish
1. Statsionar yoki Ambulatorxona sahifasiga kiring
2. Tepada "Ovoz o'chirilgan" tugmasini bosing
3. ✅ Telefon qo'ng'irog'i ovozi chiqishi kerak

### 2. Bemor Chaqiruvi
1. Telegram botdan bemor chaqiruvini yuboring
2. ✅ Telefon qo'ng'irog'i ovozi 30 soniya davom etishi kerak

### 3. Muolaja Vaqti
1. Bemorga muolaja vaqtini belgilang
2. ✅ Vaqt kelganda telefon qo'ng'irog'i ovozi chiqishi kerak

## 🔊 Ovoz Balandligini O'zgartirish

Agar ovoz juda baland yoki juda past bo'lsa, `volume` qiymatini o'zgartiring:

```javascript
audio.volume = 0.5; // 50% - pastroq
audio.volume = 0.7; // 70% - o'rtacha (hozirgi)
audio.volume = 1.0; // 100% - maksimal
```

## 🎵 Boshqa Audio Fayl Ishlatish

Agar boshqa audio fayl ishlatmoqchi bo'lsangiz:

1. Audio faylni `frontend/public/sounds/` papkasiga qo'ying
2. Kodni yangilang:

```javascript
// Inpatient.jsx va AmbulatorRoom.jsx da
const audio = new Audio('/sounds/YANGI_FAYL_NOMI.mp3');
```

## ⚠️ Muhim Eslatmalar

### Brauzer Ruxsati
- Zamonaviy brauzerlar foydalanuvchi biror narsa bosmagunicha ovoz chiqarishga ruxsat bermaydi
- Shuning uchun birinchi marta ovoz tugmasini bosish kerak

### Audio Fayl Formati
- ✅ MP3 - barcha brauzerlar qo'llab-quvvatlaydi
- ✅ WAV - sifatli lekin katta hajm
- ✅ OGG - yaxshi siqilgan
- ❌ FLAC - brauzerlar qo'llab-quvvatlamaydi

### Fayl Hajmi
- Hozirgi fayl: ~100KB (yaxshi)
- Tavsiya: 500KB dan kam
- Sabab: Tez yuklanishi uchun

## 🐛 Xatoliklarni Bartaraf Etish

### Ovoz chiqmayapti?
1. Console'ni oching (F12)
2. Xatolik bormi tekshiring
3. Brauzer ruxsat berganini tekshiring
4. Audio fayl to'g'ri joyda ekanini tekshiring:
   ```
   frontend/public/sounds/soundreality-phone-ringtone-normal-444775.mp3
   ```

### "Audio play error" xatoligi?
- Brauzer ovozga ruxsat bermagan
- Birinchi marta ovoz tugmasini bosing
- Keyin avtomatik ishlaydi

### Ovoz juda baland/past?
- `audio.volume` qiymatini o'zgartiring (0.0 - 1.0)

### Ovoz takrorlanmayapti?
- `audio.loop = true` qo'yilganini tekshiring

## 📝 Kod Misoli

To'liq kod misoli:

```javascript
const playAlarmSound = () => {
  // Avvalgi ovozni to'xtatish
  if (audioRef.current) {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  }
  
  // Yangi audio yaratish
  const audio = new Audio('/sounds/soundreality-phone-ringtone-normal-444775.mp3');
  audio.volume = 0.7;
  audio.loop = true;
  
  audioRef.current = audio;
  
  // Ovozni boshlash
  audio.play().catch(error => {
    console.error('Audio play error:', error);
    toast.error('Ovozni chiqarib bo\'lmadi');
  });
  
  // 30 soniyadan keyin to'xtatish
  audioTimeoutRef.current = setTimeout(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, 30000);
};
```

## ✅ Tayyor!

Audio tizimi to'liq ishlaydi va test qilishga tayyor!

---

**Sana**: 2026-02-06
**Versiya**: 1.0 (Audio File)
