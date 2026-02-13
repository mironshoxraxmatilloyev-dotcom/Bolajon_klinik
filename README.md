# Bolajon Klinika - Tibbiy Boshqaruv Tizimi

Zamonaviy tibbiy muassasalar uchun to'liq boshqaruv tizimi.

## 📋 Loyiha Strukturasi

```
Bolajon_klinik/
├── backend/              # Backend API (Node.js + Express + MongoDB)
│   ├── src/             # Asosiy backend kodi
│   │   ├── models/      # MongoDB modellari
│   │   ├── routes/      # API route'lar
│   │   ├── middleware/  # Middleware'lar
│   │   └── utils/       # Utility funksiyalar
│   ├── scripts/         # Utility va test scriptlar
│   ├── uploads/         # Yuklangan fayllar
│   └── __tests__/       # Test fayllar
│
├── frontend/            # Frontend (React + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/  # Qayta ishlatiladigan komponentlar
│   │   ├── pages/       # Sahifa komponentlari
│   │   ├── services/    # API service'lar
│   │   ├── contexts/    # React Context'lar
│   │   ├── layouts/     # Layout komponentlari
│   │   └── utils/       # Utility funksiyalar
│   └── public/          # Statik fayllar
│
├── bot/                 # Telegram bot
├── website/             # Landing page
├── config/              # Konfiguratsiya fayllar
├── cron/                # Cron job'lar
├── middleware/          # Umumiy middleware'lar
└── routes/              # Eski route'lar (deprecated)
```

## 🚀 Texnologiyalar

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Socket.io** - Real-time communication
- **Multer** - File upload
- **Nodemailer** - Email sending

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Axios** - HTTP client
- **React Hot Toast** - Notifications
- **i18next** - Internationalization
- **Socket.io Client** - Real-time updates

## 📦 O'rnatish

### 1. Repository'ni clone qilish
```bash
git clone https://github.com/mironshoxraxmatilloyev-dotcom/Bolajon_klinik.git
cd Bolajon_klinik
```

### 2. Backend o'rnatish
```bash
cd backend
npm install
cp .env.example .env
# .env faylni to'ldiring
npm run dev
```

### 3. Frontend o'rnatish
```bash
cd frontend
npm install
cp .env.example .env
# .env faylni to'ldiring
npm run dev
```

### 4. Telegram Bot o'rnatish (ixtiyoriy)
```bash
cd bot
npm install
cp .env.example .env
# .env faylni to'ldiring
npm start
```

## 🔧 Konfiguratsiya

### Backend .env
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/bolajon_klinik
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
NODE_ENV=development
```

### Frontend .env
```env
VITE_API_URL=http://localhost:5001/api/v1
```

## 🎯 Asosiy Funksiyalar

### Bemor Boshqaruvi
- ✅ Bemor ro'yxatdan o'tkazish
- ✅ Bemor profili va tarix
- ✅ QR kod orqali tez qidiruv
- ✅ Bemor faoliyati timeline

### Navbat Tizimi
- ✅ Navbat yaratish va boshqarish
- ✅ Real-time navbat yangilanishi
- ✅ Shifokor navbatlari
- ✅ Navbat statistikasi

### Statsionar (Inpatient)
- ✅ Xonalar va koykalar boshqaruvi
- ✅ Bemor yotqizish/chiqarish
- ✅ Koyka to'lovlari
- ✅ Hamshira chaqiruvlari (real-time)

### Ambulatoriya (Outpatient)
- ✅ Ambulatoriya xonalari
- ✅ Qisqa muddatli davolanish
- ✅ Xona boshqaruvi

### Laboratoriya
- ✅ Tahlil buyurtmalari
- ✅ Natijalarni kiritish
- ✅ PDF natijalar
- ✅ Reaktiv boshqaruvi

### Moliya (Billing)
- ✅ Hisob-faktura yaratish
- ✅ To'lovlar qabul qilish
- ✅ Qarz boshqaruvi
- ✅ Chek chop etish
- ✅ Moliyaviy hisobotlar

### Xodimlar
- ✅ Xodim boshqaruvi
- ✅ Rollar va ruxsatlar
- ✅ Ish jadvali
- ✅ Davomat tizimi
- ✅ Maosh hisoblash
- ✅ Bonuslar va jarimalar

### Vazifalar
- ✅ Vazifa berish
- ✅ Vazifa bajarish
- ✅ Tasdiqlash tizimi
- ✅ Izohlar va feedback

### Retseptlar
- ✅ Retsept yozish
- ✅ Dori ro'yxati
- ✅ Muolaja jadvali
- ✅ Hamshira vazifalari

### Hisobotlar
- ✅ Kunlik hisobotlar
- ✅ Moliyaviy hisobotlar
- ✅ Xodim hisobotlari
- ✅ Statistika

## 👥 Foydalanuvchi Rollari

1. **Admin** - To'liq tizim boshqaruvi
2. **Shifokor** - Bemorlar, retseptlar, navbat
3. **Hamshira** - Muolajalar, vazifalar
4. **Laborant** - Tahlillar
5. **Qabulxona** - Bemor qabul, navbat
6. **Kassa** - To'lovlar, hisob-fakturalar
7. **Tozalovchi** - Tozalash vazifalari
8. **Massajchi** - Massaj xizmatlari
9. **Logoped** - Logopedik xizmatlar

## 📱 Telegram Bot

Xodimlar uchun Telegram bot orqali:
- Vazifa bildirishnomalar
- Navbat yangilanishlari
- Hamshira chaqiruvlari
- Tezkor xabarlar

## 🔐 Xavfsizlik

- JWT authentication
- Role-based access control (RBAC)
- Password hashing (bcrypt)
- Input validation
- SQL injection protection
- XSS protection
- CORS configuration

## 📊 Database Schema

Asosiy collectionlar:
- `patients` - Bemorlar
- `staff` - Xodimlar
- `appointments` - Navbatlar
- `admissions` - Yotqizishlar
- `billing` - Hisob-fakturalar
- `prescriptions` - Retseptlar
- `lab_orders` - Tahlil buyurtmalari
- `tasks` - Vazifalar
- `rooms` - Xonalar
- `beds` - Koykalar

## 🧪 Testing

```bash
# Backend testlar
cd backend
npm test

# Frontend testlar
cd frontend
npm test
```

## 📝 Scripts

Backend utility scriptlar `backend/scripts/` papkasida. Batafsil ma'lumot uchun [backend/scripts/README.md](backend/scripts/README.md) ga qarang.

## 📚 Hujjatlar

- [📋 Summary](SUMMARY.md) - Loyiha tozalash va optimizatsiya yakuniy hisoboti
- [🔌 API Documentation](API_DOCUMENTATION.md) - Backend API hujjati
- [🤝 Contributing Guide](CONTRIBUTING.md) - Kod standartlari va best practices
- [📊 Optimization Report](OPTIMIZATION_REPORT.md) - Performance tahlil va optimizatsiya hisoboti
- [🧹 Cleanup Plan](CLEANUP.md) - Kod tozalash rejasi va progress
- [📝 Backend Scripts](backend/scripts/README.md) - Utility scriptlar

## 🤝 Contributing

1. Fork qiling
2. Feature branch yarating (`git checkout -b feature/AmazingFeature`)
3. Commit qiling (`git commit -m 'Add some AmazingFeature'`)
4. Push qiling (`git push origin feature/AmazingFeature`)
5. Pull Request oching

## 📄 License

MIT License

## 👨‍💻 Muallif

Mironshox Raxmatilloyev

## 📞 Aloqa

- GitHub: [@mironshoxraxmatilloyev-dotcom](https://github.com/mironshoxraxmatilloyev-dotcom)
- Email: [your-email@example.com]

---

**Eslatma:** Bu loyiha faol rivojlantirilmoqda. Yangi funksiyalar va yaxshilanishlar muntazam qo'shiladi.
