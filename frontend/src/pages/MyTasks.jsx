/**
 * MY TASKS PAGE
 * Xodimlarga berilgan vazifalarni ko'rish va bajarish
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import taskService from '../services/taskService';
import attendanceService from '../services/attendanceService';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import Modal from '../components/Modal';

export default function MyTasks() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, in_progress, completed, verified
  
  // On-duty shifts for doctors
  const [onDutyShifts, setOnDutyShifts] = useState([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const isDoctor = user?.role?.name === 'doctor' || user?.role_name === 'doctor' || user?.role_name === 'Shifokor';
  
  // Attendance
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [workSchedule, setWorkSchedule] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    loadTasks();
    loadTodayAttendance();
    loadWorkSchedule();
    if (isDoctor) {
      loadOnDutyShifts();
    }
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await taskService.getMyTasks();
      
      if (response.success) {
        setTasks(response.data);
      }
    } catch (error) {
      console.error('Load tasks error:', error);
      toast.error('Vazifalarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };
  
  const loadOnDutyShifts = async () => {
    try {
      setShiftsLoading(true);
      
      // Use the doctor-specific endpoint
      const response = await api.get('/chief-doctor/my-shifts');
      
      if (response.data.success) {
        setOnDutyShifts(response.data.data);
      }
    } catch (error) {
      console.error('Load on-duty shifts error:', error);
      if (error.response?.status !== 403) {
        toast.error('Navbatdagi smenalarni yuklashda xatolik');
      }
    } finally {
      setShiftsLoading(false);
    }
  };

  const loadTodayAttendance = async () => {
    try {
      const response = await attendanceService.getTodayAttendance();
      if (response.success) {
        setTodayAttendance(response.data);
      }
    } catch (error) {
      console.error('Load attendance error:', error);
    }
  };

  const loadWorkSchedule = async () => {
    try {
      const response = await api.get('/payroll/my-work-schedule');
      if (response.data.success) {
        setWorkSchedule(response.data.data);
      }
    } catch (error) {
      console.error('Load work schedule error:', error);
    }
  };

  const handleCheckIn = async () => {
    if (!confirm('Ishga kelganingizni tasdiqlaysizmi?')) return;
    
    setCheckingIn(true);
    try {
      const response = await attendanceService.checkIn();
      
      if (response.success) {
        if (response.data.isLate) {
          toast.error(response.message, { duration: 8000 });
        } else {
          toast.success(response.message);
        }
        loadTodayAttendance();
      }
    } catch (error) {
      console.error('Check in error:', error);
      toast.error(error.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!confirm('Ishdan ketayotganingizni tasdiqlaysizmi?')) return;
    
    setCheckingIn(true);
    try {
      const response = await attendanceService.checkOut();
      
      if (response.success) {
        if (response.data.isEarly) {
          toast.error(response.message, { duration: 8000 });
        } else {
          toast.success(response.message);
        }
        loadTodayAttendance();
      }
    } catch (error) {
      console.error('Check out error:', error);
      toast.error(error.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleStartTask = async (taskId) => {
    try {
      const response = await taskService.startTask(taskId);
      
      if (response.success) {
        toast.success('Vazifa boshlandi');
        loadTasks();
      }
    } catch (error) {
      console.error('Start task error:', error);
      toast.error('Vazifani boshlashda xatolik');
    }
  };

  const handleCompleteTask = async () => {
    try {
      const response = await taskService.completeTask(selectedTask.id, completionNotes);
      
      if (response.success) {
        toast.success('Vazifa tugatildi. Admin tasdiqini kutmoqda.');
        setShowCompleteModal(false);
        setSelectedTask(null);
        setCompletionNotes('');
        loadTasks();
      }
    } catch (error) {
      console.error('Complete task error:', error);
      toast.error('Vazifani tugatishda xatolik');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Yangi', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
      in_progress: { text: 'Bajarilmoqda', class: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
      completed: { text: 'Tugatilgan', class: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
      verified: { text: 'Tasdiqlangan', class: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' }
    };
    return badges[status] || badges.pending;
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      low: { text: 'Past', class: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
      medium: { text: 'O\'rta', class: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
      high: { text: 'Yuqori', class: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
      urgent: { text: 'Shoshilinch', class: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' }
    };
    return badges[priority] || badges.medium;
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTasks = tasks.filter(task => {
    if (filterStatus === 'all') return true;
    return task.status === filterStatus;
  });

  const stats = {
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    verified: tasks.filter(t => t.status === 'verified').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-xl">
            <span className="material-symbols-outlined text-4xl">task_alt</span>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-black">Mening Vazifalarim</h1>
            <p className="text-purple-100 mt-1">
              Salom, {user?.first_name || 'Xodim'}! Sizga berilgan vazifalar
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border-2 border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">Yangi</p>
          <p className="text-2xl font-black text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border-2 border-green-200 dark:border-green-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">Bajarilmoqda</p>
          <p className="text-2xl font-black text-green-600 dark:text-green-400">{stats.in_progress}</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border-2 border-purple-200 dark:border-purple-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">Tasdiqlash</p>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{stats.completed}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border-2 border-green-200 dark:border-green-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">Tasdiqlangan</p>
          <p className="text-2xl font-black text-green-600 dark:text-green-400">{stats.verified}</p>
        </div>
      </div>

      {/* Attendance Card */}
      {workSchedule && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border-2 border-blue-200 dark:border-blue-800 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 p-3 rounded-xl">
                <span className="material-symbols-outlined text-white text-3xl">schedule</span>
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">Ish vaqti</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {workSchedule.work_start_time} - {workSchedule.work_end_time}
                </p>
              </div>
            </div>
            
            {!todayAttendance?.check_in ? (
              <button
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined">login</span>
                {checkingIn ? 'Yuklanmoqda...' : 'Men keldim'}
              </button>
            ) : !todayAttendance?.check_out ? (
              <div className="flex items-center gap-3">
                <div className="bg-green-100 dark:bg-green-900/30 px-6 py-3 rounded-xl border-2 border-green-300 dark:border-green-700">
                  <p className="text-sm font-bold text-green-700 dark:text-green-300">
                    ✓ Kelish: {new Date(todayAttendance.check_in).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={handleCheckOut}
                  disabled={checkingIn}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">logout</span>
                  {checkingIn ? 'Yuklanmoqda...' : 'Men ketdim'}
                </button>
              </div>
            ) : (
              <div className="bg-blue-100 dark:bg-blue-900/30 px-6 py-3 rounded-xl border-2 border-blue-300 dark:border-blue-700">
                <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                  ✓ Kelish: {new Date(todayAttendance.check_in).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                  {' • '}
                  Ketish: {new Date(todayAttendance.check_out).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Haftada</p>
              <p className="text-lg font-black text-gray-900 dark:text-white">
                {workSchedule.work_days_per_week} kun
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Oylik</p>
              <p className="text-lg font-black text-gray-900 dark:text-white">
                {workSchedule.work_hours_per_month} soat
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: 'all', label: 'Barchasi' },
          { value: 'pending', label: 'Yangi' },
          { value: 'in_progress', label: 'Bajarilmoqda' },
          { value: 'completed', label: 'Tugatilgan' },
          { value: 'verified', label: 'Tasdiqlangan' }
        ].map(filter => (
          <button
            key={filter.value}
            onClick={() => setFilterStatus(filter.value)}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filterStatus === filter.value
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* On-Duty Shifts Section (Only for Doctors) */}
      {isDoctor && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">event_available</span>
              </div>
              <h2 className="text-2xl font-bold">Navbatdagi smenalarim</h2>
            </div>

            {shiftsLoading ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : onDutyShifts.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700">
                  event_busy
                </span>
                <p className="text-gray-500 dark:text-gray-400 mt-4">Sizga biriktirilgan navbatdagi smenalar yo'q</p>
              </div>
            ) : (
              <div className="space-y-3">
                {onDutyShifts.map(shift => (
                  <div
                    key={shift._id}
                    className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="size-14 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">
                            event_available
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-lg text-gray-900 dark:text-white">
                            {new Date(shift.shift_date).toLocaleDateString('uz-UZ', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {shift.start_time} - {shift.end_time}
                          </p>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${
                            shift.shift_type === 'morning' ? 'bg-yellow-100 text-yellow-700' :
                            shift.shift_type === 'evening' ? 'bg-orange-100 text-orange-700' :
                            shift.shift_type === 'night' ? 'bg-indigo-100 text-indigo-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {shift.shift_type === 'morning' ? 'Ertalabki' :
                             shift.shift_type === 'evening' ? 'Kechki' :
                             shift.shift_type === 'night' ? 'Tungi' :
                             'Kun bo\'yi'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          shift.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                          shift.status === 'active' ? 'bg-green-100 text-green-700' :
                          shift.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {shift.status === 'scheduled' ? 'Rejalashtirilgan' :
                           shift.status === 'active' ? 'Faol' :
                           shift.status === 'completed' ? 'Tugatilgan' :
                           'Bekor qilingan'}
                        </span>
                      </div>
                    </div>
                    {shift.notes && (
                      <div className="mt-3 bg-white dark:bg-gray-800 p-3 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-semibold">Izoh:</span> {shift.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
              <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">task_alt</span>
            </div>
            <h2 className="text-2xl font-bold">Vazifalar</h2>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700">
                task_alt
              </span>
              <p className="text-gray-500 dark:text-gray-400 mt-4">Vazifalar yo'q</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map(task => {
                const statusBadge = getStatusBadge(task.status);
                const priorityBadge = getPriorityBadge(task.priority);

                return (
                  <div
                    key={task.id}
                    className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-2">
                          <div className="size-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-primary">task</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-xl text-gray-900 dark:text-white">{task.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {task.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${statusBadge.class}`}>
                                {statusBadge.text}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${priorityBadge.class}`}>
                                {priorityBadge.text}
                              </span>
                            </div>
                            <div className="space-y-1 mt-2 text-sm text-gray-600 dark:text-gray-300">
                              {task.location_details && (
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-sm">location_on</span>
                                  <span>{task.location_details}</span>
                                </div>
                              )}
                              {task.due_date && (
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-sm">schedule</span>
                                  <span>Muddat: {formatDate(task.due_date)}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">person</span>
                                <span>Berdi: {task.creator_name}</span>
                              </div>
                            </div>
                            {task.completion_notes && (
                              <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm">
                                <p className="font-semibold text-green-900 dark:text-green-300">Sizning izohingiz:</p>
                                <p className="text-green-800 dark:text-green-400">{task.completion_notes}</p>
                              </div>
                            )}
                            {task.rejection_reason && (
                              <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-sm">
                                <p className="font-semibold text-orange-900 dark:text-orange-300">Qaytarilish sababi:</p>
                                <p className="text-orange-800 dark:text-orange-400">{task.rejection_reason}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {task.status === 'pending' && (
                          <button
                            onClick={() => handleStartTask(task.id)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-sm">play_arrow</span>
                            Boshlash
                          </button>
                        )}
                        
                        {['pending', 'in_progress'].includes(task.status) && (
                          <button
                            onClick={() => {
                              setSelectedTask(task);
                              setShowCompleteModal(true);
                            }}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            Tugatish
                          </button>
                        )}

                        {task.status === 'completed' && (
                          <div className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-lg font-semibold flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">hourglass_empty</span>
                            Admin tasdiqini kutmoqda
                          </div>
                        )}

                        {task.status === 'verified' && (
                          <div className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-lg font-semibold flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">verified</span>
                            Tasdiqlangan
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Complete Task Modal */}
      {showCompleteModal && selectedTask && (
        <Modal
          isOpen={showCompleteModal}
          onClose={() => {
            setShowCompleteModal(false);
            setSelectedTask(null);
            setCompletionNotes('');
          }}
          title="Vazifani Tugatish"
        >
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <p className="font-semibold text-lg">{selectedTask.title}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedTask.description}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Izoh (ixtiyoriy)</label>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                rows="4"
                placeholder="Vazifa haqida izoh yozing..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCompleteTask}
                className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600"
              >
                Tugatish
              </button>
              <button
                onClick={() => {
                  setShowCompleteModal(false);
                  setSelectedTask(null);
                  setCompletionNotes('');
                }}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 rounded-lg font-semibold"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
