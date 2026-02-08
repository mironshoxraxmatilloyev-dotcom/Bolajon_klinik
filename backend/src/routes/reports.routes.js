import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import Invoice from '../models/Invoice.js';
import Transaction from '../models/Transaction.js';
import Patient from '../models/Patient.js';
import BillingItem from '../models/BillingItem.js';
import Admission from '../models/Admission.js';
import LabOrder from '../models/LabOrder.js';
import Expense from '../models/Expense.js';
import mongoose from 'mongoose';

const router = express.Router();

/**
 * Get dashboard statistics
 */
router.get('/dashboard',
  authenticate,
  authorize('admin', 'doctor'),
  async (req, res, next) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfYear = new Date(today.getFullYear(), 0, 1);

      // Today's stats
      const [
        todayPatients,
        todayRevenue,
        todayInvoices,
        todayLabOrders,
        todayInpatientRevenue,
        todayExpenses
      ] = await Promise.all([
        Patient.countDocuments({ created_at: { $gte: today } }),
        Transaction.aggregate([
          {
            $match: {
              created_at: { $gte: today },
              transaction_type: 'payment'
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' }
            }
          }
        ]),
        Invoice.countDocuments({ created_at: { $gte: today } }),
        LabOrder.countDocuments({ createdAt: { $gte: today } }),
        // Bugungi statsionar daromadi
        Admission.aggregate([
          {
            $match: {
              admission_date: { $gte: today },
              status: { $in: ['active', 'discharged'] }
            }
          },
          {
            $lookup: {
              from: 'billing',
              let: { patientId: '$patient_id', admissionDate: '$admission_date' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$patient_id', '$$patientId'] },
                        { $gte: ['$created_at', '$$admissionDate'] }
                      ]
                    }
                  }
                }
              ],
              as: 'invoices'
            }
          },
          {
            $unwind: { path: '$invoices', preserveNullAndEmptyArrays: true }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$invoices.paid_amount' }
            }
          }
        ]),
        // Bugungi xarajatlar
        Expense.aggregate([
          {
            $match: {
              date: { $gte: today, $lt: tomorrow }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' }
            }
          }
        ])
      ]);

      // Month's stats
      const [
        monthPatients,
        monthRevenue,
        monthInvoices,
        monthInpatientRevenue,
        monthExpenses
      ] = await Promise.all([
        Patient.countDocuments({ created_at: { $gte: startOfMonth } }),
        Transaction.aggregate([
          {
            $match: {
              created_at: { $gte: startOfMonth },
              transaction_type: 'payment'
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' }
            }
          }
        ]),
        Invoice.countDocuments({ created_at: { $gte: startOfMonth } }),
        // Statsionar daromadi - Admission modelidan
        Admission.aggregate([
          {
            $match: {
              admission_date: { $gte: startOfMonth },
              status: { $in: ['active', 'discharged'] }
            }
          },
          {
            $lookup: {
              from: 'billing',
              let: { patientId: '$patient_id', admissionDate: '$admission_date' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$patient_id', '$$patientId'] },
                        { $gte: ['$created_at', '$$admissionDate'] }
                      ]
                    }
                  }
                }
              ],
              as: 'invoices'
            }
          },
          {
            $unwind: { path: '$invoices', preserveNullAndEmptyArrays: true }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$invoices.paid_amount' }
            }
          }
        ]),
        // Oylik xarajatlar
        Expense.aggregate([
          {
            $match: {
              date: { $gte: startOfMonth }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' }
            }
          }
        ])
      ]);

      // Year's stats
      const [
        yearPatients,
        yearRevenue
      ] = await Promise.all([
        Patient.countDocuments({ created_at: { $gte: startOfYear } }),
        Transaction.aggregate([
          {
            $match: {
              created_at: { $gte: startOfYear },
              transaction_type: 'payment'
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' }
            }
          }
        ])
      ]);

      // Import Bonus and Penalty models
      const Bonus = mongoose.model('Bonus');
      const Penalty = mongoose.model('Penalty');

      // Total stats
      const [
        totalPatients,
        totalRevenue,
        pendingInvoices,
        totalDebt,
        bonusesCount,
        penaltiesCount
      ] = await Promise.all([
        Patient.countDocuments(),
        Transaction.aggregate([
          {
            $match: {
              transaction_type: 'payment'
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' }
            }
          }
        ]),
        Invoice.countDocuments({ payment_status: { $in: ['pending', 'partial'] } }),
        Invoice.aggregate([
          {
            $match: {
              payment_status: { $in: ['pending', 'partial'] }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $subtract: ['$total_amount', '$paid_amount'] } }
            }
          }
        ]),
        Bonus.countDocuments(),
        Penalty.countDocuments()
      ]);

      res.json({
        success: true,
        data: {
          today: {
            patients: todayPatients,
            revenue: todayRevenue[0]?.total || 0,
            inpatient_revenue_50_percent: (todayInpatientRevenue[0]?.total || 0) * 0.5,
            total_revenue_with_inpatient: (todayRevenue[0]?.total || 0) + ((todayInpatientRevenue[0]?.total || 0) * 0.5),
            expenses: todayExpenses[0]?.total || 0,
            net_revenue: ((todayRevenue[0]?.total || 0) + ((todayInpatientRevenue[0]?.total || 0) * 0.5)) - (todayExpenses[0]?.total || 0),
            invoices: todayInvoices,
            lab_orders: todayLabOrders
          },
          month: {
            patients: monthPatients,
            revenue: monthRevenue[0]?.total || 0,
            inpatient_revenue_50_percent: (monthInpatientRevenue[0]?.total || 0) * 0.5,
            total_revenue_with_inpatient: (monthRevenue[0]?.total || 0) + ((monthInpatientRevenue[0]?.total || 0) * 0.5),
            expenses: monthExpenses[0]?.total || 0,
            net_revenue: ((monthRevenue[0]?.total || 0) + ((monthInpatientRevenue[0]?.total || 0) * 0.5)) - (monthExpenses[0]?.total || 0),
            invoices: monthInvoices
          },
          year: {
            patients: yearPatients,
            revenue: yearRevenue[0]?.total || 0
          },
          total: {
            patients: totalPatients,
            revenue: totalRevenue[0]?.total || 0,
            pending_invoices: pendingInvoices,
            total_debt: totalDebt[0]?.total || 0,
            bonuses_count: bonusesCount,
            penalties_count: penaltiesCount
          }
        }
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      next(error);
    }
  }
);

/**
 * Get financial report
 */
router.get('/financial',
  authenticate,
  authorize('admin', 'doctor'),
  async (req, res, next) => {
    try {
      const { from_date, to_date } = req.query;
      
      const filter = {};
      
      if (from_date || to_date) {
        filter.created_at = {};
        if (from_date) {
          filter.created_at.$gte = new Date(from_date);
        }
        if (to_date) {
          const endDate = new Date(to_date);
          endDate.setHours(23, 59, 59, 999);
          filter.created_at.$lte = endDate;
        }
      }

      // Revenue by payment method
      const revenueByMethod = await Transaction.aggregate([
        {
          $match: {
            ...filter,
            transaction_type: 'payment'
          }
        },
        {
          $group: {
            _id: '$payment_method',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      // Total revenue
      const totalRevenue = await Transaction.aggregate([
        {
          $match: {
            ...filter,
            transaction_type: 'payment'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      // Invoices stats
      const invoicesStats = await Invoice.aggregate([
        {
          $match: filter
        },
        {
          $group: {
            _id: null,
            total_invoices: { $sum: 1 },
            total_amount: { $sum: '$total_amount' },
            paid_amount: { $sum: '$paid_amount' },
            debt_amount: { $sum: { $subtract: ['$total_amount', '$paid_amount'] } }
          }
        }
      ]);

      // Daily revenue trend
      const dailyRevenue = await Transaction.aggregate([
        {
          $match: {
            ...filter,
            transaction_type: 'payment'
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$created_at' }
            },
            amount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        },
        {
          $project: {
            _id: 0,
            date: '$_id',
            amount: 1,
            count: 1
          }
        }
      ]);

      // Detailed transactions with patient info
      const detailedTransactions = await Invoice.aggregate([
        {
          $match: filter
        },
        {
          $lookup: {
            from: 'patients',
            localField: 'patient_id',
            foreignField: '_id',
            as: 'patient'
          }
        },
        {
          $unwind: '$patient'
        },
        {
          $project: {
            date: '$created_at',
            invoice_number: 1,
            patient_name: {
              $concat: ['$patient.first_name', ' ', '$patient.last_name']
            },
            patient_number: '$patient.patient_number',
            total_amount: 1,
            paid_amount: 1,
            debt_amount: { $subtract: ['$total_amount', '$paid_amount'] },
            payment_status: 1,
            payment_method: 1
          }
        },
        {
          $sort: { date: -1 }
        },
        {
          $limit: 100
        }
      ]);

      res.json({
        success: true,
        data: {
          summary: {
            total_invoices: invoicesStats[0]?.total_invoices || 0,
            total_amount: invoicesStats[0]?.total_amount || 0,
            paid_amount: invoicesStats[0]?.paid_amount || 0,
            debt_amount: invoicesStats[0]?.debt_amount || 0,
            total_revenue: totalRevenue[0]?.total || 0
          },
          revenue_by_method: revenueByMethod,
          daily: dailyRevenue,
          transactions: detailedTransactions
        }
      });
    } catch (error) {
      console.error('Get financial report error:', error);
      next(error);
    }
  }
);

/**
 * Get debtors report
 */
router.get('/debtors',
  authenticate,
  authorize('admin', 'doctor'),
  async (req, res, next) => {
    try {
      const debtors = await Invoice.aggregate([
        {
          $match: {
            payment_status: { $in: ['pending', 'partial'] }
          }
        },
        {
          $group: {
            _id: '$patient_id',
            total_debt: { $sum: { $subtract: ['$total_amount', '$paid_amount'] } },
            total_invoices: { $sum: 1 },
            oldest_invoice: { $min: '$created_at' }
          }
        },
        {
          $lookup: {
            from: 'patients',
            localField: '_id',
            foreignField: '_id',
            as: 'patient'
          }
        },
        {
          $unwind: '$patient'
        },
        {
          $project: {
            patient_id: '$_id',
            patient_name: {
              $concat: ['$patient.first_name', ' ', '$patient.last_name']
            },
            patient_number: '$patient.patient_number',
            phone: '$patient.phone',
            total_debt: 1,
            total_invoices: 1,
            oldest_invoice: 1
          }
        },
        {
          $sort: { total_debt: -1 }
        }
      ]);

      const totalDebt = debtors.reduce((sum, d) => sum + d.total_debt, 0);

      res.json({
        success: true,
        data: {
          debtors,
          summary: {
            total_debt: totalDebt,
            total_debtors: debtors.length
          }
        }
      });
    } catch (error) {
      console.error('Get debtors report error:', error);
      next(error);
    }
  }
);

/**
 * Get patients report
 */
router.get('/patients',
  authenticate,
  authorize('admin', 'doctor'),
  async (req, res, next) => {
    try {
      const { from_date, to_date } = req.query;
      
      const dateFilter = {};
      
      if (from_date || to_date) {
        dateFilter.createdAt = {};
        if (from_date) {
          dateFilter.createdAt.$gte = new Date(from_date);
        }
        if (to_date) {
          const endDate = new Date(to_date);
          endDate.setHours(23, 59, 59, 999);
          dateFilter.createdAt.$lte = endDate;
        }
      }

      // Total patients (all time, not filtered by date)
      const totalPatients = await Patient.countDocuments();

      // Patients by gender (all time)
      const patientsByGender = await Patient.aggregate([
        {
          $group: {
            _id: '$gender',
            count: { $sum: 1 }
          }
        }
      ]);

      // New patients trend (filtered by date range)
      const newPatientsTrend = await Patient.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        },
        {
          $project: {
            _id: 0,
            date: '$_id',
            count: 1
          }
        }
      ]);

      // Frequent patients (most invoices) - filtered by date range
      const invoiceFilter = {};
      if (from_date || to_date) {
        invoiceFilter.created_at = {};
        if (from_date) {
          invoiceFilter.created_at.$gte = new Date(from_date);
        }
        if (to_date) {
          const endDate = new Date(to_date);
          endDate.setHours(23, 59, 59, 999);
          invoiceFilter.created_at.$lte = endDate;
        }
      }

      const frequentPatients = await Invoice.aggregate([
        { $match: invoiceFilter },
        {
          $group: {
            _id: '$patient_id',
            visit_count: { $sum: 1 },
            total_spent: { $sum: '$paid_amount' }
          }
        },
        {
          $lookup: {
            from: 'patients',
            localField: '_id',
            foreignField: '_id',
            as: 'patient'
          }
        },
        {
          $unwind: '$patient'
        },
        {
          $project: {
            patient_name: {
              $concat: ['$patient.first_name', ' ', '$patient.last_name']
            },
            patient_number: '$patient.patient_number',
            visit_count: 1,
            total_spent: 1
          }
        },
        {
          $sort: { visit_count: -1 }
        },
        {
          $limit: 10
        }
      ]);

      res.json({
        success: true,
        data: {
          total_patients: totalPatients,
          by_gender: patientsByGender,
          new_patients: newPatientsTrend,
          frequent_patients: frequentPatients
        }
      });
    } catch (error) {
      console.error('Get patients report error:', error);
      next(error);
    }
  }
);

/**
 * Get services report
 */
router.get('/services',
  authenticate,
  authorize('admin', 'doctor'),
  async (req, res, next) => {
    try {
      const { from_date, to_date } = req.query;
      
      const filter = {};
      
      if (from_date || to_date) {
        filter.created_at = {};
        if (from_date) {
          filter.created_at.$gte = new Date(from_date);
        }
        if (to_date) {
          const endDate = new Date(to_date);
          endDate.setHours(23, 59, 59, 999);
          filter.created_at.$lte = endDate;
        }
      }

      // Most popular services
      const popularServices = await BillingItem.aggregate([
        {
          $lookup: {
            from: 'billing',
            localField: 'billing_id',
            foreignField: '_id',
            as: 'invoice'
          }
        },
        {
          $unwind: '$invoice'
        },
        {
          $match: {
            'invoice.created_at': filter.created_at || { $exists: true }
          }
        },
        {
          $group: {
            _id: '$service_name',
            service_name: { $first: '$service_name' },
            total_quantity: { $sum: '$quantity' },
            total_revenue: { $sum: '$total_price' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { total_quantity: -1 }
        },
        {
          $limit: 20
        }
      ]);

      // Total services revenue
      const totalRevenue = popularServices.reduce((sum, s) => sum + s.total_revenue, 0);

      res.json({
        success: true,
        data: popularServices.map(s => ({
          service_name: s.service_name,
          quantity: s.total_quantity,
          revenue: s.total_revenue,
          count: s.count
        }))
      });
    } catch (error) {
      console.error('Get services report error:', error);
      next(error);
    }
  }
);

/**
 * Get inpatient report
 */
router.get('/inpatient',
  authenticate,
  authorize('admin', 'doctor'),
  async (req, res, next) => {
    try {
      // Import Bed model
      const Bed = mongoose.model('Bed');
      
      // Bed statistics
      const bedStats = await Bed.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const totalBeds = bedStats.reduce((sum, stat) => sum + stat.count, 0);
      const occupiedBeds = bedStats.find(s => s._id === 'occupied')?.count || 0;
      const availableBeds = bedStats.find(s => s._id === 'available')?.count || 0;
      const cleaningBeds = bedStats.find(s => s._id === 'cleaning')?.count || 0;

      // Current active admissions
      const currentAdmissions = await Admission.countDocuments({
        status: 'active'
      });

      // Total admissions
      const totalAdmissions = await Admission.countDocuments();

      // Admissions by status
      const admissionsByStatus = await Admission.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Average stay duration for discharged patients
      const avgStayDuration = await Admission.aggregate([
        {
          $match: {
            status: 'discharged',
            discharge_date: { $exists: true }
          }
        },
        {
          $project: {
            duration: {
              $divide: [
                { $subtract: ['$discharge_date', '$admission_date'] },
                24 * 60 * 60 * 1000
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avg_duration: { $avg: '$duration' }
          }
        }
      ]);

      // Active admissions with patient and room details
      const activeAdmissions = await Admission.find({ status: 'active' })
        .populate('patient_id', 'first_name last_name patient_number')
        .populate('room_id', 'room_number room_name')
        .sort({ admission_date: -1 })
        .limit(50)
        .lean();

      // Calculate revenue from invoices related to inpatient services
      const inpatientRevenue = await Invoice.aggregate([
        {
          $match: {
            service_name: { $regex: /statsionar|yotqizish|koyka/i }
          }
        },
        {
          $group: {
            _id: null,
            total_revenue: { $sum: '$paid_amount' },
            total_invoices: { $sum: 1 }
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          bed_stats: {
            total: totalBeds,
            occupied: occupiedBeds,
            available: availableBeds,
            cleaning: cleaningBeds
          },
          admission_stats: {
            current: currentAdmissions,
            total: totalAdmissions,
            by_status: admissionsByStatus,
            avg_stay_duration: Math.round(avgStayDuration[0]?.avg_duration || 0)
          },
          active_admissions: activeAdmissions.map(a => ({
            patient_name: a.patient_id ? `${a.patient_id.first_name} ${a.patient_id.last_name}` : 'N/A',
            patient_number: a.patient_id?.patient_number || 'N/A',
            bed_number: a.bed_number || 'N/A',
            room_number: a.room_id?.room_number || 'N/A',
            room_name: a.room_id?.room_name || 'N/A',
            admission_date: a.admission_date,
            diagnosis: a.diagnosis || 'N/A',
            days_stayed: Math.floor((new Date() - new Date(a.admission_date)) / (24 * 60 * 60 * 1000))
          })),
          revenue: {
            total: inpatientRevenue[0]?.total_revenue || 0,
            invoices: inpatientRevenue[0]?.total_invoices || 0
          }
        }
      });
    } catch (error) {
      console.error('Get inpatient report error:', error);
      next(error);
    }
  }
);

export default router;
