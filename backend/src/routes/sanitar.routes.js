import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Task from '../models/Task.js';
import AmbulatorRoom from '../models/AmbulatorRoom.js';
import RoomCleaning from '../models/RoomCleaning.js';

const router = express.Router();

/**
 * Get sanitar dashboard statistics
 * GET /api/v1/sanitar/dashboard
 */
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const sanitarId = req.user._id || req.user.id;
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all rooms count
    const totalRooms = await AmbulatorRoom.countDocuments({
      status: { $ne: 'closed' }
    });
    
    // Get today's cleaning records
    const [pendingCount, inProgressCount, completedCount] = await Promise.all([
      RoomCleaning.countDocuments({
        cleaning_date: today,
        status: 'tozalanmagan'
      }),
      RoomCleaning.countDocuments({
        cleaning_date: today,
        status: 'tozalanmoqda'
      }),
      RoomCleaning.countDocuments({
        cleaning_date: today,
        status: 'toza'
      })
    ]);
    
    // Calculate rooms not yet in cleaning records (they are pending)
    const roomsInRecords = pendingCount + inProgressCount + completedCount;
    const actualPending = totalRooms - inProgressCount - completedCount;
    
    // Get areas (departments)
    const areas = [
      { area: 'Statsionar', department: 'inpatient' },
      { area: 'Ambulatorxona', department: 'ambulator' }
    ];
    
    res.json({
      success: true,
      data: {
        pending_tasks: actualPending,
        in_progress_tasks: inProgressCount,
        completed_today: completedCount,
        total_completed: completedCount
      },
      areas: areas
    });
  } catch (error) {
    console.error('Get sanitar dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Dashboard ma\'lumotlarini olishda xatolik',
      error: error.message
    });
  }
});

/**
 * Get sanitar tasks
 * GET /api/v1/sanitar/tasks
 */
router.get('/tasks', authenticate, async (req, res) => {
  try {
    const sanitarId = req.user._id || req.user.id;
    const { status, priority } = req.query;
    
    const query = { assigned_to: sanitarId };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (priority && priority !== 'all') {
      query.priority = priority;
    }
    
    const tasks = await Task.find(query)
      .populate('created_by', 'first_name last_name')
      .sort({ created_at: -1 })
      .lean();
    
    // Transform data
    const transformedTasks = tasks.map(task => ({
      ...task,
      id: task._id.toString(),
      created_by_name: task.created_by ? `${task.created_by.first_name} ${task.created_by.last_name}` : 'N/A'
    }));
    
    res.json({
      success: true,
      data: transformedTasks
    });
  } catch (error) {
    console.error('Get sanitar tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Topshiriqlarni olishda xatolik',
      error: error.message
    });
  }
});

/**
 * Get rooms (all rooms from Ambulatorxona and Stationlar)
 * GET /api/v1/sanitar/rooms
 */
router.get('/rooms', authenticate, async (req, res) => {
  try {
    const sanitarId = req.user._id || req.user.id;
    const { status } = req.query;
    
    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all rooms from both departments
    const allRooms = await AmbulatorRoom.find({
      status: { $ne: 'closed' }
    }).lean();
    
    // Get today's cleaning records
    const cleaningRecords = await RoomCleaning.find({
      cleaning_date: today
    }).lean();
    
    // Create a map of room cleaning status
    const cleaningMap = {};
    cleaningRecords.forEach(record => {
      cleaningMap[record.room_id.toString()] = record;
    });
    
    // Transform rooms to cleaning format
    const rooms = allRooms.map(room => {
      const cleaning = cleaningMap[room._id.toString()];
      
      let cleaningStatus = 'tozalanmagan';
      let lastCleanedAt = null;
      let cleanedBy = null;
      let startedAt = null;
      let notes = null;
      
      if (cleaning) {
        cleaningStatus = cleaning.status;
        lastCleanedAt = cleaning.completed_at;
        cleanedBy = cleaning.cleaned_by;
        startedAt = cleaning.started_at;
        notes = cleaning.notes;
      }
      
      // Apply status filter if provided
      if (status && status !== 'all' && cleaningStatus !== status) {
        return null;
      }
      
      return {
        id: room._id.toString(),
        room_id: room._id.toString(),
        room_number: room.room_number,
        room_name: room.room_name,
        room_type: room.department === 'ambulator' ? 'ambulatorxona' : 'palata',
        area: room.department === 'ambulator' ? 'Ambulatorxona' : 'Statsionar',
        department: room.department, // Add department field
        floor: room.floor ? room.floor.toString() : '1',
        status: cleaningStatus,
        priority: 'normal',
        last_cleaned_at: lastCleanedAt,
        cleaned_by: cleanedBy,
        started_at: startedAt,
        requires_disinfection: room.department === 'inpatient',
        notes: notes,
        cleaning_id: cleaning ? cleaning._id.toString() : null
      };
    }).filter(room => room !== null);
    
    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Xonalarni olishda xatolik',
      error: error.message
    });
  }
});

/**
 * Start cleaning a room
 * POST /api/v1/sanitar/rooms/:id/start
 */
router.post('/rooms/:id/start', authenticate, async (req, res) => {
  try {
    const sanitarId = req.user._id || req.user.id;
    const roomId = req.params.id;
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if room exists
    const room = await AmbulatorRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Xona topilmadi'
      });
    }
    
    // Find or create cleaning record for today
    let cleaning = await RoomCleaning.findOne({
      room_id: roomId,
      cleaning_date: today
    });
    
    if (!cleaning) {
      cleaning = await RoomCleaning.create({
        room_id: roomId,
        room_number: room.room_number,
        room_type: room.department === 'ambulator' ? 'ambulatorxona' : 'palata',
        floor: room.floor ? room.floor.toString() : '1',
        building: room.department === 'ambulator' ? 'Ambulatorxona' : 'Statsionar',
        status: 'tozalanmoqda',
        cleaned_by: sanitarId,
        started_at: new Date(),
        cleaning_date: today,
        requires_disinfection: room.department === 'inpatient'
      });
    } else {
      cleaning.status = 'tozalanmoqda';
      cleaning.cleaned_by = sanitarId;
      cleaning.started_at = new Date();
      await cleaning.save();
    }
    
    res.json({
      success: true,
      message: 'Tozalash boshlandi',
      data: cleaning
    });
  } catch (error) {
    console.error('Start cleaning error:', error);
    res.status(500).json({
      success: false,
      message: 'Tozalashni boshlashda xatolik',
      error: error.message
    });
  }
});

/**
 * Complete cleaning a room
 * POST /api/v1/sanitar/rooms/:id/complete
 */
router.post('/rooms/:id/complete', authenticate, async (req, res) => {
  try {
    const sanitarId = req.user._id || req.user.id;
    const roomId = req.params.id;
    const { notes } = req.body;
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find cleaning record
    const cleaning = await RoomCleaning.findOne({
      room_id: roomId,
      cleaning_date: today
    });
    
    if (!cleaning) {
      return res.status(404).json({
        success: false,
        message: 'Tozalash yozuvi topilmadi'
      });
    }
    
    cleaning.status = 'toza';
    cleaning.completed_at = new Date();
    cleaning.notes = notes || '';
    
    // If not started yet, set started_at
    if (!cleaning.started_at) {
      cleaning.started_at = new Date();
    }
    
    await cleaning.save();
    
    res.json({
      success: true,
      message: 'Tozalash yakunlandi',
      data: cleaning
    });
  } catch (error) {
    console.error('Complete cleaning error:', error);
    res.status(500).json({
      success: false,
      message: 'Tozalashni yakunlashda xatolik',
      error: error.message
    });
  }
});

/**
 * Get task history
 * GET /api/v1/sanitar/history
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const sanitarId = req.user._id || req.user.id;
    const { limit = 50 } = req.query;
    
    // Get completed cleaning records
    const cleanings = await RoomCleaning.find({
      cleaned_by: sanitarId,
      status: 'toza'
    })
      .sort({ completed_at: -1 })
      .limit(parseInt(limit))
      .lean();
    
    // Transform data
    const transformedCleanings = cleanings.map(cleaning => ({
      id: cleaning._id.toString(),
      room_number: cleaning.room_number,
      room_type: cleaning.room_type,
      area: cleaning.building,
      department: cleaning.building === 'Ambulatorxona' ? 'ambulator' : 'inpatient', // Add department
      floor: cleaning.floor,
      completed_at: cleaning.completed_at,
      notes: cleaning.notes,
      duration_minutes: cleaning.started_at && cleaning.completed_at 
        ? Math.round((new Date(cleaning.completed_at) - new Date(cleaning.started_at)) / 60000)
        : null
    }));
    
    res.json({
      success: true,
      data: transformedCleanings
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Tarixni olishda xatolik',
      error: error.message
    });
  }
});

export default router;
