import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import Staff from '../models/Staff.js';
import Role from '../models/Role.js';

const router = express.Router();

// Get all staff
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search = '', role, department, status } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) query.role = { $regex: new RegExp(`^${role}$`, 'i') };
    if (department) query.department = department;
    if (status) query.status = status;
    
    const staff = await Staff.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({
      success: true,
      data: staff.map(s => ({
        id: s._id,
        first_name: s.first_name,
        last_name: s.last_name,
        middle_name: s.middle_name,
        email: s.email,
        phone: s.phone,
        role: s.role,
        role_name: s.role,
        department: s.department,
        specialization: s.specialization,
        license_number: s.license_number,
        hire_date: s.hire_date,
        salary: s.salary,
        status: s.status,
        user_active: s.status === 'active',
        created_at: s.createdAt,
        access_code: s.access_code,
        telegram_chat_id: s.telegram_chat_id,
        telegram_username: s.telegram_username,
        telegram_notifications_enabled: s.telegram_notifications_enabled
      }))
    });
  } catch (error) {
    console.error('Get staff error:', error);
    next(error);
  }
});

// Get single staff
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.params.id).lean();
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Xodim topilmadi'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: staff._id,
        ...staff,
        user_active: staff.status === 'active'
      }
    });
  } catch (error) {
    console.error('Get staff error:', error);
    next(error);
  }
});

// Create staff
router.post('/', authenticate, authorize('admin', 'doctor'), async (req, res, next) => {
  try {
    const { username, password, email, first_name, last_name, middle_name, phone, role_id, department, specialization, license_number, salary, hire_date } = req.body;
    
    // Check if username already exists
    const existingStaff = await Staff.findOne({ username });
    
    if (existingStaff) {
      return res.status(400).json({
        success: false,
        message: 'Foydalanuvchi nomi allaqachon mavjud'
      });
    }
    
    // Find role by ID
    const roleDoc = await Role.findById(role_id);
    if (!roleDoc) {
      return res.status(400).json({
        success: false,
        message: 'Role topilmadi'
      });
    }
    
    // Generate unique access code for staff (LI-XXXXXXXX format)
    let accessCode;
    let isUnique = false;
    while (!isUnique) {
      // Generate 8-digit random number
      const randomNum = Math.floor(10000000 + Math.random() * 90000000);
      accessCode = `LI${randomNum}`;
      
      // Check if this code already exists
      const existing = await Staff.findOne({ access_code: accessCode });
      if (!existing) {
        isUnique = true;
      }
    }
    
    // Create staff (password will be hashed by pre-save hook)
    const staff = new Staff({
      username,
      password,
      email,
      first_name,
      last_name,
      middle_name,
      phone,
      role: roleDoc.name.toLowerCase(),
      department,
      specialization,
      license_number,
      salary: parseFloat(salary) || 0,
      hire_date: hire_date || new Date(),
      status: 'active',
      access_code: accessCode,
      telegram_notifications_enabled: true
    });
    await staff.save();
    
    res.status(201).json({
      success: true,
      message: 'Xodim muvaffaqiyatli qo\'shildi',
      data: {
        id: staff._id,
        first_name: staff.first_name,
        last_name: staff.last_name,
        middle_name: staff.middle_name,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        department: staff.department,
        specialization: staff.specialization,
        license_number: staff.license_number,
        salary: staff.salary,
        hire_date: staff.hire_date,
        status: staff.status,
        access_code: accessCode
      }
    });
  } catch (error) {
    console.error('Create staff error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Foydalanuvchi nomi yoki email allaqachon mavjud'
      });
    }
    next(error);
  }
});

// Update staff
router.put('/:id', authenticate, authorize('admin', 'doctor'), async (req, res, next) => {
  try {
    const { first_name, last_name, middle_name, email, phone, department, specialization, license_number, salary, is_active } = req.body;
    
    const updateData = {};
    
    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    if (middle_name !== undefined) updateData.middle_name = middle_name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (department) updateData.department = department;
    if (specialization !== undefined) updateData.specialization = specialization;
    if (license_number !== undefined) updateData.license_number = license_number;
    if (salary !== undefined) updateData.salary = parseFloat(salary);
    if (is_active !== undefined) updateData.status = is_active ? 'active' : 'inactive';
    
    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).lean();
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Xodim topilmadi'
      });
    }
    
    res.json({
      success: true,
      message: 'Xodim yangilandi',
      data: {
        id: staff._id,
        ...staff,
        user_active: staff.status === 'active'
      }
    });
  } catch (error) {
    console.error('Update staff error:', error);
    next(error);
  }
});

// Delete staff
router.delete('/:id', authenticate, authorize('admin', 'doctor'), async (req, res, next) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Xodim topilmadi'
      });
    }
    
    res.json({
      success: true,
      message: 'Xodim o\'chirildi'
    });
  } catch (error) {
    console.error('Delete staff error:', error);
    next(error);
  }
});

// Get roles list
router.get('/roles/list', authenticate, async (req, res, next) => {
  try {
    const roles = await Role.find({ is_active: true })
      .sort({ name: 1 })
      .lean();
    
    res.json({
      success: true,
      data: roles.map(r => ({
        id: r._id,
        name: r.name,
        display_name: r.display_name,
        description: r.description
      }))
    });
  } catch (error) {
    console.error('Get roles error:', error);
    next(error);
  }
});

export default router;


/**
 * Get my today stats (for masseur, speech therapist, etc.)
 * GET /api/v1/staff/my-stats/today
 */
router.get('/my-stats/today', authenticate, async (req, res) => {
  try {
    const staffId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Import models dynamically to avoid circular dependencies
    const Invoice = (await import('../models/Invoice.js')).default;
    const Attendance = (await import('../models/Attendance.js')).default;

    // Get today's invoices for this staff
    const invoices = await Invoice.find({
      doctor: staffId,
      created_at: {
        $gte: today,
        $lt: tomorrow
      }
    });

    const patients = invoices.length;
    const revenue = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);

    // Get today's attendance
    const attendance = await Attendance.findOne({
      staff: staffId,
      check_in: {
        $gte: today,
        $lt: tomorrow
      }
    });

    const workDuration = attendance?.work_duration || 0;

    res.json({
      success: true,
      data: {
        patients,
        revenue,
        workDuration
      }
    });
  } catch (error) {
    console.error('Get my stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Statistikani olishda xatolik',
      error: error.message
    });
  }
});
