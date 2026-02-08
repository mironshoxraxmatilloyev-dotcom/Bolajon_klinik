import express from 'express';
import Attendance from '../models/Attendance.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * Get today's attendance for current user
 * GET /api/v1/attendance/today
 */
router.get('/today', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      staff: req.user.id,
      check_in: {
        $gte: today,
        $lt: tomorrow
      }
    });

    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Xatolik yuz berdi',
      error: error.message
    });
  }
});

/**
 * Check in
 * POST /api/v1/attendance/check-in
 */
router.post('/check-in', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if already checked in today
    const existing = await Attendance.findOne({
      staff: req.user.id,
      check_in: {
        $gte: today,
        $lt: tomorrow
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Siz bugun allaqachon kelish vaqtini belgilagansiz'
      });
    }

    // Get staff salary info to check work schedule
    const StaffSalary = (await import('../models/StaffSalary.js')).default;
    const Staff = (await import('../models/Staff.js')).default;
    const Penalty = (await import('../models/Penalty.js')).default;
    
    const staffSalary = await StaffSalary.findOne({ staff_id: req.user.id });
    const staff = await Staff.findById(req.user.id);
    
    const checkInTime = new Date();
    let isLate = false;
    let lateMinutes = 0;
    let lateMessage = null;
    let penaltyAmount = 0;

    if (staffSalary && staffSalary.work_start_time) {
      // Parse work start time
      const [startHour, startMinute] = staffSalary.work_start_time.split(':').map(Number);
      const expectedStartTime = new Date();
      expectedStartTime.setHours(startHour, startMinute, 0, 0);

      // Check if late
      if (checkInTime > expectedStartTime) {
        isLate = true;
        lateMinutes = Math.floor((checkInTime - expectedStartTime) / (1000 * 60));
        
        // Calculate penalty (hourly rate * hours late)
        if (staffSalary.work_hours_per_month > 0 && staffSalary.base_salary > 0) {
          const hourlyRate = staffSalary.base_salary / staffSalary.work_hours_per_month;
          const hoursLate = lateMinutes / 60;
          penaltyAmount = Math.round(hourlyRate * hoursLate);
        }

        // Format times for message
        const expectedTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
        const actualTime = `${String(checkInTime.getHours()).padStart(2, '0')}:${String(checkInTime.getMinutes()).padStart(2, '0')}`;
        
        lateMessage = `Siz kech qoldingiz! Sizning ish vaqtingiz ${expectedTime} edi, siz ${actualTime} da keldingiz (${lateMinutes} daqiqa kechikish). Admin sizga jarima yozishi mumkin.`;

        // Create pending penalty
        console.log('🔍 Check-in: Creating penalty:', {
          staff_id: req.user.id,
          amount: penaltyAmount,
          lateMinutes,
          isLate,
          hourlyRate: staffSalary.base_salary / staffSalary.work_hours_per_month,
          base_salary: staffSalary.base_salary,
          work_hours_per_month: staffSalary.work_hours_per_month
        });
        
        if (penaltyAmount > 0) {
          const currentDate = new Date();
          try {
            const penalty = await Penalty.create({
              staff_id: req.user.id,
              amount: penaltyAmount,
              reason: `Kechikish: ${lateMinutes} daqiqa (${expectedTime} o'rniga ${actualTime} da keldi)`,
              penalty_type: 'late',
              month: currentDate.getMonth() + 1,
              year: currentDate.getFullYear(),
              status: 'pending', // Admin tasdiqlashi kerak
              penalty_date: currentDate
            });
            console.log('✅ Check-in: Penalty created:', penalty._id);
          } catch (penaltyError) {
            console.error('❌ Check-in: Penalty creation error:', penaltyError);
          }
        } else {
          console.log('⚠️ Check-in: Penalty amount is 0, not creating penalty');
        }
      }
    }

    const attendance = new Attendance({
      staff: req.user.id,
      check_in: checkInTime,
      status: isLate ? 'late' : 'present'
    });

    await attendance.save();

    res.json({
      success: true,
      message: isLate ? lateMessage : 'Kelish vaqti belgilandi',
      data: {
        attendance,
        isLate,
        lateMinutes,
        penaltyAmount: isLate ? penaltyAmount : 0
      }
    });
  } catch (error) {
    console.error('Check in error:', error);
    res.status(500).json({
      success: false,
      message: 'Xatolik yuz berdi',
      error: error.message
    });
  }
});

/**
 * Check out
 * POST /api/v1/attendance/check-out
 */
router.post('/check-out', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      staff: req.user.id,
      check_in: {
        $gte: today,
        $lt: tomorrow
      }
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Kelish vaqti topilmadi'
      });
    }

    if (attendance.check_out) {
      return res.status(400).json({
        success: false,
        message: 'Siz allaqachon ketish vaqtini belgilagansiz'
      });
    }

    // Get staff salary info to check work schedule
    const StaffSalary = (await import('../models/StaffSalary.js')).default;
    const Penalty = (await import('../models/Penalty.js')).default;
    const Staff = (await import('../models/Staff.js')).default;
    const CashierReport = (await import('../models/CashierReport.js')).default;
    const Invoice = (await import('../models/Invoice.js')).default;
    const Patient = (await import('../models/Patient.js')).default;
    
    const staffSalary = await StaffSalary.findOne({ staff_id: req.user.id });
    const staff = await Staff.findById(req.user.id);
    
    const checkOutTime = new Date();
    let isEarly = false;
    let earlyMinutes = 0;
    let earlyMessage = null;
    let penaltyAmount = 0;

    if (staffSalary && staffSalary.work_end_time) {
      // Parse work end time
      const [endHour, endMinute] = staffSalary.work_end_time.split(':').map(Number);
      const expectedEndTime = new Date();
      expectedEndTime.setHours(endHour, endMinute, 0, 0);

      // Check if leaving early
      if (checkOutTime < expectedEndTime) {
        isEarly = true;
        earlyMinutes = Math.floor((expectedEndTime - checkOutTime) / (1000 * 60));
        
        // Calculate penalty (hourly rate * hours early)
        if (staffSalary.work_hours_per_month > 0 && staffSalary.base_salary > 0) {
          const hourlyRate = staffSalary.base_salary / staffSalary.work_hours_per_month;
          const hoursEarly = earlyMinutes / 60;
          penaltyAmount = Math.round(hourlyRate * hoursEarly);
        }

        // Format times for message
        const expectedTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
        const actualTime = `${String(checkOutTime.getHours()).padStart(2, '0')}:${String(checkOutTime.getMinutes()).padStart(2, '0')}`;
        
        earlyMessage = `Siz erta ketdingiz! Sizning ish vaqtingiz ${expectedTime} gacha edi, siz ${actualTime} da ketdingiz (${earlyMinutes} daqiqa erta). Admin sizga jarima yozishi mumkin.`;

        // Create pending penalty
        console.log('🔍 Creating penalty:', {
          staff_id: req.user.id,
          amount: penaltyAmount,
          earlyMinutes,
          isEarly
        });
        
        if (penaltyAmount > 0) {
          const currentDate = new Date();
          try {
            const penalty = await Penalty.create({
              staff_id: req.user.id,
              amount: penaltyAmount,
              reason: `Erta ketish: ${earlyMinutes} daqiqa (${expectedTime} o'rniga ${actualTime} da ketdi)`,
              penalty_type: 'other',
              month: currentDate.getMonth() + 1,
              year: currentDate.getFullYear(),
              status: 'pending', // Admin tasdiqlashi kerak
              penalty_date: currentDate
            });
            console.log('✅ Penalty created:', penalty._id);
          } catch (penaltyError) {
            console.error('❌ Penalty creation error:', penaltyError);
          }
        } else {
          console.log('⚠️ Penalty amount is 0, not creating penalty');
        }
      }
    }

    attendance.check_out = checkOutTime;
    await attendance.save();

    // Create cashier report if user is reception/cashier
    if (staff && (staff.role === 'reception' || staff.role === 'admin')) {
      console.log('📊 Creating cashier report for:', staff.first_name, staff.last_name);
      
      try {
        // Get all invoices created by this staff today
        const invoices = await Invoice.find({
          created_by: req.user.id,
          created_at: {
            $gte: today,
            $lt: tomorrow
          }
        }).populate('patient_id', 'first_name last_name').lean();

        console.log(`📋 Found ${invoices.length} invoices`);

        // Calculate statistics
        const stats = {
          total_invoices: invoices.length,
          paid_invoices: 0,
          unpaid_invoices: 0,
          partial_invoices: 0,
          total_amount: 0,
          paid_amount: 0,
          unpaid_amount: 0
        };

        const invoiceDetails = [];

        invoices.forEach(invoice => {
          const totalAmount = parseFloat(invoice.total_amount || 0);
          const paidAmount = parseFloat(invoice.paid_amount || 0);
          
          stats.total_amount += totalAmount;
          stats.paid_amount += paidAmount;
          stats.unpaid_amount += (totalAmount - paidAmount);

          if (invoice.payment_status === 'paid') {
            stats.paid_invoices++;
          } else if (invoice.payment_status === 'unpaid') {
            stats.unpaid_invoices++;
          } else if (invoice.payment_status === 'partial') {
            stats.partial_invoices++;
          }

          invoiceDetails.push({
            invoice_id: invoice._id,
            invoice_number: invoice.invoice_number,
            patient_name: invoice.patient_id 
              ? `${invoice.patient_id.first_name} ${invoice.patient_id.last_name}`
              : 'N/A',
            total_amount: totalAmount,
            paid_amount: paidAmount,
            payment_status: invoice.payment_status,
            created_at: invoice.created_at
          });
        });

        // Calculate work duration
        const workDuration = Math.floor((checkOutTime - attendance.check_in) / (1000 * 60));

        // Create report
        const report = await CashierReport.create({
          staff_id: req.user.id,
          date: today,
          check_in_time: attendance.check_in,
          check_out_time: checkOutTime,
          work_duration: workDuration,
          ...stats,
          invoices: invoiceDetails
        });

        console.log('✅ Cashier report created:', report._id);
      } catch (reportError) {
        console.error('❌ Cashier report creation error:', reportError);
        // Don't fail the check-out if report creation fails
      }
    }

    res.json({
      success: true,
      message: isEarly ? earlyMessage : 'Ketish vaqti belgilandi',
      data: {
        attendance,
        isEarly,
        earlyMinutes,
        penaltyAmount: isEarly ? penaltyAmount : 0
      }
    });
  } catch (error) {
    console.error('Check out error:', error);
    res.status(500).json({
      success: false,
      message: 'Xatolik yuz berdi',
      error: error.message
    });
  }
});

/**
 * Get attendance history
 * GET /api/v1/attendance/history
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const { start_date, end_date, limit = 30 } = req.query;

    const filter = { staff: req.user.id };

    if (start_date || end_date) {
      filter.check_in = {};
      if (start_date) filter.check_in.$gte = new Date(start_date);
      if (end_date) filter.check_in.$lte = new Date(end_date);
    }

    const attendances = await Attendance.find(filter)
      .sort({ check_in: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: attendances
    });
  } catch (error) {
    console.error('Get attendance history error:', error);
    res.status(500).json({
      success: false,
      message: 'Xatolik yuz berdi',
      error: error.message
    });
  }
});

export default router;
