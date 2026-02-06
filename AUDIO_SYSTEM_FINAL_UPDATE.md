# Audio Notification System - Final Update

## O'ZGARISHLAR

### 1. Timer Audio Notification (YANGI!)
Koykadagi kamayuvchi vaqt (treatment timer) 0 ga yetganda avtomatik ravishda ovoz chiqadi.

**Qanday ishlaydi:**
- Har bir koykada muolaja vaqti kelishiga 30 daqiqa qolganda timer ko'rinadi
- Timer 0:00 ga yetganda:
  - ✅ Ovoz avtomatik chiqadi (agar yoqilgan bo'lsa)
  - ✅ Toast xabari ko'rsatiladi: "⏰ MUOLAJA VAQTI! [Dori nomi]"
  - ✅ Console'da log yoziladi

**Fayl o'zgarishlari:**
- `frontend/src/components/TreatmentTimer.jsx` - Timer 0 ga yetganda ovoz chiqarish
- `frontend/src/components/BedTreatmentWrapper.jsx` - Audio props'larni qabul qilish
- `frontend/src/pages/Inpatient.jsx` - Audio props'larni o'tkazish
- `frontend/src/pages/AmbulatorRoom.jsx` - Audio props'larni o'tkazish

### 2. Audio Notification Locations

**Ovoz qayerda chiqadi:**
1. ✅ Bemor hamshirani chaqirganda (Telegram bot orqali)
2. ✅ Muolaja vaqti kelganda (WebSocket orqali)
3. ✅ **YANGI:** Koykadagi timer 0 ga yetganda

**Ovoz qayerda CHIQMAYDI:**
- ❌ Hamshira Paneli (NursePanel) - faqat Statsionar va Ambulatorxona sahifalarida

### 3. Audio Toggle Button
Har bir sahifada (Statsionar va Ambulatorxona) alohida audio toggle tugmasi bor:
- 🔊 Yashil - Ovoz yoqilgan
- 🔇 Kulrang - Ovoz o'chirilgan
- LocalStorage'da saqlanadi (sahifa yangilanganda ham eslab qoladi)

### 4. Audio File
- **Fayl:** `/sounds/sound.mp3`
- **Ovoz balandligi:** 80%
- **Davomiyligi:** 30 soniya (loop bilan)

## TEST QILISH

### 1. Timer Audio Test
```bash
# 1. Frontend'ni ishga tushiring
cd frontend
npm run dev

# 2. Statsionar yoki Ambulatorxona sahifasiga kiring
# 3. Ovozni yoqing (🔊 tugmasi)
# 4. Bemorga muolaja belgilang (vaqti yaqin bo'lsin, masalan 2-3 daqiqadan keyin)
# 5. Timer 0:00 ga yetganda ovoz chiqishi kerak
```

### 2. Bemor Chaqiruvi Test
```bash
# Telegram bot orqali hamshirani chaqiring
# Ovoz chiqishi kerak (agar yoqilgan bo'lsa)
```

### 3. WebSocket Treatment Notification Test
```bash
# Backend'da treatment notification service ishlayotganini tekshiring
# Muolaja vaqti kelganda ovoz chiqishi kerak
```

## DEBUG

Agar ovoz chiqmasa:

1. **Console'ni tekshiring:**
   ```
   🔘 toggleAudio clicked
   🔊 playAlarmSound called
   🎵 Creating audio with path: /sounds/sound.mp3
   ▶️ Attempting to play audio...
   ✅ Audio playing successfully!
   ```

2. **Audio fayl mavjudligini tekshiring:**
   - `frontend/public/sounds/sound.mp3` fayli bor bo'lishi kerak

3. **Browser ruxsatini tekshiring:**
   - Chrome: Settings > Site Settings > Sound
   - Sahifaga birinchi marta kirganda biror tugmani bosing (browser audio'ni avtomatik bloklaydi)

4. **Audio toggle yoqilganligini tekshiring:**
   - Statsionar: localStorage.getItem('inpatient_audio_enabled') === 'true'
   - Ambulatorxona: localStorage.getItem('ambulator_audio_enabled') === 'true'

## TEXNIK TAFSILOTLAR

### TreatmentTimer Component
```jsx
// Timer 0 ga yetganda:
if (minutesLeft === 0 && secondsLeft <= 3) {
  // Ovoz chiqarish
  if (audioEnabled && playAlarmSound) {
    playAlarmSound();
  }
  
  // Toast ko'rsatish
  toast.success('⏰ MUOLAJA VAQTI!');
}
```

### Audio Props Flow
```
Inpatient/AmbulatorRoom (audio state)
  ↓ audioEnabled, playAlarmSound
BedTreatmentWrapper (props pass-through)
  ↓ audioEnabled, playAlarmSound
TreatmentTimer (audio trigger)
```

## DEPLOYMENT

```bash
# 1. Frontend build
cd frontend
npm run build

# 2. Backend restart (agar kerak bo'lsa)
cd ../backend
pm2 restart backend

# 3. Frontend deploy
# dist/ papkasini serverga ko'chiring
```

## XULOSA

✅ Timer 0 ga yetganda ovoz chiqadi
✅ Bemor chaqirganda ovoz chiqadi
✅ Muolaja vaqti kelganda ovoz chiqadi
✅ Har bir sahifada alohida audio toggle
✅ LocalStorage'da saqlanadi
✅ 30 soniya davomida chaladi
✅ Console'da debug log'lar

Ovoz tizimi to'liq ishlaydi! 🎉
