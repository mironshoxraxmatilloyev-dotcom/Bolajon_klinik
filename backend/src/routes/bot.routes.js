import express from 'express';
import Staff from '../models/Staff.js';
import Patient from '../models/Patient.js';

const router = express.Router();

/**
 * GET /api/v1/bot/staff/by-access-code/:code
 * Get staff by access code (for bot authentication)
 */
router.get('/staff/by-access-code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    console.log('=== BOT STAFF LOOKUP ===');
    console.log('Access code:', code);
    
    // Validate code format (LI + 8 digits)
    if (!code || !/^LI\d{8}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: 'Noto\'g\'ri kod formati. Kod LI bilan boshlanishi va 8 ta raqamdan iborat bo\'lishi kerak.'
      });
    }
    
    // Find staff by access code
    const staff = await Staff.findOne({ access_code: code });
    
    if (!staff) {
      console.log('❌ Staff not found');
      return res.status(404).json({
        success: false,
        message: 'Xodim topilmadi'
      });
    }
    
    console.log('✅ Staff found:', staff.first_name, staff.last_name);
    
    res.json({
      success: true,
      data: {
        _id: staff._id,
        id: staff._id,
        first_name: staff.first_name,
        last_name: staff.last_name,
        role: staff.role,
        department: staff.department,
        phone: staff.phone,
        email: staff.email,
        access_code: staff.access_code,
        telegram_chat_id: staff.telegram_chat_id,
        telegram_username: staff.telegram_username,
        telegram_notifications_enabled: staff.telegram_notifications_enabled
      }
    });
  } catch (error) {
    console.error('Error finding staff by access code:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    });
  }
});

/**
 * PUT /api/v1/bot/staff/telegram/:id
 * Update staff telegram info
 */
router.put('/staff/telegram/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { telegram_chat_id, telegram_username, telegram_notifications_enabled } = req.body;
    
    console.log('=== UPDATE STAFF TELEGRAM INFO ===');
    console.log('Staff ID:', id);
    console.log('Chat ID:', telegram_chat_id);
    console.log('Username:', telegram_username);
    
    const staff = await Staff.findByIdAndUpdate(
      id,
      {
        telegram_chat_id,
        telegram_username,
        telegram_notifications_enabled
      },
      { new: true }
    );
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Xodim topilmadi'
      });
    }
    
    console.log('✅ Staff telegram info updated');
    
    res.json({
      success: true,
      message: 'Telegram ma\'lumotlari yangilandi',
      data: {
        telegram_chat_id: staff.telegram_chat_id,
        telegram_username: staff.telegram_username,
        telegram_notifications_enabled: staff.telegram_notifications_enabled
      }
    });
  } catch (error) {
    console.error('Error updating staff telegram info:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    });
  }
});

/**
 * GET /api/v1/bot/patients/by-access-code/:code
 * Get patient by access code (existing endpoint - for reference)
 */
router.get('/patients/by-access-code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    console.log('=== BOT PATIENT LOOKUP ===');
    console.log('Access code:', code);
    
    // Validate code format (8 digits only, no prefix)
    if (!code || !/^\d{8}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: 'Noto\'g\'ri kod formati. Kod 8 ta raqamdan iborat bo\'lishi kerak.'
      });
    }
    
    // Find patient by access code
    const patient = await Patient.findOne({ access_code: code });
    
    if (!patient) {
      console.log('❌ Patient not found');
      return res.status(404).json({
        success: false,
        message: 'Bemor topilmadi'
      });
    }
    
    console.log('✅ Patient found:', patient.first_name, patient.last_name);
    
    res.json({
      success: true,
      data: {
        _id: patient._id,
        id: patient._id,
        first_name: patient.first_name,
        last_name: patient.last_name,
        patient_number: patient.patient_number,
        phone: patient.phone,
        access_code: patient.access_code,
        telegram_chat_id: patient.telegram_chat_id,
        telegram_username: patient.telegram_username,
        telegram_notifications_enabled: patient.telegram_notifications_enabled
      }
    });
  } catch (error) {
    console.error('Error finding patient by access code:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    });
  }
});

/**
 * PUT /api/v1/bot/patients/telegram/:id
 * Update patient telegram info (existing endpoint - for reference)
 */
router.put('/patients/telegram/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { telegram_chat_id, telegram_username, telegram_notifications_enabled } = req.body;
    
    console.log('=== UPDATE PATIENT TELEGRAM INFO ===');
    console.log('Patient ID:', id);
    console.log('Chat ID:', telegram_chat_id);
    console.log('Username:', telegram_username);
    
    const patient = await Patient.findByIdAndUpdate(
      id,
      {
        telegram_chat_id,
        telegram_username,
        telegram_notifications_enabled
      },
      { new: true }
    );
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Bemor topilmadi'
      });
    }
    
    console.log('✅ Patient telegram info updated');
    
    res.json({
      success: true,
      message: 'Telegram ma\'lumotlari yangilandi',
      data: {
        telegram_chat_id: patient.telegram_chat_id,
        telegram_username: patient.telegram_username,
        telegram_notifications_enabled: patient.telegram_notifications_enabled
      }
    });
  } catch (error) {
    console.error('Error updating patient telegram info:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    });
  }
});

/**
 * GET /api/v1/bot/patient/:patientId/admission
 * Get patient's current admission (room and bed info)
 */
router.get('/patient/:patientId/admission', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    console.log('=== GET PATIENT ADMISSION ===');
    console.log('Patient ID:', patientId);
    
    // Import models
    const Admission = (await import('../models/Admission.js')).default;
    const Bed = (await import('../models/Bed.js')).default;
    
    // 1. Statsionarda (Inpatient) tekshirish - Admission orqali
    let admission = await Admission.findOne({
      patient_id: patientId,
      status: 'active'
    })
      .populate('room_id', 'room_number floor department')
      .populate('bed_id', 'bed_number')
      .lean();
    
    if (admission) {
      console.log('✅ Found in Inpatient (Admission)');
      return res.json({
        success: true,
        data: {
          location: 'inpatient',
          room_number: admission.room_id?.room_number || admission.room_number,
          room_floor: admission.room_id?.floor,
          bed_number: admission.bed_id?.bed_number || admission.bed_number,
          department: admission.room_id?.department === 'inpatient' ? 'Statsionar' : 'Ambulatorxona'
        }
      });
    }
    
    // 2. Ambulatorxonada yoki Statsionarda - Bed orqali tekshirish
    const bed = await Bed.findOne({
      current_patient_id: patientId,
      status: 'occupied'
    })
      .populate('room_id', 'room_number floor department')
      .lean();
    
    if (bed) {
      console.log('✅ Found in Bed (Ambulator or Inpatient)');
      return res.json({
        success: true,
        data: {
          location: bed.room_id?.department === 'ambulator' ? 'ambulator' : 'inpatient',
          room_number: bed.room_id?.room_number,
          room_floor: bed.room_id?.floor,
          bed_number: bed.bed_number,
          department: bed.room_id?.department === 'ambulator' ? 'Ambulatorxona' : 'Statsionar'
        }
      });
    }
    
    console.log('❌ Patient not found in any room');
    return res.status(404).json({
      success: false,
      message: 'Bemor hech qayerda topilmadi'
    });
    
  } catch (error) {
    console.error('Error fetching patient admission:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    });
  }
});

/**
 * POST /api/v1/bot/call-nurse
 * Send notification to all nurses when patient calls
 */
router.post('/call-nurse', async (req, res) => {
  try {
    const { patientId, patientName, patientNumber, roomNumber, roomFloor, bedNumber, department } = req.body;
    
    console.log('=== CALL NURSE ===');
    console.log('Patient:', patientName);
    console.log('Department:', department);
    console.log('Room:', roomNumber, 'Floor:', roomFloor);
    console.log('Bed:', bedNumber);
    
    // Import TreatmentSchedule model
    const TreatmentSchedule = (await import('../models/TreatmentSchedule.js')).default;
    
    // Bemorning aktiv treatment'laridan hamshirani topish
    const treatments = await TreatmentSchedule.find({
      patient_id: patientId,
      status: 'pending'
    })
      .populate('nurse_id', 'first_name last_name telegram_chat_id telegram_username telegram_notifications_enabled')
      .sort({ created_at: -1 })
      .limit(10)
      .lean();
    
    console.log(`📊 Found ${treatments.length} active treatments for patient`);
    
    // Hamshiralarni to'plash (unique)
    const nurseMap = new Map();
    treatments.forEach(treatment => {
      if (treatment.nurse_id && treatment.nurse_id.telegram_chat_id && treatment.nurse_id.telegram_notifications_enabled) {
        nurseMap.set(treatment.nurse_id._id.toString(), treatment.nurse_id);
      }
    });
    
    const nurses = Array.from(nurseMap.values());
    
    console.log(`📊 Found ${nurses.length} assigned nurses with Telegram enabled`);
    
    // WebSocket orqali frontend'ga xabar yuborish
    if (global.io) {
      global.io.emit('nurse-call', {
        patientId,
        patientName,
        patientNumber,
        roomNumber,
        roomFloor,
        bedNumber,
        department,
        timestamp: new Date()
      });
      console.log('✅ WebSocket notification sent to frontend');
    }
    
    if (nurses.length === 0) {
      console.log('⚠️ No assigned nurses found, falling back to all nurses');
      
      // Agar biriktirilgan hamshira bo'lmasa, barcha hamshiralarga yuborish
      const allNurses = await Staff.find({
        role: 'nurse',
        status: 'active',
        telegram_chat_id: { $exists: true, $ne: null },
        telegram_notifications_enabled: true
      }).lean();
      
      if (allNurses.length === 0) {
        return res.json({
          success: true,
          message: 'Telegram ulangan hamshiralar topilmadi',
          data: { notified_count: 0 }
        });
      }
      
      nurses.push(...allNurses);
      console.log(`📊 Using ${nurses.length} nurses as fallback`);
    }
    
    const TelegramBot = (await import('node-telegram-bot-api')).default;
    const bot = new TelegramBot(process.env.BOT_TOKEN || '8551375038:AAFXDSS0IwrsZsqCIC2_oXXZwVZZWgqSdD4');
    
    // Xabar matnini yaratish - diqqat jalb qiluvchi format
    let message = `🚨🔔 *BEMOR CHAQIRYAPTI!* 🔔🚨\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `👤 *Bemor:* ${patientName}\n`;
    message += `📋 *Bemor №:* ${patientNumber}\n\n`;
    
    // Bo'lim (Department)
    if (department) {
      message += `🏥 *Bo'lim:* ${department}\n`;
    }
    
    // Xona (without floor)
    message += `🚪 *Xona:* ${roomNumber}\n`;
    
    // Ko'rpa
    message += `🛏 *Ko'rpa:* ${bedNumber}\n\n`;
    
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `⏰ *Vaqt:* ${new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}\n\n`;
    message += `⚡️ *TEZKOR YORDAM KERAK!* ⚡️\n`;
    message += `💡 Iltimos, bemorga darhol yordam bering!`;
    
    // Biriktirilgan hamshiralarga yuborish
    let notifiedCount = 0;
    for (const nurse of nurses) {
      try {
        await bot.sendMessage(nurse.telegram_chat_id, message, { parse_mode: 'Markdown' });
        notifiedCount++;
        console.log(`✅ Notification sent to nurse: ${nurse.first_name} ${nurse.last_name}`);
      } catch (error) {
        console.error(`❌ Error sending to nurse ${nurse.first_name} ${nurse.last_name}:`, error.message);
      }
    }
    
    res.json({
      success: true,
      message: `${notifiedCount} ta hamshiraga xabar yuborildi`,
      data: {
        notified_count: notifiedCount,
        total_nurses: nurses.length
      }
    });
  } catch (error) {
    console.error('Error calling nurse:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    });
  }
});

/**
 * POST /api/v1/bot/send-message-to-staff
 * Send message to staff via Telegram bot
 */
router.post('/send-message-to-staff', async (req, res) => {
  try {
    const { staffId, subject, content, senderName, senderRole } = req.body;
    
    console.log('=== SEND MESSAGE TO STAFF ===');
    console.log('Staff ID:', staffId);
    console.log('Subject:', subject);
    console.log('Content:', content);
    
    // Find staff by ID
    const staff = await Staff.findById(staffId);
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Xodim topilmadi'
      });
    }
    
    // Import Communication model and TelegramBot
    const Communication = (await import('../models/Communication.js')).default;
    const TelegramBot = (await import('node-telegram-bot-api')).default;
    
    // Create communication record
    const communication = new Communication({
      recipient_id: staffId,
      recipient_type: 'staff',
      recipient_name: `${staff.first_name} ${staff.last_name}`,
      recipient_phone: staff.phone,
      sender_name: senderName,
      sender_role: senderRole,
      subject: subject,
      content: content,
      channel: 'telegram',
      status: 'pending'
    });
    
    await communication.save();
    
    // Send to Telegram if staff has telegram_chat_id
    if (staff.telegram_chat_id && staff.telegram_notifications_enabled) {
      try {
        const bot = new TelegramBot(process.env.BOT_TOKEN || '8551375038:AAFXDSS0IwrsZsqCIC2_oXXZwVZZWgqSdD4');
        
        let message = '📨 *Yangi xabar!*\n\n';
        
        if (subject) {
          message += `📌 *${subject}*\n\n`;
        }
        
        message += `💬 ${content}\n\n`;
        
        if (senderName) {
          message += `👤 Yuboruvchi: ${senderName}`;
          if (senderRole) {
            message += ` (${senderRole})`;
          }
          message += '\n';
        }
        
        message += `\n📅 ${new Date().toLocaleDateString('uz-UZ')} ${new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`;
        
        await bot.sendMessage(staff.telegram_chat_id, message, { parse_mode: 'Markdown' });
        
        // Update communication status
        communication.status = 'sent';
        communication.sent_at = new Date();
        await communication.save();
        
        console.log('✅ Message sent to Telegram');
      } catch (telegramError) {
        console.error('❌ Error sending to Telegram:', telegramError);
        communication.status = 'failed';
        communication.error_message = telegramError.message;
        await communication.save();
      }
    } else {
      console.log('⚠️ Staff does not have Telegram chat ID or notifications disabled');
      communication.status = 'pending';
      await communication.save();
    }
    
    res.json({
      success: true,
      message: 'Xabar yuborildi',
      data: {
        id: communication._id,
        status: communication.status
      }
    });
  } catch (error) {
    console.error('Error sending message to staff:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    });
  }
});

/**
 * GET /api/v1/bot/messages/staff/:staffId
 * Get messages for staff member
 */
router.get('/messages/staff/:staffId', async (req, res) => {
  try {
    const { staffId } = req.params;
    
    console.log('=== BOT STAFF MESSAGES ===');
    console.log('Staff ID:', staffId);
    
    // Import Communication model
    const Communication = (await import('../models/Communication.js')).default;
    
    // Find messages for this staff member
    const messages = await Communication.find({
      recipient_id: staffId,
      recipient_type: 'staff'
    })
      .sort({ created_at: -1 })
      .limit(20)
      .lean();
    
    console.log(`✅ Found ${messages.length} messages for staff`);
    
    res.json({
      success: true,
      data: messages.map(msg => ({
        id: msg._id,
        subject: msg.subject,
        content: msg.content,
        sender_name: msg.sender_name,
        sender_role: msg.sender_role,
        status: msg.status,
        created_at: msg.created_at || msg.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching staff messages:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    });
  }
});

/**
 * GET /api/v1/bot/messages/patient/:patientId
 * Get messages for patient
 */
router.get('/messages/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    console.log('=== BOT PATIENT MESSAGES ===');
    console.log('Patient ID:', patientId);
    
    // Import Communication model
    const Communication = (await import('../models/Communication.js')).default;
    
    // Find messages for this patient
    const messages = await Communication.find({
      recipient_id: patientId,
      recipient_type: 'patient'
    })
      .sort({ created_at: -1 })
      .limit(20)
      .lean();
    
    console.log(`✅ Found ${messages.length} messages for patient`);
    
    res.json({
      success: true,
      data: messages.map(msg => ({
        id: msg._id,
        subject: msg.subject,
        content: msg.content,
        sender_name: msg.sender_name,
        sender_role: msg.sender_role,
        status: msg.status,
        created_at: msg.created_at || msg.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching patient messages:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    });
  }
});

/**
 * GET /api/v1/bot/tasks/staff/:staffId
 * Get tasks for staff member (for bot)
 */
router.get('/tasks/staff/:staffId', async (req, res) => {
  try {
    const { staffId } = req.params;
    
    console.log('=== BOT TASKS LOOKUP ===');
    console.log('Staff ID:', staffId);
    
    // Import Task model
    const Task = (await import('../models/Task.js')).default;
    
    // Find tasks assigned to this staff member
    const tasks = await Task.find({
      assigned_to: staffId,
      status: { $in: ['pending', 'in_progress', 'completed', 'verified'] }
    })
      .populate('created_by', 'first_name last_name')
      .sort({ created_at: -1 })
      .limit(50)
      .lean();
    
    console.log(`✅ Found ${tasks.length} tasks`);
    
    // Format tasks for bot
    const formattedTasks = tasks.map(task => ({
      id: task._id,
      title: task.title,
      description: task.description,
      task_type: task.task_type,
      priority: task.priority,
      status: task.status,
      due_date: task.due_date,
      location_details: task.location_details,
      started_at: task.started_at,
      completed_at: task.completed_at,
      verified_at: task.verified_at,
      completion_notes: task.completion_notes,
      rejection_reason: task.rejection_reason,
      creator_name: task.created_by ? `${task.created_by.first_name} ${task.created_by.last_name}` : 'N/A',
      created_at: task.created_at
    }));
    
    res.json({
      success: true,
      data: formattedTasks
    });
  } catch (error) {
    console.error('Error fetching staff tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
});

export default router;
