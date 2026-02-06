import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import nurseService from '../services/nurseService';
import doctorNurseService from '../services/doctorNurseService';
import communicationService from '../services/communicationService';
import toast, { Toaster } from 'react-hot-toast';
import { io } from 'socket.io-client';

export default function NursePanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Dashboard stats
  const [stats, setStats] = useState({
    pending_treatments: 0,
    overdue_treatments: 0,
    total_patients: 0,
    active_calls: 0
  });

  // Treatments
  const [treatments, setTreatments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [calls, setCalls] = useState([]);

  // Messages
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedPatientForMessage, setSelectedPatientForMessage] = useState(null);
  const [messageText, setMessageText] = useState('');

  // History
  const [history, setHistory] = useState([]);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState(null);

  // Filters
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals
  const [showCompleteTreatmentModal, setShowCompleteTreatmentModal] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState(null);
  const [treatmentNotes, setTreatmentNotes] = useState('');

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [activeTab, selectedFloor, selectedStatus]);

  // Audio notification setup
  useEffect(() => {
    // Create audio context for alarm sound
    // WebSocket connection for real-time notifications (faqat toast xabarlari)
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    const socket = io(apiUrl.replace('/api/v1', ''));

    // Listen for nurse calls
    socket.on('nurse-call', (data) => {
      console.log('Nurse call received:', data);
      toast.success(`🔔 ${data.patientName} chaqiryapti! Xona: ${data.roomNumber}`, {
        duration: 10000,
        icon: '🚨'
      });
    });

    // Listen for treatment notifications
    socket.on('treatment-notification', (data) => {
      console.log('Treatment notification received:', data);
      toast.success(`⏰ Muolaja vaqti! ${data.patientName} - ${data.medicationName}`, {
        duration: 10000,
        icon: '💊'
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'dashboard' || activeTab === 'treatments') {
        const [statsData, treatmentsData] = await Promise.all([
          nurseService.getStats(),
          nurseService.getTreatments({ status: selectedStatus, floor: selectedFloor })
        ]);
        
        if (statsData.success) {
          setStats(statsData.data);
        } else {
          console.error('Stats error:', statsData);
          toast.error('Statistika yuklanmadi');
        }
        
        if (treatmentsData.success) {
          setTreatments(treatmentsData.data);
        } else {
          console.error('Treatments error:', treatmentsData);
        }
      }
      
      if (activeTab === 'patients' || activeTab === 'messages') {
        const patientsData = await nurseService.getPatients({ floor: selectedFloor });
        console.log('Patients data:', patientsData);
        if (patientsData.success) setPatients(patientsData.data);
      }
      
      if (activeTab === 'calls') {
        const callsData = await nurseService.getCalls();
        console.log('Calls data:', callsData);
        if (callsData.success) setCalls(callsData.data);
      }
      
      if (activeTab === 'history') {
        const historyData = await nurseService.getHistory();
        console.log('History data:', historyData);
        if (historyData.success) setHistory(historyData.data);
      }
    } catch (error) {
      console.error('Load error:', error);
      toast.error('Ma\'lumotlarni yuklashda xatolik: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTreatment = async () => {
    try {
      const response = await doctorNurseService.completeTask(selectedTreatment.id, {
        notes: treatmentNotes
      });
      
      if (response.success) {
        toast.success('Muolaja yakunlandi va dori dorixonadan ayirildi');
        setShowCompleteTreatmentModal(false);
        setSelectedTreatment(null);
        setTreatmentNotes('');
        loadData();
      } else {
        console.error('Response not successful:', response);
        toast.error('Xatolik: ' + (response.message || response.error));
      }
    } catch (error) {
      console.error('=== FRONTEND ERROR ===');
      console.error('Complete treatment error:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      toast.error('Xatolik yuz berdi: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleAcceptCall = async (callId) => {
    try {
      const response = await nurseService.acceptCall(callId);
      if (response.success) {
        toast.success('Chaqiruv qabul qilindi');
        loadData();
      }
    } catch (error) {
      toast.error('Xatolik yuz berdi');
    }
  };

  const openCompleteTreatmentModal = (treatment) => {
    setSelectedTreatment(treatment);
    setTreatmentNotes('');
    setShowCompleteTreatmentModal(true);
  };

  const openMessageModal = (patient) => {
    setSelectedPatientForMessage(patient);
    setMessageText('');
    setShowMessageModal(true);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      toast.error('Xabar matnini kiriting');
      return;
    }

    try {
      const response = await communicationService.sendMessage({
        patient_id: selectedPatientForMessage.patient_id,
        message: messageText,
        metadata: {
          room_number: selectedPatientForMessage.room_number,
          bed_number: selectedPatientForMessage.bed_number,
          diagnosis: selectedPatientForMessage.diagnosis
        }
      });

      if (response.success) {
        toast.success('Xabar yuborildi!');
        setShowMessageModal(false);
        setSelectedPatientForMessage(null);
        setMessageText('');
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Xabar yuborishda xatolik: ' + (error.response?.data?.message || error.message));
    }
  };

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase();
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[statusLower] || 'bg-gray-100 text-gray-700';
  };

  const getStatusText = (status) => {
    const statusLower = status?.toLowerCase();
    const texts = {
      pending: 'Kutilmoqda',
      completed: 'Bajarildi',
      cancelled: 'Bekor qilindi'
    };
    return texts[statusLower] || status;
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
      <div className="bg-gradient-to-r from-pink-500 to-rose-600 rounded-2xl p-4 sm:p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="material-symbols-outlined text-4xl sm:text-5xl">medical_services</span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black">HAMSHIRA PANELI</h1>
              <p className="text-sm sm:text-lg opacity-90">Xush kelibsiz, {user?.first_name || 'Hamshira'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Stats */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 sm:p-6 text-white">
            <span className="material-symbols-outlined text-2xl sm:text-3xl mb-2">schedule</span>
            <p className="text-2xl sm:text-4xl font-black">{stats.pending_treatments}</p>
            <p className="text-xs sm:text-sm opacity-90">Bajarilishi kerak</p>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 sm:p-6 text-white">
            <span className="material-symbols-outlined text-2xl sm:text-3xl mb-2">warning</span>
            <p className="text-2xl sm:text-4xl font-black">{stats.overdue_treatments}</p>
            <p className="text-xs sm:text-sm opacity-90">Kechikkan</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 sm:p-6 text-white">
            <span className="material-symbols-outlined text-2xl sm:text-3xl mb-2">bed</span>
            <p className="text-2xl sm:text-4xl font-black">{stats.total_patients}</p>
            <p className="text-xs sm:text-sm opacity-90">Yotgan bemorlar</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 sm:p-6 text-white">
            <span className="material-symbols-outlined text-2xl sm:text-3xl mb-2">notifications_active</span>
            <p className="text-2xl sm:text-4xl font-black">{stats.active_calls}</p>
            <p className="text-xs sm:text-sm opacity-90">Faol chaqiruvlar</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-1 sm:gap-2 px-2 sm:px-4 overflow-x-auto scrollbar-hide">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
              { id: 'treatments', label: 'Muolajalar', icon: 'medication' },
              { id: 'patients', label: 'Bemorlar', icon: 'bed' },
              { id: 'calls', label: 'Chaqiruvlar', icon: 'notifications' },
              { id: 'messages', label: 'Xabarlar', icon: 'mail' },
              { id: 'history', label: 'Tarix', icon: 'history' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 font-semibold border-b-2 transition-colors whitespace-nowrap text-xs sm:text-sm ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-base sm:text-xl">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold">Bugungi muolajalar</h3>
              {treatments.length === 0 ? (
                <p className="text-gray-600">Muolajalar yo'q</p>
              ) : (
                <div className="space-y-2">
                  {treatments.slice(0, 5).map(treatment => (
                    <div key={treatment.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">{treatment.patient_name}</p>
                            {treatment.prescription_type && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                treatment.prescription_type === 'URGENT' 
                                  ? 'bg-orange-100 text-orange-700'
                                  : treatment.prescription_type === 'CHRONIC'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {treatment.prescription_type === 'URGENT' ? '🚨' : 
                                 treatment.prescription_type === 'CHRONIC' ? '📅' : 
                                 '📋'}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{treatment.medication_name} - {treatment.dosage}</p>
                          
                          {/* Xona va koyka */}
                          {treatment.admission_info?.is_admitted && treatment.admission_info.room_info ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {treatment.admission_info.admission_type === 'inpatient' ? (
                                <>
                                  🏥 Stasionar - Xona {treatment.admission_info.room_info.room_number || 'N/A'}, Ko'rpa {treatment.admission_info.room_info.bed_number || 'N/A'}
                                </>
                              ) : (
                                <>
                                  🚪 Ambulator - Xona {treatment.admission_info.room_info.room_number || 'N/A'}, 
                                  Ko'rpa {treatment.admission_info.room_info.bed_number || 'N/A'}
                                </>
                              )}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              ❌ Hali yotqizilmagan
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{new Date(treatment.scheduled_time).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</p>
                          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(treatment.status)}`}>
                            {getStatusText(treatment.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'treatments' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <select
                  value={selectedFloor}
                  onChange={(e) => setSelectedFloor(e.target.value)}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 border rounded-lg text-sm sm:text-base dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="">Barcha qavatlar</option>
                  <option value="1">1-qavat</option>
                  <option value="2">2-qavat</option>
                  <option value="3">3-qavat</option>
                </select>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 border rounded-lg text-sm sm:text-base dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="all">Barcha statuslar</option>
                  <option value="pending">Kutilmoqda</option>
                  <option value="completed">Bajarildi</option>
                </select>
              </div>
              
              {treatments.length === 0 ? (
                <p className="text-center py-12 text-gray-600 dark:text-gray-400">Muolajalar topilmadi</p>
              ) : (
                <div className="space-y-2">
                  {treatments.map(treatment => (
                    <div key={treatment.id} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-bold text-base sm:text-lg truncate">{treatment.patient_name}</p>
                            {/* Retsept turi */}
                            {treatment.prescription_type && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                treatment.prescription_type === 'URGENT' 
                                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                                  : treatment.prescription_type === 'CHRONIC'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                              }`}>
                                {treatment.prescription_type === 'URGENT' ? '🚨 Shoshilinch' : 
                                 treatment.prescription_type === 'CHRONIC' ? '📅 Surunkali' : 
                                 '📋 Oddiy'}
                              </span>
                            )}
                          </div>
                          
                          {/* Yotqizilgan joy */}
                          {treatment.admission_info && (
                            <div className="mb-2">
                              {treatment.admission_info.is_admitted ? (
                                <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                                  <span className="material-symbols-outlined text-base">hotel</span>
                                  {treatment.admission_info.admission_type === 'inpatient' ? (
                                    <span>
                                      🏥 Stasionar - {treatment.admission_info.room_info?.room_name || 'Xona'} {treatment.admission_info.room_info?.room_number || 'N/A'}, 
                                      Ko'rpa {treatment.admission_info.room_info?.bed_number || 'N/A'}
                                      {treatment.admission_info.room_info?.floor && ` (${treatment.admission_info.room_info.floor}-qavat)`}
                                    </span>
                                  ) : (
                                    <span>
                                      🚪 Ambulator - Xona {treatment.admission_info.room_info?.room_number || 'N/A'}
                                      {treatment.admission_info.room_info?.bed_number && `, Ko'rpa ${treatment.admission_info.room_info.bed_number}`}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-500">
                                  <span className="material-symbols-outlined text-base">info</span>
                                  <span>❌ Hali yotqizilmagan</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <p className="text-xs sm:text-sm mt-2"><span className="font-semibold">Dori:</span> {treatment.medication_name}</p>
                          <p className="text-xs sm:text-sm"><span className="font-semibold">Doza:</span> {treatment.dosage}</p>
                          
                          {/* Jadval ma'lumotlari */}
                          {treatment.frequency_per_day && (
                            <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                              <p className="text-xs sm:text-sm">
                                <span className="font-semibold">📅 Jadval:</span> Kuniga {treatment.frequency_per_day} marta
                                {treatment.duration_days && `, ${treatment.duration_days} kun davomida`}
                              </p>
                              {treatment.schedule_times && treatment.schedule_times.length > 0 && (
                                <p className="text-xs sm:text-sm mt-1">
                                  <span className="font-semibold">🕐 Vaqtlar:</span> {treatment.schedule_times.join(', ')}
                                </p>
                              )}
                            </div>
                          )}
                          
                          <p className="text-xs sm:text-sm mt-2"><span className="font-semibold">Boshlangan:</span> {new Date(treatment.scheduled_time).toLocaleString('uz-UZ')}</p>
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end gap-2">
                          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap ${getStatusColor(treatment.status)}`}>
                            {getStatusText(treatment.status)}
                          </span>
                          {(treatment.status === 'pending' || treatment.status === 'PENDING') && (
                            <button
                              onClick={() => openCompleteTreatmentModal(treatment)}
                              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold text-xs sm:text-sm whitespace-nowrap"
                            >
                              ✓ Yakunlash
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'patients' && (
            <div className="space-y-4">
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 border rounded-lg text-sm sm:text-base dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="">Barcha qavatlar</option>
                <option value="1">1-qavat</option>
                <option value="2">2-qavat</option>
                <option value="3">3-qavat</option>
              </select>
              
              {patients.length === 0 ? (
                <p className="text-center py-12 text-gray-600 dark:text-gray-400">Bemorlar topilmadi</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {patients.map(patient => (
                    <div key={patient.id} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-3 sm:p-4">
                      <div className="flex items-center gap-2 sm:gap-3 mb-3">
                        <div className="size-10 sm:size-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-xl sm:text-2xl">person</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm sm:text-base truncate">{patient.patient_name}</p>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{patient.patient_number}</p>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs sm:text-sm">
                        <p><span className="font-semibold">Xona:</span> {patient.room_number}</p>
                        <p><span className="font-semibold">Ko'rpa:</span> {patient.bed_number}</p>
                        <p className="truncate"><span className="font-semibold">Shifokor:</span> {patient.doctor_name}</p>
                        <p className="truncate"><span className="font-semibold">Tashxis:</span> {patient.diagnosis}</p>
                        <p className="text-orange-600 dark:text-orange-400"><span className="font-semibold">Kutilayotgan:</span> {patient.pending_treatments}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'calls' && (
            <div className="space-y-4">
              {calls.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">notifications_off</span>
                  <p className="text-gray-600">Faol chaqiruvlar yo'q</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {calls.map(call => (
                    <div key={call.id} className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-lg">{call.patient_name}</p>
                        <p className="text-gray-600">Xona {call.room_number}, Ko'rpa {call.bed_number}</p>
                        <p className="text-sm text-gray-500">{new Date(call.created_at).toLocaleString('uz-UZ')}</p>
                      </div>
                      <button
                        onClick={() => handleAcceptCall(call.id)}
                        className="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600"
                      >
                        Qabul qilish
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold">Bemorlarga xabar yuborish</h3>
              {patients.length === 0 ? (
                <p className="text-center py-12 text-gray-600">Sizga biriktirilgan bemorlar yo'q</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {patients.map(patient => (
                    <div key={patient.patient_id} className="bg-white dark:bg-gray-800 border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="size-12 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-green-600">person</span>
                        </div>
                        <div>
                          <p className="font-bold">{patient.patient_name}</p>
                          <p className="text-sm text-gray-600">{patient.patient_number}</p>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm mb-3">
                        <p><span className="font-semibold">Xona:</span> {patient.room_number || 'N/A'}</p>
                        <p><span className="font-semibold">Ko'rpa:</span> {patient.bed_number || 'N/A'}</p>
                        <p><span className="font-semibold">Tashxis:</span> {patient.diagnosis || 'N/A'}</p>
                      </div>
                      <button
                        onClick={() => openMessageModal(patient)}
                        className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-lg">mail</span>
                        Xabar yuborish
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold">Muolaja tarixi</h3>
              
              {!selectedPatientHistory ? (
                // Bemorlar ro'yxati
                <div>
                  {history.length === 0 ? (
                    <div className="text-center py-12">
                      <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">history</span>
                      <p className="text-gray-600 dark:text-gray-400">Hali muolaja qilingan bemorlar yo'q</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {history.map(item => (
                        <div 
                          key={item.id}
                          onClick={() => setSelectedPatientHistory(item)}
                          className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="size-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-2xl">check_circle</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-base truncate">{item.patient_name}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {new Date(item.completed_at).toLocaleDateString('uz-UZ')}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p><span className="font-semibold">Xona:</span> {item.room_number || 'N/A'}</p>
                            <p><span className="font-semibold">Ko'rpa:</span> {item.bed_number || 'N/A'}</p>
                            <p className="truncate"><span className="font-semibold">Tashxis:</span> {item.medicine_name || 'N/A'}</p>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {item.completed_by_name || 'Hamshira'}
                            </span>
                            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Bemor muolajalar tafsiloti
                <div>
                  <button
                    onClick={() => setSelectedPatientHistory(null)}
                    className="mb-4 flex items-center gap-2 text-primary hover:text-primary/80 font-semibold"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                    Orqaga
                  </button>
                  
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white mb-6">
                    <div className="flex items-center gap-4">
                      <div className="size-16 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl">person</span>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">{selectedPatientHistory.patient_name}</h2>
                        <p className="text-sm opacity-90">Xona {selectedPatientHistory.room_number}, Ko'rpa {selectedPatientHistory.bed_number}</p>
                        <p className="text-sm opacity-90">Yakunlangan: {new Date(selectedPatientHistory.completed_at).toLocaleString('uz-UZ')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
                    <h3 className="text-lg font-bold mb-4">Muolaja tafsilotlari</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-2xl">medication</span>
                        <div className="flex-1">
                          <p className="font-semibold">{selectedPatientHistory.medicine_name || 'Davolash'}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{selectedPatientHistory.dosage || 'Standart doza'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-2xl">person</span>
                        <div className="flex-1">
                          <p className="font-semibold">Bajargan hamshira</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{selectedPatientHistory.completed_by_name || 'Hamshira'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-2xl">event</span>
                        <div className="flex-1">
                          <p className="font-semibold">Yakunlangan vaqt</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(selectedPatientHistory.completed_at).toLocaleString('uz-UZ', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Complete Treatment Modal */}
      {showCompleteTreatmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Muolajani bajarish</h3>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <p className="font-semibold text-sm sm:text-base">{selectedTreatment?.patient_name}</p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{selectedTreatment?.medicine_name} - {selectedTreatment?.medicine_dosage}</p>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold mb-2">Izoh (ixtiyoriy)</label>
                <textarea
                  value={treatmentNotes}
                  onChange={(e) => setTreatmentNotes(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 border dark:border-gray-700 dark:bg-gray-900 rounded-lg text-sm sm:text-base"
                  rows="3"
                  placeholder="Izoh yozing..."
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => setShowCompleteTreatmentModal(false)}
                  className="w-full sm:flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm sm:text-base"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleCompleteTreatment}
                  className="w-full sm:flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm sm:text-base"
                >
                  Tasdiqlash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Bemorga xabar yuborish</h3>
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="size-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-green-600">person</span>
                  </div>
                  <div>
                    <p className="font-bold">{selectedPatientForMessage?.patient_name}</p>
                    <p className="text-sm text-gray-600">{selectedPatientForMessage?.patient_number}</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Xabar matni *</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg"
                  rows="5"
                  placeholder="Xabar matnini kiriting..."
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowMessageModal(false);
                    setSelectedPatientForMessage(null);
                    setMessageText('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleSendMessage}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">send</span>
                  Yuborish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
