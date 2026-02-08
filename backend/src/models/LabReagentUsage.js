import mongoose from 'mongoose';

const labReagentUsageSchema = new mongoose.Schema({
  reagent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabReagent',
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  lab_order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabOrder'
  },
  test_name: {
    type: String,
    required: true,
    trim: true
  },
  quantity_used: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  cost_per_test: {
    type: Number,
    required: true,
    min: 0
  },
  total_cost: {
    type: Number,
    required: true,
    min: 0
  },
  used_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexlar
labReagentUsageSchema.index({ reagent: 1, createdAt: -1 });
labReagentUsageSchema.index({ patient: 1 });
labReagentUsageSchema.index({ lab_order: 1 });
labReagentUsageSchema.index({ used_by: 1 });

// Total cost'ni avtomatik hisoblash
labReagentUsageSchema.pre('save', function() {
  this.total_cost = this.cost_per_test * this.quantity_used;
});

const LabReagentUsage = mongoose.model('LabReagentUsage', labReagentUsageSchema);

export default LabReagentUsage;
