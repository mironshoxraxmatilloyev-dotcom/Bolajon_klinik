import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  invoice_number: {
    type: String,
    required: true,
    unique: true
  },
  items: [{
    item_type: String,
    description: String,
    quantity: Number,
    unit_price: Number,
    total_price: Number,
    notes: String
  }],
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  paid_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  balance: {
    type: Number,
    default: 0
  },
  discount_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'cancelled'],
    default: 'pending'
  },
  payment_status: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'cancelled'],
    default: 'pending'
  },
  payment_method: {
    type: String,
    enum: ['cash', 'card', 'transfer'],
    default: null
  },
  notes: {
    type: String,
    trim: true
  },
  metadata: {
    specialist_type: String,
    doctor_name: String,
    doctor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    },
    appointment_time: Date,
    admission_id: mongoose.Schema.Types.ObjectId
  },
  qr_code: {
    type: String,
    default: null
  },
  qr_code_active: {
    type: Boolean,
    default: false
  },
  services: [{
    service_name: String,
    service_type: String,
    quantity: Number,
    price: Number
  }],
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
invoiceSchema.index({ patient_id: 1, created_at: -1 });
invoiceSchema.index({ payment_status: 1 });
invoiceSchema.index({ invoice_number: 1 });
invoiceSchema.index({ created_at: -1 });
invoiceSchema.index({ qr_code: 1 });
invoiceSchema.index({ qr_code_active: 1 });

const Invoice = mongoose.model('Invoice', invoiceSchema, 'billing');

export default Invoice;
