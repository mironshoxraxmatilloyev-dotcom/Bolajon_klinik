import express from 'express';
import Staff from '../models/Staff.js';
import OnDutyDoctor from '../models/OnDutyDoctor.js';
import Attendance from '../models/Attendance.js';
import Task from '../models/Task.js';
import Patient from '../models/Patient.js';
import Invoice from '../models/Invoice.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * Get dashboard statistics
 * GET /api/v1/chief-doctor/dashboard
 */
router.get('/dashboard', authenticate, authorize('chief_doctor'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Staff statistics
    const totalStaff = await Staff.countDocuments({ status: 'active' });
    const presentToday = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      status: 'present'
    });
    const absentToday = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      status: 'absent'
    });
    const onLeave = await Staff.countDocuments({ status: 'on_leave' });

    // Patient statistics
    const totalPatients = await Patient.countDocuments();
    const newPatientsToday = await Patient.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });

    // Financial statistics (hidden for chief_doctor)
    let todayRevenue = 0;
    if (req.user.role !== 'chief_doctor') {
      const revenueData = await Invoice.aggregate([
        {
          $match: {
            created_at: { $gte: today, $lt: tomorrow },
            status: { $in: ['paid', 'partially_paid'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$paid_amount' }
          }
        }
      ]);
      todayRevenue = revenueData[0]?.total || 0;
    }

    // Task statistics
    const pendingTasks = await Task.countDocuments({ status: 'pending' });
    const completedTasksToday = await Task.countDocuments({
      status: 'completed',
      updated_at: { $gte: today, $lt: tomorrow }
    });

    // On-duty doctors
    const onDutyDoctors = await OnDutyDoctor.find({
      shift_date: { $gte: today, $lt: tomorrow },
      status: { $in: ['scheduled', 'active'] }
    })
      .populate('doctor_id', 'first_name last_name specialization phone')
      .lean();

    res.json({
      success: true,
      data: {
        staff: {
          total: totalStaff,
          present: presentToday,
          absent: absentToday,
          on_leave: onLeave
        },
        patients: {
          total: totalPatients,
          new_today: newPatientsToday
        },
        finance: req.user.role === 'chief_doctor' ? null : {
          today_revenue: todayRevenue
        },
        tasks: {
          pending: pendingTasks,
          completed_today: completedTasksToday
        },
        on_duty_doctors: onDutyDoctors
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * Get staff activity
 * GET /api/v1/chief-doctor/staff-activity
 */
router.get('/staff-activity', authenticate, authorize('chief_doctor'), async (req, res) => {
  try {
    const { date, role } = req.query;
    
    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(queryDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Build staff query
    const staffQuery = { status: 'active' };
    if (role && role !== 'all') {
      staffQuery.role = role;
    }

    const staff = await Staff.find(staffQuery)
      .select('first_name last_name role department phone specialization')
      .lean();

    // Get attendance for each staff
    const staffWithActivity = await Promise.all(
      staff.map(async (member) => {
        const attendance = await Attendance.findOne({
          staff_id: member._id,
          date: { $gte: queryDate, $lt: nextDay }
        }).lean();

        const tasks = await Task.find({
          assigned_to: member._id,
          created_at: { $gte: queryDate, $lt: nextDay }
        }).lean();

        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const pendingTasks = tasks.filter(t => t.status === 'pending').length;

        return {
          ...member,
          attendance: attendance ? {
            status: attendance.status,
            check_in: attendance.check_in_time,
            check_out: attendance.check_out_time,
            notes: attendance.notes
          } : null,
          tasks: {
            total: tasks.length,
            completed: completedTasks,
            pending: pendingTasks
          }
        };
      })
    );

    res.json({
      success: true,
      data: staffWithActivity
    });
  } catch (error) {
    console.error('Staff activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * Get on-duty doctors schedule
 * GET /api/v1/chief-doctor/on-duty-schedule
 */
router.get('/on-duty-schedule', authenticate, authorize('chief_doctor', 'admin', 'cashier', 'receptionist'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    const query = {};
    if (start_date && end_date) {
      query.shift_date = {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      };
    } else {
      // Default: next 7 days
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      query.shift_date = { $gte: today, $lt: nextWeek };
    }

    const schedule = await OnDutyDoctor.find(query)
      .populate('doctor_id', 'first_name last_name specialization phone')
      .populate('assigned_by', 'first_name last_name')
      .sort({ shift_date: 1, start_time: 1 })
      .lean();

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('On-duty schedule error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * Get my on-duty shifts (for doctors)
 * GET /api/v1/chief-doctor/my-shifts
 */
router.get('/my-shifts', authenticate, authorize('doctor'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const myShifts = await OnDutyDoctor.find({
      doctor_id: req.user.id,
      shift_date: { $gte: today, $lt: nextMonth },
      status: { $in: ['scheduled', 'active'] }
    })
      .populate('assigned_by', 'first_name last_name')
      .sort({ shift_date: 1, start_time: 1 })
      .lean();

    res.json({
      success: true,
      data: myShifts
    });
  } catch (error) {
    console.error('My shifts error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * Assign on-duty doctor
 * POST /api/v1/chief-doctor/on-duty-schedule
 */
router.post('/on-duty-schedule', authenticate, authorize('chief_doctor', 'admin'), async (req, res) => {
  try {
    const { doctor_id, shift_date, shift_type, start_time, end_time, notes } = req.body;

    // Validate doctor exists and is a doctor
    const doctor = await Staff.findById(doctor_id);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(400).json({
        success: false,
        error: 'Invalid doctor'
      });
    }

    // Check if doctor already has a shift on this date
    const existingShift = await OnDutyDoctor.findOne({
      doctor_id,
      shift_date: new Date(shift_date),
      status: { $in: ['scheduled', 'active'] }
    });

    if (existingShift) {
      return res.status(400).json({
        success: false,
        error: 'Doctor already has a shift on this date'
      });
    }

    const onDutyDoctor = new OnDutyDoctor({
      doctor_id,
      shift_date: new Date(shift_date),
      shift_type,
      start_time,
      end_time,
      notes,
      assigned_by: req.user.id
    });

    await onDutyDoctor.save();

    const populated = await OnDutyDoctor.findById(onDutyDoctor._id)
      .populate('doctor_id', 'first_name last_name specialization phone')
      .populate('assigned_by', 'first_name last_name')
      .lean();

    res.status(201).json({
      success: true,
      data: populated
    });
  } catch (error) {
    console.error('Assign on-duty doctor error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * Update on-duty doctor schedule
 * PUT /api/v1/chief-doctor/on-duty-schedule/:id
 */
router.put('/on-duty-schedule/:id', authenticate, authorize('chief_doctor', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { shift_date, shift_type, start_time, end_time, status, notes } = req.body;

    const onDutyDoctor = await OnDutyDoctor.findById(id);
    if (!onDutyDoctor) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }

    if (shift_date) onDutyDoctor.shift_date = new Date(shift_date);
    if (shift_type) onDutyDoctor.shift_type = shift_type;
    if (start_time) onDutyDoctor.start_time = start_time;
    if (end_time) onDutyDoctor.end_time = end_time;
    if (status) onDutyDoctor.status = status;
    if (notes !== undefined) onDutyDoctor.notes = notes;

    await onDutyDoctor.save();

    const populated = await OnDutyDoctor.findById(onDutyDoctor._id)
      .populate('doctor_id', 'first_name last_name specialization phone')
      .populate('assigned_by', 'first_name last_name')
      .lean();

    res.json({
      success: true,
      data: populated
    });
  } catch (error) {
    console.error('Update on-duty doctor error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * Delete on-duty doctor schedule
 * DELETE /api/v1/chief-doctor/on-duty-schedule/:id
 */
router.delete('/on-duty-schedule/:id', authenticate, authorize('chief_doctor', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const onDutyDoctor = await OnDutyDoctor.findByIdAndDelete(id);
    if (!onDutyDoctor) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Delete on-duty doctor error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * Get available doctors for on-duty assignment
 * GET /api/v1/chief-doctor/available-doctors
 */
router.get('/available-doctors', authenticate, authorize('chief_doctor', 'admin'), async (req, res) => {
  try {
    const doctors = await Staff.find({
      role: 'doctor',
      status: 'active'
    })
      .select('first_name last_name specialization phone department')
      .sort({ first_name: 1 })
      .lean();

    res.json({
      success: true,
      data: doctors
    });
  } catch (error) {
    console.error('Available doctors error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

export default router;
