export const config = {
  // Telegram Bot Token (BotFather'dan olinadi)
  BOT_TOKEN: process.env.BOT_TOKEN || '8551375038:AAFXDSS0IwrsZsqCIC2_oXXZwVZZWgqSdD4',
  
  // Bot username (deep linking uchun)
  BOT_USERNAME: process.env.BOT_USERNAME || 'klinika_01_bot',
  
  // Backend API URL - environment'dan yoki default
  API_URL: process.env.API_URL || process.env.VITE_API_URL || 'http://localhost:5001/api/v1',
  
  // Admin Telegram IDs (xabarlar uchun)
  ADMIN_IDS: process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [],
  
  // Bot sozlamalari
  POLLING_INTERVAL: 1000,
  MAX_RETRIES: 3,
  
  // Xabarlar
  MESSAGES: {
    uz: {
      welcome: ' Assalomu alaykum! Klinika botiga xush kelibsiz.',
      welcome_registered: '✅ Siz muvaffaqiyatli ro\'yxatdan o\'tdingiz!\n\nEndi siz bot orqali:\n• Navbat ma\'lumotlarini ko\'rishingiz\n• Retseptlaringizni ko\'rishingiz\n• Tahlil natijalarini ko\'rishingiz\n• Qarzlaringizni ko\'rishingiz mumkin.',
      phone_request: '📱 Iltimos, telefon raqamingizni yuboring (masalan: +998901234567)',
      invalid_phone: '❌ Noto\'g\'ri telefon raqami. Iltimos, qaytadan kiriting.',
      not_registered: '❌ Siz ro\'yxatdan o\'tmagansiz. Iltimos, klinikaga tashrif buyuring.',
      main_menu: '📋 Asosiy menyu:',
      queue_info: '📊 Navbat ma\'lumotlari',
      prescriptions: '💊 Retseptlarim',
      lab_results: '🔬 Tahlil natijalari',
      debts: '💰 Qarzlar',
      settings: '⚙️ Sozlamalar',
      back: '◀️ Orqaga',
      loading: '⏳ Yuklanmoqda...',
      error: '❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.',
      queue_called: '🔔 *Sizni qabulga chaqirishmoqda!*\n\nShifokor: {doctor}\nXona: {room}\n\nIltimos, qabulga kiring.',
      new_prescription: '💊 *Yangi retsept yozildi!*\n\nShifokor: {doctor}\nTashxis: {diagnosis}\n\nBatafsil ma\'lumot uchun botdan "Retseptlar" bo\'limiga o\'ting.',
    }
  }
};
