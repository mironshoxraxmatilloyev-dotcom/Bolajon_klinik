import mongoose from 'mongoose';

const cashierReportSchema = new mongoose.Schema({
  staff_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  check_in_time: {
    type: Date,
    required: true
  },
  check_out_time: {
    type: Date,
    required: true
  },
  work_duration: {
    type: Number, // minutes
    required: true
  },
  // Invoice statistics
  total_invoices: {
    type: Number,
    default: 0
  },
  paid_invoices: {
    type: Number,
    default: 0
  },
  unpaid_invoices: {
    type: Number,
    default: 0
  },
  partial_invoices: {
    type: Number,
    default: 0
  },
  // Financial statistics
  total_amount: {
    type: Number,
    default: 0
  },
  paid_amount: {
    type: Number,
    default: 0
  },
  unpaid_amount: {
    type: Number,
    default: 0
  },
  // Invoice details
  invoices: [{
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice'
    },
    invoice_number: String,
    patient_name: String,
    total_amount: Number,
    paid_amount: Number,
    payment_status: String,
    created_at: Date
  }],
  notes: {
    type: String
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
cashierReportSchema.index({ staff_id: 1, date: -1 });
cashierReportSchema.index({ date: -1 });

const CashierReport = mongoose.model('CashierReport', cashierReportSchema, 'cashier_reports');

export default CashierReport;
