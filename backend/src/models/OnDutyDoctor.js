import mongoose from 'mongoose';

const onDutyDoctorSchema = new mongoose.Schema({
  doctor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  shift_date: {
    type: Date,
    required: true
  },
  shift_type: {
    type: String,
    enum: ['morning', 'evening', 'night', 'full_day'],
    required: true
  },
  start_time: {
    type: String, // Format: "09:00"
    required: true
  },
  end_time: {
    type: String, // Format: "18:00"
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  notes: {
    type: String
  },
  assigned_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  }
}, {
  timestamps: true
});

// Indexes
onDutyDoctorSchema.index({ shift_date: 1, shift_type: 1 });
onDutyDoctorSchema.index({ doctor_id: 1, shift_date: 1 });
onDutyDoctorSchema.index({ status: 1 });

const OnDutyDoctor = mongoose.model('OnDutyDoctor', onDutyDoctorSchema, 'on_duty_doctors');

export default OnDutyDoctor;
