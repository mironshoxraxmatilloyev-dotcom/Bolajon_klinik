import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import Medicine from '../models/Medicine.js';
import Supplier from '../models/Supplier.js';
import PharmacyRequest from '../models/PharmacyRequest.js';
import PharmacyTransaction from '../models/PharmacyTransaction.js';

const router = express.Router();

// ==================== STATISTICS ====================
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const [total, available, outOfStock, expired, lowStock] = await Promise.all([
      Medicine.countDocuments(),
      Medicine.countDocuments({ status: 'available' }),
      Medicine.countDocuments({ status: 'out_of_stock' }),
      Medicine.countDocuments({ status: 'expired' }),
      Medicine.countDocuments({ 
        $expr: { $lte: ['$quantity', '$reorder_level'] },
        status: 'available'
      })
    ]);
    
    res.json({
      success: true,
      data: {
        total_medicines: total,
        available: available,
        out_of_stock: outOfStock,
        expired: expired,
        low_stock: lowStock
      }
    });
  } catch (error) {
    console.error('Get pharmacy stats error:', error);
    next(error);
  }
});

// ==================== MEDICINES ====================
// Get out of stock medicines (specific route - MUST be before /medicines/:id)
router.get('/medicines/out-of-stock', authenticate, async (req, res, next) => {
  try {
    const { floor } = req.query;
    const query = { 
      $or: [
        { status: 'out_of_stock' },
        { $expr: { $lte: ['$quantity', '$reorder_level'] } }
      ]
    };
    if (floor) query.floor = parseInt(floor);
    
    const medicines = await Medicine.find(query).sort({ name: 1 }).lean();
    
    res.json({
      success: true,
      medicines: medicines.map(med => ({
        id: med._id,
        name: med.name,
        generic_name: med.generic_name,
        category: med.category,
        quantity: med.quantity,
        stock_quantity: med.quantity,
        reorder_level: med.reorder_level,
        min_stock_level: med.reorder_level,
        status: med.status
      }))
    });
  } catch (error) {
    console.error('Get out of stock medicines error:', error);
    next(error);
  }
});

// Get medicines with search and filter
router.get('/medicines', authenticate, async (req, res, next) => {
  try {
    const { search = '', floor, category, status } = req.query;
    
    console.log('=== GET MEDICINES (MongoDB) ===');
    console.log('Search:', search, 'Floor:', floor, 'Category:', category);
    
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { generic_name: { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (floor) query.floor = parseInt(floor);
    if (category) query.category = category;
    if (status) query.status = status;
    
    const medicines = await Medicine.find(query)
      .sort({ name: 1 })
      .lean();
    
    res.json({
      success: true,
      medicines: medicines.map(med => ({
        id: med._id,
        name: med.name,
        generic_name: med.generic_name,
        manufacturer: med.manufacturer,
        category: med.category,
        dosage_form: med.dosage_form,
        strength: med.strength,
        unit: med.unit || 'dona',
        unit_price: med.unit_price,
        price_per_unit: med.unit_price,
        quantity: med.quantity,
        stock_quantity: med.quantity,
        total_stock: med.quantity, // Frontend uchun
        reorder_level: med.reorder_level,
        min_stock_level: med.reorder_level,
        expiry_date: med.expiry_date,
        batch_number: med.batch_number,
        floor: med.floor,
        shelf_location: med.shelf_location,
        description: med.description,
        status: med.status
      }))
    });
  } catch (error) {
    console.error('Get medicines error:', error);
    next(error);
  }
});

// Get single medicine (dynamic route - must be after specific routes)
router.get('/medicines/:id', authenticate, async (req, res, next) => {
  try {
    const medicine = await Medicine.findById(req.params.id).lean();
    
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Dori topilmadi'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: medicine._id,
        ...medicine
      }
    });
  } catch (error) {
    console.error('Get medicine error:', error);
    next(error);
  }
});

// Create medicine
router.post('/medicines', authenticate, authorize('admin', 'pharmacist'), async (req, res, next) => {
  try {
    const medicineData = req.body;
    
    console.log('=== CREATE MEDICINE (MongoDB) ===');
    console.log('Data:', medicineData);
    
    const medicine = new Medicine(medicineData);
    await medicine.save();
    
    console.log('✅ Medicine created:', medicine._id);
    
    res.status(201).json({
      success: true,
      message: 'Dori muvaffaqiyatli qo\'shildi',
      data: {
        id: medicine._id,
        ...medicine.toObject()
      }
    });
  } catch (error) {
    console.error('Create medicine error:', error);
    next(error);
  }
});

// Update medicine
router.put('/medicines/:id', authenticate, authorize('admin', 'pharmacist'), async (req, res, next) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Dori topilmadi'
      });
    }
    
    res.json({
      success: true,
      message: 'Dori yangilandi',
      data: {
        id: medicine._id,
        ...medicine.toObject()
      }
    });
  } catch (error) {
    console.error('Update medicine error:', error);
    next(error);
  }
});

// Delete medicine
router.delete('/medicines/:id', authenticate, authorize('admin', 'pharmacist'), async (req, res, next) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);
    
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Dori topilmadi'
      });
    }
    
    res.json({
      success: true,
      message: 'Dori o\'chirildi'
    });
  } catch (error) {
    console.error('Delete medicine error:', error);
    next(error);
  }
});

// ==================== SUPPLIERS (DORIXONALAR) ====================
// Get suppliers
router.get('/suppliers', authenticate, async (req, res, next) => {
  try {
    const { search = '', is_active } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contact_person: { $regex: search, $options: 'i' } }
      ];
    }
    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }
    
    const suppliers = await Supplier.find(query).sort({ name: 1 }).lean();
    
    res.json({
      success: true,
      data: suppliers.map(sup => ({
        id: sup._id,
        name: sup.name,
        contact_person: sup.contact_person,
        phone: sup.phone,
        email: sup.email,
        address: sup.address,
        is_active: sup.is_active,
        notes: sup.notes,
        created_at: sup.created_at
      }))
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    next(error);
  }
});

// Create supplier
router.post('/suppliers', authenticate, authorize('admin', 'pharmacist'), async (req, res, next) => {
  try {
    const supplierData = req.body;
    
    console.log('=== CREATE SUPPLIER (MongoDB) ===');
    console.log('Data:', supplierData);
    
    const supplier = new Supplier(supplierData);
    await supplier.save();
    
    console.log('✅ Supplier created:', supplier._id);
    
    res.status(201).json({
      success: true,
      message: 'Dorixona muvaffaqiyatli qo\'shildi',
      data: {
        id: supplier._id,
        ...supplier.toObject()
      }
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    next(error);
  }
});

// Update supplier
router.put('/suppliers/:id', authenticate, authorize('admin', 'pharmacist'), async (req, res, next) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Dorixona topilmadi'
      });
    }
    
    res.json({
      success: true,
      message: 'Dorixona yangilandi',
      data: {
        id: supplier._id,
        ...supplier.toObject()
      }
    });
  } catch (error) {
    console.error('Update supplier error:', error);
    next(error);
  }
});

// Delete supplier
router.delete('/suppliers/:id', authenticate, authorize('admin', 'pharmacist'), async (req, res, next) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Dorixona topilmadi'
      });
    }
    
    res.json({
      success: true,
      message: 'Dorixona o\'chirildi'
    });
  } catch (error) {
    console.error('Delete supplier error:', error);
    next(error);
  }
});

// ==================== PHARMACY REQUESTS (BUYURTMALAR) ====================
// Get pharmacy requests
router.get('/requests', authenticate, async (req, res, next) => {
  try {
    const { floor, status, urgency } = req.query;
    
    const query = {};
    if (floor) query.floor = parseInt(floor);
    if (status) query.status = status;
    if (urgency) query.urgency = urgency;
    
    const requests = await PharmacyRequest.find(query)
      .sort({ created_at: -1 })
      .lean();
    
    res.json({
      success: true,
      data: requests.map(req => ({
        id: req._id,
        medicine_name: req.medicine_name,
        quantity: req.quantity,
        supplier_id: req.supplier_id,
        supplier_name: req.supplier_name,
        urgency: req.urgency,
        status: req.status,
        requested_by: req.requested_by,
        requested_by_name: req.requested_by_name,
        notes: req.notes,
        floor: req.floor,
        created_at: req.created_at,
        accepted_at: req.accepted_at,
        batch_number: req.batch_number,
        expiry_date: req.expiry_date,
        cost_per_unit: req.cost_per_unit
      }))
    });
  } catch (error) {
    console.error('Get requests error:', error);
    next(error);
  }
});

// Create pharmacy request
router.post('/requests', authenticate, async (req, res, next) => {
  try {
    const requestData = {
      ...req.body,
      requested_by: req.user.id,
      requested_by_name: `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.username
    };
    
    // Agar supplier_id berilgan bo'lsa, supplier_name ni olish
    if (requestData.supplier_id) {
      const supplier = await Supplier.findById(requestData.supplier_id);
      if (supplier) {
        requestData.supplier_name = supplier.name;
      }
    }
    
    console.log('=== CREATE PHARMACY REQUEST (MongoDB) ===');
    console.log('Data:', requestData);
    
    const request = new PharmacyRequest(requestData);
    await request.save();
    
    console.log('✅ Pharmacy request created:', request._id);
    
    res.status(201).json({
      success: true,
      message: 'Buyurtma muvaffaqiyatli yuborildi',
      data: {
        id: request._id,
        ...request.toObject()
      }
    });
  } catch (error) {
    console.error('Create request error:', error);
    next(error);
  }
});

// Update pharmacy request
router.put('/requests/:id', authenticate, authorize('admin', 'pharmacist'), async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    
    // Agar supplier_id o'zgargan bo'lsa, supplier_name ni yangilash
    if (updateData.supplier_id) {
      const supplier = await Supplier.findById(updateData.supplier_id);
      if (supplier) {
        updateData.supplier_name = supplier.name;
      }
    }
    
    const request = await PharmacyRequest.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Buyurtma topilmadi'
      });
    }
    
    res.json({
      success: true,
      message: 'Buyurtma yangilandi',
      data: {
        id: request._id,
        ...request.toObject()
      }
    });
  } catch (error) {
    console.error('Update request error:', error);
    next(error);
  }
});

// Accept pharmacy request (qabul qilish)
router.post('/requests/:id/accept', authenticate, authorize('admin', 'pharmacist'), async (req, res, next) => {
  try {
    const { expiry_date, unit_price } = req.body;
    
    if (!expiry_date || !unit_price) {
      return res.status(400).json({
        success: false,
        message: 'Yaroqlilik muddati va sotilish narxi majburiy'
      });
    }
    
    const request = await PharmacyRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Buyurtma topilmadi'
      });
    }
    
    // Buyurtmani qabul qilindi deb belgilash
    request.status = 'accepted';
    request.accepted_at = new Date();
    request.accepted_by = req.user.id;
    request.expiry_date = expiry_date;
    request.cost_per_unit = unit_price;
    
    await request.save();
    
    // Dori zaxirasini yangilash yoki yangi dori yaratish
    let medicine = await Medicine.findOne({ 
      name: request.medicine_name,
      floor: request.floor 
    });
    
    if (medicine) {
      // Mavjud dori - miqdorni oshirish
      medicine.quantity += request.quantity;
      medicine.expiry_date = expiry_date;
      medicine.unit_price = unit_price;
      medicine.status = 'available';
      await medicine.save();
    } else {
      // Yangi dori yaratish
      medicine = new Medicine({
        name: request.medicine_name,
        category: 'other',
        quantity: request.quantity,
        unit_price: unit_price,
        expiry_date: expiry_date,
        floor: request.floor,
        status: 'available',
        reorder_level: 10
      });
      await medicine.save();
    }
    
    res.json({
      success: true,
      message: 'Buyurtma qabul qilindi va zaxiraga qo\'shildi',
      data: {
        request: {
          id: request._id,
          ...request.toObject()
        },
        medicine: {
          id: medicine._id,
          ...medicine.toObject()
        }
      }
    });
  } catch (error) {
    console.error('Accept request error:', error);
    next(error);
  }
});

// Delete pharmacy request
router.delete('/requests/:id', authenticate, authorize('admin', 'pharmacist'), async (req, res, next) => {
  try {
    const request = await PharmacyRequest.findByIdAndDelete(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Buyurtma topilmadi'
      });
    }
    
    res.json({
      success: true,
      message: 'Buyurtma o\'chirildi'
    });
  } catch (error) {
    console.error('Delete request error:', error);
    next(error);
  }
});

// ==================== DISPENSING HISTORY ====================
// Get dispensing history (placeholder - returns empty array)
router.get('/medicine/history', authenticate, async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    next(error);
  }
});

// Get dispensing history (placeholder - returns empty array)
router.get('/dispense/history', authenticate, async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Dispense medicine to patient (Dori ishlatish)
 * POST /api/v1/pharmacy/medicines/:id/dispense
 */
router.post('/medicines/:id/dispense', authenticate, authorize('admin', 'pharmacist', 'nurse'), async (req, res, next) => {
  try {
    const { patient_id, quantity, notes } = req.body;

    if (!patient_id || !quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Bemor va miqdor majburiy'
      });
    }

    // Get medicine
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Dori topilmadi'
      });
    }

    // Check stock
    if (medicine.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Dori yetarli emas'
      });
    }

    // Get patient
    const Patient = (await import('../models/Patient.js')).default;
    const patient = await Patient.findById(patient_id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Bemor topilmadi'
      });
    }

    // Calculate total cost
    const totalCost = medicine.unit_price * quantity;

    // Create pharmacy transaction (chiqim)
    const transaction = await PharmacyTransaction.create({
      medicine_id: medicine._id,
      medicine_name: medicine.name,
      patient_id: patient_id,
      transaction_type: 'out',
      quantity: quantity,
      unit_price: medicine.unit_price,
      total_amount: totalCost,
      notes: notes || `Bemorga berildi: ${patient.first_name} ${patient.last_name}`,
      created_by: req.user.id
    });

    // Decrease medicine stock
    medicine.quantity -= quantity;
    if (medicine.quantity === 0) {
      medicine.status = 'out_of_stock';
    }
    await medicine.save();

    // Add debt to patient
    patient.total_debt = (patient.total_debt || 0) + totalCost;
    await patient.save();

    // Create invoice
    const Invoice = (await import('../models/Invoice.js')).default;
    const BillingItem = (await import('../models/BillingItem.js')).default;

    const invoiceCount = await Invoice.countDocuments();
    const invoiceNumber = `INV-${Date.now()}-${invoiceCount + 1}`;

    const invoice = await Invoice.create({
      patient_id: patient_id,
      invoice_number: invoiceNumber,
      total_amount: totalCost,
      paid_amount: 0,
      discount_amount: 0,
      payment_status: 'pending',
      notes: `Dorixona: ${medicine.name} (${quantity} ${medicine.unit || 'dona'})`,
      created_by: req.user.id
    });

    await BillingItem.create({
      billing_id: invoice._id,
      service_id: medicine._id,
      service_name: `Dori: ${medicine.name}`,
      quantity: quantity,
      unit_price: medicine.unit_price,
      total_price: totalCost
    });

    // Create expense record
    const Expense = (await import('../models/Expense.js')).default;
    await Expense.create({
      title: `Dori chiqimi: ${medicine.name}`,
      category: 'Dori-darmonlar',
      description: `Bemorga berildi: ${patient.first_name} ${patient.last_name} (${quantity} ${medicine.unit || 'dona'})`,
      amount: totalCost,
      payment_method: null,
      created_by: req.user.id
    });

    res.json({
      success: true,
      message: 'Dori muvaffaqiyatli berildi',
      data: {
        transaction_id: transaction._id,
        invoice_id: invoice._id,
        medicine_remaining: medicine.quantity,
        patient_debt: patient.total_debt,
        total_cost: totalCost
      }
    });
  } catch (error) {
    console.error('Dispense medicine error:', error);
    next(error);
  }
});

export default router;


// ==================== PHARMACY TRANSACTIONS (CHIQIM) ====================

/**
 * Get pharmacy transactions
 * GET /api/v1/pharmacy/transactions
 */
router.get('/transactions', authenticate, async (req, res, next) => {
  try {
    const { type, floor, limit = 100, patient_id, medicine_id } = req.query;
    
    const query = {};
    if (type) query.transaction_type = type;
    if (floor) query.floor = parseInt(floor);
    if (patient_id) query.patient_id = patient_id;
    if (medicine_id) query.medicine_id = medicine_id;
    
    const transactions = await PharmacyTransaction.find(query)
      .populate('medicine_id', 'name category unit')
      .populate('patient_id', 'first_name last_name patient_number')
      .populate('staff_id', 'first_name last_name')
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .lean();
    
    // Transform data
    const transformedTransactions = transactions.map(t => ({
      id: t._id.toString(),
      medicine_id: t.medicine_id?._id,
      medicine_name: t.medicine_name,
      medicine_category: t.medicine_id?.category,
      transaction_type: t.transaction_type,
      quantity: t.quantity,
      unit_price: t.unit_price,
      total_amount: t.total_amount,
      patient_id: t.patient_id?._id,
      patient_name: t.patient_id ? `${t.patient_id.first_name} ${t.patient_id.last_name}` : null,
      staff_id: t.staff_id?._id,
      staff_name: t.staff_id ? `${t.staff_id.first_name} ${t.staff_id.last_name}` : null,
      notes: t.notes,
      floor: t.floor,
      created_at: t.created_at
    }));
    
    res.json({
      success: true,
      data: transformedTransactions
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    next(error);
  }
});

/**
 * Get transaction statistics
 * GET /api/v1/pharmacy/transactions/stats
 */
router.get('/transactions/stats', authenticate, async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [totalOut, totalIn, todayOut, todayIn, totalAmount] = await Promise.all([
      PharmacyTransaction.countDocuments({ transaction_type: 'out' }),
      PharmacyTransaction.countDocuments({ transaction_type: 'in' }),
      PharmacyTransaction.countDocuments({ 
        transaction_type: 'out',
        created_at: { $gte: today }
      }),
      PharmacyTransaction.countDocuments({ 
        transaction_type: 'in',
        created_at: { $gte: today }
      }),
      PharmacyTransaction.aggregate([
        { $match: { transaction_type: 'out' } },
        { $group: { _id: null, total: { $sum: '$total_amount' } } }
      ])
    ]);
    
    res.json({
      success: true,
      data: {
        total_out: totalOut,
        total_in: totalIn,
        today_out: todayOut,
        today_in: todayIn,
        total_amount: totalAmount[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    next(error);
  }
});
