import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import api from '../services/api';

const SpeechTherapistPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState(null);
  const [todayStats, setTodayStats] = useState({
    patients: 0,
    revenue: 0,
    workDuration: 0
  });
  const [tasks, setTasks] = useState([]);
  const [salary, setSalary] = useState(null);
  const [qrCode, setQrCode] = useState('');
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const qrInputRef = useRef(null);
  const lastScanTime = useRef(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadAttendance(),
        loadTodayStats(),
        loadTasks(),
        loadSalary()
      ]);
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    try {
      const response = await api.get('/attendance/today');
      if (response.data.success) {
        setAttendance(response.data.data);
      }
    } catch (error) {
      console.error('Load attendance error:', error);
    }
  };

  const loadTodayStats = async () => {
    try {
      const response = await api.get('/staff/my-stats/today');
      if (response.data.success) {
        setTodayStats(response.data.data);
      }
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const response = await api.get('/tasks/my-tasks');
      if (response.data.success) {
        setTasks(response.data.filter(t => t.status !== 'completed'));
      }
    } catch (error) {
      console.error('Load tasks error:', error);
    }
  };

  const loadSalary = async () => {
    try {
      const response = await api.get('/staff-salary/my-salary');
      if (response.data.success) {
        setSalary(response.data.data);
      }
    } catch (error) {
      console.error('Load salary error:', error);
    }
  };

  const handleCheckIn = async () => {
    try {
      const response = await api.post('/attendance/check-in');
      if (response.data.success) {
        toast.success('Kelish vaqti belgilandi!');
        loadAttendance();
      }
    } catch (error) {
      toast.error('Xatolik: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCheckOut = async () => {
    try {
      const response = await api.post('/attendance/check-out');
      if (response.data.success) {
        toast.success('Ketish vaqti belgilandi!');
        loadAttendance();
        loadTodayStats();
      }
    } catch (error) {
      toast.error('Xatolik: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleQrScan = async (e) => {
    const code = e.target.value.trim();
    
    if (!code) return;

    const now = Date.now();
    if (now - lastScanTime.current < 500) {
      setQrCode('');
      return;
    }
    lastScanTime.current = now;

    try {
      const [patientNumber, invoiceNumber] = code.split('-');
      
      const response = await api.get(`/invoices/by-qr/${patientNumber}/${invoiceNumber}`);
      
      if (response.data.success) {
        setSelectedPatient(response.data.data);
        setShowPatientModal(true);
        toast.success('Bemor topildi!');
      }
    } catch (error) {
      toast.error('QR kod noto\'g\'ri yoki bemor topilmadi');
    } finally {
      setQrCode('');
      qrInputRef.current?.focus();
    }
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}s ${mins}d`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">Logoped Paneli</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Xush kelibsiz, {user?.first_name} {user?.last_name}!
        </p>
      </div>

      {/* QR Scanner */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined">qr_code_scanner</span>
          QR Kod Skaneri
        </h2>
        <input
          ref={qrInputRef}
          type="text"
          value={qrCode}
          onChange={(e) => setQrCode(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleQrScan(e)}
          placeholder="QR kodni skanerlang..."
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-lg"
          autoFocus
        />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Bemorning QR kodini skanerlang yoki kiriting
        </p>
      </div>

      {/* Attendance */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined">schedule</span>
          Kelib-Ketish Vaqti
        </h2>
        
        {attendance ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Kelish vaqti</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {new Date(attendance.check_in).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              
              {attendance.check_out && (
                <>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ketish vaqti</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {new Date(attendance.check_out).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ish vaqti</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatDuration(attendance.work_duration)}
                    </p>
                  </div>
                </>
              )}
            </div>
            
            {!attendance.check_out && (
              <button
                onClick={handleCheckOut}
                className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">logout</span>
                Ketish vaqtini belgilash
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={handleCheckIn}
            className="w-full px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:opacity-90 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">login</span>
            Kelish vaqtini belgilash
          </button>
        )}
      </div>

      {/* Today Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <span className="material-symbols-outlined text-4xl mb-2">people</span>
          <p className="text-4xl font-black">{todayStats.patients}</p>
          <p className="text-sm opacity-90 mt-1">Bugungi bemorlar</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <span className="material-symbols-outlined text-4xl mb-2">payments</span>
          <p className="text-2xl font-black">{formatCurrency(todayStats.revenue)}</p>
          <p className="text-sm opacity-90 mt-1">Bugungi daromad</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <span className="material-symbols-outlined text-4xl mb-2">timer</span>
          <p className="text-4xl font-black">{formatDuration(todayStats.workDuration || (attendance?.work_duration || 0))}</p>
          <p className="text-sm opacity-90 mt-1">Ish vaqti</p>
        </div>
      </div>

      {/* Tasks */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined">task</span>
          Mening Vazifalarim
        </h2>
        
        {tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.map(task => (
              <div key={task._id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-4 border-primary">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{task.title}</h3>
                    {task.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        task.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        task.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {task.priority === 'urgent' ? '🚨 Juda muhim' :
                         task.priority === 'high' ? '🔴 Muhim' :
                         task.priority === 'medium' ? '🟡 O\'rta' : '🟢 Past'}
                      </span>
                      {task.due_date && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          📅 {new Date(task.due_date).toLocaleDateString('uz-UZ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700">task_alt</span>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Vazifalar yo'q</p>
          </div>
        )}
      </div>

      {/* Salary */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined">account_balance_wallet</span>
          Mening Maoshim
        </h2>
        
        {salary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Asosiy maosh</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(salary.base_salary)}
              </p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Bonuslar</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                +{formatCurrency(salary.bonuses || 0)}
              </p>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Chegirmalar</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                -{formatCurrency(salary.deductions || 0)}
              </p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Jami</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {formatCurrency(salary.total_salary)}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700">account_balance</span>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Maosh ma'lumotlari yo'q</p>
          </div>
        )}
      </div>

      {/* Patient Modal */}
      {showPatientModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Bemor Ma'lumotlari</h3>
              <button
                onClick={() => setShowPatientModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">F.I.O</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedPatient.patient.first_name} {selectedPatient.patient.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Bemor raqami</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedPatient.patient.patient_number}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Telefon</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedPatient.patient.phone}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tug'ilgan sana</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {new Date(selectedPatient.patient.date_of_birth).toLocaleDateString('uz-UZ')}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Xizmatlar</h4>
                <div className="space-y-2">
                  {selectedPatient.services.map((service, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <span className="text-gray-900 dark:text-white">{service.service_name}</span>
                      <span className="font-semibold text-primary">{formatCurrency(service.price)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span className="text-gray-900 dark:text-white">Jami summa:</span>
                  <span className="text-primary">{formatCurrency(selectedPatient.total_amount)}</span>
                </div>
              </div>

              <button
                onClick={() => navigate(`/patients/${selectedPatient.patient._id}`)}
                className="w-full px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:opacity-90"
              >
                Bemor profiliga o'tish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeechTherapistPanel;
