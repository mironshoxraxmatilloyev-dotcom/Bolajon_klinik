import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { 
  getDoctorDailyStats, 
  sendDailyReportToDoctor,
  sendDailyReportsToAllDoctors 
} from '../services/doctorDailyReportService.js';
import Staff from '../models/Staff.js';

const router = express.Router();

/**
 * Get doctor's daily statistics
 * GET /api/v1/reports/doctor-daily/:doctorId
 */
router.get('/doctor-daily/:doctorId', authenticate, authorize('Admin', 'Administrator', 'Doctor', 'Shifokor'), async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    const stats = await getDoctorDailyStats(doctorId, date ? new Date(date) : new Date());

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get doctor daily stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Statistikani olishda xatolik',
      error: error.message
    });
  }
});

/**
 * Send daily report to specific doctor (TEST)
 * POST /api/v1/reports/send-doctor-report/:doctorId
 */
router.post('/send-doctor-report/:doctorId', authenticate, authorize('Admin', 'Administrator'), async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await Staff.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Shifokor topilmadi'
      });
    }

    const stats = await getDoctorDailyStats(doctorId);
    const result = await sendDailyReportToDoctor(doctor, stats);

    res.json({
      success: result.success,
      message: result.success ? 'Hisobot yuborildi' : 'Hisobot yuborilmadi',
      data: result
    });
  } catch (error) {
    console.error('Send doctor report error:', error);
    res.status(500).json({
      success: false,
      message: 'Hisobotni yuborishda xatolik',
      error: error.message
    });
  }
});

/**
 * Send daily reports to all doctors (TEST)
 * POST /api/v1/reports/send-all-doctor-reports
 */
router.post('/send-all-doctor-reports', authenticate, authorize('Admin', 'Administrator'), async (req, res) => {
  try {
    const result = await sendDailyReportsToAllDoctors();

    res.json({
      success: true,
      message: 'Hisobotlar yuborildi',
      data: result
    });
  } catch (error) {
    console.error('Send all doctor reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Hisobotlarni yuborishda xatolik',
      error: error.message
    });
  }
});

export default router;
