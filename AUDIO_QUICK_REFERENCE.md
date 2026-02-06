# Ovozli Ogohlantirish - Tezkor Ma'lumotnoma

## 🎯 Qisqacha

Statsionar va Ambulatorxona sahifalari uchun ovozli ogohlantirish tizimi.
**Audio fayl**: `sound.mp3`

**MUHIM**: Hamshira panelida ovoz tizimi YO'Q. Faqat Statsionar va Ambulatorxona sahifalarida ishlaydi.

## 🔊 Ovozni Yoqish/O'chirish

### Statsionar
1. Statsionar sahifasiga kiring
2. Tepada "Ovoz o'chirilgan" tugmasini bosing
3. Ovoz yoqiladi va test ovozi chiqadi (telefon qo'ng'irog'i)

### Ambulatorxona
1. Ambulatorxona sahifasiga kiring
2. Tepada "Ovoz o'chirilgan" tugmasini bosing
3. Ovoz yoqiladi va test ovozi chiqadi (telefon qo'ng'irog'i)

## 📢 Qachon Ovoz Chiqadi?

### Statsionar Sahifasida
- ✅ BARCHA bemorlar chaqirsa (Statsionar va Ambulatorxona)
- ✅ Muolaja vaqti kelsa

### Ambulatorxona Sahifasida
- ✅ BARCHA bemorlar chaqirsa (Statsionar va Ambulatorxona)
- ✅ Muolaja vaqti kelsa

### Hamshira Panelida
- ❌ Ovoz tizimi YO'Q
- ✅ Faqat toast xabarlari ko'rinadi

## ⚙️ Sozlamalar

- **Audio fayl**: sound.mp3
- **Ovoz turi**: Ogohlantirish ovozi
- **Davomiyligi**: 30 soniya (loop)
- **Ovoz balandligi**: 80%
- **Saqlash**: LocalStorage (sahifa yangilansa ham saqlanadi)
- **Alohida**: Har bir sahifa o'z sozlamasiga ega

## 🔧 Xatolik Bo'lsa

### Ovoz chiqmayapti?
1. Ovoz tugmasi yoqilganini tekshiring
2. Brauzer ovozga ruxsat berganini tekshiring
3. Backend ishlab turganini tekshiring
4. Console'da xatolik bormi tekshiring (F12)

### Noto'g'ri bo'limdan ovoz chiqadi?
- Bu xatolik! Backend'da department noto'g'ri yuborilayotgan bo'lishi mumkin

### Ovoz to'xtamayapti?
- Ovoz avtomatik 30 soniyadan keyin to'xtaydi
- Agar to'xtamasa, sahifani yangilang (F5)

## 📱 Telegram Bot

Bemor botdan hamshirani chaqirganda:
1. Backend WebSocket orqali xabar yuboradi
2. Frontend ovozni chiqaradi (agar yoqilgan bo'lsa)
3. Toast xabari ko'rinadi
4. 30 soniya davom etadi

## 💊 Muolaja Vaqti

Backend har 1 daqiqada tekshiradi:
1. Keyingi 5 daqiqada muolaja vaqti kelgan bemorlarni topadi
2. WebSocket orqali xabar yuboradi
3. Frontend ovozni chiqaradi (agar yoqilgan bo'lsa)
4. Toast xabari ko'rinadi

## 🎨 UI

### Ovoz Yoqilgan
- Rang: Yashil
- Icon: 🔊 volume_up
- Matn: "Ovoz yoqilgan"

### Ovoz O'chirilgan
- Rang: Oq/shaffof
- Icon: 🔇 volume_off
- Matn: "Ovoz o'chirilgan"

## 📝 Eslatma

- Har bir sahifa o'z ovoz tizimiga ega
- Sozlamalar localStorage'da saqlanadi
- Department filterlash avtomatik ishlaydi
- Test ovozi tugma bosilganda chiqadi

## 🆘 Yordam

Batafsil ma'lumot uchun:
- **Texnik hujjat**: NURSE_AUDIO_NOTIFICATION_SYSTEM.md
- **Test yo'riqnomasi**: AUDIO_NOTIFICATION_TEST_GUIDE.md
- **Amalga oshirish**: AUDIO_NOTIFICATION_IMPLEMENTATION_SUMMARY.md

---

**Versiya**: 1.0 | **Sana**: 2026-02-06
