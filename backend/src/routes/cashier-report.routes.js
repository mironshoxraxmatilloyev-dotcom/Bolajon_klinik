import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import CashierReport from '../models/CashierReport.js';
import Staff from '../models/Staff.js';

const router = express.Router();

/**
 * Get all cashier reports (Admin only)
 * GET /api/v1/cashier-reports
 */
router.get('/',
  authenticate,
  authorize('admin', 'doctor'),
  async (req, res) => {
    try {
      const { start_date, end_date, staff_id, limit = 50 } = req.query;

      const filter = {};

      if (staff_id) {
        filter.staff_id = staff_id;
      }

      if (start_date || end_date) {
        filter.date = {};
        if (start_date) filter.date.$gte = new Date(start_date);
        if (end_date) filter.date.$lte = new Date(end_date);
      }

      const reports = await CashierReport.find(filter)
        .populate('staff_id', 'first_name last_name employee_id role')
        .sort({ date: -1 })
        .limit(parseInt(limit))
        .lean();

      // Calculate totals
      const totals = {
        total_reports: reports.length,
        total_invoices: 0,
        paid_invoices: 0,
        unpaid_invoices: 0,
        total_amount: 0,
        paid_amount: 0,
        unpaid_amount: 0
      };

      reports.forEach(report => {
        totals.total_invoices += report.total_invoices || 0;
        totals.paid_invoices += report.paid_invoices || 0;
        totals.unpaid_invoices += report.unpaid_invoices || 0;
        totals.total_amount += parseFloat(report.total_amount || 0);
        totals.paid_amount += parseFloat(report.paid_amount || 0);
        totals.unpaid_amount += parseFloat(report.unpaid_amount || 0);
      });

      res.json({
        success: true,
        data: reports,
        totals
      });
    } catch (error) {
      console.error('Get cashier reports error:', error);
      res.status(500).json({
        success: false,
        message: 'Xatolik yuz berdi',
        error: error.message
      });
    }
  }
);

/**
 * Get single cashier report
 * GET /api/v1/cashier-reports/:id
 */
router.get('/:id',
  authenticate,
  authorize('admin', 'doctor'),
  async (req, res) => {
    try {
      const report = await CashierReport.findById(req.params.id)
        .populate('staff_id', 'first_name last_name employee_id role')
        .populate('invoices.invoice_id')
        .lean();

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Hisobot topilmadi'
        });
      }

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Get cashier report error:', error);
      res.status(500).json({
        success: false,
        message: 'Xatolik yuz berdi',
        error: error.message
      });
    }
  }
);

/**
 * Get my cashier reports (for cashier/reception staff)
 * GET /api/v1/cashier-reports/my/reports
 */
router.get('/my/reports',
  authenticate,
  async (req, res) => {
    try {
      const { start_date, end_date, limit = 30 } = req.query;

      const filter = { staff_id: req.user.id };

      if (start_date || end_date) {
        filter.date = {};
        if (start_date) filter.date.$gte = new Date(start_date);
        if (end_date) filter.date.$lte = new Date(end_date);
      }

      const reports = await CashierReport.find(filter)
        .sort({ date: -1 })
        .limit(parseInt(limit))
        .lean();

      res.json({
        success: true,
        data: reports
      });
    } catch (error) {
      console.error('Get my cashier reports error:', error);
      res.status(500).json({
        success: false,
        message: 'Xatolik yuz berdi',
        error: error.message
      });
    }
  }
);

/**
 * Get today's summary for all cashiers
 * GET /api/v1/cashier-reports/today/summary
 */
router.get('/today/summary',
  authenticate,
  authorize('admin', 'doctor'),
  async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const reports = await CashierReport.find({
        date: {
          $gte: today,
          $lt: tomorrow
        }
      })
        .populate('staff_id', 'first_name last_name employee_id')
        .lean();

      // Calculate totals
      const summary = {
        total_cashiers: reports.length,
        total_invoices: 0,
        paid_invoices: 0,
        unpaid_invoices: 0,
        total_amount: 0,
        paid_amount: 0,
        unpaid_amount: 0,
        cashiers: []
      };

      reports.forEach(report => {
        summary.total_invoices += report.total_invoices || 0;
        summary.paid_invoices += report.paid_invoices || 0;
        summary.unpaid_invoices += report.unpaid_invoices || 0;
        summary.total_amount += parseFloat(report.total_amount || 0);
        summary.paid_amount += parseFloat(report.paid_amount || 0);
        summary.unpaid_amount += parseFloat(report.unpaid_amount || 0);

        summary.cashiers.push({
          staff_id: report.staff_id._id,
          staff_name: `${report.staff_id.first_name} ${report.staff_id.last_name}`,
          employee_id: report.staff_id.employee_id,
          total_invoices: report.total_invoices,
          paid_invoices: report.paid_invoices,
          total_amount: report.total_amount,
          paid_amount: report.paid_amount,
          work_duration: report.work_duration
        });
      });

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Get today summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Xatolik yuz berdi',
        error: error.message
      });
    }
  }
);

export default router;
