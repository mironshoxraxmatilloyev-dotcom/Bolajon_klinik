import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: false,
    enum: ['Maosh', 'Kommunal xizmatlar', 'Dori-darmonlar', 'Jihozlar', 'Ta\'mirlash', 'Transport', 'Boshqa'],
    default: 'Boshqa'
  },
  description: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  payment_method: {
    type: String,
    enum: ['Naqd', 'Karta', 'Bank o\'tkazmasi'],
    default: null
  },
  receipt_number: {
    type: String,
    trim: true,
    default: null
  }
}, {
  timestamps: true
});

// Indexlar
expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ created_by: 1 });

const Expense = mongoose.model('Expense', expenseSchema);

export default Expense;
