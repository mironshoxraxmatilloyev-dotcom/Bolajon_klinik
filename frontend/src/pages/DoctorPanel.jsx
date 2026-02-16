import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { queueService } from '../services/queueService';
import { prescriptionService } from '../services/prescriptionService';
import doctorNurseService from '../services/doctorNurseService';
import pharmacyService from '../services/pharmacyService';
import api from '../services/api';
import Modal from '../components/Modal';
import AlertModal from '../components/AlertModal';
import ConfirmModal from '../components/ConfirmModal';
import toast, { Toaster } from 'react-hot-toast';

const DoctorPanel = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [myQueue, setMyQueue] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  
  // QR Code Scanner
  const [qrSearch, setQrSearch] = useState('');
  const [showPatientInfoModal, setShowPatientInfoModal] = useState(false);
  const [scannedPatientInfo, setScannedPatientInfo] = useState(null);
  const lastScanTimeRef = useRef(0);
  
  // User data
  const user = JSON.parse(localStorage.getItem('user'));
  
  // Nurse assignment
  const [showNurseModal, setShowNurseModal] = useState(false);
  const [nurses, setNurses] = useState([]);
  const [selectedNurse, setSelectedNurse] = useState(null);
  const [nurseTaskData, setNurseTaskData] = useState({
    medication_name: '',
    dosage: ''
  });
  
  // Prescription form
  const [diagnosis, setDiagnosis] = useState('');
  const [prescriptionType, setPrescriptionType] = useState('REGULAR');
  const [notes, setNotes] = useState('');
  const [medications, setMedications] = useState([]);
  
  // Dorixona dorilar ro'yxati
  const [availableMedicines, setAvailableMedicines] = useState([]);
  const [loadingMedicines, setLoadingMedicines] = useState(false);

  // Alert and Confirm modals
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const showAlert = (message, type = 'info', title = '') => {
    setAlertModal({ isOpen: true, title, message, type });
  };

  const showConfirm = (message, onConfirm, options = {}) => {
    console.log('🔔 showConfirm called:', { message, options, hasOnConfirm: !!onConfirm });
    const modalData = { 
      isOpen: true, 
      title: options.title || 'Tasdiqlash',
      message, 
      onConfirm,
      type: options.type || 'warning',
      confirmText: options.confirmText || 'Tasdiqlash',
      cancelText: options.cancelText || 'Bekor qilish'
    };
    console.log('🔔 Setting confirmModal to:', modalData);
    setConfirmModal(modalData);
  };

  useEffect(() => {
    loadMyQueue();
    loadAvailableMedicines();
  }, []);
  
  const loadAvailableMedicines = async () => {
    try {
      setLoadingMedicines(true);
      const response = await pharmacyService.getMedicines({ limit: 1000, available_only: 'true' });
      if (response.medicines) {
        setAvailableMedicines(response.medicines);
      }
    } catch (error) {
      console.error('Load medicines error:', error);
    } finally {
      setLoadingMedicines(false);
    }
  };

  // QR kod skanerlash va bemor ma'lumotlarini olish
  const handleQRScan = async (qrCode) => {
    try {
      console.log('=== QR CODE SCANNED ===');
      console.log('QR Code:', qrCode);
      
      // QR kod formatini tekshirish: PATIENT_NUMBER-INVOICE_NUMBER
      if (!qrCode || !qrCode.includes('-')) {
        showAlert('Noto\'g\'ri QR kod formati', 'error', 'Xatolik');
        return;
      }
      
      const [patientNumber, invoiceNumber] = qrCode.split('-');
      console.log('Patient Number:', patientNumber);
      console.log('Invoice Number:', invoiceNumber);
      
      // Backend'dan bemor va invoice ma'lumotlarini olish
      const response = await api.get(`/billing/invoice/${invoiceNumber}`);
      console.log('Invoice response:', response.data);
      
      if (response.data.success) {
        const invoiceData = response.data.data;
        
        // Bemor ma'lumotlarini olish
        const patientResponse = await api.get(`/patients/${invoiceData.patient_id}`);
        console.log('Patient response:', patientResponse.data);
        
        if (patientResponse.data.success) {
          const patientData = patientResponse.data.data;
          
          // Ma'lumotlarni birlashtirish
          setScannedPatientInfo({
            patient: patientData,
            invoice: invoiceData,
            services: invoiceData.items || []
          });
          
          setShowPatientInfoModal(true);
        }
      }
    } catch (error) {
      console.error('QR scan error:', error);
      showAlert('QR kod ma\'lumotlarini yuklashda xatolik', 'error', 'Xatolik');
    }
  };

  const handleQRSearchChange = (value) => {
    const now = Date.now();
    
    // Agar oxirgi scan'dan 500ms o'tmagan bo'lsa, ignore qilish (duplicate scan)
    if (now - lastScanTimeRef.current < 500) {
      console.log('Duplicate scan detected, ignoring...');
      return;
    }
    
    // Oxirgi scan vaqtini yangilash
    lastScanTimeRef.current = now;
    setQrSearch(value);
    
    // Agar QR kod to'liq kiritilgan bo'lsa (masalan, 10+ belgi)
    if (value.length >= 10 && value.includes('-')) {
      handleQRScan(value);
      // Input'ni tozalash
      setTimeout(() => setQrSearch(''), 500);
    }
  };

  const loadMyQueue = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      console.log('=== DOCTOR PANEL LOAD QUEUE ===');
      console.log('Today:', today);
      console.log('User:', user);
      
      // Get doctor ID from user object - backend returns user.id as staff._id
      const doctorId = user?.id;
      console.log('Doctor ID:', doctorId);
      
      if (!doctorId) {
        console.error('Doctor ID not found in user object');
        setMyQueue([]);
        return;
      }
      
      // Backend'ga doctor_id parametrini yuborish
      const response = await queueService.getQueue({ 
        date: today,
        doctor_id: doctorId 
      });
      
      console.log('Queue response:', response);
      
      if (response.success) {
        console.log('My patients count:', response.data.length);
        console.log('My patients:', response.data);
        console.log('WAITING patients:', response.data.filter(q => q.status === 'WAITING'));
        console.log('WAITING count:', response.data.filter(q => q.status === 'WAITING').length);
        setMyQueue(response.data);
      }
    } catch (error) {
      console.error('Load queue error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCallPatient = async (queueId) => {
    try {
      // Avval bemorning to'lov holatini tekshirish
      const queueItem = myQueue.find(q => q.id === queueId);
      if (!queueItem) {
        showAlert('Bemor topilmadi', 'error', t('common.error'));
        return;
      }

      // To'lov holatini tekshirish
      try {
        const invoiceResponse = await api.get(`/billing/invoices/patient/${queueItem.patient_id}/unpaid`);
        
        if (invoiceResponse.data.success && invoiceResponse.data.data && invoiceResponse.data.data.length > 0) {
          // To'lanmagan hisob-fakturalar bor
          const totalUnpaid = invoiceResponse.data.data.reduce((sum, inv) => sum + (inv.total_amount - inv.paid_amount), 0);
          
          showAlert(
            `⚠️ DIQQAT: Bemorning ${totalUnpaid.toLocaleString()} so'm to'lanmagan qarzi bor!\n\nIltimos, avval to'lovni amalga oshiring.`,
            'error',
            'To\'lov kerak'
          );
          return;
        }
      } catch (invoiceError) {
        console.error('Invoice check error:', invoiceError);
        // Xatolik bo'lsa ham davom etamiz
      }

      await queueService.callPatient(queueId);
      showAlert(t('doctorPanel.patientCalled'), 'success', t('common.success'));
      loadMyQueue();
    } catch (error) {
      console.error('Call patient error:', error);
      showAlert(t('doctorPanel.errorOccurred'), 'error', t('common.error'));
    }
  };

  const handleStartConsultation = (patient) => {
    setSelectedPatient(patient);
    setShowPrescriptionModal(true);
    setDiagnosis('');
    setPrescriptionType('REGULAR');
    setNotes('');
    setMedications([]);
  };

  const addMedication = () => {
    // Shoshilinch rejimda faqat dori nomi va dozasi
    if (prescriptionType === 'URGENT') {
      setMedications([...medications, {
        medication_name: '',
        dosage: '',
        frequency: 'Shoshilinch',
        duration_days: 1,
        instructions: 'Shoshilinch',
        is_urgent: true
      }]);
    } else {
      setMedications([...medications, {
        medication_name: '',
        dosage: '',
        frequency: '',
        frequency_per_day: null,
        schedule_times: [],
        duration_days: null,
        instructions: '',
        is_urgent: false
      }]);
    }
  };

  const updateMedication = (index, field, value) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const removeMedication = (index) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleSubmitPrescription = async (e, shouldPrint = false) => {
    e.preventDefault();
    
    console.log('=== PRESCRIPTION SUBMIT STARTED ===');
    console.log('Should print:', shouldPrint);
    
    if (!diagnosis || medications.length === 0) {
      showAlert('Iltimos, tashxis va kamida 1 ta dori kiriting', 'warning', 'Ogohlantirish');
      return;
    }

    try {
      console.log('Patient:', selectedPatient);
      console.log('Diagnosis:', diagnosis);
      console.log('Medications:', medications);
      
      const prescriptionData = {
        patient_id: selectedPatient.patient_id,
        queue_id: selectedPatient.id,
        diagnosis,
        prescription_type: prescriptionType,
        medications,
        notes,
        nurse_id: selectedNurse || null
      };
      
      // Store patient data before clearing
      const patientData = {
        first_name: selectedPatient.first_name,
        last_name: selectedPatient.last_name,
        patient_number: selectedPatient.patient_number,
        phone: selectedPatient.phone
      };
      
      // Store for nurse assignment if urgent
      const isUrgent = prescriptionType === 'URGENT';
      const patientForNurse = isUrgent ? { ...selectedPatient } : null;
      
      console.log('Prescription data:', prescriptionData);
      console.log('Is Urgent:', isUrgent);
      console.log('Patient for nurse:', patientForNurse);
      
      const response = await prescriptionService.createPrescription(prescriptionData);
      
      console.log('Prescription response:', response);

      if (response.success) {
        // Qabulni yakunlash
        await queueService.completeAppointment(selectedPatient.id);

        // Close modal first
        setShowPrescriptionModal(false);
        
        // Agar shoshilinch bo'lsa va hamshira tanlangan bo'lsa, avtomatik topshiriq yuborish
        console.log('=== NURSE ASSIGNMENT CHECK ===');
        console.log('isUrgent:', isUrgent);
        console.log('prescriptionType:', prescriptionType);
        console.log('patientForNurse:', patientForNurse);
        console.log('selectedNurse:', selectedNurse);
        console.log('medications.length:', medications.length);
        
        if (isUrgent && patientForNurse && selectedNurse && medications.length > 0) {
          console.log('✅ URGENT PRESCRIPTION with nurse - Sending task automatically');
          
          try {
            const taskData = {
              patient_id: patientForNurse.patient_id,
              admission_id: patientForNurse.admission_id || null,
              nurse_id: selectedNurse,
              task_type: 'emergency',
              medication_name: medications[0].medication_name,
              dosage: medications[0].dosage,
              route: 'oral',
              frequency: 'Shoshilinch',
              priority: 'EMERGENCY',
              instructions: 'Shifokor tomonidan shoshilinch tayinlangan',
              scheduled_time: new Date().toISOString()
            };

            console.log('📤 Sending task data:', taskData);
            const nurseResponse = await doctorNurseService.assignTask(taskData);
            console.log('📥 Nurse response:', nurseResponse);
            
            if (nurseResponse.success) {
              showAlert('Retsept saqlandi va hamshiraga topshiriq yuborildi!', 'success', 'Muvaffaqiyatli');
            } else {
              showAlert('Retsept saqlandi, lekin hamshiraga yuborishda xatolik', 'warning', 'Ogohlantirish');
            }
          } catch (error) {
            console.error('❌ Assign to nurse error:', error);
            showAlert('Retsept saqlandi, lekin hamshiraga yuborishda xatolik', 'warning', 'Ogohlantirish');
          }
          
          // Reset nurse selection
          setSelectedNurse(null);
        } else if (prescriptionType === 'REGULAR' && selectedNurse) {
          // Oddiy retsept uchun - muolaja jadvali backend'da yaratildi
          console.log('✅ REGULAR PRESCRIPTION with nurse - Treatment schedule created automatically');
          
          const hasScheduledMeds = medications.some(med => 
            med.schedule_times && med.schedule_times.length > 0 && med.duration_days
          );
          
          if (hasScheduledMeds) {
            showAlert(
              'Retsept saqlandi! Muolaja jadvali yaratildi va hamshiraga biriktirildi.', 
              'success', 
              'Muvaffaqiyatli'
            );
          } else {
            showAlert(
              'Retsept saqlandi va hamshiraga biriktirildi!', 
              'success', 
              'Muvaffaqiyatli'
            );
          }
          
          // Reset nurse selection
          setSelectedNurse(null);
        } else {
          console.log('❌ NOT sending to nurse - condition failed');
          if (!isUrgent && prescriptionType !== 'REGULAR') console.log('  - Not urgent or regular');
          if (!patientForNurse && !selectedPatient) console.log('  - No patient');
          if (!selectedNurse) console.log('  - No nurse selected');
          if (medications.length === 0) console.log('  - No medications');
          
          // Show success alert
          showAlert('Retsept muvaffaqiyatli saqlandi va qabul yakunlandi!', 'success', 'Muvaffaqiyatli');
        }

        // If shouldPrint is true, print the receipt
        if (shouldPrint) {
          console.log('=== PRINTING RECEIPT ===');
          setTimeout(() => {
            prescriptionService.printPrescriptionReceipt(
              {
                ...prescriptionData,
                prescription_number: response.data?.prescription_number,
                doctor_name: user?.full_name || user?.username
              },
              patientData
            );
          }, 300);
        }

        setSelectedPatient(null);
        loadMyQueue();
      } else {
        showAlert('Xatolik: ' + (response.message || 'Noma\'lum xatolik'), 'error', 'Xatolik');
      }
    } catch (error) {
      console.error('Submit prescription error:', error);
      console.error('Error response:', error.response?.data);
      showAlert('Xatolik yuz berdi: ' + (error.response?.data?.message || error.message), 'error', 'Xatolik');
    }
  };

  // Hamshiraga topshiriq yuborish
  const handleOpenNurseModal = async (patient) => {
    try {
      setSelectedPatient(patient);
      const response = await doctorNurseService.getActiveNurses();
      if (response.success) {
        setNurses(response.data);
        setShowNurseModal(true);
      }
    } catch (error) {
      console.error('Load nurses error:', error);
      toast.error('Hamshiralarni yuklashda xatolik');
    }
  };

  const handleAssignToNurse = async () => {
    if (!selectedNurse) {
      toast.error('Iltimos, hamshirani tanlang');
      return;
    }

    if (!nurseTaskData.medication_name || !nurseTaskData.dosage) {
      toast.error('Iltimos, dori va dozasini kiriting');
      return;
    }

    try {
      const taskData = {
        patient_id: selectedPatient.patient_id,
        admission_id: selectedPatient.admission_id || null,
        nurse_id: selectedNurse,
        task_type: 'emergency',
        medication_name: nurseTaskData.medication_name,
        dosage: nurseTaskData.dosage,
        route: 'oral',
        frequency: 'Shoshilinch',
        priority: 'EMERGENCY',
        instructions: 'Shifokor tomonidan shoshilinch tayinlangan',
        scheduled_time: new Date().toISOString()
      };

      const response = await doctorNurseService.assignTask(taskData);
      
      if (response.success) {
        toast.success('Shoshilinch topshiriq hamshiraga yuborildi!');
        setShowNurseModal(false);
        setSelectedNurse(null);
        setNurseTaskData({
          medication_name: '',
          dosage: ''
        });
      }
    } catch (error) {
      console.error('Assign to nurse error:', error);
      toast.error('Topshiriq yuborishda xatolik');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'WAITING': 'bg-yellow-100 text-yellow-700',
      'CALLED': 'bg-green-100 text-green-700',
      'IN_PROGRESS': 'bg-purple-100 text-purple-700'
    };
    return colors[status] || colors.WAITING;
  };

  const getStatusText = (status) => {
    const texts = {
      'WAITING': 'Kutmoqda',
      'CALLED': 'Chaqirildi',
      'IN_PROGRESS': 'Qabulda'
    };
    return texts[status] || status;
  };

  if (loading) {
    return (
      <div className="p-3 sm:p-4 sm:p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="size-12 sm:size-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('doctorPanel.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 sm:p-4 sm:p-6 lg:p-8 space-y-3 sm:space-y-4 sm:space-y-4 sm:space-y-6">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{t('doctorPanel.title')}</h1>
          <p className="text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            {t('doctorPanel.todayQueue')}: {myQueue.length} {t('doctorPanel.patients')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-col sm:flex-row gap-2 sm:gap-2 sm:gap-3 sm:gap-2 sm:gap-3">
          <button
            onClick={() => navigate('/queue')}
            className="w-full sm:w-auto px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-green-500 text-white rounded-lg sm:rounded-lg sm:rounded-xl text-sm sm:text-sm sm:text-base font-semibold hover:bg-green-600 flex items-center justify-center gap-2 sm:gap-2 sm:gap-3"
          >
            <span className="material-symbols-outlined text-sm sm:text-base">format_list_numbered</span>
            {t('doctorPanel.goToQueue')}
          </button>
          <button
            onClick={loadMyQueue}
            className="w-full sm:w-auto px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-primary text-white rounded-lg sm:rounded-lg sm:rounded-xl text-sm sm:text-sm sm:text-base font-semibold hover:opacity-90 flex items-center justify-center gap-2 sm:gap-2 sm:gap-3"
          >
            <span className="material-symbols-outlined text-sm sm:text-base">refresh</span>
            {t('doctorPanel.refresh')}
          </button>
        </div>
      </div>

      {/* QR Code Scanner Input */}
      <div className="bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
        <label className="block text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
          <span className="material-symbols-outlined text-sm sm:text-base align-middle mr-1">qr_code_scanner</span>
          QR kod skanerlash
        </label>
        <input
          type="text"
          value={qrSearch}
          onChange={(e) => handleQRSearchChange(e.target.value)}
          placeholder="QR kodni skanerlang yoki kiriting..."
          className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
        />
        <p className="text-xs text-gray-500 mt-2">
          Kassadan berilgan QR kodni shu yerga skanerlang
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 sm:gap-3 sm:gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg sm:rounded-xl p-3 sm:p-3 sm:p-4 border border-green-100 dark:border-green-800">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="size-10 sm:size-12 bg-green-500 rounded-lg sm:rounded-lg sm:rounded-xl flex items-center justify-center text-white flex-shrink-0">
              <span className="material-symbols-outlined text-xl sm:text-xl sm:text-2xl">groups</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400 truncate">{t('doctorPanel.todayPatients')}</p>
              <p className="text-xl sm:text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{myQueue.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg sm:rounded-xl p-3 sm:p-3 sm:p-4 border border-yellow-100 dark:border-yellow-800">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="size-10 sm:size-12 bg-yellow-500 rounded-lg sm:rounded-lg sm:rounded-xl flex items-center justify-center text-white flex-shrink-0">
              <span className="material-symbols-outlined text-xl sm:text-xl sm:text-2xl">schedule</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400 truncate">{t('doctorPanel.waiting')}</p>
              <p className="text-xl sm:text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {myQueue.filter(q => q.status === 'WAITING' || q.status === 'CALLED').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg sm:rounded-xl p-3 sm:p-3 sm:p-4 border border-purple-100 dark:border-purple-800">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="size-10 sm:size-12 bg-purple-500 rounded-lg sm:rounded-lg sm:rounded-xl flex items-center justify-center text-white flex-shrink-0">
              <span className="material-symbols-outlined text-xl sm:text-xl sm:text-2xl">medical_services</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400 truncate">{t('doctorPanel.inConsultation')}</p>
              <p className="text-xl sm:text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {myQueue.filter(q => q.status === 'IN_PROGRESS').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg sm:rounded-xl p-3 sm:p-3 sm:p-4 border border-green-100 dark:border-green-800">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="size-10 sm:size-12 bg-green-500 rounded-lg sm:rounded-lg sm:rounded-xl flex items-center justify-center text-white flex-shrink-0">
              <span className="material-symbols-outlined text-xl sm:text-xl sm:text-2xl">check_circle</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400 truncate">{t('doctorPanel.completed')}</p>
              <p className="text-xl sm:text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {myQueue.filter(q => q.status === 'COMPLETED').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alert - Kutayotgan bemorlar */}
      {myQueue.filter(q => q.status === 'WAITING' || q.status === 'CALLED').length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg sm:rounded-xl p-3 sm:p-3 sm:p-4">
          <div className="flex flex-col sm:flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <span className="material-symbols-outlined text-yellow-600 text-2xl sm:text-2xl sm:text-3xl flex-shrink-0">notifications_active</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm sm:text-sm sm:text-base text-gray-900 dark:text-white">
                Sizda {myQueue.filter(q => q.status === 'WAITING' || q.status === 'CALLED').length} ta kutayotgan bemor bor
              </p>
              <p className="text-xs sm:text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                {t('doctorPanel.goToQueuePage')}
              </p>
            </div>
            <button
              onClick={() => navigate('/queue')}
              className="w-full sm:w-auto px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-yellow-500 text-white rounded-lg sm:rounded-lg sm:rounded-xl text-sm sm:text-sm sm:text-base font-semibold hover:bg-yellow-600 flex-shrink-0"
            >
              {t('doctorPanel.goToQueue')}
            </button>
          </div>
        </div>
      )}

      {/* Info Message */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg sm:rounded-xl p-3 sm:p-3 sm:p-4">
        <div className="flex items-start sm:items-center gap-2 sm:gap-2 sm:gap-3 sm:gap-2 sm:gap-3">
          <span className="material-symbols-outlined text-green-600 text-xl sm:text-xl sm:text-2xl flex-shrink-0">info</span>
          <p className="text-xs sm:text-sm sm:text-sm sm:text-base text-gray-700 dark:text-gray-300">
            {t('doctorPanel.infoMessage')}
          </p>
        </div>
      </div>

      {/* Kutayotgan bemorlar ro'yxati */}
      {myQueue.filter(q => q.status === 'WAITING' || q.status === 'CALLED').length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="p-3 sm:p-3 sm:p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-base sm:text-base sm:text-lg font-bold text-gray-900 dark:text-white">{t('doctorPanel.waitingPatientsList')}</h2>
            <p className="text-xs sm:text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">{t('doctorPanel.sortedByTime')}</p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {myQueue
              .filter(q => q.status === 'WAITING' || q.status === 'CALLED')
              .sort((a, b) => a.queueNumber - b.queueNumber)
              .map((patient, index) => (
                <div key={patient.id} className="p-3 sm:p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 sm:gap-2 sm:gap-3 sm:gap-3 sm:gap-4">
                      <div className="size-10 sm:size-12 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-lg sm:rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-base sm:text-base sm:text-lg flex-shrink-0">
                        {index + 1}
                      </div>
                      
                      <div className="size-10 sm:size-12 bg-primary/10 text-primary rounded-lg sm:rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-lg sm:text-lg sm:text-xl font-black">{patient.queueNumber}</span>
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm sm:text-sm sm:text-base text-gray-900 dark:text-white truncate">
                          {patient.patientName}
                        </p>
                        <p className="text-xs sm:text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400 truncate">
                          {patient.patientNumber} • {patient.patientPhone}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          <span className="material-symbols-outlined text-xs align-middle mr-1">schedule</span>
                          {new Date(patient.appointmentTime).toLocaleTimeString('uz-UZ', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-2 sm:gap-3 sm:gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                      {patient.queueType === 'EMERGENCY' && (
                        <span className="px-2 sm:px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-full text-xs font-semibold whitespace-nowrap">
                          {t('doctorPanel.emergency')}
                        </span>
                      )}
                      
                      <button
                        onClick={() => navigate('/queue')}
                        className="w-full sm:w-auto px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-green-500 text-white rounded-lg sm:rounded-lg sm:rounded-xl text-sm sm:text-sm sm:text-base font-semibold hover:bg-green-600 whitespace-nowrap"
                      >
                        {t('doctorPanel.acceptPatient')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

      {/* Confirm Modal */}
      {console.log('🎨 Rendering ConfirmModal with state:', confirmModal)}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => {
          console.log('🔴 ConfirmModal onClose called');
          setConfirmModal({ ...confirmModal, isOpen: false });
        }}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
      />

      {/* Retsept tahrirlash Modal - TEMPORARILY DISABLED */}
      {false && (
      <Modal
        isOpen={showPrescriptionModal}
        onClose={() => setShowPrescriptionModal(false)}
        title="📋 Retsept tahrirlash"
        size="xl"
      >
        <form onSubmit={handleSubmitPrescription} className="space-y-4 sm:space-y-6">
          {/* Bemor ma'lumotlari */}
          {selectedPatient && (
            <div className="bg-green-50 dark:bg-green-900/20 p-3 sm:p-4 rounded-lg sm:rounded-lg sm:rounded-xl">
              <p className="font-bold text-base sm:text-lg">{selectedPatient.first_name} {selectedPatient.last_name}</p>
              <p className="text-sm sm:text-sm sm:text-base text-gray-600">Bemor raqami: {selectedPatient.patient_number}</p>
            </div>
          )}

          {/* Tashxis */}
          <div>
            <label className="block text-sm sm:text-sm sm:text-base font-semibold mb-2">Tashxis *</label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 border rounded-lg sm:rounded-lg sm:rounded-xl"
              placeholder="Tashxisni kiriting"
              required
            />
          </div>

          {/* Retsept turi */}
          <div>
            <label className="block text-sm sm:text-sm sm:text-base font-semibold mb-2">Retsept turi</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setPrescriptionType('REGULAR')}
                className={`px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-lg sm:rounded-lg sm:rounded-xl font-semibold transition-all ${
                  prescriptionType === 'REGULAR'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Oddiy
              </button>
              <button
                type="button"
                onClick={() => setPrescriptionType('URGENT')}
                className={`px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-lg sm:rounded-lg sm:rounded-xl font-semibold transition-all ${
                  prescriptionType === 'URGENT'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Shoshilinch
              </button>
              <button
                type="button"
                onClick={() => setPrescriptionType('CHRONIC')}
                className={`px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-lg sm:rounded-lg sm:rounded-xl font-semibold transition-all ${
                  prescriptionType === 'CHRONIC'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Surunkali
              </button>
            </div>
          </div>

          {/* Dorilar */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm sm:text-sm sm:text-base font-semibold">Dorilar *</label>
              <button
                type="button"
                onClick={addMedication}
                className="px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-green-500 text-white rounded-lg sm:rounded-lg sm:rounded-xl text-sm sm:text-sm sm:text-base font-semibold hover:bg-green-600 flex items-center gap-2 sm:gap-2 sm:gap-3"
              >
                <span className="material-symbols-outlined text-base sm:text-lg">add</span>
                Dori qo'shish
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {medications.map((med, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg sm:rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Dori #{index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeMedication(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>

                  {/* Dori nomi */}
                  <div className="mb-3">
                    <label className="block text-sm sm:text-sm sm:text-base font-medium mb-1">Dori nomi *</label>
                    <select
                      value={med.medication_name}
                      onChange={(e) => updateMedication(index, 'medication_name', e.target.value)}
                      className="w-full px-3 py-2 sm:py-2.5 border rounded-lg sm:rounded-lg sm:rounded-xl bg-white dark:bg-gray-800"
                      required
                    >
                      <option value="">Dorini tanlang</option>
                      {availableMedicines.map((medicine) => (
                        <option key={medicine.id} value={medicine.name}>
                          {medicine.name} {medicine.generic_name ? `(${medicine.generic_name})` : ''} - {medicine.total_stock || 0} {medicine.unit}
                        </option>
                      ))}
                    </select>
                    {loadingMedicines && (
                      <p className="text-xs text-gray-500 mt-1">Dorilar yuklanmoqda...</p>
                    )}
                  </div>

                  {/* Dozasi */}
                  <div className="mb-3">
                    <label className="block text-sm sm:text-sm sm:text-base font-medium mb-1">Dozasi *</label>
                    <input
                      type="text"
                      value={med.dosage}
                      onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                      className="w-full px-3 py-2 sm:py-2.5 border rounded-lg sm:rounded-lg sm:rounded-xl"
                      placeholder="Masalan: 500mg"
                      required
                    />
                  </div>

                  {/* Shoshilinch rejimda qolgan maydonlar ko'rinmasin */}
                  {prescriptionType !== 'URGENT' && (
                    <>
                      {/* Kuniga necha marta - ASOSIY MAYDON */}
                      <div className="mb-3 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg sm:rounded-lg sm:rounded-xl border border-blue-200 dark:border-blue-700">
                        <label className="block text-sm sm:text-sm sm:text-base font-bold mb-2 text-blue-900 dark:text-blue-100">
                          📊 Kuniga necha marta qabul qilish kerak? *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={med.frequency_per_day || ''}
                          onChange={(e) => {
                            const count = parseInt(e.target.value) || 0;
                            updateMedication(index, 'frequency_per_day', count);
                            // Auto-generate time slots
                            if (count > 0) {
                              const times = [];
                              const interval = Math.floor(24 / count);
                              for (let i = 0; i < count; i++) {
                                const hour = (8 + i * interval) % 24;
                                times.push(`${String(hour).padStart(2, '0')}:00`);
                              }
                              updateMedication(index, 'schedule_times', times);
                            } else {
                              updateMedication(index, 'schedule_times', []);
                            }
                          }}
                          className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 border-2 border-blue-300 rounded-lg sm:rounded-lg sm:rounded-xl text-base sm:text-lg font-bold"
                          placeholder="Masalan: 3"
                        />
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          💡 Vaqtlar avtomatik yaratiladi, keyin o'zgartirishingiz mumkin
                        </p>
                      </div>

                      {/* Qabul qilish vaqtlari */}
                      {med.frequency_per_day > 0 && (
                        <div className="mb-3 bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg sm:rounded-lg sm:rounded-xl border border-purple-200 dark:border-purple-700">
                          <label className="block text-sm sm:text-sm sm:text-base font-bold mb-3 text-purple-900 dark:text-purple-100">
                            🕐 Qabul qilish vaqtlari
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                            {Array.from({ length: med.frequency_per_day }).map((_, timeIndex) => (
                              <div key={timeIndex} className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                                  {timeIndex + 1}-marta:
                                </span>
                                <input
                                  type="text"
                                  pattern="[0-2][0-9]:[0-5][0-9]"
                                  placeholder="HH:MM"
                                  maxLength="5"
                                  value={med.schedule_times?.[timeIndex] || ''}
                                  onChange={(e) => {
                                    let value = e.target.value.replace(/[^0-9:]/g, '');
                                    
                                    // Avtomatik : qo'shish
                                    if (value.length === 2 && !value.includes(':')) {
                                      value = value + ':';
                                    }
                                    
                                    // Format tekshirish
                                    if (value.length === 5) {
                                      const [hours, minutes] = value.split(':');
                                      const h = parseInt(hours);
                                      const m = parseInt(minutes);
                                      
                                      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
                                        const newTimes = [...(med.schedule_times || [])];
                                        newTimes[timeIndex] = value;
                                        updateMedication(index, 'schedule_times', newTimes);
                                      }
                                    } else if (value.length < 5) {
                                      const newTimes = [...(med.schedule_times || [])];
                                      newTimes[timeIndex] = value;
                                      updateMedication(index, 'schedule_times', newTimes);
                                    }
                                  }}
                                  onBlur={(e) => {
                                    // Format to'g'rilash
                                    const value = e.target.value;
                                    if (value.length === 5) {
                                      const [hours, minutes] = value.split(':');
                                      const h = parseInt(hours);
                                      const m = parseInt(minutes);
                                      
                                      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
                                        const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                                        const newTimes = [...(med.schedule_times || [])];
                                        newTimes[timeIndex] = formatted;
                                        updateMedication(index, 'schedule_times', newTimes);
                                      }
                                    }
                                  }}
                                  className="w-full px-3 py-2 sm:py-2.5 border-2 border-purple-300 rounded-lg sm:rounded-lg sm:rounded-xl font-bold text-sm sm:text-base text-center focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                />
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-purple-700 dark:text-purple-300 mt-2">
                            ⏰ Har bir vaqtda dori qabul qilish kerak
                          </p>
                        </div>
                      )}

                      {/* Davomiyligi */}
                      <div className="mb-3">
                        <label className="block text-sm sm:text-sm sm:text-base font-medium mb-1">📅 Davomiyligi (kunlar)</label>
                        <input
                          type="number"
                          min="1"
                          value={med.duration_days || ''}
                          onChange={(e) => updateMedication(index, 'duration_days', parseInt(e.target.value) || null)}
                          className="w-full px-3 py-2 sm:py-2.5 border rounded-lg sm:rounded-lg sm:rounded-xl"
                          placeholder="Masalan: 7"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Necha kun davomida qabul qilish kerak
                        </p>
                      </div>

                      {/* Hamshira tayinlash */}
                      <div className="mb-3 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg sm:rounded-lg sm:rounded-xl border-2 border-green-300 dark:border-green-700">
                        <label className="block text-sm sm:text-sm sm:text-base font-bold mb-2 text-green-900 dark:text-green-100 flex items-center gap-2 sm:gap-2 sm:gap-3">
                          <span className="material-symbols-outlined text-green-600">person</span>
                          👩‍⚕️ Hamshirani tanlang (ixtiyoriy)
                        </label>
                        <select
                          value={med.nurse_id || ''}
                          onChange={async (e) => {
                            updateMedication(index, 'nurse_id', e.target.value);
                          }}
                          onFocus={async () => {
                            // Load nurses when select is focused
                            if (!nurses.length) {
                              try {
                                const response = await doctorNurseService.getActiveNurses();
                                if (response.success) {
                                  setNurses(response.data);
                                }
                              } catch (error) {
                                console.error('Load nurses error:', error);
                              }
                            }
                          }}
                          className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 border-2 border-green-300 rounded-lg sm:rounded-lg sm:rounded-xl bg-white dark:bg-gray-800 font-medium"
                        >
                          <option value="">Hamshira tanlanmagan</option>
                          {nurses.map((nurse) => (
                            <option key={nurse._id} value={nurse._id}>
                              👩‍⚕️ {nurse.first_name} {nurse.last_name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                          💡 Bu dori uchun mas'ul hamshira - muolajalarni bajaradi
                        </p>
                      </div>

                      {/* Ko'rsatmalar */}
                      <div>
                        <label className="block text-sm sm:text-sm sm:text-base font-medium mb-1">📝 Qo'shimcha ko'rsatmalar</label>
                        <textarea
                          value={med.instructions}
                          onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                          className="w-full px-3 py-2 sm:py-2.5 border rounded-lg sm:rounded-lg sm:rounded-xl"
                          rows="2"
                          placeholder="Qo'shimcha ko'rsatmalar..."
                        />
                      </div>
                    </>
                  )}

                  {/* Shoshilinch checkbox */}
                  {prescriptionType !== 'URGENT' && (
                    <div className="mt-3">
                      <label className="flex items-center gap-2 sm:gap-2 sm:gap-3">
                        <input
                          type="checkbox"
                          checked={med.is_urgent}
                          onChange={(e) => updateMedication(index, 'is_urgent', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm sm:text-sm sm:text-base">Shoshilinch dori</span>
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Qo'shimcha izohlar */}
          <div>
            <label className="block text-sm sm:text-sm sm:text-base font-semibold mb-2">Qo'shimcha izohlar</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 border rounded-lg sm:rounded-lg sm:rounded-xl"
              rows="3"
              placeholder="Qo'shimcha izohlar..."
            />
          </div>

          {/* Hamshiraga biriktirish - barcha retseptlar uchun (ixtiyoriy) */}
          <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 p-4 sm:p-6 rounded-lg sm:rounded-xl border-2 border-green-300 dark:border-green-700">
            <div className="flex items-center gap-2 sm:gap-3 mb-4">
              <span className="material-symbols-outlined text-2xl sm:text-3xl text-green-600">medical_services</span>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Hamshiraga biriktirish (ixtiyoriy)</h3>
            </div>
            
            {/* Hamshirani tanlash */}
            <div className="mb-2">
              <label className="block text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Hamshirani tanlang
              </label>
              <select
                value={selectedNurse || ''}
                onChange={async (e) => {
                  setSelectedNurse(e.target.value);
                  if (!nurses.length) {
                    try {
                      const response = await doctorNurseService.getActiveNurses();
                      if (response.success) {
                        setNurses(response.data);
                      }
                    } catch (error) {
                      console.error('Load nurses error:', error);
                    }
                  }
                }}
                onFocus={async () => {
                  if (!nurses.length) {
                    try {
                      const response = await doctorNurseService.getActiveNurses();
                      if (response.success) {
                        setNurses(response.data);
                      }
                    } catch (error) {
                      console.error('Load nurses error:', error);
                    }
                  }
                }}
                className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Tanlanmagan</option>
                {nurses.map((nurse) => (
                  <option key={nurse.id} value={nurse.id}>
                    {nurse.full_name} - {nurse.specialization || 'Hamshira'}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Agar hamshira tanlasangiz, u retseptni ko'radi va bajarishi mumkin
            </p>
          </div>

          {/* Hamshiraga biriktirish - faqat shoshilinch uchun */}
          {prescriptionType === 'URGENT' && (
            <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-4 sm:p-6 rounded-lg sm:rounded-xl border-2 border-orange-300 dark:border-orange-700">
              <div className="flex items-center gap-2 sm:gap-3 mb-4">
                <span className="material-symbols-outlined text-2xl sm:text-3xl text-orange-600">emergency</span>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Muolajaga yuborish</h3>
              </div>
              
              {/* Hamshirani tanlash */}
              <div className="mb-4">
                <label className="block text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Hamshirani tanlang *
                </label>
                <select
                  value={selectedNurse || ''}
                  onChange={async (e) => {
                    setSelectedNurse(e.target.value);
                    if (!nurses.length) {
                      try {
                        const response = await doctorNurseService.getActiveNurses();
                        if (response.success) {
                          setNurses(response.data);
                        }
                      } catch (error) {
                        console.error('Load nurses error:', error);
                      }
                    }
                  }}
                  onFocus={async () => {
                    if (!nurses.length) {
                      try {
                        const response = await doctorNurseService.getActiveNurses();
                        if (response.success) {
                          setNurses(response.data);
                        }
                      } catch (error) {
                        console.error('Load nurses error:', error);
                      }
                    }
                  }}
                  className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Hamshirani tanlang</option>
                  {nurses.map((nurse) => (
                    <option key={nurse.id} value={nurse.id}>
                      {nurse.full_name} - {nurse.specialization || 'Hamshira'}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400 italic">
                💡 Shoshilinch retsept saqlangandan keyin avtomatik hamshiraga topshiriq yuboriladi
              </p>
            </div>
          )}

          {/* Tugmalar */}
          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowPrescriptionModal(false)}
              className="flex-1 px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-gray-200 rounded-lg sm:rounded-lg sm:rounded-xl font-semibold hover:bg-gray-300"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="flex-1 px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-primary text-white rounded-lg sm:rounded-lg sm:rounded-xl font-semibold hover:opacity-90"
            >
              Saqlash
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmitPrescription(e, true)}
              className="flex-1 px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-green-500 text-white rounded-lg sm:rounded-lg sm:rounded-xl font-semibold hover:bg-green-600 flex items-center justify-center gap-2 sm:gap-2 sm:gap-3"
            >
              <span className="material-symbols-outlined">print</span>
              Saqlash va Chop etish
            </button>
          </div>
        </form>
      </Modal>
      )}

      {/* Hamshiraga Topshiriq Yuborish Modal */}
      <Modal
        isOpen={showNurseModal}
        onClose={() => setShowNurseModal(false)}
        title="🩺 Hamshiraga Shoshilinch Topshiriq Yuborish"
        size="md"
      >
        <Toaster position="top-right" />
        <div className="space-y-3 sm:space-y-4">
          {selectedPatient && (
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-3 sm:p-4 rounded-lg sm:rounded-lg sm:rounded-xl text-white">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="material-symbols-outlined text-2xl sm:text-3xl">emergency</span>
                <div>
                  <p className="font-bold text-base sm:text-lg">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                  <p className="text-sm sm:text-sm sm:text-base opacity-90">Bemor raqami: {selectedPatient.patient_number}</p>
                </div>
              </div>
            </div>
          )}

          {/* Hamshira tanlash */}
          <div>
            <label className="block text-sm sm:text-sm sm:text-base font-semibold mb-2 text-gray-700 dark:text-gray-300">
              Hamshirani tanlang <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedNurse || ''}
              onChange={(e) => setSelectedNurse(e.target.value)}
              className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="">Hamshirani tanlang</option>
              {nurses.map(nurse => (
                <option key={nurse.id} value={nurse.id}>
                  {nurse.name} ({nurse.active_patients} bemor, {nurse.pending_tasks} topshiriq)
                </option>
              ))}
            </select>
          </div>

          {/* Dori nomi */}
          <div>
            <label className="block text-sm sm:text-sm sm:text-base font-semibold mb-2 text-gray-700 dark:text-gray-300">
              Dori nomi <span className="text-red-500">*</span>
            </label>
            <select
              value={nurseTaskData.medication_name}
              onChange={(e) => setNurseTaskData({...nurseTaskData, medication_name: e.target.value})}
              className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="">Dorini tanlang</option>
              {availableMedicines.map((medicine) => (
                <option key={medicine.id} value={medicine.name}>
                  {medicine.name} {medicine.generic_name ? `(${medicine.generic_name})` : ''} - {medicine.total_stock || 0} {medicine.unit}
                </option>
              ))}
            </select>
            {loadingMedicines && (
              <p className="text-xs text-gray-500 mt-1">Dorilar yuklanmoqda...</p>
            )}
          </div>

          {/* Doza */}
          <div>
            <label className="block text-sm sm:text-sm sm:text-base font-semibold mb-2 text-gray-700 dark:text-gray-300">
              Doza <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nurseTaskData.dosage}
              onChange={(e) => setNurseTaskData({...nurseTaskData, dosage: e.target.value})}
              className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="Masalan: 500mg"
            />
          </div>

          {/* Tugmalar */}
          <div className="flex gap-2 sm:gap-3 pt-4">
            <button
              onClick={() => setShowNurseModal(false)}
              className="flex-1 px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg sm:rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleAssignToNurse}
              className="flex-1 px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg sm:rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 sm:gap-2 sm:gap-3"
            >
              <span className="material-symbols-outlined">send</span>
              Yuborish
            </button>
          </div>
        </div>
      </Modal>

      {/* Bemor Ma'lumotlari Modal (QR Scan) */}
      <Modal
        isOpen={showPatientInfoModal}
        onClose={() => {
          setShowPatientInfoModal(false);
          setScannedPatientInfo(null);
        }}
        title="📋 Bemor Ma'lumotlari"
        size="lg"
      >
        {scannedPatientInfo && (
          <div className="space-y-4 sm:space-y-6">
            {/* Bemor ma'lumotlari */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 sm:p-6 rounded-lg sm:rounded-xl border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="size-16 bg-green-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                  <span className="material-symbols-outlined text-2xl sm:text-3xl">person</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {scannedPatientInfo.patient.first_name} {scannedPatientInfo.patient.last_name}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm sm:text-sm sm:text-base">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Bemor raqami:</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{scannedPatientInfo.patient.patient_number}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Telefon:</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{scannedPatientInfo.patient.phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Tug'ilgan sana:</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {scannedPatientInfo.patient.date_of_birth 
                          ? new Date(scannedPatientInfo.patient.date_of_birth).toLocaleDateString('uz-UZ')
                          : 'Kiritilmagan'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Jins:</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {scannedPatientInfo.patient.gender === 'male' ? 'Erkak' : 'Ayol'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Xizmatlar ro'yxati */}
            <div>
              <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2 sm:gap-2 sm:gap-3">
                <span className="material-symbols-outlined text-primary">medical_services</span>
                Qaysi xizmatlar uchun kelgan:
              </h4>
              <div className="space-y-2 sm:space-y-3">
                {scannedPatientInfo.services.map((service, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg sm:rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white">{service.service_name || service.description}</p>
                        <p className="text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                          Miqdor: {service.quantity} x {new Intl.NumberFormat('uz-UZ').format(service.unit_price)} so'm
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base sm:text-lg font-bold text-primary">
                          {new Intl.NumberFormat('uz-UZ').format(service.total_price || (service.quantity * service.unit_price))} so'm
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* To'lov ma'lumotlari */}
            <div className="bg-green-50 dark:bg-green-900/20 p-3 sm:p-4 rounded-lg sm:rounded-lg sm:rounded-xl border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700 dark:text-gray-300">Jami summa:</span>
                <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  {new Intl.NumberFormat('uz-UZ').format(scannedPatientInfo.invoice.total_amount)} so'm
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700 dark:text-gray-300">To'langan:</span>
                <span className="text-base sm:text-lg font-semibold text-green-600">
                  {new Intl.NumberFormat('uz-UZ').format(scannedPatientInfo.invoice.paid_amount)} so'm
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-green-200 dark:border-green-700">
                <span className="text-gray-700 dark:text-gray-300">Holat:</span>
                <span className={`px-3 py-1 rounded-full text-sm sm:text-sm sm:text-base font-semibold ${
                  scannedPatientInfo.invoice.payment_status === 'paid' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
                }`}>
                  {scannedPatientInfo.invoice.payment_status === 'paid' ? 'To\'langan' : 'Qisman to\'langan'}
                </span>
              </div>
            </div>

            {/* Tavsiyalar */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-4 rounded-lg sm:rounded-lg sm:rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2 sm:gap-3">
                <span className="material-symbols-outlined text-blue-600 text-xl sm:text-2xl flex-shrink-0">info</span>
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-300 mb-1">Nima qilish kerak:</p>
                  <ul className="text-sm sm:text-sm sm:text-base text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
                    <li>Bemorni qabul qiling va ko'rik o'tkazing</li>
                    <li>Kerakli tekshiruvlarni o'tkazing</li>
                    <li>Tashxis qo'ying va retsept yozing</li>
                    <li>Agar kerak bo'lsa, qo'shimcha xizmatlar buyurtma qiling</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Tugmalar */}
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setShowPatientInfoModal(false);
                  setScannedPatientInfo(null);
                }}
                className="flex-1 px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg sm:rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Yopish
              </button>
              <button
                onClick={() => {
                  // Bemor profiliga o'tish
                  navigate(`/patients/${scannedPatientInfo.patient.id}`);
                }}
                className="flex-1 px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-primary text-white rounded-lg sm:rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 sm:gap-2 sm:gap-3"
              >
                <span className="material-symbols-outlined">person</span>
                Bemor Profiliga O'tish
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DoctorPanel;

