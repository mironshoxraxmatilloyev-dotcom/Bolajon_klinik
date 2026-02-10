import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import DateInput from '../components/DateInput';

export default function OnDutyDoctors() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // On-duty doctors
  const [onDutySchedule, setOnDutySchedule] = useState([]);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [showAddDutyModal, setShowAddDutyModal] = useState(false);
  const [editingDuty, setEditingDuty] = useState(null);
  const [dutyForm, setDutyForm] = useState({
    doctor_id: '',
    shift_date: new Date().toISOString().split('T')[0],
    shift_type: 'morning',
    start_time: '09:00',
    end_time: '18:00',
    notes: ''
  });

  // Filters
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  });

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [scheduleRes, doctorsRes] = await Promise.all([
        api.get('/chief-doctor/on-duty-schedule', {
          params: { start_date: startDate, end_date: endDate }
        }),
        api.get('/chief-doctor/available-doctors')
      ]);
      
      if (scheduleRes.data.success) {
        setOnDutySchedule(scheduleRes.data.data);
      }
      if (doctorsRes.data.success) {
        setAvailableDoctors(doctorsRes.data.data);
      }
    } catch (error) {
      console.error('Load data error:', error);
      toast.error('Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingDuty(null);
    setDutyForm({
      doctor_id: '',
      shift_date: new Date().toISOString().split('T')[0],
      shift_type: 'morning',
      start_time: '09:00',
      end_time: '18:00',
      notes: ''
    });
    setShowAddDutyModal(true);
  };

  const handleOpenEditModal = (duty) => {
    setEditingDuty(duty);
    setDutyForm({
      doctor_id: duty.doctor_id._id,
      shift_date: new Date(duty.shift_date).toISOString().split('T')[0],
      shift_type: duty.shift_type,
      start_time: duty.start_time,
      end_time: duty.end_time,
      notes: duty.notes || ''
    });
    setShowAddDutyModal(true);
  };

  const handleSaveDutyDoctor = async () => {
    try {
      if (!dutyForm.doctor_id) {
        toast.error('Shifokorni tanlang');
        return;
      }

      if (editingDuty) {
        // Update
        const response = await api.put(`/chief-doctor/on-duty-schedule/${editingDuty._id}`, dutyForm);
        if (response.data.success) {
          toast.success('Navbat yangilandi');
        }
      } else {
        // Create
        const response = await api.post('/chief-doctor/on-duty-schedule', dutyForm);
        if (response.data.success) {
          toast.success('Navbatdagi shifokor biriktirildi');
        }
      }
      
      setShowAddDutyModal(false);
      loadData();
    } catch (error) {
      console.error('Save duty doctor error:', error);
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

  const getShiftTypeText = (type) => {
    const types = {
      morning: 'Ertalabki',
      evening: 'Kechki',
      night: 'Tungi',
      full_day: 'Kun bo\'yi'
    };
    return types[type] || type;
  };

  const getShiftTypeColor = (type) => {
    const colors = {
      morning: 'bg-yellow-100 text-yellow-700',
      evening: 'bg-orange-100 text-orange-700',
      night: 'bg-indigo-100 text-indigo-700',
      full_day: 'bg-green-100 text-green-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
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
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-5xl">event_available</span>
            <div>
              <h1 className="text-3xl font-black">NAVBATDAGI SHIFOKORLAR</h1>
              <p className="text-lg opacity-90">Shifokorlar navbat jadvali</p>
            </div>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-semibold flex items-center gap-2"
          >
            <span className="material-symbols-outlined">add</span>
            Shifokor biriktirish
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold mb-2">Boshlanish sanasi</label>
            <DateInput
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Tugash sanasi</label>
            <DateInput
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
            />
          </div>
          <button
            onClick={loadData}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Qidirish
          </button>
        </div>
      </div>

      {/* Schedule List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-xl font-bold mb-4">Jadval</h3>
        
        {onDutySchedule.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">event_busy</span>
            <p className="text-gray-600 dark:text-gray-400">Navbatdagi shifokorlar yo'q</p>
          </div>
        ) : (
          <div className="space-y-3">
            {onDutySchedule.map(duty => (
              <div key={duty._id} className="bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="size-14 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">person</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-lg">{duty.doctor_id?.first_name} {duty.doctor_id?.last_name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{duty.doctor_id?.specialization}</p>
                      <p className="text-sm text-gray-500">{duty.doctor_id?.phone}</p>
                    </div>
                  </div>
                  
                  <div className="text-center mx-4">
                    <p className="font-semibold text-lg">{new Date(duty.shift_date).toLocaleDateString('uz-UZ')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{duty.start_time} - {duty.end_time}</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${getShiftTypeColor(duty.shift_type)}`}>
                      {getShiftTypeText(duty.shift_type)}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEditModal(duty)}
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      title="Tahrirlash"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteDutyDoctor(duty._id)}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      title="O'chirish"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
                
                {duty.notes && (
                  <div className="mt-3 bg-white dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-semibold">Izoh:</span> {duty.notes}
                    </p>
                  </div>
                )}
                
                {duty.assigned_by && (
                  <p className="text-xs text-gray-500 mt-2">
                    Biriktirgan: {duty.assigned_by.first_name} {duty.assigned_by.last_name}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Duty Doctor Modal */}
      {showAddDutyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {editingDuty ? 'Navbatni tahrirlash' : 'Navbatdagi shifokor biriktirish'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Shifokor *</label>
                <select
                  value={dutyForm.doctor_id}
                  onChange={(e) => setDutyForm({ ...dutyForm, doctor_id: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
                  required
                  disabled={editingDuty} // Can't change doctor when editing
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
                <DateInput
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
                  onClick={handleSaveDutyDoctor}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  {editingDuty ? 'Saqlash' : 'Biriktirish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
