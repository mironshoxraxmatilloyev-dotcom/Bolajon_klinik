import TreatmentSchedule from '../models/TreatmentSchedule.js';
import Admission from '../models/Admission.js';
import AmbulatorRoom from '../models/AmbulatorRoom.js';
import Bed from '../models/Bed.js';
import Patient from '../models/Patient.js';
import Staff from '../models/Staff.js';
import TelegramBot from 'node-telegram-bot-api';

const BOT_TOKEN = process.env.BOT_TOKEN || '8551375038:AAFXDSS0IwrsZsqCIC2_oXXZwVZZWgqSdD4';

/**
 * Muolaja vaqti kelgan bemorlar haqida hamshiralarga xabar yuborish
 */
export async function sendTreatmentNotifications() {
  try {
    console.log('🔔 Checking for upcoming treatments...');
    console.log('Current time:', new Date().toISOString());
    
    const now = new Date();
    const fiveMinutesLater = new Date(now.getTime() + 5 * 60000); // 5 daqiqadan keyin
    
    console.log('Checking treatments between:', now.toISOString(), 'and', fiveMinutesLater.toISOString());
    
    // Keyingi 5 daqiqada muolaja vaqti kelgan va hali pending bo'lgan treatmentlarni topish
    const upcomingTreatments = await TreatmentSchedule.find({
      scheduled_time: {
        $gte: now,
        $lte: fiveMinutesLater
      },
      status: 'pending',
      nurse_id: { $exists: true, $ne: null }
    })
      .populate('patient_id', 'first_name last_name patient_number')
      .populate('nurse_id', 'first_name last_name telegram_chat_id telegram_notifications_enabled')
      .populate('admission_id')
      .lean();
    
    console.log(`📊 Found ${upcomingTreatments.length} upcoming treatments`);
    
    if (upcomingTreatments.length > 0) {
      console.log('Treatments:', upcomingTreatments.map(t => ({
        patient: `${t.patient_id?.first_name} ${t.patient_id?.last_name}`,
        medication: t.medication_name,
        scheduled_time: t.scheduled_time,
        nurse: `${t.nurse_id?.first_name} ${t.nurse_id?.last_name}`,
        has_telegram: !!t.nurse_id?.telegram_chat_id
      })));
    }
    
    if (upcomingTreatments.length === 0) {
      return;
    }
    
    const bot = new TelegramBot(BOT_TOKEN);
    
    // Har bir treatment uchun xabar yuborish
    for (const treatment of upcomingTreatments) {
      try {
        const nurse = treatment.nurse_id;
        const patient = treatment.patient_id;
        
        // Agar hamshirada telegram_chat_id bo'lmasa, o'tkazib yuborish
        if (!nurse || !nurse.telegram_chat_id || !nurse.telegram_notifications_enabled) {
          console.log(`⚠️ Nurse ${nurse?.first_name} ${nurse?.last_name} does not have Telegram notifications enabled`);
          continue;
        }
        
        // Xona va ko'rpa ma'lumotlarini olish
        let roomInfo = '';
        let bedInfo = '';
        let departmentInfo = '';
        
        if (treatment.admission_id) {
          const admission = await Admission.findById(treatment.admission_id)
            .populate('room_id', 'room_number floor department')
            .populate('bed_id', 'bed_number')
            .lean();
          
          if (admission) {
            if (admission.room_id) {
              const room = admission.room_id;
              
              // Department
              if (room.department) {
                departmentInfo = room.department === 'inpatient' ? 'Statsionar' : 'Ambulatorxona';
              }
              
              // Xona (without floor)
              roomInfo = `🚪 Xona: ${room.room_number}`;
            }
            
            if (admission.bed_id) {
              bedInfo = `🛏 Ko'rpa: ${admission.bed_id.bed_number}`;
            } else if (admission.bed_number) {
              bedInfo = `🛏 Ko'rpa: ${admission.bed_number}`;
            }
          }
        }
        
        // Xabar matnini yaratish
        const scheduledTime = new Date(treatment.scheduled_time);
        const timeStr = scheduledTime.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
        
        let message = `⏰ *MUOLAJA VAQTI YAQINLASHDI!*\n\n`;
        message += `👤 *Bemor:* ${patient.first_name} ${patient.last_name}\n`;
        message += `📋 Bemor №: ${patient.patient_number}\n\n`;
        
        if (departmentInfo) {
          message += `🏥 Bo'lim: ${departmentInfo}\n`;
        }
        if (roomInfo) {
          message += `${roomInfo}\n`;
        }
        if (bedInfo) {
          message += `${bedInfo}\n`;
        }
        
        message += `\n💊 *Dori:* ${treatment.medication_name}\n`;
        message += `💉 *Doza:* ${treatment.dosage}\n`;
        message += `🕐 *Vaqt:* ${timeStr}\n`;
        
        if (treatment.instructions) {
          message += `\n📝 *Ko'rsatma:* ${treatment.instructions}`;
        }
        
        message += `\n\n⚡️ *TEZKOR YORDAM KERAK!* ⚡️`;
        message += `\n💡 Iltimos, bemorga darhol yordam bering!`;
        
        // Telegram orqali yuborish
        await bot.sendMessage(nurse.telegram_chat_id, message, { parse_mode: 'Markdown' });
        
        console.log(`✅ Notification sent to nurse ${nurse.first_name} ${nurse.last_name} for patient ${patient.first_name} ${patient.last_name}`);
        
        // WebSocket orqali frontend'ga ham yuborish (ovozli ogohlantirish uchun)
        if (global.io) {
          global.io.emit('treatment-notification', {
            nurseId: nurse._id.toString(),
            patientId: patient._id.toString(),
            patientName: `${patient.first_name} ${patient.last_name}`,
            patientNumber: patient.patient_number,
            medicationName: treatment.medication_name,
            dosage: treatment.dosage,
            scheduledTime: treatment.scheduled_time,
            timestamp: new Date()
          });
          console.log('✅ WebSocket treatment notification sent to frontend');
        }
        
        // Treatment'ga notification_sent flag qo'shish (agar kerak bo'lsa)
        // await TreatmentSchedule.findByIdAndUpdate(treatment._id, { notification_sent: true });
        
      } catch (error) {
        console.error(`❌ Error sending notification for treatment ${treatment._id}:`, error);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in sendTreatmentNotifications:', error);
  }
}

/**
 * Har 1 daqiqada tekshirish uchun interval
 */
export function startTreatmentNotificationService() {
  console.log('🚀 Starting treatment notification service...');
  
  // Darhol birinchi marta tekshirish
  sendTreatmentNotifications();
  
  // Har 1 daqiqada tekshirish
  const interval = setInterval(() => {
    sendTreatmentNotifications();
  }, 60000); // 60000ms = 1 daqiqa
  
  console.log('✅ Treatment notification service started (checking every 1 minute)');
  
  return interval;
}

export default {
  sendTreatmentNotifications,
  startTreatmentNotificationService
};
