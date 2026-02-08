import cron from 'node-cron';
import Staff from '../models/Staff.js';
import Invoice from '../models/Invoice.js';
import { sendTelegramMessage } from './telegramService.js';

/**
 * Get doctor's daily statistics
 */
async function getDoctorDailyStats(doctorId, date = new Date()) {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Bugungi bemorlar soni va tushum
    const invoices = await Invoice.find({
      doctor: doctorId,
      created_at: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).populate('patient', 'first_name last_name patient_number');

    const totalPatients = invoices.length;
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const paidRevenue = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);

    return {
      totalPatients,
      totalRevenue,
      paidRevenue,
      invoices
    };
  } catch (error) {
    console.error('Error getting doctor daily stats:', error);
    throw error;
  }
}

/**
 * Format and send daily report to doctor
 */
async function sendDailyReportToDoctor(doctor, stats) {
  try {
    if (!doctor.telegram_chat_id) {
      console.log(`⚠️ Shifokor ${doctor.full_name} telegram chat ID yo'q`);
      return { success: false, message: 'No Telegram chat ID' };
    }

    const date = new Date();
    const dateStr = date.toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const message = `
📊 *Kunlik hisobot*
👨‍⚕️ *Shifokor:* ${doctor.full_name}
📅 *Sana:* ${dateStr}

━━━━━━━━━━━━━━━━━━━━

👥 *Tekshirilgan bemorlar:* ${stats.totalPatients} ta
💰 *Umumiy tushum:* ${formatCurrency(stats.totalRevenue)}
✅ *To'langan:* ${formatCurrency(stats.paidRevenue)}
${stats.totalRevenue - stats.paidRevenue > 0 ? `⏳ *Qarzdorlik:* ${formatCurrency(stats.totalRevenue - stats.paidRevenue)}` : ''}

━━━━━━━━━━━━━━━━━━━━

${stats.totalPatients > 0 ? '✨ Ajoyib ish! Bugun ham ko\'p bemorlarga yordam berdingiz!' : '📝 Bugun bemorlar yo\'q edi.'}
    `.trim();

    return await sendTelegramMessage(doctor.telegram_chat_id, message);
  } catch (error) {
    console.error('Error sending daily report:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send daily reports to all doctors
 */
async function sendDailyReportsToAllDoctors() {
  try {
    console.log('📊 Shifokorlarga kunlik hisobot yuborilmoqda...');
    
    // Barcha shifokorlarni olish
    const doctors = await Staff.find({
      role: { $in: ['Shifokor', 'Doctor', 'doctor'] },
      status: 'active',
      telegram_chat_id: { $exists: true, $ne: null }
    });

    console.log(`👨‍⚕️ ${doctors.length} ta shifokor topildi`);

    let successCount = 0;
    let failCount = 0;

    for (const doctor of doctors) {
      try {
        // Shifokor statistikasini olish
        const stats = await getDoctorDailyStats(doctor._id);
        
        // Hisobotni yuborish
        const result = await sendDailyReportToDoctor(doctor, stats);
        
        if (result.success) {
          successCount++;
          console.log(`✅ ${doctor.full_name} ga hisobot yuborildi`);
        } else {
          failCount++;
          console.log(`❌ ${doctor.full_name} ga hisobot yuborilmadi: ${result.message}`);
        }
      } catch (error) {
        failCount++;
        console.error(`❌ ${doctor.full_name} uchun xatolik:`, error.message);
      }
    }

    console.log(`📊 Hisobot yuborish tugadi: ${successCount} muvaffaqiyatli, ${failCount} xato`);
    
    return {
      success: true,
      total: doctors.length,
      successCount,
      failCount
    };
  } catch (error) {
    console.error('Error sending daily reports to all doctors:', error);
    throw error;
  }
}

/**
 * Format currency
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
}

/**
 * Start daily report scheduler
 * Runs every day at 19:00 (7:00 PM)
 */
export function startDailyReportScheduler() {
  // Har kuni soat 19:00 da ishga tushadi
  cron.schedule('0 19 * * *', async () => {
    console.log('⏰ Soat 19:00 - Kunlik hisobot vaqti!');
    try {
      await sendDailyReportsToAllDoctors();
    } catch (error) {
      console.error('Daily report scheduler error:', error);
    }
  }, {
    timezone: 'Asia/Tashkent'
  });

  console.log('✅ Kunlik hisobot scheduler ishga tushdi (har kuni 19:00)');
}

// Named exports
export {
  getDoctorDailyStats,
  sendDailyReportToDoctor,
  sendDailyReportsToAllDoctors
};

// Default export
export default {
  getDoctorDailyStats,
  sendDailyReportToDoctor,
  sendDailyReportsToAllDoctors,
  startDailyReportScheduler
};
