import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import Queue from '../models/Queue.js';
import Patient from '../models/Patient.js';
import Staff from '../models/Staff.js';
import { sendQueueCallNotification } from '../services/telegram.service.js';

const router = express.Router();

/**
 * Get queue list
 */
router.get('/',
  authenticate,
  async (req, res, next) => {
    try {
      const { date, doctor_id, status } = req.query;
      
      console.log('=== GET QUEUE (MongoDB) ===');
      console.log('Filters:', { date, doctor_id, status });
      
      // Build query
      let query = {};
      
      if (date) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        
        query.createdAt = {
          $gte: startDate,
          $lte: endDate
        };
      } else {
        // Default to today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        query.createdAt = {
          $gte: today,
          $lt: tomorrow
        };
      }
      
      if (doctor_id) {
        query.doctor_id = doctor_id;
      }
      
      if (status) {
        query.status = status;
      }
      
      // Get queues with populated data
      const queues = await Queue.find(query)
        .populate('patient_id', 'patient_number first_name last_name phone')
        .populate('doctor_id', 'first_name last_name specialization')
        .sort({ queue_number: 1 })
        .lean();
      
      console.log('Found queues:', queues.length);
      
      // Format response
      const queueData = queues.map(q => ({
        id: q._id,
        queueNumber: q.queue_number,
        queueType: q.queue_type,
        status: q.status,
        appointmentTime: q.createdAt,
        calledAt: q.called_at,
        completedAt: q.completed_at,
        notes: q.notes,
        patientId: q.patient_id?._id,
        patient_id: q.patient_id?._id,
        doctor_id: q.doctor_id?._id,
        patientName: q.patient_id ? `${q.patient_id.first_name} ${q.patient_id.last_name}` : 'N/A',
        patientNumber: q.patient_id?.patient_number,
        patientPhone: q.patient_id?.phone,
        doctorName: q.doctor_id ? `${q.doctor_id.first_name} ${q.doctor_id.last_name}` : 'N/A'
      }));
      
      res.json({
        success: true,
        data: queueData
      });
    } catch (error) {
      console.error('Queue GET error:', error);
      res.json({
        success: true,
        data: [],
        error: error.message
      });
    }
  }
);

/**
 * Get list of doctors for queue
 */
router.get('/doctors',
  authenticate,
  async (req, res, next) => {
    try {
      console.log('=== GET /queue/doctors (MongoDB) ===');
      
      // Get all doctors
      const doctors = await Staff.find({
        role: 'doctor',
        status: 'active'
      }).select('first_name last_name specialization phone').lean();
      
      console.log('Found doctors:', doctors.length);
      
      // Get today's waiting count for each doctor
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const doctorsWithCount = await Promise.all(
        doctors.map(async (doctor) => {
          const waitingCount = await Queue.countDocuments({
            doctor_id: doctor._id,
            status: 'WAITING',
            createdAt: {
              $gte: today,
              $lt: tomorrow
            }
          });
          
          return {
            id: doctor._id,
            first_name: doctor.first_name,
            last_name: doctor.last_name,
            specialization: doctor.specialization,
            phone: doctor.phone,
            waiting_count: waitingCount
          };
        })
      );
      
      console.log('✅ Doctors with counts:', doctorsWithCount.length);
      
      res.json({
        success: true,
        data: doctorsWithCount
      });
    } catch (error) {
      console.error('❌ Get doctors error:', error);
      res.status(500).json({
        success: false,
        message: 'Shifokorlar ro\'yxatini yuklashda xatolik',
        error: error.message
      });
    }
  }
);

/**
 * Get queue statistics
 */
router.get('/stats',
  authenticate,
  async (req, res, next) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const query = {
        createdAt: {
          $gte: today,
          $lt: tomorrow
        }
      };
      
      const [waiting, in_progress, completed, cancelled, total] = await Promise.all([
        Queue.countDocuments({ ...query, status: 'WAITING' }),
        Queue.countDocuments({ ...query, status: 'IN_PROGRESS' }),
        Queue.countDocuments({ ...query, status: 'COMPLETED' }),
        Queue.countDocuments({ ...query, status: 'CANCELLED' }),
        Queue.countDocuments(query)
      ]);
      
      res.json({
        success: true,
        data: {
          waiting,
          in_progress,
          completed,
          cancelled,
          total
        }
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.json({
        success: true,
        data: { waiting: 0, in_progress: 0, completed: 0, cancelled: 0, total: 0 }
      });
    }
  }
);

/**
 * Add patient to queue
 */
router.post('/',
  authenticate,
  authorize('admin', 'receptionist'),
  async (req, res, next) => {
    try {
      const { patient_id, doctor_id, queue_type = 'NORMAL', notes } = req.body;
      
      console.log('=== ADD TO QUEUE (MongoDB) ===');
      console.log('Data:', { patient_id, doctor_id, queue_type, notes });
      
      if (!patient_id || !doctor_id) {
        return res.status(400).json({
          success: false,
          message: 'Bemor va shifokor tanlanishi kerak'
        });
      }
      
      // Check if patient has paid invoices
      const Invoice = (await import('../models/Invoice.js')).default;
      const paidInvoices = await Invoice.countDocuments({
        patient_id,
        payment_status: 'paid',
        qr_code_active: true
      });
      
      if (paidInvoices === 0) {
        return res.status(400).json({
          success: false,
          message: 'Bemor kassada to\'lov qilmagan. Avval to\'lov qiling!'
        });
      }
      
      // Get today's queue count for this doctor
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const count = await Queue.countDocuments({
        doctor_id,
        createdAt: {
          $gte: today,
          $lt: tomorrow
        }
      });
      
      const queueNumber = count + 1;
      
      // Create queue entry
      const queue = new Queue({
        patient_id,
        doctor_id,
        queue_number: queueNumber,
        queue_type,
        status: 'WAITING',
        notes
      });
      
      await queue.save();
      
      console.log('✅ Queue created:', queue._id);
      
      res.status(201).json({
        success: true,
        data: queue,
        message: 'Bemor navbatga qo\'shildi'
      });
    } catch (error) {
      console.error('Add to queue error:', error);
      res.status(500).json({
        success: false,
        message: 'Navbatga qo\'shishda xatolik',
        error: error.message
      });
    }
  }
);

/**
 * Call patient from queue
 */
router.put('/:id/call',
  authenticate,
  async (req, res, next) => {
    try {
      const queue = await Queue.findById(req.params.id);
      
      if (!queue) {
        return res.status(404).json({
          success: false,
          message: 'Navbat topilmadi'
        });
      }
      
      queue.status = 'CALLED';
      queue.called_at = new Date();
      await queue.save();
      
      // Send notification if patient has telegram
      try {
        const patient = await Patient.findById(queue.patient_id);
        const doctor = await Staff.findById(queue.doctor_id);
        
        if (patient && patient.telegram_chat_id && doctor) {
          // Bemorga xabar yuborish - shifokor chaqirdi
          const axios = (await import('axios')).default;
          const BOT_TOKEN = process.env.BOT_TOKEN || 'your_bot_token_here';
          
          const message = `🔔 *Sizning navbatingiz keldi!*\n\n` +
            `👨‍⚕️ Shifokor: *${doctor.first_name} ${doctor.last_name}*\n` +
            `📍 Shifokor sizni chaqirdi!\n\n` +
            `⏰ Iltimos, darhol qabul xonasiga kiring!`;
          
          await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: patient.telegram_chat_id,
            text: message,
            parse_mode: 'Markdown'
          });
          
          console.log(`✅ Call notification sent to patient: ${patient.first_name} ${patient.last_name}`);
        }
        
        // Keyingi bemorga xabar yuborish (navbat 1 bo'lganida)
        await notifyNextPatient(queue.doctor_id);
      } catch (notifError) {
        console.error('Notification error:', notifError);
      }
      
      res.json({
        success: true,
        data: queue,
        message: 'Bemor chaqirildi'
      });
    } catch (error) {
      console.error('Call patient error:', error);
      res.status(500).json({
        success: false,
        message: 'Bemorni chaqirishda xatolik',
        error: error.message
      });
    }
  }
);

/**
 * Start appointment
 */
router.put('/:id/start',
  authenticate,
  async (req, res, next) => {
    try {
      const queue = await Queue.findById(req.params.id);
      
      if (!queue) {
        return res.status(404).json({
          success: false,
          message: 'Navbat topilmadi'
        });
      }
      
      queue.status = 'IN_PROGRESS';
      await queue.save();
      
      res.json({
        success: true,
        data: queue,
        message: 'Qabul boshlandi'
      });
    } catch (error) {
      console.error('Start appointment error:', error);
      res.status(500).json({
        success: false,
        message: 'Qabulni boshlashda xatolik',
        error: error.message
      });
    }
  }
);

/**
 * Complete appointment
 */
router.put('/:id/complete',
  authenticate,
  async (req, res, next) => {
    try {
      const queue = await Queue.findById(req.params.id);
      
      if (!queue) {
        return res.status(404).json({
          success: false,
          message: 'Navbat topilmadi'
        });
      }
      
      queue.status = 'COMPLETED';
      queue.completed_at = new Date();
      await queue.save();
      
      res.json({
        success: true,
        data: queue,
        message: 'Qabul yakunlandi'
      });
    } catch (error) {
      console.error('Complete appointment error:', error);
      res.status(500).json({
        success: false,
        message: 'Qabulni yakunlashda xatolik',
        error: error.message
      });
    }
  }
);

/**
 * Cancel appointment
 */
router.put('/:id/cancel',
  authenticate,
  async (req, res, next) => {
    try {
      const { reason } = req.body;
      
      const queue = await Queue.findById(req.params.id);
      
      if (!queue) {
        return res.status(404).json({
          success: false,
          message: 'Navbat topilmadi'
        });
      }
      
      queue.status = 'CANCELLED';
      const cancelReason = reason || 'Sabab ko\'rsatilmagan';
      queue.notes = queue.notes 
        ? `${queue.notes} | Bekor qilish sababi: ${cancelReason}`
        : `Bekor qilish sababi: ${cancelReason}`;
      
      await queue.save();
      
      res.json({
        success: true,
        data: queue,
        message: 'Qabul bekor qilindi'
      });
    } catch (error) {
      console.error('Cancel appointment error:', error);
      res.status(500).json({
        success: false,
        message: 'Qabulni bekor qilishda xatolik',
        error: error.message
      });
    }
  }
);

// Helper function: Keyingi bemorga xabar yuborish
async function notifyNextPatient(doctorId) {
  try {
    // Bugungi kun uchun kutayotgan navbatlarni olish
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const waitingQueues = await Queue.find({
      doctor_id: doctorId,
      status: 'WAITING',
      createdAt: { $gte: today, $lt: tomorrow }
    })
      .sort({ queue_number: 1 })
      .limit(1)
      .lean();
    
    if (waitingQueues.length > 0) {
      const nextQueue = waitingQueues[0];
      
      // Bemorni topish
      const patient = await Patient.findById(nextQueue.patient_id);
      const doctor = await Staff.findById(doctorId);
      
      if (patient && patient.telegram_chat_id && doctor) {
        // Telegram orqali xabar yuborish
        const axios = (await import('axios')).default;
        const BOT_TOKEN = process.env.BOT_TOKEN || 'your_bot_token_here';
        
        const message = `🎯 *Navbatingiz yaqinlashdi!*\n\n` +
          `👨‍⚕️ Shifokor: *${doctor.first_name} ${doctor.last_name}*\n` +
          `🔢 Sizning navbatingiz: *1*\n\n` +
          `⏰ Siz keyingi navbatdasiz!\n` +
          `📍 Iltimos, qabul xonasi yonida tayyor turing.`;
        
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          chat_id: patient.telegram_chat_id,
          text: message,
          parse_mode: 'Markdown'
        });
        
        console.log(`✅ Next patient notification sent to: ${patient.first_name} ${patient.last_name}`);
      }
    }
  } catch (error) {
    console.error('Error notifying next patient:', error);
  }
}

export default router;
