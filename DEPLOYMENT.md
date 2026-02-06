# 🚀 Deployment Guide - Klinika CRM

## AI Chatbot Deploy Qilish

AI chatbot localhost'da ishlaydi, lekin production'da ishlamaydi? Bu muammoni hal qilish uchun quyidagi qadamlarni bajaring:

---

## 1️⃣ Frontend Environment Variables

### Development (`.env`)
```env
VITE_API_URL=http://localhost:5001/api/v1
```

### Production (`.env.production`)
```env
# O'zingizning production API URL'ingizni kiriting
VITE_API_URL=https://api.yourdomain.com/api/v1
VITE_APP_NAME=Klinika CRM
VITE_APP_VERSION=1.0.0
VITE_ENABLE_CONSOLE=false
```

**MUHIM:** `https://api.yourdomain.com` ni o'zingizning haqiqiy backend URL'ingiz bilan almashtiring!

---

## 2️⃣ Backend Environment Variables

### Production (`.env`)
```env
# Server Configuration
NODE_ENV=production
PORT=5001
API_VERSION=v1

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/clinic_db

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production

# CORS - Frontend URL'larini qo'shing
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# AI Chatbot (Groq API) - Optional
GROQ_API_KEY=your-groq-api-key-here
```

**MUHIM:** 
- `CORS_ORIGIN` ga frontend domain'ingizni qo'shing
- `JWT_SECRET` va `JWT_REFRESH_SECRET` ni production uchun o'zgartiring

---

## 3️⃣ Frontend Build va Deploy

### Build qilish
```bash
cd frontend
npm run build
```

Bu `dist` papkasini yaratadi. Uni hosting provideringizga yuklang (Vercel, Netlify, va h.k.)

### Vercel uchun
```bash
npm install -g vercel
vercel --prod
```

### Netlify uchun
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

---

## 4️⃣ Backend Deploy

### Option 1: VPS/Dedicated Server (Ubuntu)

```bash
# 1. Serverni yangilash
sudo apt update && sudo apt upgrade -y

# 2. Node.js o'rnatish
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 3. PM2 o'rnatish (process manager)
sudo npm install -g pm2

# 4. Backend kodini serverga yuklash
cd /var/www
git clone your-repo-url
cd your-repo/backend

# 5. Dependencies o'rnatish
npm install --production

# 6. .env faylini yaratish
nano .env
# Yuqoridagi production environment variables'ni kiriting

# 7. PM2 bilan ishga tushirish
pm2 start src/server.js --name clinic-backend
pm2 save
pm2 startup

# 8. Nginx reverse proxy sozlash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/clinic-api

# Quyidagi konfiguratsiyani kiriting:
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Nginx'ni yoqish
sudo ln -s /etc/nginx/sites-available/clinic-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 9. SSL sertifikat (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

### Option 2: Heroku

```bash
# 1. Heroku CLI o'rnatish
npm install -g heroku

# 2. Login
heroku login

# 3. App yaratish
heroku create clinic-backend

# 4. Environment variables sozlash
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-mongodb-uri
heroku config:set JWT_SECRET=your-secret
heroku config:set CORS_ORIGIN=https://yourdomain.com

# 5. Deploy qilish
git push heroku main
```

### Option 3: Railway.app

1. Railway.app'ga kiring
2. "New Project" > "Deploy from GitHub"
3. Backend repository'ni tanlang
4. Environment variables qo'shing
5. Deploy tugmasini bosing

---

## 5️⃣ Telegram Bot Deploy

```bash
cd bot

# 1. Dependencies o'rnatish
npm install --production

# 2. .env faylini sozlash
nano .env

# Quyidagilarni kiriting:
BOT_TOKEN=your-telegram-bot-token
API_URL=https://api.yourdomain.com/api/v1

# 3. PM2 bilan ishga tushirish
pm2 start bot.js --name clinic-bot
pm2 save
```

---

## 6️⃣ Tekshirish

### Backend tekshirish
```bash
curl https://api.yourdomain.com/health
```

Javob:
```json
{
  "status": "ok",
  "database": "MongoDB",
  "timestamp": "2026-02-04T12:00:00.000Z"
}
```

### AI Chatbot tekshirish
```bash
curl -X POST https://api.yourdomain.com/api/v1/ai-chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Salom", "sessionId": "test123"}'
```

Javob:
```json
{
  "success": true,
  "message": "Assalomu alaykum! Sizga qanday yordam bera olaman?",
  "intent": "greeting"
}
```

---

## 🔧 Troubleshooting

### AI Chatbot ishlamayapti?

1. **Browser Console'ni tekshiring:**
   - F12 bosing
   - Console tab'ga o'ting
   - Qanday xatolik ko'rsatilganini ko'ring

2. **CORS xatoligi:**
   ```
   Access to fetch at 'https://api.yourdomain.com' from origin 'https://yourdomain.com' 
   has been blocked by CORS policy
   ```
   
   **Yechim:** Backend `.env` faylida `CORS_ORIGIN` ni to'g'ri sozlang:
   ```env
   CORS_ORIGIN=https://yourdomain.com
   ```

3. **Network xatoligi:**
   ```
   Failed to fetch
   ```
   
   **Yechim:** 
   - Backend server ishlab turganini tekshiring
   - Frontend `.env.production` da to'g'ri API URL borligini tekshiring

4. **500 Internal Server Error:**
   
   **Yechim:** Backend logs'ni tekshiring:
   ```bash
   pm2 logs clinic-backend
   ```

---

## 📝 Checklist

Deploy qilishdan oldin:

- [ ] Frontend `.env.production` da to'g'ri API URL
- [ ] Backend `.env` da to'g'ri CORS_ORIGIN
- [ ] Backend `.env` da production JWT secrets
- [ ] MongoDB connection string to'g'ri
- [ ] SSL sertifikat o'rnatilgan (HTTPS)
- [ ] Telegram bot token to'g'ri
- [ ] PM2 yoki boshqa process manager ishlatilgan
- [ ] Nginx reverse proxy sozlangan
- [ ] Firewall sozlamalari to'g'ri (port 80, 443 ochiq)

---

## 🆘 Yordam

Agar muammo hal bo'lmasa:

1. Backend logs'ni tekshiring: `pm2 logs clinic-backend`
2. Nginx logs'ni tekshiring: `sudo tail -f /var/log/nginx/error.log`
3. Browser console'ni tekshiring (F12)
4. Network tab'da API request'larni tekshiring

---

## 📞 Qo'shimcha Ma'lumot

- Frontend: React + Vite
- Backend: Node.js + Express + MongoDB
- Bot: Node.js + node-telegram-bot-api
- AI: Rule-based chatbot (Groq API integratsiyasi tayyor)

**Muvaffaqiyatli deploy qilishingizni tilaymiz! 🎉**
