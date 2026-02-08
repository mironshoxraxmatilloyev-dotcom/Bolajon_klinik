import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import Settings from '../models/Settings.js';

const router = express.Router();

/**
 * Get bonus settings
 * GET /api/v1/settings/bonus
 */
router.get('/bonus', authenticate, authorize('admin'), async (req, res) => {
  try {
    const bonusEnabled = await Settings.findOne({ key: 'bonus_enabled' });
    const bonusAmount = await Settings.findOne({ key: 'bonus_amount' });

    res.json({
      success: true,
      data: {
        enabled: bonusEnabled?.value || false,
        amount: bonusAmount?.value || 0
      }
    });
  } catch (error) {
    console.error('Get bonus settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * Update bonus settings
 * PUT /api/v1/settings/bonus
 */
router.put('/bonus', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { enabled, amount } = req.body;

    // Update or create bonus_enabled setting
    await Settings.findOneAndUpdate(
      { key: 'bonus_enabled' },
      {
        key: 'bonus_enabled',
        value: enabled,
        description: 'Bonus berish yoqilgan/o\'chirilgan',
        updated_by: req.user.id
      },
      { upsert: true, new: true }
    );

    // Update or create bonus_amount setting
    await Settings.findOneAndUpdate(
      { key: 'bonus_amount' },
      {
        key: 'bonus_amount',
        value: amount,
        description: 'Oylik bonus summasi',
        updated_by: req.user.id
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Bonus sozlamalari yangilandi',
      data: {
        enabled,
        amount
      }
    });
  } catch (error) {
    console.error('Update bonus settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * Manually trigger monthly bonus distribution
 * POST /api/v1/settings/bonus/distribute
 */
router.post('/bonus/distribute', authenticate, authorize('admin'), async (req, res) => {
  try {
    const bonusEnabled = await Settings.findOne({ key: 'bonus_enabled' });
    const bonusAmount = await Settings.findOne({ key: 'bonus_amount' });

    if (!bonusEnabled?.value) {
      return res.status(400).json({
        success: false,
        error: 'Bonus berish o\'chirilgan'
      });
    }

    const amount = bonusAmount?.value || 0;
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Bonus summasi noto\'g\'ri'
      });
    }

    // Import models
    const Staff = (await import('../models/Staff.js')).default;
    const Penalty = (await import('../models/Penalty.js')).default;
    const Bonus = (await import('../models/Bonus.js')).default;

    // Get current month
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get all active staff
    const allStaff = await Staff.find({ status: 'active' });

    // Get staff with penalties this month
    const staffWithPenalties = await Penalty.distinct('staff_id', {
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    // Filter staff without penalties
    const eligibleStaff = allStaff.filter(staff => 
      !staffWithPenalties.some(penaltyStaffId => 
        penaltyStaffId.toString() === staff._id.toString()
      )
    );

    // Create bonuses
    const bonuses = [];
    for (const staff of eligibleStaff) {
      const bonus = await Bonus.create({
        staff_id: staff._id,
        amount: amount,
        reason: 'Oylik avtomatik bonus (jarimasi yo\'q)',
        bonus_type: 'other',
        month: currentMonth,
        year: currentYear,
        approved_by: req.user.id,
        status: 'approved'
      });
      bonuses.push(bonus);
    }

    res.json({
      success: true,
      message: `${bonuses.length} ta xodimga bonus berildi`,
      data: {
        total_staff: allStaff.length,
        staff_with_penalties: staffWithPenalties.length,
        bonuses_given: bonuses.length,
        bonus_amount: amount
      }
    });
  } catch (error) {
    console.error('Distribute bonus error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

export default router;
