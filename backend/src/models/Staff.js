import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const staffSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true
  },
  phone: {
    type: String,
    trim: true
  },
  first_name: {
    type: String,
    required: true,
    trim: true
  },
  last_name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    enum: ['admin', 'doctor', 'nurse', 'laborant', 'pharmacist', 'sanitar', 'receptionist', 'masseur', 'speech_therapist', 'chief_doctor'],
    lowercase: true
  },
  specialization: {
    type: String,
    trim: true
  },
  license_number: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  shift: {
    type: String,
    enum: ['morning', 'evening', 'night', 'rotating'],
    default: 'morning'
  },
  salary: {
    type: Number,
    default: 0
  },
  commission_rate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  hire_date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on_leave', 'terminated'],
    default: 'active'
  },
  two_factor_enabled: {
    type: Boolean,
    default: false
  },
  two_factor_secret: {
    type: String
  },
  last_login: {
    type: Date
  },
  refresh_token: {
    type: String
  },
  profile_image: {
    type: String
  },
  address: {
    type: String
  },
  emergency_contact: {
    name: String,
    phone: String,
    relationship: String
  },
  notes: {
    type: String
  },
  // Telegram bot integratsiyasi
  access_code: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  telegram_chat_id: {
    type: String,
    sparse: true
  },
  telegram_username: {
    type: String
  },
  telegram_notifications_enabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.two_factor_secret;
      delete ret.refresh_token;
      return ret;
    }
  }
});

// Index'lar
staffSchema.index({ role: 1 });
staffSchema.index({ status: 1 });
staffSchema.index({ department: 1 });

// Password hash qilish
staffSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Password tekshirish
staffSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Full name
staffSchema.virtual('full_name').get(function() {
  return `${this.first_name} ${this.last_name}`;
});

const Staff = mongoose.model('Staff', staffSchema);

export default Staff;
