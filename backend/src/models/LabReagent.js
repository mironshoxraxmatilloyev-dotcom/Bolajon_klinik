import mongoose from 'mongoose';

const labReagentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  country_of_origin: {
    type: String,
    trim: true
  },
  expiry_date: {
    type: Date,
    required: true
  },
  total_tests: {
    type: Number,
    required: true,
    min: 1
  },
  remaining_tests: {
    type: Number,
    required: true,
    min: 0
  },
  total_price: {
    type: Number,
    required: true,
    min: 0
  },
  price_per_test: {
    type: Number,
    required: true,
    min: 0
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'low_stock', 'expired', 'depleted'],
    default: 'active'
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  }
}, {
  timestamps: true
});

// Indexlar
labReagentSchema.index({ name: 1 });
labReagentSchema.index({ status: 1 });
labReagentSchema.index({ expiry_date: 1 });

// Status'ni avtomatik yangilash
labReagentSchema.pre('save', function() {
  const now = new Date();
  
  if (this.remaining_tests === 0) {
    this.status = 'depleted';
  } else if (this.expiry_date < now) {
    this.status = 'expired';
  } else if (this.remaining_tests <= this.total_tests * 0.2) {
    this.status = 'low_stock';
  } else {
    this.status = 'active';
  }
});

const LabReagent = mongoose.model('LabReagent', labReagentSchema);

export default LabReagent;
