import express from 'express';
import LabReagent from '../models/LabReagent.js';
import LabReagentUsage from '../models/LabReagentUsage.js';
import Patient from '../models/Patient.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * Get all reagents
 * GET /api/v1/lab-reagents
 */
router.get('/', authenticate, authorize('admin', 'laborant'), async (req, res) => {
  try {
    const { status, search } = req.query;
    
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { country_of_origin: { $regex: search, $options: 'i' } }
      ];
    }

    const reagents = await LabReagent.find(filter)
      .populate('created_by', 'full_name username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: reagents
    });
  } catch (error) {
    console.error('Get reagents error:', error);
    res.status(500).json({
      success: false,
      message: 'Reaktivlarni yuklashda xatolik',
      error: error.message
    });
  }
});

/**
 * Create reagent
 * POST /api/v1/lab-reagents
 */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    console.log('📝 Create reagent request body:', req.body);
    console.log('👤 User:', req.user);
    
    const { name, country_of_origin, expiry_date, total_tests, total_price, notes } = req.body;

    if (!name || !expiry_date || !total_tests || !total_price) {
      return res.status(400).json({
        success: false,
        message: 'Nomi, yaroqlilik muddati, test soni va narx majburiy'
      });
    }

    // Avtomatik hisoblash: bitta testga qancha tushadi
    const price_per_test = Math.ceil(total_price / total_tests);

    console.log('💊 Creating reagent with data:', {
      name,
      country_of_origin,
      expiry_date,
      total_tests,
      total_price,
      price_per_test,
      created_by: req.user.id
    });

    const reagent = new LabReagent({
      name,
      country_of_origin,
      expiry_date: new Date(expiry_date),
      total_tests: parseInt(total_tests),
      remaining_tests: parseInt(total_tests),
      total_price: parseFloat(total_price),
      price_per_test,
      notes,
      created_by: req.user.id
    });

    await reagent.save();

    const populatedReagent = await LabReagent.findById(reagent._id)
      .populate('created_by', 'full_name username');

    res.status(201).json({
      success: true,
      message: 'Reaktiv muvaffaqiyatli qo\'shildi',
      data: populatedReagent
    });
  } catch (error) {
    console.error('❌ Create reagent error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Reaktiv qo\'shishda xatolik',
      error: error.message
    });
  }
});

/**
 * Update reagent
 * PUT /api/v1/lab-reagents/:id
 */
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, country_of_origin, expiry_date, total_tests, total_price, notes } = req.body;

    const reagent = await LabReagent.findById(id);
    if (!reagent) {
      return res.status(404).json({
        success: false,
        message: 'Reaktiv topilmadi'
      });
    }

    if (name) reagent.name = name;
    if (country_of_origin !== undefined) reagent.country_of_origin = country_of_origin;
    if (expiry_date) reagent.expiry_date = new Date(expiry_date);
    if (notes !== undefined) reagent.notes = notes;

    // Agar total_tests yoki total_price o'zgarsa, price_per_test qayta hisoblanadi
    if (total_tests) {
      reagent.total_tests = parseInt(total_tests);
      reagent.remaining_tests = parseInt(total_tests);
    }
    if (total_price) {
      reagent.total_price = parseFloat(total_price);
    }
    if (total_tests || total_price) {
      reagent.price_per_test = Math.ceil(reagent.total_price / reagent.total_tests);
    }

    await reagent.save();

    const populatedReagent = await LabReagent.findById(reagent._id)
      .populate('created_by', 'full_name username');

    res.json({
      success: true,
      message: 'Reaktiv muvaffaqiyatli yangilandi',
      data: populatedReagent
    });
  } catch (error) {
    console.error('Update reagent error:', error);
    res.status(500).json({
      success: false,
      message: 'Reaktivni yangilashda xatolik',
      error: error.message
    });
  }
});

/**
 * Delete reagent
 * DELETE /api/v1/lab-reagents/:id
 */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const reagent = await LabReagent.findById(id);
    if (!reagent) {
      return res.status(404).json({
        success: false,
        message: 'Reaktiv topilmadi'
      });
    }

    await reagent.deleteOne();

    res.json({
      success: true,
      message: 'Reaktiv muvaffaqiyatli o\'chirildi'
    });
  } catch (error) {
    console.error('Delete reagent error:', error);
    res.status(500).json({
      success: false,
      message: 'Reaktivni o\'chirishda xatolik',
      error: error.message
    });
  }
});

/**
 * Use reagent (Laborant ishlatadi)
 * POST /api/v1/lab-reagents/use
 */
router.post('/use', authenticate, authorize('laborant'), async (req, res) => {
  try {
    const { reagent_id, patient_id, lab_order_id, test_name, quantity = 1, notes } = req.body;

    if (!reagent_id || !patient_id || !test_name) {
      return res.status(400).json({
        success: false,
        message: 'Reaktiv, bemor va test nomi majburiy'
      });
    }

    const reagent = await LabReagent.findById(reagent_id);
    if (!reagent) {
      return res.status(404).json({
        success: false,
        message: 'Reaktiv topilmadi'
      });
    }

    if (reagent.remaining_tests < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Reaktiv yetarli emas'
      });
    }

    if (reagent.status === 'expired') {
      return res.status(400).json({
        success: false,
        message: 'Reaktiv muddati o\'tgan'
      });
    }

    const patient = await Patient.findById(patient_id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Bemor topilmadi'
      });
    }

    // Reaktiv foydalanishni yozish
    const usage = new LabReagentUsage({
      reagent: reagent_id,
      patient: patient_id,
      lab_order: lab_order_id,
      test_name,
      quantity_used: quantity,
      cost_per_test: reagent.price_per_test,
      used_by: req.user.id,
      notes
    });

    await usage.save();

    // Reaktivdan kamaytiramiz
    reagent.remaining_tests -= quantity;
    await reagent.save();

    // Bemorga qarz qo'shamiz
    const totalCost = reagent.price_per_test * quantity;
    patient.total_debt = (patient.total_debt || 0) + totalCost;
    await patient.save();

    const populatedUsage = await LabReagentUsage.findById(usage._id)
      .populate('reagent', 'name')
      .populate('patient', 'first_name last_name patient_number')
      .populate('used_by', 'full_name');

    res.json({
      success: true,
      message: 'Reaktiv ishlatildi va bemor profiliga qarz yozildi',
      data: {
        usage: populatedUsage,
        reagent_remaining: reagent.remaining_tests,
        patient_debt: patient.total_debt
      }
    });
  } catch (error) {
    console.error('Use reagent error:', error);
    res.status(500).json({
      success: false,
      message: 'Reaktivni ishlatishda xatolik',
      error: error.message
    });
  }
});

/**
 * Get reagent usage history
 * GET /api/v1/lab-reagents/usage-history
 */
router.get('/usage-history', authenticate, authorize('admin', 'laborant'), async (req, res) => {
  try {
    const { reagent_id, patient_id, start_date, end_date, limit = 50 } = req.query;

    const filter = {};

    if (reagent_id) filter.reagent = reagent_id;
    if (patient_id) filter.patient = patient_id;

    if (start_date || end_date) {
      filter.createdAt = {};
      if (start_date) filter.createdAt.$gte = new Date(start_date);
      if (end_date) filter.createdAt.$lte = new Date(end_date);
    }

    const usages = await LabReagentUsage.find(filter)
      .populate('reagent', 'name batch_number')
      .populate('patient', 'first_name last_name patient_number')
      .populate('used_by', 'full_name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: usages
    });
  } catch (error) {
    console.error('Get usage history error:', error);
    res.status(500).json({
      success: false,
      message: 'Foydalanish tarixini yuklashda xatolik',
      error: error.message
    });
  }
});

export default router;
