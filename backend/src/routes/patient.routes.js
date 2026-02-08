import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import Patient from '../models/Patient.js';

const router = express.Router();

/**
 * Search patients - simple endpoint for quick search
 */
router.get('/search',
  authenticate,
  async (req, res, next) => {
    try {
      const { q = '', limit = 100 } = req.query;
      
      let query = { status: 'active' };
      
      // Search filter
      if (q && q.trim()) {
        const searchRegex = new RegExp(q.trim(), 'i');
        query.$or = [
          { first_name: searchRegex },
          { last_name: searchRegex },
          { middle_name: searchRegex },
          { phone: searchRegex },
          { patient_number: searchRegex }
        ];
      }
      
      const patients = await Patient.find(query)
        .select('patient_number first_name last_name middle_name phone date_of_birth gender total_debt status createdAt registration_date last_visit_date')
        .limit(parseInt(limit))
        .sort({ createdAt: -1 })
        .lean();
      
      const formattedPatients = patients.map(patient => ({
        id: patient._id,
        patient_number: patient.patient_number,
        first_name: patient.first_name,
        last_name: patient.last_name,
        middle_name: patient.middle_name || '',
        phone: patient.phone,
        birth_date: patient.date_of_birth,
        gender: patient.gender,
        current_balance: patient.total_debt || 0,
        is_blocked: patient.status !== 'active',
        created_at: patient.createdAt || patient.registration_date,
        last_visit_date: patient.last_visit_date
      }));
      
      res.json({
        success: true,
        data: formattedPatients
      });
    } catch (error) {
      console.error('Search patients error:', error);
      next(error);
    }
  }
);

/**
 * Get all patients with pagination
 */
router.get('/',
  authenticate,
  async (req, res, next) => {
    try {
      const { page = 1, limit = 20, search = '' } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      let query = { status: 'active' };
      
      // Search filter
      if (search) {
        // Check if search is exact patient_number match first
        const exactMatch = await Patient.findOne({ 
          patient_number: search.toUpperCase(),
          status: 'active'
        }).select('-password -refresh_token').lean();
        
        if (exactMatch) {
          // If exact match found, return only that patient
          const formattedPatient = {
            id: exactMatch._id,
            patient_number: exactMatch.patient_number,
            first_name: exactMatch.first_name,
            last_name: exactMatch.last_name,
            middle_name: exactMatch.middle_name || '',
            phone: exactMatch.phone,
            birth_date: exactMatch.date_of_birth,
            gender: exactMatch.gender,
            current_balance: exactMatch.total_debt || 0,
            is_blocked: exactMatch.status !== 'active',
            created_at: exactMatch.createdAt || exactMatch.registration_date
          };
          
          return res.json({
            success: true,
            data: [formattedPatient],
            pagination: {
              page: 1,
              limit: parseInt(limit),
              total: 1,
              totalPages: 1
            }
          });
        }
        
        // Otherwise, do fuzzy search
        query.$or = [
          { first_name: { $regex: search, $options: 'i' } },
          { last_name: { $regex: search, $options: 'i' } },
          { patient_number: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Get patients
      const patients = await Patient.find(query)
        .select('-password -refresh_token')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean();
      
      // Get total count
      const total = await Patient.countDocuments(query);
      
      // Format response
      const formattedPatients = patients.map(p => ({
        id: p._id,
        patient_number: p.patient_number,
        access_code: p.access_code, // 8-xonali Telegram kod
        first_name: p.first_name,
        last_name: p.last_name,
        middle_name: p.middle_name || '',
        phone: p.phone,
        birth_date: p.date_of_birth,
        gender: p.gender,
        current_balance: p.total_debt || 0,
        is_blocked: p.status !== 'active',
        telegram_username: p.telegram_username,
        created_at: p.createdAt || p.registration_date
      }));
      
      res.json({
        success: true,
        data: formattedPatients,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Get patients error:', error);
      next(error);
    }
  }
);

/**
 * Get patient by ID with full profile data
 */
router.get('/:id',
  authenticate,
  async (req, res, next) => {
    try {
      const patient = await Patient.findById(req.params.id)
        .select('-password -refresh_token')
        .lean();
      
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Bemor topilmadi'
        });
      }
      
      // Load related data
      const Admission = (await import('../models/Admission.js')).default;
      const AmbulatorRoom = (await import('../models/AmbulatorRoom.js')).default;
      const Bed = (await import('../models/Bed.js')).default;
      const Staff = (await import('../models/Staff.js')).default;
      const Invoice = (await import('../models/Invoice.js')).default;
      const Prescription = (await import('../models/Prescription.js')).default;
      const LabOrder = (await import('../models/LabOrder.js')).default;
      
      // Get admissions with room, bed, doctor, and nurse info
      const admissions = await Admission.find({ patient_id: patient._id })
        .populate('room_id', 'room_number room_name floor')
        .populate('admitted_by', 'first_name last_name role')
        .sort({ admission_date: -1 })
        .lean();
      
      // Format admissions with nurse info
      const formattedAdmissions = await Promise.all(admissions.map(async (admission) => {
        // Get bed info
        const bed = await Bed.findOne({ 
          room_id: admission.room_id?._id, 
          bed_number: admission.bed_number 
        }).lean();
        
        // Get assigned nurse for this admission
        const PatientNurse = (await import('../models/PatientNurse.js')).default;
        const nurseAssignment = await PatientNurse.findOne({
          patient_id: patient._id,
          admission_id: admission._id,
          status: 'active'
        }).populate('nurse_id', 'first_name last_name phone').lean();
        
        return {
          id: admission._id,
          room_number: admission.room_id?.room_number || 'N/A',
          room_name: admission.room_id?.room_name || '',
          floor_number: admission.room_id?.floor || 1,
          bed_number: admission.bed_number,
          bed_id: bed?._id,
          bed_status: bed?.status,
          admission_date: admission.admission_date,
          discharge_date: admission.discharge_date,
          status: admission.status,
          display_status: admission.status === 'active' ? 'ACTIVE' : 
                         admission.status === 'discharged' ? 'DISCHARGED' : 
                         admission.status.toUpperCase(),
          diagnosis: admission.diagnosis,
          notes: admission.notes,
          doctor_first_name: admission.admitted_by?.first_name,
          doctor_last_name: admission.admitted_by?.last_name,
          // Nurse information
          nurse_id: nurseAssignment?.nurse_id?._id,
          nurse_first_name: nurseAssignment?.nurse_id?.first_name,
          nurse_last_name: nurseAssignment?.nurse_id?.last_name,
          nurse_phone: nurseAssignment?.nurse_id?.phone,
          nurse_assigned_at: nurseAssignment?.assigned_at
        };
      }));
      
      // Get invoices
      const invoices = await Invoice.find({ patient_id: patient._id })
        .sort({ created_at: -1 })
        .limit(10)
        .lean();
      
      // Get prescriptions
      const prescriptions = await Prescription.find({ patient_id: patient._id })
        .populate('doctor_id', 'first_name last_name')
        .sort({ created_at: -1 })
        .limit(10)
        .lean();
      
      // Get lab results
      const labResults = await LabOrder.find({ patient_id: patient._id })
        .populate('doctor_id', 'first_name last_name')
        .populate('laborant_id', 'first_name last_name')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
      
      // Format response
      const formattedPatient = {
        id: patient._id,
        patient_number: patient.patient_number,
        first_name: patient.first_name,
        last_name: patient.last_name,
        middle_name: patient.middle_name || '',
        phone: patient.phone,
        email: patient.email,
        birth_date: patient.date_of_birth,
        gender: patient.gender,
        address: patient.address,
        city: patient.city,
        passport_number: patient.passport_number,
        blood_type: patient.blood_type,
        allergies: patient.allergies || [],
        chronic_conditions: patient.chronic_conditions || [],
        emergency_contact: patient.emergency_contact,
        insurance_number: patient.insurance_number,
        insurance_provider: patient.insurance_provider,
        current_balance: patient.total_debt || 0,
        debt_limit: patient.debt_limit || 500000,
        is_blocked: patient.status !== 'active',
        status: patient.status,
        notes: patient.notes,
        created_at: patient.createdAt || patient.registration_date
      };
      
      res.json({
        success: true,
        data: {
          patient: formattedPatient,
          admissions: formattedAdmissions,
          invoices: invoices.map(inv => ({
            id: inv._id,
            invoice_number: inv.invoice_number,
            total_amount: inv.total_amount,
            paid_amount: inv.paid_amount,
            payment_status: inv.payment_status,
            description: inv.description,
            created_at: inv.created_at
          })),
          prescriptions: prescriptions.map(presc => ({
            id: presc._id,
            diagnosis: presc.diagnosis,
            prescription_type: presc.prescription_type,
            medications: presc.medications,
            notes: presc.notes,
            doctor_first_name: presc.doctor_id?.first_name,
            doctor_last_name: presc.doctor_id?.last_name,
            created_at: presc.created_at
          })),
          labResults: labResults.map(lab => ({
            result_id: lab._id,
            test_name: lab.test_name,
            test_code: lab.order_number,
            result_value: lab.results && lab.results.length > 0 ? lab.results[0].value : '',
            result_text: lab.notes || '',
            unit: lab.results && lab.results.length > 0 ? lab.results[0].unit : '',
            normal_value_min: '',
            normal_value_max: '',
            is_normal: lab.results && lab.results.length > 0 ? lab.results[0].is_normal : null,
            status: lab.status === 'completed' ? 'approved' : lab.status,
            result_date: lab.completed_at || lab.createdAt,
            technician_first_name: lab.laborant_id?.first_name,
            technician_last_name: lab.laborant_id?.last_name,
            approved_by_first_name: lab.doctor_id?.first_name,
            approved_by_last_name: lab.doctor_id?.last_name,
            approved_at: lab.completed_at
          })),
          medicalRecords: [] // Can be added later if needed
        }
      });
    } catch (error) {
      console.error('Get patient error:', error);
      next(error);
    }
  }
);

/**
 * Create new patient
 */
router.post('/',
  authenticate,
  authorize('admin', 'receptionist'),
  async (req, res, next) => {
    try {
      const {
        username,
        password,
        first_name,
        last_name,
        middle_name,
        phone,
        email,
        date_of_birth,
        gender,
        address,
        city,
        passport_number,
        blood_type,
        allergies,
        chronic_conditions,
        emergency_contact,
        insurance_number,
        insurance_provider,
        notes
      } = req.body;
      
      // Validate required fields
      if (!first_name || !last_name || !phone || !date_of_birth || !gender) {
        return res.status(400).json({
          success: false,
          message: 'Majburiy maydonlarni to\'ldiring'
        });
      }
      
      // Check if phone already exists
      const existingPatient = await Patient.findOne({ phone, status: 'active' });
      if (existingPatient) {
        return res.status(400).json({
          success: false,
          message: 'Bu telefon raqami allaqachon ro\'yxatdan o\'tgan'
        });
      }
      
      // Check if username already exists (if provided)
      if (username) {
        const existingUsername = await Patient.findOne({ username });
        if (existingUsername) {
          return res.status(400).json({
            success: false,
            message: 'Bu foydalanuvchi nomi allaqachon band'
          });
        }
      }
      
      // Create patient
      const patient = new Patient({
        username,
        password,
        first_name,
        last_name,
        middle_name,
        phone,
        email,
        date_of_birth: new Date(date_of_birth),
        gender,
        address,
        city,
        passport_number,
        blood_type,
        allergies: allergies || [],
        chronic_conditions: chronic_conditions || [],
        emergency_contact,
        insurance_number,
        insurance_provider,
        notes,
        status: 'active',
        registration_date: new Date()
      });
      
      await patient.save();
      
      res.status(201).json({
        success: true,
        message: 'Bemor muvaffaqiyatli qo\'shildi',
        data: {
          id: patient._id,
          patient_number: patient.patient_number,
          first_name: patient.first_name,
          last_name: patient.last_name,
          phone: patient.phone
        }
      });
    } catch (error) {
      console.error('Create patient error:', error);
      next(error);
    }
  }
);

/**
 * Update patient
 */
router.put('/:id',
  authenticate,
  authorize('admin', 'receptionist'),
  async (req, res, next) => {
    try {
      const patient = await Patient.findById(req.params.id);
      
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Bemor topilmadi'
        });
      }
      
      // Update fields
      const allowedFields = [
        'first_name', 'last_name', 'middle_name', 'phone', 'email',
        'date_of_birth', 'gender', 'address', 'city', 'passport_number',
        'blood_type', 'allergies', 'chronic_conditions', 'emergency_contact',
        'insurance_number', 'insurance_provider', 'notes', 'status'
      ];
      
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          patient[field] = req.body[field];
        }
      });
      
      await patient.save();
      
      res.json({
        success: true,
        message: 'Bemor ma\'lumotlari yangilandi',
        data: {
          id: patient._id,
          patient_number: patient.patient_number
        }
      });
    } catch (error) {
      console.error('Update patient error:', error);
      next(error);
    }
  }
);

/**
 * Delete patient (soft delete)
 */
router.delete('/:id',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const patient = await Patient.findById(req.params.id);
      
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Bemor topilmadi'
        });
      }
      
      patient.status = 'inactive';
      await patient.save();
      
      res.json({
        success: true,
        message: 'Bemor o\'chirildi'
      });
    } catch (error) {
      console.error('Delete patient error:', error);
      next(error);
    }
  }
);

export default router;
