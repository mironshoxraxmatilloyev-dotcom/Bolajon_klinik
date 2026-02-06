# Bot Qayta Ishga Tushirish

## Muammo
Bot xabarlari yangilanmagan, chunki bot hali eski kod bilan ishlayapti.

## Yechim
Botni qayta ishga tushirish kerak.

## Qadamlar

### 1. Botni to'xtatish
Hozirda ishlab turgan bot processini to'xtating:
- Terminal/CMD da `Ctrl+C` bosing
- Yoki bot ishlab turgan terminalda `Ctrl+C` ni ikki marta bosing

### 2. Botni qayta ishga tushirish
```bash
cd bot
npm start
```

Yoki agar nodemon ishlatayotgan bo'lsangiz:
```bash
cd bot
npm run dev
```

### 3. Tekshirish
Bot ishga tushgandan keyin konsolda quyidagi xabarlar ko'rinishi kerak:
```
🤖 Telegram bot ishga tushdi!
🚀 Starting Telegram Bot...
📱 Bot Token: Configured
🌐 API URL: http://localhost:5001/api/v1
📝 Logs are being saved to: bot-logs.txt

✅ Bot is running and listening for messages...
💡 Press Ctrl+C to stop
```

### 4. Botni test qilish
Telegram botga quyidagi xabarni yuboring:
```
🔔 Hamshirani chaqirish
```

Endi yangi format bilan xabar kelishi kerak:
```
⏳ Hamshira chaqirilmoqda...

✅ Hamshira chaqirildi!

🏥 Bo'lim: Statsionar
🚪 Xona: 101
🛏 Ko'rpa: 1

⏰ 15:33

💡 Hamshira tez orada keladi.
```

## Muhim Eslatmalar

1. **Backend ham ishlab turishi kerak**: Bot backend API bilan ishlaydi, shuning uchun backend server ham ishlab turishi kerak.

2. **Environment Variables**: Bot `.env` faylida to'g'ri sozlamalar bo'lishi kerak:
   - `BOT_TOKEN=8551375038:AAFXDSS0IwrsZsqCIC2_oXXZwVZZWgqSdD4`
   - `API_URL=http://localhost:5001/api/v1` (development)
   - Yoki `API_URL=https://bolajon.biznesjon.uz/api/v1` (production)

3. **Production serverda**: Agar production serverda bot ishlab turgan bo'lsa, PM2 orqali qayta ishga tushiring:
   ```bash
   pm2 restart bot
   ```
   
   Yoki PM2 process nomini bilsangiz:
   ```bash
   pm2 restart klinika-bot
   ```

## O'zgarishlar

### Bot xabarlari yangilandi:
1. ✅ "Hamshiralar" → "Hamshira" (birlik shakli)
2. ✅ "Bo'lim: inpatient" → "Bo'lim: Statsionar" yoki "Ambulatorxona"
3. ✅ "Xona: 101 (1-qavat)" → "Xona: 101" (qavat olib tashlandi)

### Backend yangilandi:
1. ✅ Department nomini to'g'ri qaytaradi (Statsionar/Ambulatorxona)
2. ✅ Admission endpoint yangilandi

## Agar muammo davom etsa

1. Bot loglarini tekshiring:
   ```bash
   cat bot-logs.txt
   ```

2. Backend loglarini tekshiring

3. Bot va backend o'rtasidagi aloqani tekshiring:
   - Backend ishlab turibmi?
   - API_URL to'g'rimi?
   - Network muammolari yo'qmi?
