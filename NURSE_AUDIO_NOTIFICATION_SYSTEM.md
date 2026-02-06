# Ovozli Ogohlantirish Tizimi (Audio Notification System)

## Umumiy Ma'lumot

Statsionar va Ambulatorxona sahifalari uchun alohida ovozli ogohlantirish tizimi qo'shildi. Har bir bo'lim o'z ovoz tizimiga ega va mustaqil ravishda yoqiladi/o'chiriladi.

## Xususiyatlar

### 1. Alohida Ovoz Tizimi
- **Statsionar (Inpatient)**: O'z ovoz tizimi
- **Ambulatorxona (AmbulatorRoom)**: O'z ovoz tizimi
- Har bir sahifa o'z localStorage kalitiga ega:
  - `inpatient_audio_enabled` - Statsionar uchun
  - `ambulator_audio_enabled` - Ambulatorxona uchun

### 2. Ovoz Chiqarish Holatlari

#### Bemor Chaqiruvi
- Bemor hamshirani chaqirganda ovoz chiqadi
- Faqat o'sha bo'limga tegishli chaqiruvlar eshitiladi:
  - Statsionar sahifasida faqat Statsionar bemorlarining chaqiruvlari
  - Ambulatorxona sahifasida faqat Ambulatorxona bemorlarining chaqiruvlari

#### Muolaja Vaqti
- Bemorning muolaja vaqti kelganda ovoz chiqadi
- Barcha muolaja vaqtlari uchun ovoz chiqadi (bo'limdan qat'iy nazar)

### 3. Ovoz Parametrlari

```javascript
const duration = 30; // 30 soniya
const beepInterval = 0.5; // 0.5 soniya orasida
const beepDuration = 0.3; // 0.3 soniya davomida
const frequencies = [800, 1000]; // Hz (budilnik kabi)
```

### 4. Ovoz Tugmasi

Har bir sahifaning tepasida (header) ovoz tugmasi mavjud:
- **Yoqilgan**: Yashil rang, "🔊 Ovoz yoqilgan"
- **O'chirilgan**: Oq/shaffof rang, "🔇 Ovoz o'chirilgan"
- Tugmani bosganda test ovozi chiqadi

## Texnik Tafsilotlar

### Frontend (React)

#### State Management
```javascript
const [audioEnabled, setAudioEnabled] = useState(() => {
  return localStorage.getItem('inpatient_audio_enabled') === 'true';
});
const audioRef = useRef(null);
const audioTimeoutRef = useRef(null);
```

#### WebSocket Listeners
```javascript
socket.on('nurse-call', (data) => {
  if (audioEnabled && data.department === 'Statsionar') {
    playAlarmSound();
  }
});

socket.on('treatment-notification', (data) => {
  if (audioEnabled) {
    playAlarmSound();
  }
});
```

#### Audio Functions
- `toggleAudio()`: Ovozni yoqish/o'chirish
- `playAlarmSound()`: 30 soniya davomida budilnik ovozini chiqarish

### Backend (Node.js)

#### WebSocket Events
- `nurse-call`: Bemor chaqiruvi
- `treatment-notification`: Muolaja vaqti

#### Bot Routes
- `/api/v1/bot/call-nurse`: Hamshirani chaqirish
- WebSocket orqali frontend'ga xabar yuboradi

#### Treatment Notification Service
- Har 1 daqiqada tekshiradi
- Keyingi 5 daqiqada muolaja vaqti kelgan bemorlarni topadi
- Hamshiralarga Telegram va WebSocket orqali xabar yuboradi

## Foydalanish

### Hamshira uchun

1. **Statsionar sahifasiga kirish**
   - Tepada "Ovoz o'chirilgan" tugmasini bosing
   - Ovoz yoqiladi va test ovozi chiqadi
   - Endi bemor chaqirsa yoki muolaja vaqti kelsa ovoz chiqadi

2. **Ambulatorxona sahifasiga kirish**
   - Xuddi shu tarzda ovozni yoqing
   - Bu sahifa faqat Ambulatorxona bemorlarining chaqiruvlarini eshitadi

3. **Ovozni o'chirish**
   - Istalgan vaqtda tugmani bosib ovozni o'chirish mumkin
   - Sozlama localStorage'da saqlanadi

### Admin uchun

Ovoz tizimi avtomatik ishlaydi. Qo'shimcha sozlash kerak emas.

## Xatoliklarni Bartaraf Etish

### Ovoz chiqmayapti
1. Brauzer ovozga ruxsat berganini tekshiring
2. Ovoz tugmasi yoqilganini tekshiring
3. WebSocket ulanganini tekshiring (Console'da "✅ WebSocket connected" xabari bo'lishi kerak)
4. Backend ishlab turganini tekshiring

### Noto'g'ri bo'limdan ovoz chiqadi
- Backend'da `department` to'g'ri yuborilayotganini tekshiring
- Frontend'da `data.department === 'Statsionar'` yoki `'Ambulatorxona'` shartini tekshiring

### Ovoz to'xtamayapti
- Ovoz avtomatik 30 soniyadan keyin to'xtaydi
- Agar to'xtamasa, sahifani yangilang

## Fayl Joylashuvi

### Frontend
- `frontend/src/pages/Inpatient.jsx` - Statsionar sahifasi
- `frontend/src/pages/AmbulatorRoom.jsx` - Ambulatorxona sahifasi

### Backend
- `backend/src/routes/bot.routes.js` - Bot API routes
- `backend/src/services/treatmentNotificationService.js` - Muolaja xabarnomasi xizmati

## Kelajakda Qo'shilishi Mumkin

1. Ovoz balandligini sozlash
2. Turli ovoz turlari (budilnik, qo'ng'iroq, signal)
3. Ovoz davomiyligini sozlash
4. Ovozni faqat ma'lum vaqtlarda yoqish (masalan, ish vaqtida)
5. Ovoz tarixini ko'rish

## Versiya

- **Versiya**: 1.0
- **Sana**: 2026-02-06
- **Muallif**: Kiro AI Assistant
