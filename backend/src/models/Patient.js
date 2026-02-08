import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const patientSchema = new mongoose.Schema({
  patient_number: {
    type: String,
    unique: true,
    sparse: true
  },
  access_code: {
    type: String,
    unique: true,
    sparse: true
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    minlength: 6
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
  date_of_birth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true
  },
  address: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  passport_number: {
    type: String,
    trim: true
  },
  blood_type: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  allergies: [{
    type: String
  }],
  chronic_conditions: [{
    type: String
  }],
  emergency_contact: {
    name: String,
    phone: String,
    relationship: String
  },
  insurance_number: {
    type: String,
    trim: true
  },
  insurance_provider: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'deceased'],
    default: 'active'
  },
  registration_date: {
    type: Date,
    default: Date.now
  },
  last_visit: {
    type: Date
  },
  last_visit_date: {
    type: Date
  },
  total_debt: {
    type: Number,
    default: 0
  },
  debt_limit: {
    type: Number,
    default: 500000
  },
  notes: {
    type: String
  },
  profile_image: {
    type: String
  },
  telegram_chat_id: {
    type: String
  },
  refresh_token: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.refresh_token;
      return ret;
    }
  }
});

// Index'lar
patientSchema.index({ phone: 1 });
patientSchema.index({ status: 1 });

// Auto-increment patient_number
patientSchema.pre('save', async function() {
  if (!this.isNew || this.patient_number) {
    return;
  }
  
  const lastPatient = await mongoose.model('Patient').findOne().sort({ patient_number: -1 });
  
  if (lastPatient && lastPatient.patient_number) {
    const lastNumber = parseInt(lastPatient.patient_number.replace('P', ''));
    this.patient_number = `P${String(lastNumber + 1).padStart(6, '0')}`;
  } else {
    this.patient_number = 'P000001';
  }
});

// Auto-generate 8-digit access code
patientSchema.pre('save', async function() {
  if (!this.isNew || this.access_code) {
    return;
  }
  
  // Generate unique 8-digit code
  let code;
  let isUnique = false;
  
  while (!isUnique) {
    code = Math.floor(10000000 + Math.random() * 90000000).toString();
    const existing = await mongoose.model('Patient').findOne({ access_code: code });
    if (!existing) {
      isUnique = true;
    }
  }
  
  this.access_code = code;
});

// Password hash qilish
patientSchema.pre('save', async function() {
  if (!this.isModified('password') || !this.password) {
    return;
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Password tekshirish
patientSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

// Full name
patientSchema.virtual('full_name').get(function() {
  return `${this.first_name} ${this.last_name}`;
});

// Age calculation
patientSchema.virtual('age').get(function() {
  if (!this.date_of_birth) return null;
  const today = new Date();
  const birthDate = new Date(this.date_of_birth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

const Patient = mongoose.model('Patient', patientSchema);

export default Patient;
