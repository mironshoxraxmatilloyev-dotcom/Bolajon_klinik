import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  check_in: {
    type: Date,
    required: true,
    default: Date.now
  },
  check_out: {
    type: Date
  },
  work_duration: {
    type: Number, // minutes
    default: 0
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['present', 'late', 'absent', 'half_day'],
    default: 'present'
  }
}, {
  timestamps: true
});

// Indexlar
attendanceSchema.index({ staff: 1, check_in: -1 });
attendanceSchema.index({ check_in: -1 });

// Check out qilganda ish vaqtini hisoblash
attendanceSchema.pre('save', function() {
  if (this.check_out && this.check_in) {
    const duration = Math.floor((this.check_out - this.check_in) / (1000 * 60)); // minutes
    this.work_duration = duration;
  }
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
