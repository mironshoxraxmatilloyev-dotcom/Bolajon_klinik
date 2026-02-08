import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

export default function ChiefDoctorPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Dashboard data
  const [stats, setStats] = useState({
    staff: { total: 0, present: 0, absent: 0, on_leave: 0 },
    patients: { total: 0, new_today: 0 },
    finance: { today_revenue: 0 },
    tasks: { pending: 0, completed_today: 0 },
    on_duty_doctors: []
  });
  
  // Staff activity
  const [staffActivity, setStaffActivity] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRole, setSelectedRole] = useState('all');
  
  // On-duty doctors
  const [onDutySchedule, setOnDutySchedule] = useState([]);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [showAddDutyModal, setShowAddDutyModal] = useState(false);
  const [dutyForm, setDutyForm] = useState({
    doctor_id: '',
    shift_date: new Date().toISOString().split('T')[0],
    shift_type: 'morning',
    start_time: '09:00',
    end_time: '18:00',
    notes: ''
  });
  
  // My tasks
  const [myTasks, setMyTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab, selectedDate, selectedRole]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'dashboard') {
        const response = await api.get('/chief-doctor/dashboard');
        if (response.data.success) {
          setStats(response.data.data);
        }
      } else if (activeTab === 'staff-activity') {
        const response = await api.get('/chief-doctor/staff-activity', {
          params: { date: selectedDate, role: selectedRole }
        });
        if (response.data.success) {
          setStaffActivity(response.data.data);
        }
      } else if (activeTab === 'on-duty') {
        const [scheduleRes, doctorsRes] = await Promise.all([
          api.get('/chief-doctor/on-duty-schedule'),
          api.get('/chief-doctor/available-doctors')
        ]);
        if (scheduleRes.data.success) {
          setOnDutySchedule(scheduleRes.data.data);
        }
        if (doctorsRes.data.success) {
          setAvailableDoctors(doctorsRes.data.data);
        }
      } else if (activeTab === 'my-tasks') {
        setTasksLoading(true);
        const response = await api.get('/tasks/my-tasks');
        if (response.data.success) {
          setMyTasks(response.data.data || []);
        }
        setTasksLoading(false);
      }
    } catch (error) {
      console.error('Load data error:', error);
      toast.error('Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDutyDoctor = async () => {
    try {
      if (!dutyForm.doctor_id) {
        toast.error('Shifokorni tanlang');
        return;
      }

      const response = await api.post('/chief-doctor/on-duty-schedule', dutyForm);
      if (response.data.success) {
        toast.success('Navbatdagi shifokor biriktirildi');
        setShowAddDutyModal(false);
        setDutyForm({
          doctor_id: '',
          shift_date: new Date().toISOString().split('T')[0],
          shift_type: 'morning',
          start_time: '09:00',
          end_time: '18:00',
          notes: ''
        });
        loadData();
      }
    } catch (error) {
      console.error('Add duty doctor error:', error);
      toast.error(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleDeleteDutyDoctor = async (id) => {
    if (!confirm('Navbatdagi shifokorni o\'chirmoqchimisiz?')) return;
    
    try {
      const response = await api.delete(`/chief-doctor/on-duty-schedule/${id}`);
      if (response.data.success) {
        toast.success('O\'chirildi');
        loadData();
      }
    } catch (error) {
      console.error('Delete duty doctor error:', error);
      toast.error('Xatolik yuz berdi');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      present: 'bg-green-100 text-green-700',
      absent: 'bg-red-100 text-red-700',
      late: 'bg-yellow-100 text-yellow-700',
      on_leave: 'bg-blue-100 text-blue-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusText = (status) => {
    const texts = {
      present: 'Ishda',
      absent: 'Yo\'q',
      late: 'Kechikdi',
      on_leave: 'Ta\'tilda'
    };
    return texts[status] || status;
  };

  const getRoleText = (role) => {
    const roles = {
      admin: 'Administrator',
      doctor: 'Shifokor',
      nurse: 'Hamshira',
      laborant: 'Laborant',
      pharmacist: 'Dorixona',
      sanitar: 'Tozalovchi',
      receptionist: 'Qabulxona',
      masseur: 'Massajchi',
      speech_therapist: 'Logoped',
      chief_doctor: 'Bosh shifokor'
    };
    return roles[role] || role;
  };

  if (loading && activeTab === 'dashboard') {
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
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-5xl">medical_information</span>
          <div>
            <h1 className="text-3xl font-black">BOSH SHIFOKOR PANELI</h1>
            <p className="text-lg opacity-90">Xush kelibsiz, {user?.first_name || 'Bosh shifokor'}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2 px-4 overflow-x-auto scrollbar-hide">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
              { id: 'staff-activity', label: 'Xodimlar faoliyati', icon: 'groups' },
              { id: 'on-duty', label: 'Navbatdagi shifokorlar', icon: 'event_available' },
              { id: 'my-tasks', label: 'Mening vazifalarim', icon: 'task_alt' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                  <span className="material-symbols-outlined text-3xl mb-2">groups</span>
                  <p className="text-4xl font-black">{stats.staff.total}</p>
                  <p className="text-sm opacity-90">Jami xodimlar</p>
                  <div className="mt-3 text-xs">
                    <p>Ishda: {stats.staff.present} | Yo'q: {stats.staff.absent}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                  <span className="material-symbols-outlined text-3xl mb-2">person</span>
                  <p className="text-4xl font-black">{stats.patients.total}</p>
                  <p className="text-sm opacity-90">Jami bemorlar</p>
                  <div className="mt-3 text-xs">
                    <p>Bugun yangi: {stats.patients.new_today}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                  <span className="material-symbols-outlined text-3xl mb-2">task_alt</span>
                  <p className="text-4xl font-black">{stats.tasks.pending}</p>
                  <p className="text-sm opacity-90">Bajarilmagan vazifalar</p>
                  <div className="mt-3 text-xs">
                    <p>Bugun bajarildi: {stats.tasks.completed_today}</p>
                  </div>
                </div>
              </div>

              {/* On-duty doctors today */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
                <h3 className="text-xl font-bold mb-4">Bugungi navbatdagi shifokorlar</h3>
                {stats.on_duty_doctors.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400">Bugun navbatdagi shifokorlar yo'q</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stats.on_duty_doctors.map(duty => (
                      <div key={duty._id} className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <div className="size-12 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-green-600 dark:text-green-400">person</span>
                          </div>
                          <div>
                            <p className="font-bold">{duty.doctor_id?.first_name} {duty.doctor_id?.last_name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{duty.doctor_id?.specialization}</p>
                            <p className="text-xs text-gray-500">{duty.start_time} - {duty.end_time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'staff-activity' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Sana</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Lavozim</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
                  >
                    <option value="all">Barchasi</option>
                    <option value="doctor">Shifokor</option>
                    <option value="nurse">Hamshira</option>
                    <option value="laborant">Laborant</option>
                    <option value="pharmacist">Dorixona</option>
                    <option value="receptionist">Qabulxona</option>
                    <option value="sanitar">Tozalovchi</option>
                  </select>
                </div>
              </div>

              {/* Staff list */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : staffActivity.length === 0 ? (
                <p className="text-center py-12 text-gray-600">Xodimlar topilmadi</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staffActivity.map(staff => (
                    <div key={staff._id} className="bg-white dark:bg-gray-800 border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="size-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary">person</span>
                          </div>
                          <div>
                            <p className="font-bold">{staff.first_name} {staff.last_name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{getRoleText(staff.role)}</p>
                          </div>
                        </div>
                        {staff.attendance && (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(staff.attendance.status)}`}>
                            {getStatusText(staff.attendance.status)}
                          </span>
                        )}
                      </div>
                      
                      {staff.attendance && (
                        <div className="text-sm space-y-1 mb-3">
                          {staff.attendance.check_in && (
                            <p><span className="font-semibold">Keldi:</span> {new Date(staff.attendance.check_in).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</p>
                          )}
                          {staff.attendance.check_out && (
                            <p><span className="font-semibold">Ketdi:</span> {new Date(staff.attendance.check_out).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</p>
                          )}
                        </div>
                      )}
                      
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                        <p className="text-sm font-semibold mb-1">Vazifalar</p>
                        <div className="flex gap-4 text-sm">
                          <span>Jami: {staff.tasks.total}</span>
                          <span className="text-green-600">Bajarildi: {staff.tasks.completed}</span>
                          <span className="text-yellow-600">Kutilmoqda: {staff.tasks.pending}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'on-duty' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Navbatdagi shifokorlar jadvali</h3>
                <button
                  onClick={() => setShowAddDutyModal(true)}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">add</span>
                  Shifokor biriktirish
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : onDutySchedule.length === 0 ? (
                <p className="text-center py-12 text-gray-600">Navbatdagi shifokorlar yo'q</p>
              ) : (
                <div className="space-y-3">
                  {onDutySchedule.map(duty => (
                    <div key={duty._id} className="bg-white dark:bg-gray-800 border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="size-14 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-2xl">person</span>
                          </div>
                          <div>
                            <p className="font-bold text-lg">{duty.doctor_id?.first_name} {duty.doctor_id?.last_name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{duty.doctor_id?.specialization}</p>
                            <p className="text-sm text-gray-500">{duty.doctor_id?.phone}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{new Date(duty.shift_date).toLocaleDateString('uz-UZ')}</p>
                          <p className="text-sm text-gray-600">{duty.start_time} - {duty.end_time}</p>
                          <p className="text-xs text-gray-500 capitalize">{duty.shift_type}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteDutyDoctor(duty._id)}
                          className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                      {duty.notes && (
                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                          {duty.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'my-tasks' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold">Mening vazifalarim</h3>
              
              {tasksLoading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : myTasks.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">task_alt</span>
                  <p className="text-gray-600 dark:text-gray-400">Vazifalar yo'q</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myTasks.map(task => (
                    <div key={task._id} className="bg-white dark:bg-gray-800 border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg mb-1">{task.title}</h4>
                          {task.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{task.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className={`px-2 py-1 rounded-full font-semibold ${
                              task.priority === 'high' ? 'bg-red-100 text-red-700' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {task.priority === 'high' ? 'Yuqori' : task.priority === 'medium' ? 'O\'rta' : 'Past'}
                            </span>
                            <span className={`px-2 py-1 rounded-full font-semibold ${
                              task.status === 'completed' ? 'bg-green-100 text-green-700' :
                              task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {task.status === 'completed' ? 'Bajarildi' : 
                               task.status === 'in_progress' ? 'Jarayonda' : 'Kutilmoqda'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          {task.due_date && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-base">event</span>
                              {new Date(task.due_date).toLocaleDateString('uz-UZ')}
                            </span>
                          )}
                          {task.assigned_by && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-base">person</span>
                              {task.assigned_by.first_name} {task.assigned_by.last_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Duty Doctor Modal */}
      {showAddDutyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Navbatdagi shifokor biriktirish</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Shifokor *</label>
                <select
                  value={dutyForm.doctor_id}
                  onChange={(e) => setDutyForm({ ...dutyForm, doctor_id: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
                  required
                >
                  <option value="">Shifokorni tanlang...</option>
                  {availableDoctors.map(doctor => (
                    <option key={doctor._id} value={doctor._id}>
                      {doctor.first_name} {doctor.last_name} - {doctor.specialization}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Sana *</label>
                <input
                  type="date"
                  value={dutyForm.shift_date}
                  onChange={(e) => setDutyForm({ ...dutyForm, shift_date: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Smena turi *</label>
                <select
                  value={dutyForm.shift_type}
                  onChange={(e) => setDutyForm({ ...dutyForm, shift_type: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
                >
                  <option value="morning">Ertalabki</option>
                  <option value="evening">Kechki</option>
                  <option value="night">Tungi</option>
                  <option value="full_day">Kun bo'yi</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Boshlanish *</label>
                  <input
                    type="time"
                    value={dutyForm.start_time}
                    onChange={(e) => setDutyForm({ ...dutyForm, start_time: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Tugash *</label>
                  <input
                    type="time"
                    value={dutyForm.end_time}
                    onChange={(e) => setDutyForm({ ...dutyForm, end_time: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Izoh</label>
                <textarea
                  value={dutyForm.notes}
                  onChange={(e) => setDutyForm({ ...dutyForm, notes: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
                  rows="3"
                  placeholder="Izoh yozing..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddDutyModal(false)}
                  className="flex-1 px-4 py-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleAddDutyDoctor}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  Biriktirish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
