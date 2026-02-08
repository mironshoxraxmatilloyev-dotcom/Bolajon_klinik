import mongoose from 'mongoose';

const penaltySchema = new mongoose.Schema({
  staff_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  penalty_type: {
    type: String,
    enum: ['late', 'absence', 'violation', 'other'],
    default: 'other'
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  penalty_date: {
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
penaltySchema.index({ staff_id: 1, month: 1, year: 1 });
penaltySchema.index({ status: 1 });

const Penalty = mongoose.model('Penalty', penaltySchema, 'penalties');

export default Penalty;
