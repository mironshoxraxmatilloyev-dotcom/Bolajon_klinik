import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { patientService } from '../services/patientService';
import { prescriptionService } from '../services/prescriptionService';
import treatmentService from '../services/treatmentService';
import Modal from '../components/Modal';
import AlertModal from '../components/AlertModal';
import PatientQRModal from '../components/PatientQRModal';
import DateInput from '../components/DateInput';

const PatientProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const isDoctor = user?.role?.name === 'Doctor';
  
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [labResults, setLabResults] = useState([]); // labOrders -> labResults
  const [admissions, setAdmissions] = useState([]);
  const [assignedSpecialists, setAssignedSpecialists] = useState([]);
  const [treatmentSchedule, setTreatmentSchedule] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showQRModal, setShowQRModal] = useState(false);
  
  // Modals
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [showAddLabModal, setShowAddLabModal] = useState(false);
  const [recordForm, setRecordForm] = useState({
    diagnosis_text: '',
    treatment_plan: '',
    notes: ''
  });

  // Alert modal
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  const showAlert = (message, type = 'info', title = '') => {
    setAlertModal({ isOpen: true, title, message, type });
  };

  useEffect(() => {
    loadPatientData();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'treatments') {
      loadTreatmentSchedule();
    } else if (activeTab === 'specialists') {
      loadAssignedSpecialists();
    }
  }, [activeTab, selectedDate, id]);

  const loadTreatmentSchedule = async () => {
    try {
      const response = await treatmentService.getPatientDailySchedule(id, selectedDate);
      if (response.success) {
        setTreatmentSchedule(response.data);
      }
    } catch (error) {
      console.error('Load treatment schedule error:', error);
    }
  };

  const loadAssignedSpecialists = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1'}/appointments/patient/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setAssignedSpecialists(data.data || []);
      }
    } catch (error) {
      console.error('Load specialists error:', error);
    }
  };

  const loadPatientData = async () => {
    try {
      setLoading(true);
      
      const response = await patientService.getPatient(id);
      
      if (response.success && response.data) {
        setPatient(response.data.patient);
        setMedicalRecords(response.data.medicalRecords || []);
        setInvoices(response.data.invoices || []);
        setLabResults(response.data.labResults || []); // labOrders -> labResults
        setAdmissions(response.data.admissions || []);
      } else {
        console.error('Invalid response:', response);
        showAlert('Bemor ma\'lumotlari topilmadi', 'error', 'Xatolik');
      }
      
      // Load prescriptions
      try {
        const prescResponse = await prescriptionService.getPatientPrescriptions(id);
        if (prescResponse.success) {
          setPrescriptions(prescResponse.data || []);
        }
      } catch (error) {
        console.error('Load prescriptions error:', error);
        console.error('Error response:', error.response?.data);
      }
    } catch (error) {
      console.error('Load patient error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      showAlert(`Xatolik: ${error.response?.data?.error || error.message}`, 'error', 'Xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedicalRecord = async (e) => {
    e.preventDefault();
    try {
      await patientService.addMedicalRecord(id, recordForm);
      setShowAddRecordModal(false);
      setRecordForm({ diagnosis_text: '', treatment_plan: '', notes: '' });
      loadPatientData();
    } catch (error) {
      console.error('Add record error:', error);
    }
  };

  const formatPhone = (phone) => {
    if (!phone) return '-';
    return phone.replace(/(\+998)(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-8 text-center">
        <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">person_off</span>
        <p className="text-gray-500">Bemor topilmadi</p>
        <button
          onClick={() => navigate('/patients')}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
        >
          Orqaga
        </button>
      </div>
    );
  }

  const fullName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white self-start"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Orqaga
        </button>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowQRModal(true)}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">qr_code</span>
            <span className="hidden sm:inline">QR Kod</span>
          </button>
          {!isDoctor && (
            <button
              onClick={() => navigate(`/patients/${id}/edit`)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">edit</span>
              <span className="hidden sm:inline">Tahrirlash</span>
            </button>
          )}
        </div>
      </div>

      {/* Patient Info Card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          {patient.photo_url ? (
            <img
              src={patient.photo_url}
              alt={fullName}
              className="size-20 sm:size-24 rounded-full object-cover flex-shrink-0 mx-auto sm:mx-0"
            />
          ) : (
            <div className="size-20 sm:size-24 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl sm:text-3xl font-bold flex-shrink-0 mx-auto sm:mx-0">
              {patient.first_name?.[0]}{patient.last_name?.[0]}
            </div>
          )}
          
          <div className="flex-1 w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white break-words">{fullName}</h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                  ID: {patient.patient_number}
                </p>
              </div>
              <div className={`px-3 sm:px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap flex-shrink-0 mx-auto sm:mx-0 ${
                patient.is_blocked 
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              }`}>
                {patient.is_blocked ? 'Bloklangan' : 'Faol'}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Telefon</p>
                <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white break-words">{formatPhone(patient.phone)}</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Tug'ilgan sana</p>
                <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">{formatDate(patient.birth_date)}</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Jinsi</p>
                <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                  {patient.gender === 'Male' ? 'Erkak' : 'Ayol'}
                </p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Balans</p>
                <p className={`font-bold text-sm sm:text-base ${
                  (patient.current_balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(patient.current_balance || 0) >= 0 ? '+' : ''}{(patient.current_balance || 0).toLocaleString()} so'm
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <div className="flex gap-2 sm:gap-4 px-3 sm:px-6 min-w-max">
            {[
              { id: 'overview', label: 'Umumiy', icon: 'dashboard' },
              { id: 'treatments', label: 'Muolaja jadvali', icon: 'schedule' },
              { id: 'prescriptions', label: 'Retseptlar', icon: 'medication' },
              { id: 'specialists', label: 'Mutaxasislar', icon: 'medical_information' },
              { id: 'lab', label: 'Tahlillar', icon: 'biotech' },
              { id: 'billing', label: 'Moliya', icon: 'payments' },
              { id: 'admissions', label: 'Yotqizish', icon: 'bed' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 sm:py-4 border-b-2 transition-colors whitespace-nowrap text-sm sm:text-base ${
                  activeTab === tab.id
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-base sm:text-lg">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 sm:size-12 bg-orange-500 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                      <span className="material-symbols-outlined text-xl sm:text-2xl">medication</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Retseptlar</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{prescriptions.length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 sm:size-12 bg-purple-500 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                      <span className="material-symbols-outlined text-xl sm:text-2xl">biotech</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Tahlillar</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{labResults.length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center gap-3">
                    <div className="size-10 sm:size-12 bg-green-500 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                      <span className="material-symbols-outlined text-xl sm:text-2xl">receipt_long</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Hisob-fakturalar</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{invoices.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {patient.address && (
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-sm sm:text-base">Manzil</h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 break-words">{patient.address}</p>
                </div>
              )}
            </div>
          )}

          {/* Treatment Schedule Tab */}
          {activeTab === 'treatments' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">Kunlik muolaja jadvali</h3>
                <DateInput
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {!treatmentSchedule ? (
                <div className="text-center py-12">
                  <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Yuklanmoqda...</p>
                </div>
              ) : treatmentSchedule.schedule.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
                    event_busy
                  </span>
                  <p className="text-gray-500 dark:text-gray-400">Bu kun uchun muolajalar yo'q</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">info</span>
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        Jami: <span className="font-bold">{treatmentSchedule.total_treatments}</span> ta muolaja
                      </p>
                    </div>
                  </div>

                  {treatmentSchedule.schedule.map((timeSlot, index) => (
                    <div key={index} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <div className="bg-gradient-to-r from-primary to-primary/80 px-4 py-3">
                        <div className="flex items-center gap-2 text-white">
                          <span className="material-symbols-outlined">schedule</span>
                          <span className="font-bold text-lg">{timeSlot.time}</span>
                        </div>
                      </div>
                      
                      <div className="p-4 space-y-3">
                        {timeSlot.treatments.map((treatment) => (
                          <div key={treatment.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-base sm:text-lg text-gray-900 dark:text-white break-words">
                                  {treatment.medication_name}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 break-words">
                                  Dozasi: {treatment.dosage}
                                </p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 ${
                                treatment.status === 'completed' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                  : treatment.status === 'missed'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                  : treatment.status === 'cancelled'
                                  ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                              }`}>
                                {treatment.status === 'completed' ? 'Bajarildi' :
                                 treatment.status === 'missed' ? 'O\'tkazildi' :
                                 treatment.status === 'cancelled' ? 'Bekor qilindi' : 'Kutilmoqda'}
                              </span>
                            </div>
                            
                            {treatment.instructions && (
                              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                <span className="font-medium">Ko'rsatma:</span> {treatment.instructions}
                              </div>
                            )}
                            
                            {treatment.nurse && (
                              <div className="mt-2 flex items-center gap-2 text-sm">
                                <span className="material-symbols-outlined text-primary text-base">person</span>
                                <span className="text-gray-700 dark:text-gray-300">
                                  Hamshira: <span className="font-semibold">{treatment.nurse.first_name} {treatment.nurse.last_name}</span>
                                </span>
                                {treatment.nurse.phone && (
                                  <span className="text-gray-500 dark:text-gray-400">
                                    ({formatPhone(treatment.nurse.phone)})
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {treatment.completed_at && (
                              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                Bajarilgan vaqt: {formatDate(treatment.completed_at)}
                              </div>
                            )}
                            
                            {treatment.notes && (
                              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-800 dark:text-blue-300">
                                <span className="font-medium">Izoh:</span> {treatment.notes}
                              </div>
                            )}
                            
                            {treatment.prescription && (
                              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                Retsept: {treatment.prescription.prescription_number}
                                {treatment.prescription.diagnosis && ` - ${treatment.prescription.diagnosis}`}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Prescriptions Tab */}
          {activeTab === 'prescriptions' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">Retseptlar</h3>
              </div>

              {prescriptions.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
                    medication
                  </span>
                  <p className="text-gray-500 dark:text-gray-400">Retseptlar yo'q</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {prescriptions.map((prescription) => (
                    <div key={prescription.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-3 mb-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white break-words">
                            Dr. {prescription.doctor_first_name} {prescription.doctor_last_name}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500">
                            {formatDate(prescription.created_at)}
                          </p>
                        </div>
                        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 ${
                          prescription.prescription_type === 'URGENT' 
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        }`}>
                          {prescription.prescription_type === 'URGENT' ? 'Shoshilinch' : 'Oddiy'}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Tashxis:</p>
                          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 break-words">{prescription.diagnosis}</p>
                        </div>
                        
                        {prescription.medications && prescription.medications.length > 0 && (
                          <div>
                            <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Dorilar:</p>
                            <div className="space-y-2">
                              {prescription.medications.map((med, index) => (
                                <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 sm:p-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white break-words">
                                        {med.medication_name}
                                        {med.is_urgent && (
                                          <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded text-xs">
                                            Shoshilinch
                                          </span>
                                        )}
                                      </p>
                                      
                                      {/* Shoshilinch retseptda faqat dori nomi */}
                                      {prescription.prescription_type === 'URGENT' ? (
                                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 italic break-words">
                                          Shoshilinch retsept - batafsil ma'lumotlar shifokor tomonidan og'zaki beriladi
                                        </p>
                                      ) : (
                                        /* Oddiy retseptda to'liq ma'lumotlar */
                                        <div className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                          {med.dosage && (
                                            <p className="break-words"><span className="font-medium">Dozasi:</span> {med.dosage}</p>
                                          )}
                                          {med.frequency && (
                                            <p className="break-words"><span className="font-medium">Qabul qilish:</span> {med.frequency}</p>
                                          )}
                                          {med.duration_days && (
                                            <p><span className="font-medium">Davomiyligi:</span> {med.duration_days} kun</p>
                                          )}
                                          {med.instructions && (
                                            <p className="break-words"><span className="font-medium">Ko'rsatma:</span> {med.instructions}</p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {prescription.notes && (
                          <div>
                            <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Qo'shimcha izohlar:</p>
                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 break-words">{prescription.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mutaxasislar Tab */}
          {activeTab === 'specialists' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg sm:text-xl font-bold">Biriktirilgan mutaxasislar</h3>
              </div>

              {assignedSpecialists.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">person_off</span>
                  <p className="text-gray-500 dark:text-gray-400">Hali mutaxasis biriktirilmagan</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {assignedSpecialists.map((specialist) => (
                    <div key={specialist.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="size-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">person</span>
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-gray-900 dark:text-white">{specialist.doctor_name}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{specialist.specialist_type_label || specialist.specialist_type}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="material-symbols-outlined text-gray-400">schedule</span>
                              <div>
                                <p className="text-gray-500 dark:text-gray-400 text-xs">Kelish vaqti</p>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {new Date(specialist.appointment_time).toLocaleString('uz-UZ')}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm">
                              <span className="material-symbols-outlined text-gray-400">payments</span>
                              <div>
                                <p className="text-gray-500 dark:text-gray-400 text-xs">Narx</p>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {specialist.price?.toLocaleString()} so'm
                                </p>
                              </div>
                            </div>
                            
                            {specialist.notes && (
                              <div className="sm:col-span-2 flex items-start gap-2 text-sm">
                                <span className="material-symbols-outlined text-gray-400">notes</span>
                                <div>
                                  <p className="text-gray-500 dark:text-gray-400 text-xs">Izoh</p>
                                  <p className="text-gray-700 dark:text-gray-300">{specialist.notes}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex sm:flex-col items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            specialist.status === 'completed' 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                              : specialist.status === 'cancelled'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                          }`}>
                            {specialist.status === 'completed' ? 'Bajarildi' : 
                             specialist.status === 'cancelled' ? 'Bekor qilindi' : 
                             'Rejalashtirilgan'}
                          </span>
                          
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(specialist.created_at).toLocaleDateString('uz-UZ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lab Orders Tab */}
          {activeTab === 'lab' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">Tahlil natijalari</h3>
              </div>

              {labResults.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
                    biotech
                  </span>
                  <p className="text-gray-500 dark:text-gray-400">Tahlil natijalari yo'q</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {labResults.map((result) => (
                    <div key={result.result_id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white break-words">
                              {result.test_name}
                            </p>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                              result.is_normal === true ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                              result.is_normal === false ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
                            }`}>
                              {result.is_normal === true ? 'Normal' :
                               result.is_normal === false ? 'Normaldan tashqari' :
                               'Baholash kerak'}
                            </span>
                            {result.status === 'approved' && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 rounded-full text-xs font-semibold whitespace-nowrap">
                                Tasdiqlangan
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-1 text-xs sm:text-sm">
                            {result.test_code && (
                              <p className="text-gray-600 dark:text-gray-400">
                                <span className="font-medium">Kod:</span> {result.test_code}
                              </p>
                            )}
                            {result.result_value && (
                              <p className="text-gray-900 dark:text-white font-semibold">
                                <span className="font-medium text-gray-600 dark:text-gray-400">Natija:</span> {result.result_value} {result.unit}
                                {result.normal_value_min && result.normal_value_max && (
                                  <span className="text-gray-500 dark:text-gray-400 ml-2">
                                    (Normal: {result.normal_value_min} - {result.normal_value_max} {result.unit})
                                  </span>
                                )}
                              </p>
                            )}
                            {result.result_text && (
                              <p className="text-gray-700 dark:text-gray-300 break-words">
                                <span className="font-medium text-gray-600 dark:text-gray-400">Izoh:</span> {result.result_text}
                              </p>
                            )}
                            {result.technician_first_name && (
                              <p className="text-gray-600 dark:text-gray-400 break-words">
                                <span className="font-medium">Laborant:</span> {result.technician_first_name} {result.technician_last_name}
                              </p>
                            )}
                            <p className="text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Sana:</span> {formatDate(result.result_date)}
                            </p>
                            {result.approved_at && result.approved_by_first_name && (
                              <p className="text-gray-600 dark:text-gray-400 break-words">
                                <span className="font-medium">Tasdiqlagan:</span> {result.approved_by_first_name} {result.approved_by_last_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">Moliyaviy ma'lumotlar</h3>
                <div className="text-left sm:text-right">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Joriy balans</p>
                  <p className={`text-xl sm:text-2xl font-bold ${
                    (patient.current_balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(patient.current_balance || 0) >= 0 ? '+' : ''}{(patient.current_balance || 0).toLocaleString()} so'm
                  </p>
                </div>
              </div>
              
              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
                    receipt_long
                  </span>
                  <p className="text-gray-500 dark:text-gray-400">Hisob-fakturalar yo'q</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {invoice.invoice_number || `INV-${invoice.id.slice(0, 8)}`}
                            </p>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              invoice.payment_status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                              invoice.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                              'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                              {invoice.payment_status === 'paid' ? 'To\'langan' :
                               invoice.payment_status === 'partial' ? 'Qisman' :
                               'To\'lanmagan'}
                            </span>
                          </div>
                          
                          <div className="space-y-1 text-sm">
                            <p className="text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Sana:</span> {formatDate(invoice.created_at)}
                            </p>
                            {invoice.description && (
                              <p className="text-gray-600 dark:text-gray-400">
                                <span className="font-medium">Tavsif:</span> {invoice.description}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-bold text-lg text-gray-900 dark:text-white">
                            {(invoice.total_amount || 0).toLocaleString()} so'm
                          </p>
                          {invoice.paid_amount > 0 && invoice.payment_status !== 'paid' && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              To'langan: {(invoice.paid_amount || 0).toLocaleString()} so'm
                            </p>
                          )}
                          {invoice.payment_status !== 'paid' && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              Qarz: {((invoice.total_amount || 0) - (invoice.paid_amount || 0)).toLocaleString()} so'm
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Admissions Tab */}
          {activeTab === 'admissions' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-900 dark:text-white">Yotqizish tarixi</h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Jami: {admissions.length}
                </span>
              </div>
              
              {admissions.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
                    bed
                  </span>
                  <p className="text-gray-500 dark:text-gray-400">Yotqizish tarixi yo'q</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {admissions.map((admission) => (
                    <div key={admission.id} className={`rounded-lg p-4 border-2 ${
                      admission.display_status === 'ACTIVE' 
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-700' 
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              admission.display_status === 'ACTIVE' 
                                ? 'bg-green-600 text-white' 
                                : admission.display_status === 'DISCHARGED'
                                ? 'bg-gray-500 text-white'
                                : 'bg-green-500 text-white'
                            }`}>
                              {admission.display_status === 'ACTIVE' ? '🛏️ Hozir yotmoqda' :
                               admission.display_status === 'DISCHARGED' ? 'Chiqarilgan' :
                               admission.display_status}
                            </span>
                            {admission.admission_type === 'EMERGENCY' && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-full text-xs font-semibold">
                                Shoshilinch
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-primary text-xl">bed</span>
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  Xona {admission.room_number}, Ko'yka {admission.bed_number}
                                </p>
                                {admission.room_name && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {admission.room_name}
                                  </p>
                                )}
                                {admission.floor_number && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {admission.floor_number}-qavat
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-gray-500 dark:text-gray-400">Yotqizilgan sana:</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {formatDate(admission.admission_date)}
                                </p>
                              </div>
                              {admission.discharge_date && (
                                <div>
                                  <p className="text-gray-500 dark:text-gray-400">Chiqarilgan sana:</p>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {formatDate(admission.discharge_date)}
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            {admission.diagnosis && (
                              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Tashxis:</p>
                                <p className="text-sm text-gray-900 dark:text-white">{admission.diagnosis}</p>
                              </div>
                            )}
                            
                            {admission.admission_reason && (
                              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Yotqizish sababi:</p>
                                <p className="text-sm text-gray-900 dark:text-white">{admission.admission_reason}</p>
                              </div>
                            )}
                            
                            {admission.doctor_first_name && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Davolovchi shifokor:</p>
                                <p className="text-sm text-gray-900 dark:text-white">
                                  Dr. {admission.doctor_first_name} {admission.doctor_last_name}
                                </p>
                              </div>
                            )}
                            
                            {admission.nurse_first_name && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Biriktirilgan hamshira:</p>
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-blue-500 text-lg">medical_services</span>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                      {admission.nurse_first_name} {admission.nurse_last_name}
                                    </p>
                                    {admission.nurse_phone && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {formatPhone(admission.nurse_phone)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {admission.notes && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Izoh:</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{admission.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {admission.display_status === 'ACTIVE' && (
                          <div className="ml-4">
                            <div className="size-16 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                              <span className="material-symbols-outlined text-white text-3xl">bed</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && patient && (
        <PatientQRModal
          patient={patient}
          onClose={() => setShowQRModal(false)}
        />
      )}

      {/* Add Medical Record Modal */}
      <Modal isOpen={showAddRecordModal} onClose={() => setShowAddRecordModal(false)}>
        <form onSubmit={handleAddMedicalRecord} className="space-y-4">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">Yangi tibbiy yozuv</h2>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Tashxis <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={recordForm.diagnosis_text}
              onChange={(e) => setRecordForm({ ...recordForm, diagnosis_text: e.target.value })}
              rows="3"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Tashxisni kiriting..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Davolash rejasi
            </label>
            <textarea
              value={recordForm.treatment_plan}
              onChange={(e) => setRecordForm({ ...recordForm, treatment_plan: e.target.value })}
              rows="3"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Davolash rejasini kiriting..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Qo'shimcha izohlar
            </label>
            <textarea
              value={recordForm.notes}
              onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
              rows="2"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Izohlar..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowAddRecordModal(false)}
              className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90"
            >
              Saqlash
            </button>
          </div>
        </form>
      </Modal>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
};

export default PatientProfile;
