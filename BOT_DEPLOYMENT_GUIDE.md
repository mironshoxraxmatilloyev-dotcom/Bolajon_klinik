# Bot Deploy Qilish Yo'riqnomasi

## Muammo:
Bot hozirda `http://localhost:5001/api/v1` ga so'rov yuboradi. Bu deploy qilingan versiyada ishlamaydi.

## Yechim:

### 1. Server'da bot `.env` faylini yaratish:

```bash
cd /var/www/bolajon.biznesjon.uz/bot
nano .env
```

### 2. Quyidagi konfiguratsiyani kiriting:

```env
# Telegram Bot Token
BOT_TOKEN=8551375038:AAFXDSS0IwrsZsqCIC2_oXXZwVZZWgqSdD4

# Bot username
BOT_USERNAME=klinika_01_bot

# Backend API URL - PRODUCTION
API_URL=https://bolajon.biznesjon.uz/api/v1

# Admin Telegram IDs (vergul bilan ajratilgan)
ADMIN_IDS=

# Node muhiti
NODE_ENV=production
```

### 3. Bot'ni PM2 bilan ishga tushirish:

```bash
cd /var/www/bolajon.biznesjon.uz/bot

# Bot'ni PM2 ga qo'shish
pm2 start index.js --name "klinika-bot"

# Avtomatik ishga tushirish
pm2 startup
pm2 save
```

### 4. Bot statusini tekshirish:

```bash
pm2 status
pm2 logs klinika-bot
```

### 5. Bot'ni qayta ishga tushirish:

```bash
pm2 restart klinika-bot
```

## API Endpoints:

Bot quyidagi endpoint'larga so'rov yuboradi:

### Bemor uchun:
- `GET /api/v1/bot/patients/by-access-code/:code` - Bemor kodini tekshirish
- `PUT /api/v1/bot/patients/telegram/:id` - Telegram ma'lumotlarini yangilash
- `GET /api/v1/bot/patient/:patientId/admission` - Bemor xona ma'lumotlari
- `POST /api/v1/bot/call-nurse` - Hamshirani chaqirish
- `GET /api/v1/bot/messages/patient/:patientId` - Bemor xabarlari

### Xodim uchun:
- `GET /api/v1/bot/staff/by-access-code/:code` - Xodim kodini tekshirish
- `PUT /api/v1/bot/staff/telegram/:id` - Telegram ma'lumotlarini yangilash
- `GET /api/v1/bot/messages/staff/:staffId` - Xodim xabarlari

## Backend URL'lar:

### Development:
```
API_URL=http://localhost:5001/api/v1
```

### Production:
```
API_URL=https://bolajon.biznesjon.uz/api/v1
```

## Tekshirish:

1. Bot ishga tushganini tekshirish:
```bash
pm2 logs klinika-bot --lines 50
```

2. Backend'ga ulanishni tekshirish:
```bash
curl https://bolajon.biznesjon.uz/api/v1/health
```

3. Bot'da kod kiritib test qilish:
   - Telegram'da @klinika_01_bot ga o'ting
   - 8-xonali bemor kodini kiriting
   - Yoki LI + 8-xonali xodim kodini kiriting

## Xatoliklarni hal qilish:

### Bot ishlamayapti:
```bash
pm2 restart klinika-bot
pm2 logs klinika-bot --err
```

### Backend'ga ulanmayapti:
- `.env` faylida `API_URL` to'g'ri ekanligini tekshiring
- Backend ishlab turganini tekshiring: `pm2 status`
- Nginx konfiguratsiyasini tekshiring

### 409 Conflict xatosi:
```bash
# Barcha bot processlarni to'xtatish
pm2 delete klinika-bot
pkill -f "node.*bot"

# Qayta ishga tushirish
pm2 start index.js --name "klinika-bot"
```

## PM2 Ecosystem File (ixtiyoriy):

`ecosystem.config.js` yaratish:

```javascript
module.exports = {
  apps: [{
    name: 'klinika-bot',
    script: './index.js',
    cwd: '/var/www/bolajon.biznesjon.uz/bot',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      API_URL: 'https://bolajon.biznesjon.uz/api/v1'
    }
  }]
};
```

Ishga tushirish:
```bash
pm2 start ecosystem.config.js
pm2 save
```
