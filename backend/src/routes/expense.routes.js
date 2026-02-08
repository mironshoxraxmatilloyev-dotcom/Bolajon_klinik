import express from 'express';
import Expense from '../models/Expense.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Barcha xarajatlarni olish (filtrlash bilan)
router.get('/', authenticate, authorize('Admin', 'Administrator'), async (req, res) => {
  try {
    console.log('=== GET EXPENSES ===');
    console.log('User:', req.user);
    
    const { 
      start_date, 
      end_date, 
      category,
      month, // YYYY-MM format
      year,  // YYYY format
      limit = 50,
      skip = 0
    } = req.query;

    const filter = {};

    // Sana filtri
    if (start_date || end_date) {
      filter.date = {};
      if (start_date) filter.date.$gte = new Date(start_date);
      if (end_date) filter.date.$lte = new Date(end_date);
    }

    // Oy filtri (YYYY-MM)
    if (month) {
      const [y, m] = month.split('-');
      const startOfMonth = new Date(y, m - 1, 1);
      const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);
      filter.date = { $gte: startOfMonth, $lte: endOfMonth };
    }

    // Yil filtri (YYYY)
    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
      filter.date = { $gte: startOfYear, $lte: endOfYear };
    }

    // Kategoriya filtri
    if (category && category !== 'all') {
      filter.category = category;
    }

    const expenses = await Expense.find(filter)
      .populate('created_by', 'full_name username')
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Expense.countDocuments(filter);

    res.json({
      success: true,
      data: expenses,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Xarajatlarni yuklashda xatolik',
      error: error.message
    });
  }
});

// Statistika olish
router.get('/stats', authenticate, authorize('Admin', 'Administrator'), async (req, res) => {
  try {
    console.log('=== GET EXPENSE STATS ===');
    console.log('User:', req.user);
    
    const { month, year } = req.query;

    // Umumiy xarajat
    const totalExpense = await Expense.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Oylik xarajat
    let monthlyFilter = {};
    if (month) {
      const [y, m] = month.split('-');
      const startOfMonth = new Date(y, m - 1, 1);
      const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);
      monthlyFilter = { date: { $gte: startOfMonth, $lte: endOfMonth } };
    } else {
      // Joriy oy
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      monthlyFilter = { date: { $gte: startOfMonth, $lte: endOfMonth } };
    }

    const monthlyExpense = await Expense.aggregate([
      { $match: monthlyFilter },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Yillik xarajat
    let yearlyFilter = {};
    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
      yearlyFilter = { date: { $gte: startOfYear, $lte: endOfYear } };
    } else {
      // Joriy yil
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      yearlyFilter = { date: { $gte: startOfYear, $lte: endOfYear } };
    }

    const yearlyExpense = await Expense.aggregate([
      { $match: yearlyFilter },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Kategoriya bo'yicha xarajatlar
    const expensesByCategory = await Expense.aggregate([
      { $match: monthlyFilter },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        total_expense: totalExpense[0]?.total || 0,
        monthly_expense: monthlyExpense[0]?.total || 0,
        yearly_expense: yearlyExpense[0]?.total || 0,
        by_category: expensesByCategory
      }
    });
  } catch (error) {
    console.error('Get expense stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Statistikani yuklashda xatolik',
      error: error.message
    });
  }
});

// Yangi xarajat qo'shish
router.post('/', authenticate, authorize('Admin', 'Administrator'), async (req, res) => {
  try {
    const { title, amount, category, description, date, payment_method, receipt_number } = req.body;

    if (!title || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Sarlavha va summa majburiy'
      });
    }

    const expense = new Expense({
      title,
      amount: parseFloat(amount),
      category: category || 'Boshqa',
      description,
      date: date ? new Date(date) : new Date(),
      created_by: req.user.id,
      payment_method: payment_method || null,
      receipt_number: receipt_number || null
    });

    await expense.save();

    const populatedExpense = await Expense.findById(expense._id)
      .populate('created_by', 'full_name username');

    res.status(201).json({
      success: true,
      message: 'Xarajat muvaffaqiyatli qo\'shildi',
      data: populatedExpense
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Xarajat qo\'shishda xatolik',
      error: error.message
    });
  }
});

// Xarajatni tahrirlash
router.put('/:id', authenticate, authorize('Admin', 'Administrator'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, category, description, date, payment_method, receipt_number } = req.body;

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Xarajat topilmadi'
      });
    }

    if (title) expense.title = title;
    if (amount) expense.amount = parseFloat(amount);
    if (category) expense.category = category;
    if (description !== undefined) expense.description = description;
    if (date) expense.date = new Date(date);
    if (payment_method) expense.payment_method = payment_method;
    if (receipt_number !== undefined) expense.receipt_number = receipt_number;

    await expense.save();

    const populatedExpense = await Expense.findById(expense._id)
      .populate('created_by', 'full_name username');

    res.json({
      success: true,
      message: 'Xarajat muvaffaqiyatli yangilandi',
      data: populatedExpense
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Xarajatni yangilashda xatolik',
      error: error.message
    });
  }
});

// Xarajatni o'chirish
router.delete('/:id', authenticate, authorize('Admin', 'Administrator'), async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Xarajat topilmadi'
      });
    }

    await expense.deleteOne();

    res.json({
      success: true,
      message: 'Xarajat muvaffaqiyatli o\'chirildi'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Xarajatni o\'chirishda xatolik',
      error: error.message
    });
  }
});

export default router;
