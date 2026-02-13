import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, authorize } from '../middleware/auth.js';
import LabOrder from '../models/LabOrder.js';
import LabTest from '../models/LabTest.js';
import Patient from '../models/Patient.js';
import Staff from '../models/Staff.js';
import mongoose from 'mongoose';

const router = express.Router();

// Rate limiter for lab order creation (prevent abuse)
const createOrderLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Max 30 orders per minute per IP
  message: {
    success: false,
    message: 'Juda ko\'p so\'rov. Iltimos, bir daqiqa kuting.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// General rate limiter for all lab routes
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Max 100 requests per minute per IP
  message: {
    success: false,
    message: 'Juda ko\'p so\'rov. Iltimos, bir daqiqa kuting.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply general rate limiter to all routes
router.use(generalLimiter);

// Get all lab tests
router.get('/tests', authenticate, async (req, res, next) => {
  try {
    const { is_active, category } = req.query;
    
    const query = {};
    
    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }
    
    if (category) {
      query.category = category;
    }
    
    const tests = await LabTest.find(query)
      .sort({ name: 1 })
      .lean();
    
    res.json({
      success: true,
      data: tests.map(t => ({
        id: t._id,
        test_name: t.name,
        test_code: t.code,
        name: t.name,
        code: t.code,
        category: t.category,
        description: t.description,
        price: t.price,
        duration_minutes: t.duration_minutes,
        turnaround_time: t.duration_minutes ? Math.round(t.duration_minutes / 60) : null,
        sample_type: t.sample_type,
        preparation_instructions: t.preparation_instructions,
        normal_range: t.normal_range,
        test_parameters: t.test_parameters || [],
        is_active: t.is_active
      }))
    });
  } catch (error) {
    console.error('Get lab tests error:', error);
    next(error);
  }
});

// Get single lab test
router.get('/tests/:id', authenticate, async (req, res, next) => {
  try {
    const test = await LabTest.findById(req.params.id).lean();
    
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Tahlil topilmadi'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: test._id,
        ...test
      }
    });
  } catch (error) {
    console.error('Get lab test error:', error);
    next(error);
  }
});

// Create lab test
router.post('/tests', authenticate, authorize('admin', 'laborant', 'doctor'), async (req, res, next) => {
  try {
    const {
      name,
      code,
      category,
      description,
      price,
      duration_minutes,
      sample_type,
      preparation_instructions,
      normal_range,
      test_parameters
    } = req.body;
    
    if (!name || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Majburiy maydonlarni to\'ldiring'
      });
    }
    
    const test = new LabTest({
      name,
      code,
      category: category || 'Umumiy',
      description,
      price,
      duration_minutes,
      sample_type,
      preparation_instructions,
      normal_range,
      test_parameters: test_parameters || [],
      is_active: true
    });
    
    await test.save();
    
    res.status(201).json({
      success: true,
      message: 'Tahlil yaratildi',
      data: {
        id: test._id,
        name: test.name
      }
    });
  } catch (error) {
    console.error('Create lab test error:', error);
    next(error);
  }
});

// Update lab test
router.put('/tests/:id', authenticate, authorize('admin', 'laborant', 'doctor'), async (req, res, next) => {
  try {
    const {
      name,
      code,
      category,
      description,
      price,
      duration_minutes,
      sample_type,
      preparation_instructions,
      normal_range,
      test_parameters,
      is_active
    } = req.body;
    
    const updateData = {};
    
    if (name) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (category) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes;
    if (sample_type) updateData.sample_type = sample_type;
    if (preparation_instructions !== undefined) updateData.preparation_instructions = preparation_instructions;
    if (normal_range !== undefined) updateData.normal_range = normal_range;
    if (test_parameters !== undefined) updateData.test_parameters = test_parameters;
    if (is_active !== undefined) updateData.is_active = is_active;
    
    const test = await LabTest.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Tahlil topilmadi'
      });
    }
    
    res.json({
      success: true,
      message: 'Tahlil yangilandi',
      data: test
    });
  } catch (error) {
    console.error('Update lab test error:', error);
    next(error);
  }
});

// Delete lab test
router.delete('/tests/:id', authenticate, authorize('admin', 'laborant', 'doctor'), async (req, res, next) => {
  try {
    const test = await LabTest.findByIdAndDelete(req.params.id);
    
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Tahlil topilmadi'
      });
    }
    
    res.json({
      success: true,
      message: 'Tahlil o\'chirildi'
    });
  } catch (error) {
    console.error('Delete lab test error:', error);
    next(error);
  }
});

// Get all lab orders
router.get('/orders', authenticate, async (req, res, next) => {
  try {
    const { date_from, date_to, status, patient_id } = req.query;
    
    const query = {};
    
    // Agar laborant bo'lsa, faqat o'ziga biriktirilgan yoki hech kimga biriktirilmagan buyurtmalarni ko'rsatish
    const userRole = req.user.role?.name || req.user.role_name || '';
    if (userRole.toLowerCase() === 'laborant') {
      query.$or = [
        { laborant_id: req.user.id },
        { laborant_id: null },
        { laborant_id: { $exists: false } }
      ];
    }
    
    if (date_from) {
      query.createdAt = { $gte: new Date(date_from) };
    }
    
    if (date_to) {
      if (query.createdAt) {
        query.createdAt.$lte = new Date(date_to);
      } else {
        query.createdAt = { $lte: new Date(date_to) };
      }
    }
    
    // Only filter by status if it's not 'all'
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (patient_id) {
      query.patient_id = patient_id;
    }
    
    const orders = await LabOrder.find(query)
      .populate('patient_id', 'first_name last_name patient_number phone')
      .populate('doctor_id', 'first_name last_name')
      .populate('laborant_id', 'first_name last_name')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({
      success: true,
      data: orders.map(o => ({
        id: o._id,
        order_number: o.order_number,
        patient_id: o.patient_id?._id,
        patient_first_name: o.patient_id?.first_name,
        patient_last_name: o.patient_id?.last_name,
        patient_name: o.patient_id ? `${o.patient_id.first_name} ${o.patient_id.last_name}` : null,
        patient_number: o.patient_id?.patient_number,
        patient_phone: o.patient_id?.phone,
        doctor_id: o.doctor_id?._id,
        doctor_name: o.doctor_id ? `${o.doctor_id.first_name} ${o.doctor_id.last_name}` : null,
        laborant_id: o.laborant_id?._id,
        laborant_name: o.laborant_id ? `${o.laborant_id.first_name} ${o.laborant_id.last_name}` : null,
        test_id: o.test_id,
        test_type: o.test_type,
        test_name: o.test_name,
        status: o.status,
        priority: o.priority,
        sample_type: o.sample_type,
        sample_collected_at: o.sample_collected_at,
        results: o.results,
        notes: o.notes,
        completed_at: o.completed_at,
        price: o.price,
        order_date: o.createdAt,
        created_at: o.createdAt
      }))
    });
  } catch (error) {
    console.error('Get lab orders error:', error);
    next(error);
  }
});

// Get single lab order
router.get('/orders/:id', authenticate, async (req, res, next) => {
  try {
    const order = await LabOrder.findById(req.params.id)
      .populate('patient_id', 'first_name last_name patient_number phone date_of_birth')
      .populate('doctor_id', 'first_name last_name')
      .populate('laborant_id', 'first_name last_name')
      .lean();
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Tahlil buyurtmasi topilmadi'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: order._id,
        ...order
      }
    });
  } catch (error) {
    console.error('Get lab order error:', error);
    next(error);
  }
});

// Get lab order result for viewing/printing
router.get('/orders/:id/result', authenticate, async (req, res, next) => {
  try {
    const order = await LabOrder.findById(req.params.id)
      .populate('patient_id', 'first_name last_name patient_number phone date_of_birth')
      .populate('doctor_id', 'first_name last_name')
      .populate('laborant_id', 'first_name last_name')
      .lean();
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Tahlil buyurtmasi topilmadi'
      });
    }

    // Calculate patient age and birth year if date_of_birth exists
    let patientAge = null;
    let patientBirthYear = null;
    if (order.patient_id?.date_of_birth) {
      const birthDate = new Date(order.patient_id.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      patientAge = age;
      patientBirthYear = birthDate.getFullYear();
    }
    
    res.json({
      success: true,
      data: {
        id: order._id,
        order_number: order.order_number,
        test_name: order.test_name,
        test_type: order.test_type,
        patient_name: order.patient_id ? `${order.patient_id.first_name} ${order.patient_id.last_name}` : 'Noma\'lum',
        patient_number: order.patient_id?.patient_number,
        patient_age: patientAge,
        patient_birth_year: patientBirthYear,
        patient_address: order.patient_id?.address || null,
        doctor_name: order.doctor_id ? `${order.doctor_id.first_name} ${order.doctor_id.last_name}` : null,
        laborant_name: order.laborant_id ? `${order.laborant_id.first_name} ${order.laborant_id.last_name}` : null,
        test_results: order.results || [],
        notes: order.notes,
        order_date: order.createdAt,
        completed_at: order.completed_at,
        approved_at: order.completed_at,
        status: order.status
      }
    });
  } catch (error) {
    console.error('Get lab order result error:', error);
    next(error);
  }
});

// Create lab order
router.post('/orders', authenticate, authorize('admin', 'doctor', 'receptionist'), createOrderLimiter, async (req, res, next) => {
  const session = await mongoose.startSession();
  
  try {
    await session.startTransaction();
    
    const {
      patient_id,
      doctor_id,
      test_id,
      laborant_id,
      priority,
      notes
    } = req.body;
    
    // Validation: Required fields
    if (!patient_id || !test_id) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Majburiy maydonlarni to'ldiring. Patient ID: ${patient_id ? 'OK' : 'MISSING'}, Test ID: ${test_id ? 'OK' : 'MISSING'}`
      });
    }
    
    // Validation: Check if IDs are valid MongoDB ObjectIds
    if (!mongoose.Types.ObjectId.isValid(patient_id)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Noto\'g\'ri patient ID formati'
      });
    }
    
    if (!mongoose.Types.ObjectId.isValid(test_id)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Noto\'g\'ri test ID formati'
      });
    }
    
    // Validation: Notes length (max 1000 characters)
    if (notes && notes.length > 1000) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Izoh juda uzun (maksimal 1000 belgi)'
      });
    }
    
    // Validation: Priority value
    const validPriorities = ['normal', 'urgent', 'stat'];
    if (priority && !validPriorities.includes(priority)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Noto'g'ri priority qiymati. Faqat: ${validPriorities.join(', ')}`
      });
    }
    
    // Validation: Check if patient exists
    const patient = await Patient.findById(patient_id).session(session);
    if (!patient) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Bemor topilmadi'
      });
    }
    
    // Get test details
    const test = await LabTest.findById(test_id).session(session);
    if (!test) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Tahlil topilmadi'
      });
    }
    
    // Validation: Check if test is active
    if (!test.is_active) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Bu tahlil faol emas'
      });
    }
    
    // Create lab order
    const order = new LabOrder({
      patient_id,
      doctor_id: doctor_id || req.user.id,
      laborant_id: laborant_id || null,
      test_id: test._id,
      test_type: test.category,
      test_name: test.name,
      priority: priority || 'normal',
      sample_type: test.sample_type,
      notes: notes || '',
      price: test.price,
      status: 'pending'
    });
    
    await order.save({ session });
    
    // Create invoice for lab order
    const Invoice = (await import('../models/Invoice.js')).default;
    const BillingItem = (await import('../models/BillingItem.js')).default;
    const Transaction = (await import('../models/Transaction.js')).default;
    // Patient already imported at the top, no need to re-import
    
    // Generate invoice number
    const invoiceCount = await Invoice.countDocuments().session(session);
    const invoiceNumber = `INV-${Date.now()}-${invoiceCount + 1}`;
    
    // Create invoice
    const invoice = await Invoice.create([{
      patient_id,
      invoice_number: invoiceNumber,
      items: [{
        item_type: 'laboratory',
        description: `Laboratoriya: ${test.name}`,
        quantity: 1,
        unit_price: test.price,
        total_price: test.price,
        notes: order.order_number
      }],
      total_amount: test.price,
      paid_amount: 0,
      discount_amount: 0,
      payment_status: 'pending',
      notes: `Laboratoriya tahlili: ${test.name} (${order.order_number})`,
      created_by: req.user.id
    }], { session });
    
    // Create billing item
    await BillingItem.create([{
      billing_id: invoice[0]._id,
      service_id: test._id,
      service_name: `Laboratoriya: ${test.name}`,
      quantity: 1,
      unit_price: test.price,
      total_price: test.price
    }], { session });
    
    // Update patient balance
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
    ]).session(session);
    
    const totalDebt = balanceResult[0]?.total_debt || 0;
    const totalPaid = balanceResult[0]?.total_paid || 0;
    const calculatedBalance = totalPaid - totalDebt;
    
    await Patient.findByIdAndUpdate(
      patient_id,
      { 
        current_balance: calculatedBalance,
        updated_at: new Date()
      },
      { session }
    );
    
    await session.commitTransaction();
    
    res.status(201).json({
      success: true,
      message: 'Tahlil buyurtmasi va hisob-faktura yaratildi',
      data: {
        id: order._id,
        order_number: order.order_number,
        invoice_id: invoice[0]._id,
        invoice_number: invoiceNumber
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Create lab order error:', error);
    next(error);
  } finally {
    session.endSession();
  }
});

// Update lab order status
router.put('/orders/:id/status', authenticate, authorize('admin', 'laborant'), async (req, res, next) => {
  try {
    const { status, results, laborant_id } = req.body;
    
    const updateData = { status };
    
    if (results) {
      updateData.results = results;
    }
    
    if (laborant_id) {
      updateData.laborant_id = laborant_id;
    }
    
    if (status === 'in_progress' && !updateData.laborant_id) {
      updateData.laborant_id = req.user.id;
    }
    
    if (status === 'completed') {
      updateData.completed_at = new Date();
    }
    
    const order = await LabOrder.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Tahlil buyurtmasi topilmadi'
      });
    }
    
    res.json({
      success: true,
      message: 'Status yangilandi',
      data: order
    });
  } catch (error) {
    console.error('Update lab order status error:', error);
    next(error);
  }
});

// Update lab order
router.put('/orders/:id', authenticate, authorize('admin', 'laborant'), async (req, res, next) => {
  try {
    const {
      test_type,
      test_name,
      priority,
      sample_type,
      sample_collected_at,
      results,
      notes,
      price
    } = req.body;
    
    const updateData = {};
    
    if (test_type) updateData.test_type = test_type;
    if (test_name) updateData.test_name = test_name;
    if (priority) updateData.priority = priority;
    if (sample_type) updateData.sample_type = sample_type;
    if (sample_collected_at) updateData.sample_collected_at = sample_collected_at;
    if (results !== undefined) updateData.results = results;
    if (notes !== undefined) updateData.notes = notes;
    if (price !== undefined) updateData.price = price;
    
    const order = await LabOrder.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Tahlil buyurtmasi topilmadi'
      });
    }
    
    res.json({
      success: true,
      message: 'Tahlil buyurtmasi yangilandi',
      data: order
    });
  } catch (error) {
    console.error('Update lab order error:', error);
    next(error);
  }
});

// Delete lab order
router.delete('/orders/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const order = await LabOrder.findByIdAndDelete(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Tahlil buyurtmasi topilmadi'
      });
    }
    
    res.json({
      success: true,
      message: 'Tahlil buyurtmasi o\'chirildi'
    });
  } catch (error) {
    console.error('Delete lab order error:', error);
    next(error);
  }
});

// Get statistics
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const { date_from, date_to } = req.query;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Date range query
    let dateQuery = {};
    if (date_from) {
      dateQuery.createdAt = { $gte: new Date(date_from) };
    }
    if (date_to) {
      if (dateQuery.createdAt) {
        dateQuery.createdAt.$lte = new Date(date_to);
      } else {
        dateQuery.createdAt = { $lte: new Date(date_to) };
      }
    }
    
    const [
      totalOrders,
      pendingOrders,
      inProgressOrders,
      completedToday,
      todayPatients,
      todayRevenue
    ] = await Promise.all([
      LabOrder.countDocuments(dateQuery),
      LabOrder.countDocuments({ ...dateQuery, status: 'pending' }),
      LabOrder.countDocuments({ ...dateQuery, status: 'in_progress' }),
      LabOrder.countDocuments({
        status: 'completed',
        completed_at: { $gte: today, $lt: tomorrow }
      }),
      // Bugungi bemorlar soni (unique)
      LabOrder.distinct('patient_id', {
        createdAt: { $gte: today, $lt: tomorrow }
      }).then(ids => ids.length),
      // Bugungi tushum
      LabOrder.aggregate([
        {
          $match: {
            status: 'completed',
            completed_at: { $gte: today, $lt: tomorrow }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$price' }
          }
        }
      ]).then(result => result[0]?.total || 0)
    ]);
    
    // Reagent statistics (admin only)
    let reagentStats = null;
    if (req.user.role === 'admin' || req.user.role_name === 'admin') {
      const LabReagent = (await import('../models/LabReagent.js')).default;
      
      // Barcha reaktivlarni olish
      const allReagents = await LabReagent.find({});
      
      const now = new Date();
      let activeCount = 0;
      let expiredCount = 0;
      let lowStockCount = 0;
      let depletedCount = 0;
      
      allReagents.forEach(reagent => {
        const expiryDate = new Date(reagent.expiry_date);
        const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        
        // Tugagan
        if (reagent.remaining_tests === 0) {
          depletedCount++;
        }
        // Muddati o'tgan yoki 30 kun qolgan
        else if (daysUntilExpiry < 0 || daysUntilExpiry <= 30) {
          expiredCount++;
        }
        // Kam qolgan (31-90 kun)
        else if (daysUntilExpiry <= 90) {
          lowStockCount++;
        }
        // Yaroqli (90 kundan ko'p)
        else {
          activeCount++;
        }
      });
      
      reagentStats = {
        total: allReagents.length,
        active: activeCount,
        expired: expiredCount,
        low_stock: lowStockCount,
        depleted: depletedCount
      };
    }
    
    res.json({
      success: true,
      data: {
        total_orders: totalOrders,
        pending_orders: pendingOrders,
        in_progress_orders: inProgressOrders,
        completed_today: completedToday,
        today_patients: todayPatients,
        today_revenue: todayRevenue,
        reagent_stats: reagentStats
      }
    });
  } catch (error) {
    console.error('Get lab stats error:', error);
    next(error);
  }
});

// ============================================
// LABORANT ENDPOINTS
// ============================================

// Get laborant statistics
router.get('/laborant/stats', authenticate, authorize('laborant', 'admin'), async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Laborant uchun faqat o'ziga biriktirilgan buyurtmalar
    const baseQuery = {};
    const userRole = req.user.role?.name || req.user.role_name || '';
    if (userRole.toLowerCase() === 'laborant') {
      baseQuery.laborant_id = req.user.id;
    }
    
    const [
      todayPending,
      notReady,
      overdue,
      recentResults
    ] = await Promise.all([
      // Bugungi kutilayotgan
      LabOrder.countDocuments({
        ...baseQuery,
        status: 'pending',
        createdAt: { $gte: today, $lt: tomorrow }
      }),
      // Tayyorlanmagan (sample_collected yoki in_progress)
      LabOrder.countDocuments({
        ...baseQuery,
        status: { $in: ['sample_collected', 'in_progress'] }
      }),
      // Kechikkan (24 soatdan ortiq pending)
      LabOrder.countDocuments({
        ...baseQuery,
        status: 'pending',
        createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }),
      // Oxirgi natijalar (bugun tayyor bo'lgan)
      LabOrder.countDocuments({
        ...baseQuery,
        status: 'completed',
        completed_at: { $gte: today, $lt: tomorrow }
      })
    ]);
    
    res.json({
      success: true,
      data: {
        today_pending: todayPending,
        not_ready: notReady,
        overdue: overdue,
        recent_results: recentResults
      }
    });
  } catch (error) {
    console.error('Get laborant stats error:', error);
    next(error);
  }
});

// Scan QR code
router.post('/scan-qr', authenticate, authorize('laborant', 'admin'), async (req, res, next) => {
  try {
    const { qr_code } = req.body;
    
    if (!qr_code) {
      return res.status(400).json({
        success: false,
        message: 'QR kod majburiy'
      });
    }
    
    // QR kod order_number bo'lishi kerak
    const order = await LabOrder.findOne({ order_number: qr_code })
      .populate('patient_id', 'first_name last_name patient_number phone')
      .populate('doctor_id', 'first_name last_name')
      .lean();
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Buyurtma topilmadi'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: order._id,
        order_number: order.order_number,
        patient_first_name: order.patient_id?.first_name,
        patient_last_name: order.patient_id?.last_name,
        patient_number: order.patient_id?.patient_number,
        test_name: order.test_name,
        test_type: order.test_type,
        status: order.status,
        created_at: order.createdAt
      }
    });
  } catch (error) {
    console.error('Scan QR error:', error);
    next(error);
  }
});

// Submit test results
router.post('/orders/:id/results', authenticate, authorize('laborant', 'admin'), async (req, res, next) => {
  try {
    const { test_results, notes, reagent_id } = req.body;
    
    if (!test_results || !Array.isArray(test_results)) {
      return res.status(400).json({
        success: false,
        message: 'Test natijalari majburiy'
      });
    }

    // First get the order to get patient_id
    const existingOrder = await LabOrder.findById(req.params.id);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Buyurtma topilmadi'
      });
    }

    const patientId = existingOrder.patient_id;
    
    // Update lab order
    existingOrder.results = test_results;
    existingOrder.notes = notes || '';
    existingOrder.status = 'completed';
    existingOrder.completed_at = new Date();
    existingOrder.laborant_id = req.user.id;
    await existingOrder.save();

    // Use reagent if provided
    if (reagent_id) {
      const LabReagent = (await import('../models/LabReagent.js')).default;
      const LabReagentUsage = (await import('../models/LabReagentUsage.js')).default;

      const reagent = await LabReagent.findById(reagent_id);
      if (reagent) {
        if (reagent.remaining_tests >= 1 && reagent.status !== 'expired') {
          // Record reagent usage
          const usage = new LabReagentUsage({
            reagent: reagent_id,
            patient: patientId,
            lab_order: existingOrder._id,
            test_name: existingOrder.test_name,
            quantity_used: 1,
            cost_per_test: reagent.price_per_test,
            total_cost: reagent.price_per_test * 1,
            used_by: req.user.id,
            notes: `Tahlil: ${existingOrder.test_name}`
          });

          await usage.save();

          // Decrease reagent stock
          reagent.remaining_tests -= 1;
          await reagent.save();

          // Add debt to patient
          const Patient = (await import('../models/Patient.js')).default;
          const patient = await Patient.findById(patientId);
          if (patient) {
            patient.total_debt = (patient.total_debt || 0) + reagent.price_per_test;
            await patient.save();
          }

          // Create invoice for reagent cost
          const Invoice = (await import('../models/Invoice.js')).default;
          const BillingItem = (await import('../models/BillingItem.js')).default;

          // Generate invoice number
          const invoiceCount = await Invoice.countDocuments();
          const invoiceNumber = `INV-${Date.now()}-${invoiceCount + 1}`;

          // Create invoice
          const invoice = await Invoice.create({
            patient_id: patientId,
            invoice_number: invoiceNumber,
            items: [{
              item_type: 'reagent',
              description: `Lab reaktiv: ${reagent.name}`,
              quantity: 1,
              unit_price: reagent.price_per_test,
              total_price: reagent.price_per_test,
              notes: `${existingOrder.test_name} uchun`
            }],
            total_amount: reagent.price_per_test,
            paid_amount: 0,
            discount_amount: 0,
            payment_status: 'pending',
            notes: `Laboratoriya reaktivi: ${reagent.name} (${existingOrder.test_name})`,
            created_by: req.user.id
          });

          // Create billing item
          await BillingItem.create({
            billing_id: invoice._id,
            service_id: reagent._id,
            service_name: `Lab reaktiv: ${reagent.name}`,
            quantity: 1,
            unit_price: reagent.price_per_test,
            total_price: reagent.price_per_test
          });
        }
      }
    }
    
    res.json({
      success: true,
      message: 'Natijalar kiritildi',
      data: {
        id: existingOrder._id,
        order_number: existingOrder.order_number,
        status: existingOrder.status
      }
    });
  } catch (error) {
    console.error('Submit results error:', error);
    next(error);
  }
});

// Get completed tests history (for laborant)
router.get('/laborant/history', authenticate, authorize('laborant', 'admin'), async (req, res, next) => {
  try {
    // Get completed orders grouped by patient
    const completedOrders = await LabOrder.find({
      status: 'completed',
      laborant_id: req.user.id
    })
      .populate('patient_id', 'first_name last_name patient_number')
      .populate('laborant_id', 'first_name last_name')
      .sort({ completed_at: -1 })
      .limit(100)
      .lean();
    
    // Group by patient
    const patientMap = new Map();
    
    completedOrders.forEach(order => {
      if (!order.patient_id) return;
      
      const patientId = order.patient_id._id.toString();
      
      if (!patientMap.has(patientId)) {
        patientMap.set(patientId, {
          patient_id: patientId,
          patient_name: `${order.patient_id.first_name} ${order.patient_id.last_name}`,
          patient_number: order.patient_id.patient_number,
          total_tests: 0,
          last_test_date: order.completed_at,
          tests: []
        });
      }
      
      const patientData = patientMap.get(patientId);
      patientData.total_tests++;
      patientData.tests.push({
        test_name: order.test_name,
        test_type: order.test_type,
        results: order.results,
        notes: order.notes,
        completed_at: order.completed_at,
        completed_by_name: order.laborant_id ? 
          `${order.laborant_id.first_name} ${order.laborant_id.last_name}` : 
          'Noma\'lum'
      });
      
      // Update last test date if this is more recent
      if (order.completed_at > patientData.last_test_date) {
        patientData.last_test_date = order.completed_at;
      }
    });
    
    const history = Array.from(patientMap.values());
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get laborant history error:', error);
    next(error);
  }
});

export default router;
