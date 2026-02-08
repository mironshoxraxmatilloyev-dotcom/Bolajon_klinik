import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import Task from '../models/Task.js';
import Staff from '../models/Staff.js';
import { sendTaskNotification } from '../services/telegramService.js';

const router = express.Router();

/**
 * Create new task (Admin only)
 */
router.post('/create',
  authenticate,
  authorize('admin', 'doctor'),
  async (req, res, next) => {
    try {
      const { title, description, taskType, priority, assignedTo, dueDate, locationDetails } = req.body;

      if (!title || !assignedTo) {
        return res.status(400).json({
          success: false,
          message: 'Sarlavha va xodim majburiy'
        });
      }

      if (!taskType || !priority) {
        return res.status(400).json({
          success: false,
          message: 'Turi va muhimlik majburiy'
        });
      }

      // Check if assigned staff exists
      const staff = await Staff.findById(assignedTo);
      if (!staff) {
        return res.status(404).json({
          success: false,
          message: 'Xodim topilmadi'
        });
      }

      const task = await Task.create({
        title,
        description,
        task_type: taskType,
        priority,
        assigned_to: assignedTo,
        created_by: req.user.id,
        due_date: dueDate || null,
        location_details: locationDetails
      });

      const populated = await Task.findById(task._id)
        .populate('assigned_to', 'first_name last_name role telegram_chat_id')
        .populate('created_by', 'first_name last_name')
        .lean();

      // Send Telegram notification to assigned staff
      console.log('=== SENDING TELEGRAM NOTIFICATION ===');
      console.log('Staff:', staff.first_name, staff.last_name);
      console.log('Telegram Chat ID:', staff.telegram_chat_id);
      console.log('Notifications enabled:', staff.telegram_notifications_enabled);
      
      if (staff.telegram_chat_id && staff.telegram_notifications_enabled !== false) {
        const creator = await Staff.findById(req.user.id).select('first_name last_name').lean();
        const result = await sendTaskNotification(staff, task, creator);
        console.log('📱 Telegram notification result:', result);
        
        if (result.success) {
          console.log('✅ Telegram notification sent successfully');
        } else {
          console.log('❌ Telegram notification failed:', result.error || result.message);
        }
      } else {
        console.log('⚠️ Staff has no Telegram chat ID or notifications disabled');
        console.log('   - telegram_chat_id:', staff.telegram_chat_id || 'MISSING');
        console.log('   - notifications_enabled:', staff.telegram_notifications_enabled);
      }

      res.json({
        success: true,
        message: 'Vazifa muvaffaqiyatli yaratildi',
        data: populated
      });
    } catch (error) {
      console.error('Create task error:', error);
      next(error);
    }
  }
);

/**
 * Get all tasks (Admin only)
 */
router.get('/all',
  authenticate,
  authorize('admin', 'doctor'),
  async (req, res, next) => {
    try {
      const { status } = req.query;

      const filter = {};
      if (status) {
        const statuses = status.split(',');
        filter.status = { $in: statuses };
      }

      const tasks = await Task.find(filter)
        .populate('assigned_to', 'first_name last_name role employee_id')
        .populate('created_by', 'first_name last_name')
        .sort({ created_at: -1 })
        .lean();

      // Format for frontend
      const formattedTasks = tasks.map(task => ({
        id: task._id,
        title: task.title,
        description: task.description,
        task_type: task.task_type,
        priority: task.priority,
        status: task.status,
        assigned_to: task.assigned_to?._id || null,
        first_name: task.assigned_to?.first_name || 'O\'chirilgan',
        last_name: task.assigned_to?.last_name || 'xodim',
        role: task.assigned_to?.role || 'unknown',
        employee_id: task.assigned_to?.employee_id || 'N/A',
        created_by: task.created_by?._id || null,
        creator_name: task.created_by ? `${task.created_by.first_name} ${task.created_by.last_name}` : 'O\'chirilgan xodim',
        due_date: task.due_date,
        location_details: task.location_details,
        started_at: task.started_at,
        completed_at: task.completed_at,
        verified_at: task.verified_at,
        completion_notes: task.completion_notes,
        verification_notes: task.verification_notes,
        rejection_reason: task.rejection_reason,
        created_at: task.created_at,
        updated_at: task.updated_at
      }));

      res.json({
        success: true,
        data: formattedTasks
      });
    } catch (error) {
      console.error('Get all tasks error:', error);
      next(error);
    }
  }
);

/**
 * Get my tasks (Staff)
 */
router.get('/my-tasks',
  authenticate,
  async (req, res, next) => {
    try {
      const tasks = await Task.find({
        assigned_to: req.user.id,
        status: { $in: ['pending', 'in_progress', 'completed'] }
      })
        .populate('created_by', 'first_name last_name username')
        .sort({ created_at: -1 })
        .lean();

      // Format for frontend
      const formattedTasks = tasks.map(task => ({
        id: task._id,
        title: task.title,
        description: task.description,
        task_type: task.task_type,
        priority: task.priority,
        status: task.status,
        creator_name: task.created_by ? `${task.created_by.first_name} ${task.created_by.last_name}` : 'O\'chirilgan xodim',
        assigned_by_username: task.created_by?.username || (task.created_by ? `${task.created_by.first_name} ${task.created_by.last_name}` : 'O\'chirilgan xodim'),
        due_date: task.due_date,
        location_details: task.location_details,
        started_at: task.started_at,
        completed_at: task.completed_at,
        completion_notes: task.completion_notes,
        rejection_reason: task.rejection_reason,
        created_at: task.created_at
      }));

      res.json({
        success: true,
        data: formattedTasks
      });
    } catch (error) {
      console.error('Get my tasks error:', error);
      next(error);
    }
  }
);

/**
 * Start task (Staff)
 */
router.put('/:id/start',
  authenticate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const task = await Task.findOne({
        _id: id,
        assigned_to: req.user.id
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Vazifa topilmadi yoki sizga tayinlanmagan'
        });
      }

      if (task.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Faqat yangi vazifalarni boshlash mumkin'
        });
      }

      task.status = 'in_progress';
      task.started_at = new Date();
      await task.save();

      res.json({
        success: true,
        message: 'Vazifa boshlandi',
        data: task
      });
    } catch (error) {
      console.error('Start task error:', error);
      next(error);
    }
  }
);

/**
 * Complete task (Staff)
 */
router.put('/:id/complete',
  authenticate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { completionNotes } = req.body;

      const task = await Task.findOne({
        _id: id,
        assigned_to: req.user.id
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Vazifa topilmadi yoki sizga tayinlanmagan'
        });
      }

      if (!['pending', 'in_progress'].includes(task.status)) {
        return res.status(400).json({
          success: false,
          message: 'Bu vazifani tugatish mumkin emas'
        });
      }

      task.status = 'completed';
      task.completed_at = new Date();
      task.completion_notes = completionNotes || '';
      // If task was never started, set started_at to now
      if (!task.started_at) {
        task.started_at = new Date();
      }
      await task.save();

      res.json({
        success: true,
        message: 'Vazifa tugatildi va tasdiqlashga yuborildi',
        data: task
      });
    } catch (error) {
      console.error('Complete task error:', error);
      next(error);
    }
  }
);

/**
 * Verify task (Admin only)
 */
router.put('/:id/verify',
  authenticate,
  authorize('admin', 'doctor'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { verificationNotes } = req.body;

      const task = await Task.findById(id);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Vazifa topilmadi'
        });
      }

      if (task.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Faqat tugatilgan vazifalarni tasdiqlash mumkin'
        });
      }

      task.status = 'verified';
      task.verified_at = new Date();
      task.verification_notes = verificationNotes || '';
      await task.save();

      res.json({
        success: true,
        message: 'Vazifa tasdiqlandi',
        data: task
      });
    } catch (error) {
      console.error('Verify task error:', error);
      next(error);
    }
  }
);

/**
 * Reject task (Admin only)
 */
router.put('/:id/reject',
  authenticate,
  authorize('admin', 'doctor'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;

      if (!rejectionReason) {
        return res.status(400).json({
          success: false,
          message: 'Qaytarish sababi ko\'rsatilishi shart'
        });
      }

      const task = await Task.findById(id);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Vazifa topilmadi'
        });
      }

      if (task.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Faqat tugatilgan vazifalarni qaytarish mumkin'
        });
      }

      task.status = 'in_progress';
      task.rejection_reason = rejectionReason;
      task.completed_at = null;
      task.completion_notes = '';
      await task.save();

      res.json({
        success: true,
        message: 'Vazifa qaytarildi',
        data: task
      });
    } catch (error) {
      console.error('Reject task error:', error);
      next(error);
    }
  }
);

/**
 * Delete task (Admin only)
 */
router.delete('/:id',
  authenticate,
  authorize('admin', 'doctor'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const task = await Task.findByIdAndDelete(id);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Vazifa topilmadi'
        });
      }

      res.json({
        success: true,
        message: 'Vazifa o\'chirildi'
      });
    } catch (error) {
      console.error('Delete task error:', error);
      next(error);
    }
  }
);

/**
 * Get staff list (Admin only)
 */
router.get('/staff-list',
  authenticate,
  authorize('admin', 'doctor'),
  async (req, res, next) => {
    try {
      const { role } = req.query;

      const filter = { status: 'active' };
      if (role) {
        filter.role = role.toLowerCase();
      }

      const staff = await Staff.find(filter)
        .select('first_name last_name role employee_id')
        .sort({ first_name: 1 })
        .lean();

      const formattedStaff = staff.map(s => ({
        id: s._id,
        first_name: s.first_name,
        last_name: s.last_name,
        role: s.role,
        employee_id: s.employee_id
      }));

      res.json({
        success: true,
        data: formattedStaff
      });
    } catch (error) {
      console.error('Get staff list error:', error);
      next(error);
    }
  }
);

export default router;
