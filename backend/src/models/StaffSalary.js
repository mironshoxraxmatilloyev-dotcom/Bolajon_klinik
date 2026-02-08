import mongoose from 'mongoose';

const staffSalarySchema = new mongoose.Schema({
  staff_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
    unique: true
  },
  // Asosiy maosh (faqat admin uchun)
  base_salary: {
    type: Number,
    default: 0
  },
  // Oylik ish soatlari
  work_hours_per_month: {
    type: Number,
    default: 160, // Default: 8 soat * 20 ish kuni
    min: 0
  },
  // Kunlik ish vaqti
  work_start_time: {
    type: String, // Format: "09:00"
    default: "09:00"
  },
  work_end_time: {
    type: String, // Format: "18:00"
    default: "18:00"
  },
  // Haftada necha kun ishlaydi
  work_days_per_week: {
    type: Number,
    default: 5,
    min: 1,
    max: 7
  },
  // Lavozim bonusi
  position_bonus: {
    type: Number,
    default: 0
  },
  // Tajriba bonusi
  experience_bonus: {
    type: Number,
    default: 0
  },
  // Komissiya foizi (shifokor, hamshira, laborant uchun)
  commission_rate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Bosh shifokor uchun statsionar foizi (maksimal 50%)
  inpatient_percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 50
  },
  // Xona tozalash narxi (faqat sanitar uchun)
  room_cleaning_rate: {
    type: Number,
    default: 0
  },
  // Hisoblash turi
  calculation_type: {
    type: String,
    enum: ['fixed', 'commission', 'per_room'],
    default: 'fixed'
  },
  effective_from: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
staffSalarySchema.index({ staff_id: 1 });
staffSalarySchema.index({ effective_from: -1 });

const StaffSalary = mongoose.model('StaffSalary', staffSalarySchema, 'staff_salaries');

export default StaffSalary;
