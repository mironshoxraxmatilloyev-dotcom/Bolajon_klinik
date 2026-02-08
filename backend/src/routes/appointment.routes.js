import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Patient from '../models/Patient.js';
import Invoice from '../models/Invoice.js';

const router = express.Router();

// GET /api/v1/appointments/patient/:patientId - Bemorga biriktirilgan mutaxasislar
router.get('/patient/:patientId', authenticate, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    console.log('=== GET SPECIALISTS FOR PATIENT ===');
    console.log('Patient ID:', patientId);
    
    // Avval barcha invoice'larni tekshirish
    const allInvoices = await Invoice.find({ patient_id: patientId }).lean();
    console.log('All invoices for patient:', allInvoices.length);
    console.log('All invoices:', JSON.stringify(allInvoices, null, 2));
    
    // Invoice'lardan mutaxasis konsultatsiyalarini topish
    const invoices = await Invoice.find({
      patient_id: patientId,
      'metadata.specialist_type': { $exists: true }
    }).sort({ createdAt: -1 }).lean();
    
    console.log('Found specialist invoices:', invoices.length);
    console.log('Specialist invoices:', JSON.stringify(invoices, null, 2));
    
    // Specialist type'ni o'zbekchaga tarjima qilish
    const specialistTypeMap = {
      'therapist': 'Terapevt',
      'surgeon': 'Xirurg',
      'cardiologist': 'Kardiolog',
      'neurologist': 'Nevrolog',
      'pediatrician': 'Pediatr',
      'gynecologist': 'Ginekolog',
      'orthopedist': 'Ortoped',
      'dermatologist': 'Dermatolog',
      'ophthalmologist': 'Oftalmolog',
      'ent': 'LOR'
    };
    
    const specialists = invoices.map(invoice => ({
      id: invoice._id,
      doctor_name: invoice.metadata.doctor_name,
      specialist_type: invoice.metadata.specialist_type,
      specialist_type_label: specialistTypeMap[invoice.metadata.specialist_type] || invoice.metadata.specialist_type,
      appointment_time: invoice.metadata.appointment_time,
      price: invoice.total_amount,
      notes: invoice.items[0]?.notes || '',
      status: invoice.status === 'paid' ? 'completed' : 'scheduled',
      created_at: invoice.createdAt
    }));
    
    console.log('Mapped specialists:', specialists);
    
    res.json({
      success: true,
      data: specialists
    });
    
  } catch (error) {
    console.error('Get specialists error:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
});

// POST /api/v1/appointments/specialist - Mutaxasis biriktirish
router.post('/specialist', authenticate, async (req, res) => {
  try {
    const {
      patient_id,
      doctor_name,
      specialist_type,
      appointment_time,
      price,
      notes,
      admission_id
    } = req.body;
    
    // Validation
    if (!patient_id || !doctor_name || !specialist_type || !appointment_time || !price) {
      return res.status(400).json({
        success: false,
        message: 'Barcha majburiy maydonlarni to\'ldiring'
      });
    }
    
    // Specialist type'ni o'zbekchaga tarjima qilish
    const specialistTypeMap = {
      'therapist': 'Terapevt',
      'surgeon': 'Xirurg',
      'cardiologist': 'Kardiolog',
      'neurologist': 'Nevrolog',
      'pediatrician': 'Pediatr',
      'gynecologist': 'Ginekolog',
      'orthopedist': 'Ortoped',
      'dermatologist': 'Dermatolog',
      'ophthalmologist': 'Oftalmolog',
      'ent': 'LOR'
    };
    
    const specialistLabel = specialistTypeMap[specialist_type] || specialist_type;
    
    // 1. Invoice yaratish
    const invoiceNumber = `INV-${Date.now()}`;
    
    // Metadata obyektini alohida yaratish
    const invoiceMetadata = {
      specialist_type,
      doctor_name,
      appointment_time,
      admission_id
    };
    
    console.log('Creating invoice with metadata:', invoiceMetadata);
    
    const invoice = new Invoice({
      patient_id,
      invoice_number: invoiceNumber,
      items: [{
        item_type: 'consultation',
        description: `${specialistLabel} konsultatsiyasi - ${doctor_name}`,
        quantity: 1,
        unit_price: parseFloat(price),
        total_price: parseFloat(price),
        notes: notes || ''
      }],
      total_amount: parseFloat(price),
      paid_amount: 0,
      balance: parseFloat(price),
      status: 'pending',
      payment_method: null,
      created_by: req.user.id,
      metadata: invoiceMetadata
    });
    
    await invoice.save();
    console.log('Invoice created:', invoice._id);
    console.log('Invoice metadata after save:', invoice.metadata);
    console.log('Invoice full object:', JSON.stringify(invoice.toObject(), null, 2));
    
    // 2. Patient balance yangilash (qarz qo'shish)
    const patient = await Patient.findById(patient_id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Bemor topilmadi'
      });
    }
    
    patient.current_balance = (patient.current_balance || 0) - parseFloat(price);
    await patient.save();
    
    res.json({
      success: true,
      data: {
        appointment: {
          id: invoice._id.toString(),
          patient_id,
          doctor_name,
          specialist_type,
          appointment_time,
          price,
          notes,
          admission_id,
          status: 'scheduled',
          created_at: invoice.createdAt
        },
        invoice: {
          id: invoice._id.toString(),
          invoice_number: invoice.invoice_number,
          total_amount: invoice.total_amount,
          paid_amount: invoice.paid_amount,
          balance: invoice.balance,
          status: invoice.status,
          created_at: invoice.createdAt
        },
        patient: {
          current_balance: patient.current_balance
        }
      },
      message: 'Mutaxasis muvaffaqiyatli biriktirildi va hisob-faktura yaratildi'
    });
    
  } catch (error) {
    console.error('Assign specialist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
});

export default router;
