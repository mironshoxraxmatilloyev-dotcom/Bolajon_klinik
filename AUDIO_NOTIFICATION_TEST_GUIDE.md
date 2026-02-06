# Ovozli Ogohlantirish Tizimini Sinash (Audio Notification Test Guide)

## Test Qilish Uchun Qadamlar

### 1. Statsionar (Inpatient) Sahifasini Sinash

#### A. Ovozni Yoqish
1. Statsionar sahifasiga kiring
2. Tepada "Ovoz o'chirilgan" tugmasini bosing
3. ✅ Test ovozi chiqishi kerak (30 soniya budilnik ovozi)
4. ✅ Tugma "Ovoz yoqilgan" ga o'zgarishi kerak
5. ✅ Toast xabari: "🔊 Ovozli ogohlantirish yoqildi (Statsionar)"

#### B. Bemor Chaqiruvini Sinash
1. Telegram botga kiring (bemor sifatida)
2. Statsionar bo'limidagi bemorni tanlang
3. "Hamshirani chaqirish" tugmasini bosing
4. ✅ Statsionar sahifasida ovoz chiqishi kerak
5. ✅ Toast xabari ko'rinishi kerak: "🚨 BEMOR CHAQIRYAPTI!"
6. ✅ Console'da: "🔔 Nurse call received:"

#### C. Muolaja Vaqtini Sinash
1. Bemorga muolaja vaqtini yaqin vaqtga belgilang (masalan, 2 daqiqadan keyin)
2. 5 daqiqa kuting (service har 1 daqiqada tekshiradi)
3. ✅ Ovoz chiqishi kerak
4. ✅ Toast xabari: "⏰ Muolaja vaqti! [Bemor] - [Dori]"
5. ✅ Console'da: "⏰ Treatment notification received:"

#### D. Ovozni O'chirish
1. "Ovoz yoqilgan" tugmasini bosing
2. ✅ Tugma "Ovoz o'chirilgan" ga o'zgarishi kerak
3. ✅ Toast xabari: "🔇 Ovozli ogohlantirish o'chirildi (Statsionar)"
4. Bemor chaqirsa ovoz chiqmasligi kerak (faqat toast xabari)

### 2. Ambulatorxona (AmbulatorRoom) Sahifasini Sinash

#### A. Ovozni Yoqish
1. Ambulatorxona sahifasiga kiring
2. Tepada "Ovoz o'chirilgan" tugmasini bosing
3. ✅ Test ovozi chiqishi kerak
4. ✅ Tugma "Ovoz yoqilgan" ga o'zgarishi kerak
5. ✅ Toast xabari: "🔊 Ovozli ogohlantirish yoqildi (Ambulatorxona)"

#### B. Bemor Chaqiruvini Sinash
1. Telegram botga kiring (bemor sifatida)
2. Ambulatorxona bo'limidagi bemorni tanlang
3. "Hamshirani chaqirish" tugmasini bosing
4. ✅ Ambulatorxona sahifasida ovoz chiqishi kerak
5. ✅ Statsionar sahifasida ovoz chiqmasligi kerak (agar yoqilgan bo'lsa ham)

### 3. Bo'limlar Orasidagi Ajratishni Sinash

#### Test Scenariosi
1. Ikkita brauzer oynasini oching:
   - Oyna 1: Statsionar sahifasi (ovoz yoqilgan)
   - Oyna 2: Ambulatorxona sahifasi (ovoz yoqilgan)

2. Statsionar bemorini chaqiring:
   - ✅ Oyna 1'da ovoz chiqishi kerak
   - ✅ Oyna 2'da ovoz chiqmasligi kerak

3. Ambulatorxona bemorini chaqiring:
   - ✅ Oyna 2'da ovoz chiqishi kerak
   - ✅ Oyna 1'da ovoz chiqmasligi kerak

### 4. LocalStorage Sinovi

#### A. Sozlamani Saqlash
1. Statsionar sahifasida ovozni yoqing
2. Sahifani yangilang (F5)
3. ✅ Ovoz yoqilgan holda qolishi kerak

#### B. Alohida Sozlamalar
1. Statsionar sahifasida ovozni yoqing
2. Ambulatorxona sahifasiga o'ting
3. ✅ Ovoz o'chirilgan bo'lishi kerak (alohida sozlama)
4. Ambulatorxona sahifasida ovozni yoqing
5. Statsionar sahifasiga qaytib keling
6. ✅ Ovoz yoqilgan bo'lishi kerak (har bir sahifa o'z sozlamasini saqlaydi)

### 5. WebSocket Ulanishini Tekshirish

#### Console'da Tekshirish
1. Brauzer Console'ni oching (F12)
2. Statsionar yoki Ambulatorxona sahifasiga kiring
3. ✅ Console'da ko'rinishi kerak:
   ```
   ✅ WebSocket connected
   ```
   yoki
   ```
   ✅ WebSocket connected (Ambulator)
   ```

#### Ulanish Uzilsa
1. Backend serverni to'xtating
2. ✅ Console'da xatolik ko'rinishi kerak
3. Backend serverni qayta ishga tushiring
4. Sahifani yangilang
5. ✅ WebSocket qayta ulanishi kerak

### 6. Ovoz Parametrlarini Tekshirish

#### Ovoz Davomiyligi
1. Ovozni yoqing va test ovozini eshiting
2. ✅ Ovoz 30 soniya davom etishi kerak
3. ✅ Budilnik kabi tovush (800Hz va 1000Hz o'zgaruvchan)
4. ✅ Har 0.5 soniyada signal

### 7. Xatoliklarni Tekshirish

#### A. Brauzer Ovozga Ruxsat Bermasa
1. Brauzer sozlamalarida ovozni bloklang
2. Ovozni yoqishga harakat qiling
3. ✅ Brauzer ruxsat so'rashi kerak
4. Ruxsat bering va qayta urinib ko'ring

#### B. Backend Ishlamasa
1. Backend serverni to'xtating
2. Bemor chaqiruvini yuboring
3. ✅ Ovoz chiqmasligi kerak
4. ✅ Toast xabari ko'rinmasligi kerak
5. ✅ Console'da WebSocket xatoligi ko'rinishi kerak

#### C. Noto'g'ri Department
1. Backend'da department'ni noto'g'ri yuboring (masalan, "test")
2. ✅ Ovoz chiqmasligi kerak (faqat "Statsionar" yoki "Ambulatorxona" uchun)

## Kutilgan Natijalar

### ✅ Muvaffaqiyatli Test
- Ovoz tugmasi ishlaydi
- Test ovozi chiqadi
- Bemor chaqiruvida ovoz chiqadi
- Muolaja vaqtida ovoz chiqadi
- Bo'limlar orasida ajratish ishlaydi
- LocalStorage sozlamalarni saqlaydi
- WebSocket ulanishi barqaror

### ❌ Xatoliklar
Agar biror narsa ishlamasa:
1. Console'ni tekshiring (F12)
2. Network tab'ni tekshiring (WebSocket ulanishi)
3. Backend loglarini tekshiring
4. NURSE_AUDIO_NOTIFICATION_SYSTEM.md faylini o'qing

## Qo'shimcha Testlar

### Performance Test
1. 10 ta bemor chaqiruvini ketma-ket yuboring
2. ✅ Har bir chaqiruv uchun ovoz chiqishi kerak
3. ✅ Ovozlar bir-birining ustiga tushmasligi kerak (har biri 30 soniya)

### Stress Test
1. Bir vaqtning o'zida 5 ta bemorni chaqiring
2. ✅ Barcha chaqiruvlar uchun ovoz chiqishi kerak
3. ✅ Sahifa sekinlashmasligi kerak

### Browser Compatibility
Test qilish kerak bo'lgan brauzerlar:
- ✅ Chrome
- ✅ Firefox
- ✅ Edge
- ✅ Safari (agar mavjud bo'lsa)

## Xulosa

Barcha testlar muvaffaqiyatli o'tsa, ovozli ogohlantirish tizimi to'liq ishlaydi va ishlatishga tayyor!

---

**Eslatma**: Agar biror test muvaffaqiyatsiz bo'lsa, NURSE_AUDIO_NOTIFICATION_SYSTEM.md faylida "Xatoliklarni Bartaraf Etish" bo'limini o'qing.
