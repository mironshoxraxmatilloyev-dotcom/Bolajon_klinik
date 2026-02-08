import express from 'express';
import { authenticate } from '../middleware/auth.js';
import MonthlyPayroll from '../models/MonthlyPayroll.js';
import Staff from '../models/Staff.js';
import Invoice from '../models/Invoice.js';
import BillingItem from '../models/BillingItem.js';
import Service from '../models/Service.js';
import Bonus from '../models/Bonus.js';
import Penalty from '../models/Penalty.js';

const router = express.Router();

/**
 * Get my salary information
 * GET /api/v1/staff-salary/my-salary
 */
router.get('/my-salary', authenticate, async (req, res) => {
  try {
    const staffId = req.user._id || req.user.id;
    
    // Get staff info
    const staff = await Staff.findById(staffId).lean();
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Xodim topilmadi'
      });
    }

    // Get current month and year
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // Get all payroll history
    const payrollHistory = await MonthlyPayroll.find({
      staff_id: staffId
    })
      .sort({ year: -1, month: -1 })
      .lean();

    // Get current month payroll
    const currentPayroll = payrollHistory.find(
      p => p.month === currentMonth && p.year === currentYear
    );

    // Calculate this month's earnings (from start of month to now)
    const monthStart = new Date(currentYear, currentMonth - 1, 1);
    const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);
    
    // Calculate commissions from services
    let thisMonthCommissions = 0;
    if (staff.commission_rate && staff.commission_rate > 0) {
      // Get invoices for this month where staff provided service
      const invoices = await Invoice.find({
        created_at: { $gte: monthStart, $lte: now },
        payment_status: 'paid'
      }).lean();

      for (const invoice of invoices) {
        const billingItems = await BillingItem.find({
          invoice_id: invoice._id
        }).populate('service_id').lean();

        for (const item of billingItems) {
          if (item.service_id && item.service_id.staff_id && 
              item.service_id.staff_id.toString() === staffId.toString()) {
            const commissionAmount = (parseFloat(item.unit_price) * item.quantity * staff.commission_rate) / 100;
            thisMonthCommissions += commissionAmount;
          }
        }
      }
    }

    // Calculate bonuses and penalties for this month
    const thisMonthBonuses = currentPayroll ? parseFloat(currentPayroll.other_bonuses || 0) : 0;
    const thisMonthPenalties = currentPayroll ? parseFloat(currentPayroll.penalties || 0) : 0;

    // Calculate total for this month
    const baseSalary = parseFloat(staff.salary || 0);
    const thisMonthTotal = baseSalary + thisMonthCommissions + thisMonthBonuses - thisMonthPenalties;

    // Calculate statistics
    const totalEarned = payrollHistory
      .filter(p => p.payment_status === 'paid')
      .reduce((sum, p) => sum + parseFloat(p.total_salary || 0), 0);
    
    const monthsWorked = payrollHistory.filter(p => p.payment_status === 'paid').length;
    const averageSalary = monthsWorked > 0 ? totalEarned / monthsWorked : 0;

    // Get last payment
    const lastPayment = payrollHistory.find(p => p.payment_status === 'paid');

    // Calculate next payment (end of current month)
    const nextPaymentDate = new Date(currentYear, currentMonth, 0); // Last day of current month
    
    // Estimate next payment amount (current earnings + projected earnings)
    const daysInMonth = monthEnd.getDate();
    const daysPassed = now.getDate();
    const daysRemaining = daysInMonth - daysPassed;
    const dailyAverage = thisMonthTotal / daysPassed;
    const estimatedNextPayment = thisMonthTotal + (dailyAverage * daysRemaining);

    res.json({
      success: true,
      data: {
        staff: {
          firstName: staff.first_name,
          lastName: staff.last_name,
          role: staff.role,
          employeeId: staff.employee_id
        },
        currentSalary: {
          baseSalary: baseSalary,
          commissionRate: staff.commission_rate || 0,
          effectiveFrom: staff.hire_date || staff.created_at
        },
        thisMonth: {
          baseSalary: baseSalary,
          commissions: thisMonthCommissions,
          bonuses: thisMonthBonuses,
          penalties: thisMonthPenalties,
          total: thisMonthTotal,
          daysWorked: daysPassed,
          daysRemaining: daysRemaining
        },
        statistics: {
          totalEarned: totalEarned,
          monthsWorked: monthsWorked,
          averageSalary: averageSalary,
          lastPayment: lastPayment
        },
        nextPayment: {
          date: nextPaymentDate,
          estimatedAmount: estimatedNextPayment,
          status: currentPayroll ? currentPayroll.payment_status : 'pending'
        },
        history: payrollHistory.map(p => ({
          month: p.month,
          year: p.year,
          base_salary: p.base_salary,
          service_commissions: p.service_commissions,
          other_bonuses: p.other_bonuses,
          penalties: p.penalties,
          total_salary: p.total_salary,
          payment_status: p.payment_status,
          payment_date: p.payment_date,
          payment_method: p.payment_method
        }))
      }
    });
  } catch (error) {
    console.error('Get my salary error:', error);
    res.status(500).json({
      success: false,
      message: 'Maosh ma\'lumotlarini olishda xatolik',
      error: error.message
    });
  }
});

/**
 * Get my bonuses and penalties
 * GET /api/v1/staff-salary/my-bonuses
 */
router.get('/my-bonuses', authenticate, async (req, res) => {
  try {
    const staffId = req.user._id || req.user.id;
    
    console.log('🔍 Getting bonuses/penalties for staff:', staffId);
    
    // Get bonuses directly from Bonus collection
    const bonusRecords = await Bonus.find({
      staff_id: staffId,
      status: 'approved'
    })
      .sort({ created_at: -1 })
      .lean();

    console.log('✅ Found bonuses:', bonusRecords.length);

    // Get penalties directly from Penalty collection (both pending and approved)
    const penaltyRecords = await Penalty.find({
      staff_id: staffId,
      status: { $in: ['pending', 'approved'] }
    })
      .sort({ created_at: -1 })
      .lean();

    console.log('✅ Found penalties:', penaltyRecords.length);

    const bonuses = bonusRecords.map(bonus => ({
      id: bonus._id.toString(),
      bonus_type: bonus.bonus_type || 'other',
      amount: bonus.amount,
      reason: bonus.reason,
      bonus_date: bonus.penalty_date || bonus.created_at,
      status: bonus.status
    }));

    const penalties = penaltyRecords.map(penalty => ({
      id: penalty._id.toString(),
      penalty_type: penalty.penalty_type || 'other',
      amount: penalty.amount,
      reason: penalty.reason,
      penalty_date: penalty.penalty_date || penalty.created_at,
      status: penalty.status,
      month: penalty.month,
      year: penalty.year
    }));

    console.log('📦 Returning data:', { bonuses: bonuses.length, penalties: penalties.length });

    res.json({
      success: true,
      data: {
        bonuses,
        penalties
      }
    });
  } catch (error) {
    console.error('Get my bonuses error:', error);
    res.status(500).json({
      success: false,
      message: 'Bonus va jarimalarni olishda xatolik',
      error: error.message
    });
  }
});

/**
 * Get my commissions
 * GET /api/v1/staff-salary/my-commissions
 */
router.get('/my-commissions', authenticate, async (req, res) => {
  try {
    const staffId = req.user._id || req.user.id;
    const { month, year } = req.query;

    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // Get staff info
    const staff = await Staff.findById(staffId).lean();
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Xodim topilmadi'
      });
    }

    const monthStart = new Date(targetYear, targetMonth - 1, 1);
    const monthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    // Get invoices for this month
    const invoices = await Invoice.find({
      created_at: { $gte: monthStart, $lte: monthEnd },
      payment_status: 'paid'
    }).lean();

    const commissionRecords = [];
    let totalCommission = 0;

    for (const invoice of invoices) {
      const billingItems = await BillingItem.find({
        invoice_id: invoice._id
      }).populate('service_id').lean();

      for (const item of billingItems) {
        if (item.service_id && item.service_id.staff_id && 
            item.service_id.staff_id.toString() === staffId.toString()) {
          
          const serviceAmount = parseFloat(item.unit_price) * item.quantity;
          let commissionEarned = 0;

          // Check if staff has commission rate
          if (staff.commission_rate && staff.commission_rate > 0) {
            commissionEarned = (serviceAmount * staff.commission_rate) / 100;
          }
          // Check if service has fixed commission
          else if (item.service_id.commission_amount && item.service_id.commission_amount > 0) {
            commissionEarned = parseFloat(item.service_id.commission_amount) * item.quantity;
          }

          if (commissionEarned > 0) {
            commissionRecords.push({
              id: item._id.toString(),
              service_name: item.service_id.name,
              service_amount: serviceAmount,
              commission_earned: commissionEarned,
              service_date: invoice.created_at,
              patient_name: invoice.patient_id ? 'Bemor' : 'N/A'
            });

            totalCommission += commissionEarned;
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        month: targetMonth,
        year: targetYear,
        total: totalCommission,
        count: commissionRecords.length,
        records: commissionRecords
      }
    });
  } catch (error) {
    console.error('Get my commissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Komissiyalarni olishda xatolik',
      error: error.message
    });
  }
});

export default router;
