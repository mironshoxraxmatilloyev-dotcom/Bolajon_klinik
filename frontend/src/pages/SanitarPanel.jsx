import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import sanitarService from '../services/sanitarService';
import taskService from '../services/taskService';
import toast, { Toaster } from 'react-hot-toast';
import Modal from '../components/Modal';
import MySalary from './MySalary';

export default function SanitarPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshing, setRefreshing] = useState(false);
  
  const [stats, setStats] = useState({ tozalanmagan: 0, tozalanmoqda: 0, toza: 0, kechikkan: 0 });
  const [areas, setAreas] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyStats, setHistoryStats] = useState({ today: 0, this_month: 0, total: 0 });
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');
  
  // Task management
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [showTaskCompleteModal, setShowTaskCompleteModal] = useState(false);
  const [selectedAssignedTask, setSelectedAssignedTask] = useState(null);
  const [taskCompletionNotes, setTaskCompletionNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab, selectedStatus]);

  useEffect(() => {
    const interval = setInterval(() => loadData(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    
    try {
      if (activeTab === 'dashboard') {
        const response = await sanitarService.getDashboard();
        // Transform backend data to frontend format
        const backendStats = response.data || response;
        setStats({
          tozalanmagan: backendStats.pending_tasks || 0,
          tozalanmoqda: backendStats.in_progress_tasks || 0,
          toza: backendStats.completed_today || 0,
          kechikkan: 0 // Backend'da yo'q, keyinroq qo'shiladi
        });
        setAreas(response.areas || []);
      } else if (activeTab === 'rooms') {
        const filters = selectedStatus !== 'all' ? { status: selectedStatus } : {};
        const roomsResponse = await sanitarService.getRooms(filters);
        const roomsData = roomsResponse.data || roomsResponse;
        setRooms(Array.isArray(roomsData) ? roomsData : []);
      } else if (activeTab === 'history') {
        const historyResponse = await sanitarService.getHistory();
        const historyData = historyResponse.data || historyResponse;
        setHistory(Array.isArray(historyData) ? historyData : []);
        setHistoryStats({ 
          today: historyData.length || 0, 
          this_month: historyData.length || 0, 
          total: historyData.length || 0 
        });
      } else if (activeTab === 'tasks') {
        const tasksResponse = await taskService.getMyTasks();
        if (tasksResponse.success) {
          setAssignedTasks(tasksResponse.data);
        }
      }
    } catch (error) {
      console.error('Load data error:', error);
      if (!silent) toast.error('Xatolik yuz berdi');
      if (error.response?.status === 401) window.location.href = '/login';
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStartCleaning = async (cleaningId, roomId, roomNumber) => {
    const t = toast.loading(`${roomNumber} tozalanmoqda...`);
    try {
      if (roomId) {
        await sanitarService.startRoomCleaning(roomId);
      } else {
        await sanitarService.startCleaning(cleaningId);
      }
      toast.success(`${roomNumber} - Boshlandi! 🧹`, { id: t });
      loadData();
    } catch (error) {
      toast.error('Xato: ' + (error.response?.data?.error || error.message), { id: t });
    }
  };

  const handleCompleteCleaning = async () => {
    const t = toast.loading('Yakunlanmoqda...');
    try {
      await sanitarService.completeRoomCleaning(selectedTask.room_id, completionNotes);
      toast.success(`${selectedTask.room_number} - Yakunlandi! ✅`, { id: t });
      setShowCompleteModal(false);
      setSelectedTask(null);
      setCompletionNotes('');
      loadData();
    } catch (error) {
      toast.error('Xato: ' + (error.response?.data?.error || error.message), { id: t });
    }
  };

  const getStatusColor = (s) => ({ tozalanmagan: 'bg-red-100 text-red-700 border-red-300', tozalanmoqda: 'bg-yellow-100 text-yellow-700 border-yellow-300', toza: 'bg-green-100 text-green-700 border-green-300' }[s] || 'bg-gray-100 text-gray-700');
  const getStatusIcon = (s) => ({ tozalanmagan: 'warning', tozalanmoqda: 'cleaning_services', toza: 'check_circle' }[s] || 'help');
  const getDepartmentName = (dept) => dept === 'inpatient' ? 'Statsionar' : dept === 'ambulator' ? 'Ambulatorxona' : dept;
  const formatTime = (d) => { if (!d) return '-'; const diff = Math.floor((new Date() - new Date(d)) / 60000); return diff < 1 ? 'Hozir' : diff < 60 ? `${diff} daq` : diff < 1440 ? `${Math.floor(diff/60)} soat` : `${Math.floor(diff/1440)} kun`; };
  const filteredRooms = rooms.filter(r => r.room_number.toLowerCase().includes(searchQuery.toLowerCase()) || r.area.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading && activeTab === 'dashboard' && stats.tozalanmagan === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900 dark:to-cyan-900">
        <div className="text-center"><div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div><p className="mt-4 font-semibold text-gray-600 dark:text-gray-300">Yuklanmoqda...</p></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-green-50 to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-20 lg:pb-6">
      <Toaster position="top-right" />
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 max-w-7xl mx-auto">

        {/* Header - Responsive */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 text-white shadow-xl">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="bg-white/20 p-2 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl">
              <span className="material-symbols-outlined text-3xl sm:text-4xl lg:text-6xl">cleaning_services</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-4xl font-black truncate">TOZALOVCHI</h1>
              <p className="text-sm sm:text-base lg:text-xl opacity-90 truncate">Salom, {user?.first_name || 'Tozalovchi'} </p>
              {refreshing && <div className="flex items-center gap-1 mt-1 text-xs sm:text-sm"><span className="material-symbols-outlined animate-spin text-sm">refresh</span><span>Yangilanmoqda</span></div>}
            </div>
          </div>
        </div>

        {/* Stats - Responsive Grid */}
        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
              {[
                { key: 'tozalanmagan', label: 'Tozalanmagan', icon: 'warning', color: 'from-red-500 to-red-600' },
                { key: 'tozalanmoqda', label: 'Jarayonda', icon: 'cleaning_services', color: 'from-yellow-500 to-yellow-600' },
                { key: 'toza', label: 'Toza', icon: 'check_circle', color: 'from-green-500 to-green-600' }
              ].map(s => (
                <div key={s.key} className={`bg-gradient-to-br ${s.color} rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 text-white shadow-lg hover:scale-105 transition-transform`}>
                  <span className="material-symbols-outlined text-2xl sm:text-3xl mb-1 sm:mb-2">{s.icon}</span>
                  <p className="text-2xl sm:text-3xl lg:text-4xl font-black">{stats[s.key]}</p>
                  <p className="text-xs sm:text-sm opacity-90 truncate">{s.label}</p>
                </div>
              ))}
            </div>

            {areas.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
                <h3 className="text-base sm:text-lg font-bold mb-3 flex items-center gap-2 text-gray-900 dark:text-white"><span className="material-symbols-outlined">location_on</span>Sizning hududlaringiz</h3>
                <div className="flex flex-wrap gap-2">{areas.map((a, i) => <div key={i} className="bg-green-50 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-700 px-3 py-2 rounded-lg"><p className="text-sm font-bold text-green-700 dark:text-green-300">{a.area}</p>{a.department && <p className="text-xs text-green-600 dark:text-green-400">{a.department === 'inpatient' ? 'Statsionar' : 'Ambulatorxona'}</p>}</div>)}</div>
              </div>
            )}
          </>
        )}


        {/* Tabs - Responsive with Full Labels */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
          <div className="border-b dark:border-gray-700">
            <div className="grid grid-cols-5 px-2 sm:px-4">
              {[
                { id: 'dashboard', label: 'Asosiy', icon: 'dashboard' },
                { id: 'rooms', label: 'Xonalar', icon: 'meeting_room' },
                { id: 'tasks', label: 'Vazifalar', icon: 'task_alt' },
                { id: 'salary', label: 'Maoshlarim', icon: 'payments' },
                { id: 'history', label: 'Tarix', icon: 'history' }
              ].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex flex-col items-center justify-center gap-1 px-2 py-3 font-semibold border-b-2 transition-all ${activeTab === t.id ? 'border-primary text-primary bg-green-50 dark:bg-green-900/30' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  <span className="material-symbols-outlined text-lg sm:text-xl">{t.icon}</span>
                  <span className="text-[10px] sm:text-xs lg:text-sm">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 sm:p-4 lg:p-6 min-h-[300px]">
            {/* Xonalar Tab */}
            {activeTab === 'rooms' && (
              <div className="space-y-3 sm:space-y-4">
                {/* Search & Filter - Responsive */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">search</span>
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Xona qidirish..." className="w-full pl-10 pr-4 py-2 sm:py-3 border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary text-sm sm:text-base" />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {[{ value: 'all', label: 'Barchasi' }, { value: 'tozalanmagan', label: 'Tozalanmagan' }, { value: 'tozalanmoqda', label: 'Jarayonda' }, { value: 'toza', label: 'Toza' }].map(f => (
                      <button key={f.value} onClick={() => setSelectedStatus(f.value)} className={`px-3 sm:px-4 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap text-xs sm:text-sm ${selectedStatus === f.value ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>{f.label}</button>
                    ))}
                  </div>
                </div>

                {loading ? <div className="text-center py-12"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div> : filteredRooms.length === 0 ? <div className="text-center py-12"><span className="material-symbols-outlined text-5xl sm:text-6xl text-gray-300 dark:text-gray-600">inbox</span><p className="text-gray-500 dark:text-gray-400 mt-4">Xonalar topilmadi</p></div> : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {filteredRooms.map(r => (
                      <div key={r.id} className={`bg-white dark:bg-gray-800 rounded-xl border-2 p-4 sm:p-5 hover:shadow-lg transition-all ${r.priority === 'favqulodda' ? 'border-red-500 shadow-red-100 dark:shadow-red-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0"><h3 className="text-xl sm:text-2xl font-black truncate text-gray-900 dark:text-white">{r.room_number}</h3><p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{getDepartmentName(r.department)}</p></div>
                          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold border-2 flex items-center gap-1 ${getStatusColor(r.status)}`}><span className="material-symbols-outlined text-sm">{getStatusIcon(r.status)}</span><span className="hidden sm:inline">{r.status}</span></span>
                        </div>
                        <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4 text-xs sm:text-sm">
                          {r.last_cleaned_at && <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><span className="material-symbols-outlined text-sm sm:text-base">schedule</span><span>{formatTime(r.last_cleaned_at)}</span></div>}
                          {r.requires_disinfection && <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded"><span className="material-symbols-outlined text-sm sm:text-base">science</span><span className="font-semibold text-xs">Dezinfeksiya</span></div>}
                          {r.priority === 'favqulodda' && <div className="flex items-center gap-2 text-red-600 bg-red-50 px-2 py-1 rounded animate-pulse"><span className="material-symbols-outlined text-sm sm:text-base">emergency</span><span className="font-bold text-xs">FAVQULODDA</span></div>}
                        </div>
                        {r.status === 'tozalanmagan' && <button onClick={() => handleStartCleaning(r.cleaning_id, r.room_id, r.room_number)} className={`w-full py-2 sm:py-3 rounded-lg font-bold transition-colors text-sm sm:text-base ${r.priority === 'favqulodda' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-primary hover:bg-primary-dark text-white'}`}>Boshlash</button>}
                        {r.status === 'tozalanmoqda' && <button onClick={() => { setSelectedTask({ room_id: r.room_id, room_number: r.room_number }); setShowCompleteModal(true); }} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 sm:py-3 rounded-lg font-bold transition-colors text-sm sm:text-base">Tugadi</button>}
                        {r.status === 'toza' && <div className="text-center py-2 text-green-600 font-bold text-sm sm:text-base">✓ Toza</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}


            {/* Favqulodda Tab - REMOVED */}

            {/* Mening Maoshlarim Tab */}
            {activeTab === 'salary' && (
              <MySalary />
            )}

            {/* Berilgan Vazifalar Tab */}
            {activeTab === 'tasks' && (
              <div className="space-y-3 sm:space-y-4">
                <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-3 sm:p-4">
                  <h2 className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2 text-sm sm:text-base">
                    <span className="material-symbols-outlined">task_alt</span>
                    Berilgan Vazifalar
                  </h2>
                  <p className="text-xs sm:text-sm text-purple-700 dark:text-purple-300">Sizga tayinlangan vazifalar</p>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                ) : assignedTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="material-symbols-outlined text-5xl sm:text-6xl text-gray-300 dark:text-gray-600">task</span>
                    <p className="text-gray-500 dark:text-gray-400 mt-4">Vazifalar yo'q</p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {assignedTasks.map(task => {
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

                      const statusBadge = getStatusBadge(task.status);
                      const priorityBadge = getPriorityBadge(task.priority);

                      return (
                        <div key={task.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-3 sm:p-5 hover:shadow-md transition-shadow">
                          <div className="flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white mb-2">{task.title}</h3>
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">{task.description}</p>
                                
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${statusBadge.class}`}>
                                    {statusBadge.text}
                                  </span>
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${priorityBadge.class}`}>
                                    {priorityBadge.text}
                                  </span>
                                </div>

                                <div className="space-y-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                                  {task.location_details && (
                                    <div className="flex items-center gap-2">
                                      <span className="material-symbols-outlined text-sm">location_on</span>
                                      <span>{task.location_details}</span>
                                    </div>
                                  )}
                                  {task.due_date && (
                                    <div className="flex items-center gap-2">
                                      <span className="material-symbols-outlined text-sm">schedule</span>
                                      <span>Muddat: {new Date(task.due_date).toLocaleString('uz-UZ', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">person</span>
                                    <span>Berdi: {task.assigned_by_username}</span>
                                  </div>
                                </div>

                                {task.completion_notes && (
                                  <div className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                                    <p className="font-semibold text-green-900 dark:text-green-300">Sizning izohingiz:</p>
                                    <p>{task.completion_notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2">
                              {task.status === 'pending' && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const response = await taskService.startTask(task.id);
                                      if (response.success) {
                                        toast.success('Vazifa boshlandi');
                                        loadData();
                                      }
                                    } catch (error) {
                                      toast.error('Xatolik yuz berdi');
                                    }
                                  }}
                                  className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center gap-2 text-sm"
                                >
                                  <span className="material-symbols-outlined text-sm">play_arrow</span>
                                  Boshlash
                                </button>
                              )}
                              
                              {['pending', 'in_progress'].includes(task.status) && (
                                <button
                                  onClick={() => {
                                    setSelectedAssignedTask(task);
                                    setShowTaskCompleteModal(true);
                                  }}
                                  className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center gap-2 text-sm"
                                >
                                  <span className="material-symbols-outlined text-sm">check_circle</span>
                                  Tugatish
                                </button>
                              )}

                              {task.status === 'completed' && (
                                <div className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-lg font-semibold flex items-center gap-2 text-sm">
                                  <span className="material-symbols-outlined text-sm">hourglass_empty</span>
                                  Admin tasdiqini kutmoqda
                                </div>
                              )}

                              {task.status === 'verified' && (
                                <div className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-lg font-semibold flex items-center gap-2 text-sm">
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
            )}

            {/* Tarix Tab */}
            {activeTab === 'history' && (
              <div className="space-y-3 sm:space-y-4">
                {/* Statistics Cards */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-3 sm:p-6 text-white shadow-lg">
                    <span className="material-symbols-outlined text-2xl sm:text-3xl mb-1 sm:mb-2">today</span>
                    <p className="text-2xl sm:text-4xl font-black">{historyStats.today}</p>
                    <p className="text-xs sm:text-sm opacity-90">Bugun</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 sm:p-6 text-white shadow-lg">
                    <span className="material-symbols-outlined text-2xl sm:text-3xl mb-1 sm:mb-2">calendar_month</span>
                    <p className="text-2xl sm:text-4xl font-black">{historyStats.this_month}</p>
                    <p className="text-xs sm:text-sm opacity-90">Shu oy</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-3 sm:p-6 text-white shadow-lg">
                    <span className="material-symbols-outlined text-2xl sm:text-3xl mb-1 sm:mb-2">check_circle</span>
                    <p className="text-2xl sm:text-4xl font-black">{historyStats.total}</p>
                    <p className="text-xs sm:text-sm opacity-90">Jami</p>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-3 sm:p-4">
                  <h2 className="font-bold text-green-900 dark:text-green-200 flex items-center gap-2 text-sm sm:text-base">
                    <span className="material-symbols-outlined">history</span>
                    Tozalash tarixi
                  </h2>
                  <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">Bajarilgan ishlar</p>
                </div>
                
                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="material-symbols-outlined text-5xl sm:text-6xl text-gray-300 dark:text-gray-600">inbox</span>
                    <p className="text-gray-500 dark:text-gray-400 mt-4">Tarix bo'sh</p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {history.map(h => (
                      <div key={h.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-3 sm:p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                              <h3 className="text-base sm:text-xl font-bold truncate text-gray-900 dark:text-white">{h.room_number}</h3>
                              <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded whitespace-nowrap">{getDepartmentName(h.department)}</span>
                            </div>
                            <div className="space-y-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">schedule</span>
                                <span>{new Date(h.completed_at).toLocaleString('uz-UZ', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}</span>
                              </div>
                              {h.duration_minutes && (
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-sm">timer</span>
                                  <span>{h.duration_minutes} daqiqa</span>
                                </div>
                              )}
                            </div>
                            {h.notes && (
                              <div className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                {h.notes}
                              </div>
                            )}
                          </div>
                          <span className="material-symbols-outlined text-green-500 dark:text-green-400 text-2xl sm:text-4xl">check_circle</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Complete Modal - Responsive */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900 dark:text-white">Tozalashni yakunlash</h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-3 sm:mb-4">Xona: <span className="font-bold">{selectedTask?.room_number}</span></p>
            <div className="mb-4"><label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Izoh (ixtiyoriy)</label><textarea value={completionNotes} onChange={(e) => setCompletionNotes(e.target.value)} className="w-full px-3 sm:px-4 py-2 sm:py-3 border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary text-sm sm:text-base" rows="3" placeholder="Qo'shimcha izoh..."/></div>
            <div className="flex gap-2 sm:gap-3"><button onClick={() => { setShowCompleteModal(false); setSelectedTask(null); setCompletionNotes(''); }} className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm sm:text-base">Bekor</button><button onClick={handleCompleteCleaning} className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors text-sm sm:text-base">Yakunlash</button></div>
          </div>
        </div>
      )}

      {/* Task Complete Modal */}
      {showTaskCompleteModal && selectedAssignedTask && (
        <Modal
          isOpen={showTaskCompleteModal}
          onClose={() => {
            setShowTaskCompleteModal(false);
            setSelectedAssignedTask(null);
            setTaskCompletionNotes('');
          }}
          title="Vazifani Tugatish"
        >
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <p className="font-semibold text-lg">{selectedAssignedTask.title}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedAssignedTask.description}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Izoh (ixtiyoriy)</label>
              <textarea
                value={taskCompletionNotes}
                onChange={(e) => setTaskCompletionNotes(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                rows="4"
                placeholder="Vazifa haqida izoh yozing..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  try {
                    const response = await taskService.completeTask(selectedAssignedTask.id, taskCompletionNotes);
                    if (response.success) {
                      toast.success('Vazifa tugatildi. Admin tasdiqini kutmoqda.');
                      setShowTaskCompleteModal(false);
                      setSelectedAssignedTask(null);
                      setTaskCompletionNotes('');
                      loadData();
                    }
                  } catch (error) {
                    toast.error('Xatolik yuz berdi');
                  }
                }}
                className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600"
              >
                Tugatish
              </button>
              <button
                onClick={() => {
                  setShowTaskCompleteModal(false);
                  setSelectedAssignedTask(null);
                  setTaskCompletionNotes('');
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
