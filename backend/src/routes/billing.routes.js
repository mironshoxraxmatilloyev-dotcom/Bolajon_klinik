import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import Joi from 'joi';
import Invoice from '../models/Invoice.js';
import BillingItem from '../models/BillingItem.js';
import Service from '../models/Service.js';
import ServiceCategory from '../models/ServiceCategory.js';
import Transaction from '../models/Transaction.js';
import Patient from '../models/Patient.js';
import Staff from '../models/Staff.js';
import LabTest from '../models/LabTest.js';
import mongoose from 'mongoose';

const router = express.Router();

// DEBUG: Check current user role
router.get('/debug/me',
  authenticate,
  async (req, res) => {
    res.json({
      success: true,
      user: req.user,
      message: 'This is your current user info'
    });
  }
);

// Validation schemas
const createInvoiceSchema = Joi.object({
  patient_id: Joi.string().required(),
  items: Joi.array().items(
    Joi.object({
      service_id: Joi.string().required(),
      quantity: Joi.number().integer().min(1).default(1)
    })
  ).min(1).required(),
  payment_method: Joi.string().valid('cash', 'card', 'transfer').allow(null),
  paid_amount: Joi.number().min(0).default(0),
  discount_amount: Joi.number().min(0).default(0),
  notes: Joi.string().allow('', null),
  doctor_id: Joi.string().allow(null)
});

const addPaymentSchema = Joi.object({
  amount: Joi.number().min(0).required(),
  payment_method: Joi.string().valid('cash', 'card', 'transfer').required(),
  reference_number: Joi.string().allow('', null),
  notes: Joi.string().allow('', null)
});

/**
 * Get billing statistics
 */
router.get('/stats',
  authenticate,
  authorize('admin', 'cashier', 'receptionist'),
  async (req, res, next) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Today's revenue
      const todayRevenue = await Transaction.aggregate([
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
      ]);

      // Today's revenue by payment method
      const todayByMethod = await Transaction.aggregate([
        {
          $match: {
            created_at: { $gte: today },
            transaction_type: 'payment'
          }
        },
        {
          $group: {
            _id: '$payment_method',
            total: { $sum: '$amount' }
          }
        }
      ]);

      // Pending invoices count
      const pendingInvoices = await Invoice.countDocuments({
        payment_status: { $in: ['pending', 'partial'] }
      });

      // Total debt
      const totalDebtResult = await Invoice.aggregate([
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
      ]);

      // This month's revenue
      const monthRevenue = await Transaction.aggregate([
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
      ]);

      // Month's revenue by payment method
      const monthByMethod = await Transaction.aggregate([
        {
          $match: {
            created_at: { $gte: startOfMonth },
            transaction_type: 'payment'
          }
        },
        {
          $group: {
            _id: '$payment_method',
            total: { $sum: '$amount' }
          }
        }
      ]);

      // Format payment method breakdown
      const formatMethodBreakdown = (rows) => {
        const breakdown = {
          cash: 0,
          card: 0,
          transfer: 0
        };
        rows.forEach(row => {
          if (row._id && breakdown.hasOwnProperty(row._id)) {
            breakdown[row._id] = row.total;
          }
        });
        return breakdown;
      };

      res.json({
        success: true,
        data: {
          todayRevenue: todayRevenue[0]?.total || 0,
          todayByMethod: formatMethodBreakdown(todayByMethod),
          pendingInvoices: pendingInvoices,
          totalDebt: totalDebtResult[0]?.total || 0,
          monthRevenue: monthRevenue[0]?.total || 0,
          monthByMethod: formatMethodBreakdown(monthByMethod)
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get service categories
 */
router.get('/services/categories',
  authenticate,
  async (req, res, next) => {
    try {
      const categories = await ServiceCategory.find().sort({ name: 1 });
      
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error in GET /services/categories:', error);
      next(error);
    }
  }
);

/**
 * Get all services
 */
router.get('/services',
  authenticate,
  async (req, res, next) => {
    try {
      const { category, is_active } = req.query;
      
      const filter = {};
      
      if (category) {
        filter.category = category;
      }
      
      if (is_active !== undefined) {
        filter.is_active = is_active === 'true';
      }
      
      const services = await Service.find(filter).sort({ category: 1, name: 1 });
      
      res.json({
        success: true,
        data: services
      });
    } catch (error) {
      console.error('Error in GET /services:', error);
      next(error);
    }
  }
);

/**
 * Create new invoice
 */
router.post('/invoices',
  authenticate,
  authorize('admin', 'cashier', 'receptionist'),
  async (req, res, next) => {
    const session = await mongoose.startSession();
    
    try {
      const { error } = createInvoiceSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      await session.startTransaction();

      const { patient_id, items, payment_method, paid_amount, discount_amount, notes, doctor_id } = req.body;

      // Get patient to check last visit
      const patient = await Patient.findById(patient_id);
      if (!patient) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: 'Bemor topilmadi'
        });
      }

      // Generate invoice number - qisqa format
      const invoiceCount = await Invoice.countDocuments();
      const today = new Date();
      const year = today.getFullYear().toString().slice(-2); // Oxirgi 2 raqam
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');
      const invoiceNumber = `INV-${year}${month}${day}-${(invoiceCount + 1).toString().padStart(4, '0')}`;

      // Calculate total amount
      let totalAmount = 0;
      const invoiceItems = [];

      console.log('=== CREATE INVOICE DEBUG ===');
      console.log('Items received:', JSON.stringify(items, null, 2));

      // List all services for debugging
      const allServices = await Service.find({ is_active: true }).select('_id name price').limit(20);
      console.log('Available services in DB:', allServices.map(s => ({ id: s._id.toString(), name: s.name, price: s.price })));

      for (const item of items) {
        console.log(`Searching for service with ID: ${item.service_id}`);
        
        // Avval Service modelida qidirish
        let service = await Service.findOne({ 
          _id: item.service_id, 
          is_active: true 
        });

        // Agar Service'da topilmasa, LabTest'da qidirish
        if (!service) {
          const labTest = await LabTest.findOne({
            _id: item.service_id,
            is_active: true
          });
          
          if (labTest) {
            // Lab testni service formatiga o'tkazish
            service = {
              _id: labTest._id,
              name: labTest.name,
              price: labTest.price,
              base_price: labTest.price,
              category: 'Laboratoriya'
            };
            console.log(`Lab test found: ${service.name} (${service._id})`);
          }
        } else {
          console.log(`Service found: ${service.name} (${service._id})`);
        }

        if (!service) {
          await session.abortTransaction();
          return res.status(404).json({
            success: false,
            message: `Xizmat topilmadi: ${item.service_id}`
          });
        }

        // Use base_price if available, otherwise use price
        const servicePrice = service.base_price || service.price || 0;
        const itemTotal = servicePrice * (item.quantity || 1);
        totalAmount += itemTotal;

        invoiceItems.push({
          service_id: item.service_id,
          service_name: service.name,
          quantity: item.quantity || 1,
          unit_price: servicePrice,
          total_price: itemTotal
        });
      }

      // Calculate revisit discount
      let revisitDiscount = 0;
      let revisitDiscountReason = '';
      
      if (patient.last_visit_date) {
        const lastVisit = new Date(patient.last_visit_date);
        lastVisit.setHours(0, 0, 0, 0); // Faqat sanani solishtirish
        
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Faqat sanani solishtirish
        
        const daysDiff = Math.floor((today - lastVisit) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 0) {
          // Bugun allaqachon qabul bo'lgan - 100% chegirma (bepul)
          revisitDiscount = totalAmount;
          revisitDiscountReason = `Bugungi qayta qabul - 100% chegirma (BEPUL)`;
        } else if (daysDiff >= 1 && daysDiff <= 3) {
          // 1-3 kun: 100% chegirma (bepul, faqat birinchi to'lov)
          revisitDiscount = totalAmount;
          revisitDiscountReason = `Qayta qabul (${daysDiff} kun ichida) - 100% chegirma`;
        } else if (daysDiff >= 4 && daysDiff <= 7) {
          // 4-7 kun: 50% chegirma
          revisitDiscount = totalAmount * 0.50;
          revisitDiscountReason = `Qayta qabul (${daysDiff} kun ichida) - 50% chegirma`;
        }
        // 8+ kun: Chegirma yo'q
      }

      // Apply discount with validation
      let discountAmt = discount_amount || 0;
      
      // Add revisit discount to manual discount
      if (revisitDiscount > 0) {
        discountAmt += revisitDiscount;
      }
      
      // Qabulxonachi uchun 20% chegirma cheklovi (faqat manual discount uchun)
      const userRole = req.user.role?.toLowerCase() || '';
      if (userRole === 'reception' || userRole === 'qabulxona' || userRole === 'receptionist') {
        const manualDiscount = discount_amount || 0;
        const maxDiscount = totalAmount * 0.20; // 20% chegirma
        if (manualDiscount > maxDiscount) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Qabulxonachi maksimal 20% chegirma bera oladi. Maksimal: ${maxDiscount.toFixed(2)} so'm`
          });
        }
      }
      
      totalAmount = totalAmount - discountAmt;

      // Determine payment status
      const paidAmt = paid_amount || 0;
      let paymentStatus = 'pending';
      if (paidAmt >= totalAmount) {
        paymentStatus = 'paid';
      } else if (paidAmt > 0) {
        paymentStatus = 'partial';
      }

      // Create invoice
      const invoiceData = {
        patient_id,
        invoice_number: invoiceNumber,
        total_amount: totalAmount,
        paid_amount: paidAmt,
        discount_amount: discountAmt,
        payment_status: paymentStatus,
        payment_method,
        notes: revisitDiscountReason ? `${revisitDiscountReason}${notes ? '. ' + notes : ''}` : notes,
        created_by: req.user.id
      };

      // Add doctor_id to metadata if provided
      if (doctor_id) {
        invoiceData.metadata = {
          doctor_id: doctor_id
        };
      }
      
      // Add revisit discount info to metadata
      if (revisitDiscount > 0) {
        invoiceData.metadata = {
          ...invoiceData.metadata,
          revisit_discount: revisitDiscount,
          revisit_discount_reason: revisitDiscountReason
        };
      }

      const invoice = await Invoice.create([invoiceData], { session });

      // Create invoice items
      for (const item of invoiceItems) {
        await BillingItem.create([{
          billing_id: invoice[0]._id,
          service_id: item.service_id,
          service_name: item.service_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        }], { session });
      }

      // Create transaction if payment made
      if (paidAmt > 0) {
        await Transaction.create([{
          billing_id: invoice[0]._id,
          patient_id,
          amount: paidAmt,
          transaction_type: 'payment',
          payment_method,
          created_by: req.user.id
        }], { session });
      }

      // Update patient's current balance and last visit date
      const balanceResult = await Invoice.aggregate([
        {
          $match: { patient_id: new mongoose.Types.ObjectId(patient_id) }
        },
        {
          $group: {
            _id: null,
            total_debt: { $sum: '$total_amount' },
            total_paid: { $sum: '$paid_amount' }
          }
        }
      ]);

      const totalDebt = balanceResult[0]?.total_debt || 0;
      const totalPaid = balanceResult[0]?.total_paid || 0;
      const calculatedBalance = totalPaid - totalDebt;
      
      await Patient.findByIdAndUpdate(
        patient_id,
        { 
          current_balance: calculatedBalance,
          last_visit_date: new Date(),
          updated_at: new Date()
        },
        { session }
      );

      await session.commitTransaction();
      
      // Send Telegram notification for new debt (async, don't wait)
      if (paymentStatus !== 'paid') {
        import('../services/telegram.service.js').then(telegramService => {
          const remainingAmount = totalAmount - paidAmt;
          const description = invoiceItems.map(item => item.service_name).join(', ');
          
          telegramService.sendDebtNotification(patient_id, remainingAmount, description)
            .then(result => {
              // Notification sent
            })
            .catch(error => {
              // Ignore notification error
            });
        });
      }

      res.status(201).json({
        success: true,
        message: 'Hisob-faktura muvaffaqiyatli yaratildi',
        data: {
          invoice: invoice[0].toObject(),
          items: invoiceItems,
          revisit_discount: revisitDiscount,
          revisit_discount_reason: revisitDiscountReason
        }
      });
    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  }
);

/**
 * Get all invoices
 */
router.get('/invoices',
  authenticate,
  authorize('admin', 'cashier', 'receptionist'),
  async (req, res, next) => {
    try {
      const { patient_id, payment_status, from_date, to_date, limit = 50, offset = 0 } = req.query;
      
      const filter = {};
      
      if (patient_id) {
        filter.patient_id = patient_id;
      }
      
      if (payment_status) {
        filter.payment_status = payment_status;
      }
      
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
      
      const invoices = await Invoice.find(filter)
        .populate('patient_id', 'first_name last_name phone')
        .populate('created_by', 'username')
        .sort({ created_at: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .lean();
      
      // Format response to match PostgreSQL structure
      const formattedInvoices = invoices.map(inv => ({
        ...inv,
        id: inv._id,
        first_name: inv.patient_id?.first_name,
        last_name: inv.patient_id?.last_name,
        phone: inv.patient_id?.phone,
        created_by_name: inv.created_by?.username
      }));
      
      res.json({
        success: true,
        data: formattedInvoices
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get invoice by ID
 */
router.get('/invoices/:id',
  authenticate,
  authorize('admin', 'cashier', 'receptionist'),
  async (req, res, next) => {
    try {
      // Get invoice
      const invoice = await Invoice.findById(req.params.id)
        .populate('patient_id', 'first_name last_name phone patient_number')
        .populate('created_by', 'username')
        .lean();
      
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Hisob-faktura topilmadi'
        });
      }
      
      // Get invoice items
      // Avval invoice.items array'ini tekshirish
      let items = invoice.items || [];
      
      // Agar invoice.items bo'sh bo'lsa, BillingItem'dan olish (eski invoice'lar uchun)
      if (items.length === 0) {
        const billingItems = await BillingItem.find({ billing_id: req.params.id })
          .sort({ created_at: 1 })
          .lean();
        
        // BillingItem'larni invoice.items formatiga o'tkazish
        items = billingItems.map(bi => ({
          item_type: bi.service_type || 'service',
          description: bi.service_name || bi.description,
          quantity: bi.quantity || 1,
          unit_price: bi.unit_price,
          total_price: bi.total_price,
          notes: bi.notes
        }));
      }
      
      // Get transactions
      const transactions = await Transaction.find({ billing_id: req.params.id })
        .populate('created_by', 'username')
        .sort({ created_at: -1 })
        .lean();
      
      // Format response
      const formattedInvoice = {
        ...invoice,
        id: invoice._id,
        first_name: invoice.patient_id?.first_name,
        last_name: invoice.patient_id?.last_name,
        phone: invoice.patient_id?.phone,
        patient_number: invoice.patient_id?.patient_number,
        created_by_name: invoice.created_by?.username
      };

      const formattedTransactions = transactions.map(t => ({
        ...t,
        id: t._id,
        created_by_name: t.created_by?.username
      }));
      
      res.json({
        success: true,
        data: {
          ...formattedInvoice,
          items,
          transactions: formattedTransactions
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Add payment to invoice
 */
router.post('/invoices/:id/payment',
  authenticate,
  authorize('admin', 'cashier', 'receptionist'),
  async (req, res, next) => {
    const session = await mongoose.startSession();
    
    try {
      const { error } = addPaymentSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      await session.startTransaction();

      const { amount, payment_method, reference_number, notes } = req.body;

      // Get invoice
      const invoice = await Invoice.findById(req.params.id).session(session);

      if (!invoice) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: 'Hisob-faktura topilmadi'
        });
      }

      const newPaidAmount = invoice.paid_amount + amount;
      const totalAmount = invoice.total_amount;

      // Check if overpayment
      if (newPaidAmount > totalAmount) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'To\'lov summasi qarzdan oshib ketdi'
        });
      }

      // Determine new payment status
      let paymentStatus = 'partial';
      if (newPaidAmount >= totalAmount) {
        paymentStatus = 'paid';
      }

      // Generate QR code if fully paid
      let qrCode = invoice.qr_code;
      let qrCodeActive = invoice.qr_code_active;
      
      if (paymentStatus === 'paid' && !qrCode) {
        // Generate unique QR code: PATIENT_NUMBER-INVOICE_NUMBER
        const patient = await Patient.findById(invoice.patient_id).session(session);
        qrCode = `${patient.patient_number}-${invoice.invoice_number}`;
        qrCodeActive = true;
      } else if (paymentStatus === 'paid') {
        qrCodeActive = true;
      }

      // Update invoice
      invoice.paid_amount = newPaidAmount;
      invoice.payment_status = paymentStatus;
      invoice.payment_method = payment_method;
      invoice.qr_code = qrCode;
      invoice.qr_code_active = qrCodeActive;
      invoice.updated_at = new Date();
      await invoice.save({ session });

      // Create transaction
      await Transaction.create([{
        billing_id: req.params.id,
        patient_id: invoice.patient_id,
        amount,
        transaction_type: 'payment',
        payment_method,
        reference_number,
        notes,
        created_by: req.user.id
      }], { session });

      // Update patient's current balance
      const balanceResult = await Invoice.aggregate([
        {
          $match: { patient_id: invoice.patient_id }
        },
        {
          $group: {
            _id: null,
            total_debt: { $sum: '$total_amount' },
            total_paid: { $sum: '$paid_amount' }
          }
        }
      ]);

      const totalDebt = balanceResult[0]?.total_debt || 0;
      const totalPaid = balanceResult[0]?.total_paid || 0;
      const calculatedBalance = totalPaid - totalDebt;
      
      await Patient.findByIdAndUpdate(
        invoice.patient_id,
        { 
          current_balance: calculatedBalance,
          updated_at: new Date()
        },
        { session }
      );

      await session.commitTransaction();

      res.json({
        success: true,
        message: 'To\'lov muvaffaqiyatli qo\'shildi',
        data: {
          paid_amount: newPaidAmount,
          remaining_amount: totalAmount - newPaidAmount,
          payment_status: paymentStatus,
          patient_balance: calculatedBalance
        }
      });
    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  }
);

/**
 * Get recent transactions
 */
router.get('/transactions',
  authenticate,
  authorize('admin', 'cashier', 'receptionist'),
  async (req, res, next) => {
    try {
      const { patient_id, transaction_type, from_date, to_date, limit = 50, offset = 0 } = req.query;
      
      const filter = {};
      
      if (patient_id) {
        filter.patient_id = patient_id;
      }
      
      if (transaction_type) {
        filter.transaction_type = transaction_type;
      }
      
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
      
      const transactions = await Transaction.find(filter)
        .populate('patient_id', 'first_name last_name phone')
        .populate('billing_id', 'invoice_number')
        .populate('created_by', 'username')
        .sort({ created_at: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .lean();
      
      // Format response
      const formattedTransactions = transactions.map(t => ({
        ...t,
        id: t._id,
        first_name: t.patient_id?.first_name,
        last_name: t.patient_id?.last_name,
        phone: t.patient_id?.phone,
        invoice_number: t.billing_id?.invoice_number,
        created_by_name: t.created_by?.username
      }));
      
      res.json({
        success: true,
        data: formattedTransactions
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Cancel invoice
 */
router.put('/invoices/:id/cancel',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    const session = await mongoose.startSession();
    
    try {
      await session.startTransaction();

      // Get invoice
      const invoice = await Invoice.findById(req.params.id).session(session);

      if (!invoice) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: 'Hisob-faktura topilmadi'
        });
      }

      // Check if already paid
      if (invoice.payment_status === 'paid') {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'To\'langan hisob-fakturani bekor qilib bo\'lmaydi'
        });
      }

      // Update invoice status
      invoice.payment_status = 'cancelled';
      invoice.updated_at = new Date();
      await invoice.save({ session });

      await session.commitTransaction();

      res.json({
        success: true,
        message: 'Hisob-faktura bekor qilindi'
      });
    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  }
);

/**
 * Create new service
 */
router.post('/services',
  authenticate,
  async (req, res, next) => {
    try {
      const { name, category, price, description, is_active } = req.body;
      
      console.log('=== CREATE SERVICE DEBUG ===');
      console.log('Request body:', req.body);
      
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Xizmat nomi majburiy'
        });
      }
      
      // Price can be 0 or any number
      if (price === undefined || price === null || price === '') {
        return res.status(400).json({
          success: false,
          message: 'Xizmat narxi majburiy (0 bo\'lishi mumkin)'
        });
      }
      
      const service = new Service({
        name,
        category: category || 'Umumiy',
        price: parseFloat(price) || 0,
        description: description || '',
        is_active: is_active !== undefined ? is_active : true
      });
      
      await service.save();
      
      console.log('Service created:', service);
      
      res.status(201).json({
        success: true,
        message: 'Xizmat muvaffaqiyatli qo\'shildi',
        data: service
      });
    } catch (error) {
      console.error('Create service error:', error);
      next(error);
    }
  }
);

/**
 * Update service
 */
router.put('/services/:id',
  authenticate,
  async (req, res, next) => {
    try {
      const { name, category, price, description, is_active } = req.body;
      
      console.log('=== UPDATE SERVICE DEBUG ===');
      console.log('Service ID:', req.params.id);
      console.log('Request body:', req.body);
      
      const service = await Service.findById(req.params.id);
      
      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Xizmat topilmadi'
        });
      }
      
      if (name) service.name = name;
      if (category) service.category = category;
      if (price !== undefined && price !== null && price !== '') service.price = parseFloat(price) || 0;
      if (description !== undefined) service.description = description;
      if (is_active !== undefined) service.is_active = is_active;
      
      await service.save();
      
      console.log('Service updated:', service);
      
      res.json({
        success: true,
        message: 'Xizmat muvaffaqiyatli yangilandi',
        data: service
      });
    } catch (error) {
      console.error('Update service error:', error);
      next(error);
    }
  }
);

/**
 * Delete service
 */
router.delete('/services/:id',
  authenticate,
  async (req, res, next) => {
    try {
      const service = await Service.findById(req.params.id);
      
      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Xizmat topilmadi'
        });
      }
      
      // Hard delete - completely remove from database
      await Service.findByIdAndDelete(req.params.id);
      
      res.json({
        success: true,
        message: 'Xizmat muvaffaqiyatli o\'chirildi'
      });
    } catch (error) {
      console.error('Delete service error:', error);
      next(error);
    }
  }
);

export default router;
