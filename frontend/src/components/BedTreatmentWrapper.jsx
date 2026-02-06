import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import doctorNurseService from '../services/doctorNurseService';
import MedicineSelectionModal from './MedicineSelectionModal';
import TreatmentTimer from './TreatmentTimer';

export default function BedTreatmentWrapper({ children, patientId, patientName, roomNumber, bedNumber, onTreatmentComplete, hasMyTreatments, admissionType, isNurseCalling, audioEnabled, playAlarmSound }) {
  const [showModal, setShowModal] = useState(false);
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [completingTreatment, setCompletingTreatment] = useState(null);
  const [treatmentNotes, setTreatmentNotes] = useState('');
  const [showMedicineModal, setShowMedicineModal] = useState(false);
  const [currentTreatmentId, setCurrentTreatmentId] = useState(null);
  const [quickNoteTemplate, setQuickNoteTemplate] = useState('');

  // Load treatments on mount and periodically
  useEffect(() => {
    if (patientId && hasMyTreatments) {
      loadTreatmentsQuietly();
      
      // Refresh every 30 seconds
      const interval = setInterval(loadTreatmentsQuietly, 30000);
      return () => clearInterval(interval);
    }
  }, [patientId, hasMyTreatments]);

  const loadTreatmentsQuietly = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1'}/nurse/treatments`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        let filteredTreatments = [];
        
        if (roomNumber && bedNumber) {
          filteredTreatments = data.data.filter(t => {
            const roomInfo = t.admission_info?.room_info;
            if (!roomInfo) return false;
            
            const matchesRoom = String(roomInfo.room_number) === String(roomNumber);
            const matchesBed = String(roomInfo.bed_number) === String(bedNumber);
            
            return matchesRoom && matchesBed;
          });
          
          if (filteredTreatments.length === 0 && patientId) {
            filteredTreatments = data.data.filter(t => {
              const tPatientId = t.patient_id?._id || t.patient_id;
              return String(tPatientId) === String(patientId);
            });
          }
        } else if (patientId) {
          filteredTreatments = data.data.filter(t => {
            const tPatientId = t.patient_id?._id || t.patient_id;
            return String(tPatientId) === String(patientId);
          });
        }
        
        if (admissionType === 'outpatient') {
          filteredTreatments = filteredTreatments.filter(t => t.prescription_type === 'URGENT');
        }
        
        setTreatments(filteredTreatments || []);
      }
    } catch (error) {
      console.error('Load treatments quietly error:', error);
    }
  };

  // Quick note templates
  const noteTemplates = [
    { label: '✅ Muvaffaqiyatli bajarildi', value: 'Muolaja muvaffaqiyatli bajarildi. Bemor yaxshi holatda.' },
    { label: '💊 Dori qabul qilindi', value: 'Dori to\'liq dozada qabul qilindi. Nojo\'ya ta\'sir kuzatilmadi.' },
    { label: '⚠️ Qisman bajarildi', value: 'Muolaja qisman bajarildi. Bemor to\'liq dozani qabul qila olmadi.' },
    { label: '🔄 Takrorlash kerak', value: 'Muolaja bajarildi, keyingi seansda takrorlash tavsiya etiladi.' },
    { label: '📝 Maxsus izoh', value: '' }
  ];

  const loadTreatments = async () => {
    try {
      setLoading(true);
      setShowModal(true);
      
      console.log('=== LOADING TREATMENTS ===');
      console.log('Patient ID:', patientId);
      console.log('Room Number:', roomNumber, 'Type:', typeof roomNumber);
      console.log('Bed Number:', bedNumber, 'Type:', typeof bedNumber);
      
      // Hamshiraga biriktirilgan barcha muolajalarni olish
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1'}/nurse/treatments`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      const data = await response.json();
      
      console.log('=== LOAD TREATMENTS (FRONTEND) ===');
      console.log('Total treatments from API:', data.data?.length || 0);
      console.log('Room:', roomNumber, 'Bed:', bedNumber);
      console.log('Room type:', typeof roomNumber, 'Bed type:', typeof bedNumber);
      
      // Log first few treatments to see structure
      if (data.data && data.data.length > 0) {
        console.log('Sample treatment:', JSON.stringify(data.data[0], null, 2));
        console.log('All treatments admission_info:', data.data.map(t => ({
          id: t.id,
          medicine: t.medication_name,
          admission_info: t.admission_info
        })));
      }
      
      if (data.success) {
        let filteredTreatments = [];
        
        // Agar roomNumber va bedNumber berilgan bo'lsa, ular bo'yicha filter qilamiz
        if (roomNumber && bedNumber) {
          filteredTreatments = data.data.filter(t => {
            const roomInfo = t.admission_info?.room_info;
            
            console.log('Checking treatment:', t.medication_name);
            console.log('  Room info:', roomInfo);
            
            if (!roomInfo) {
              console.log('  ❌ No room_info');
              return false;
            }
            
            console.log('  Comparing:', {
              roomInfo_number: roomInfo.room_number,
              roomInfo_bed: roomInfo.bed_number,
              target_room: roomNumber,
              target_bed: bedNumber
            });
            
            // Convert to strings for comparison to handle both string and number types
            const matchesRoom = String(roomInfo.room_number) === String(roomNumber);
            const matchesBed = String(roomInfo.bed_number) === String(bedNumber);
            
            console.log('  Room match:', matchesRoom, 'Bed match:', matchesBed);
            
            return matchesRoom && matchesBed;
          });
          
          console.log('After room/bed filter:', filteredTreatments.length);
          
          // Agar xona/koyka bo'yicha topilmasa, patient_id bo'yicha qidiramiz
          if (filteredTreatments.length === 0 && patientId) {
            console.log('⚠️  No treatments found by room/bed, trying patient_id:', patientId);
            filteredTreatments = data.data.filter(t => {
              const tPatientId = t.patient_id?._id || t.patient_id;
              const match = String(tPatientId) === String(patientId);
              if (match) {
                console.log('  ✅ Found treatment for patient:', t.medication_name);
              }
              return match;
            });
            console.log('After patient_id filter:', filteredTreatments.length);
          }
        } else if (patientId) {
          // Agar faqat patientId berilgan bo'lsa, patient bo'yicha filter qilamiz
          console.log('Filtering by patient_id only:', patientId);
          filteredTreatments = data.data.filter(t => {
            const tPatientId = t.patient_id?._id || t.patient_id;
            return String(tPatientId) === String(patientId);
          });
        }
        
        console.log('Final filtered treatments:', filteredTreatments.length);
        console.log('Filtered treatment IDs:', filteredTreatments.map(t => t.id || t._id));
        console.log('Filtered medicines:', filteredTreatments.map(t => `${t.medication_name} (${t.dosage})`));
        
        // Agar ambulatorxona bo'lsa, faqat shoshilinch muolajalarni ko'rsatish
        if (admissionType === 'outpatient') {
          filteredTreatments = filteredTreatments.filter(t => t.prescription_type === 'URGENT');
          console.log('After URGENT filter:', filteredTreatments.length);
        }
        
        // Check for duplicates
        const medicineNames = filteredTreatments.map(t => t.medication_name);
        const duplicateMedicines = medicineNames.filter((name, index) => medicineNames.indexOf(name) !== index);
        if (duplicateMedicines.length > 0) {
          console.warn('⚠️  DUPLICATE MEDICINES FOUND:', duplicateMedicines);
        }
        
        setTreatments(filteredTreatments || []);
      } else {
        toast.error('Muolajalarni yuklashda xatolik');
      }
    } catch (error) {
      console.error('Load treatments error:', error);
      toast.error('Muolajalarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTreatment = async (treatmentId, usedMedicines) => {
    try {
      const loadingToast = toast.loading('Muolaja yakunlanmoqda...');
      
      const response = await doctorNurseService.completeTask(treatmentId, {
        notes: treatmentNotes,
        used_medicines: usedMedicines
      });
      
      toast.dismiss(loadingToast);
      
      if (response.success) {
        toast.success('✅ Muolaja muvaffaqiyatli yakunlandi!', {
          duration: 3000,
          icon: '🎉'
        });
        setCompletingTreatment(null);
        setTreatmentNotes('');
        setQuickNoteTemplate('');
        
        // Muolajalarni qayta yuklash
        await loadTreatments();
        
        // Agar callback berilgan bo'lsa, chaqirish (koykani yangilash uchun)
        if (onTreatmentComplete) {
          onTreatmentComplete();
        }
      } else {
        toast.error('❌ Xatolik: ' + (response.message || response.error));
      }
    } catch (error) {
      console.error('Complete treatment error:', error);
      toast.error('❌ Xatolik yuz berdi: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleQuickComplete = (treatmentId) => {
    // Tez yakunlash - dori tanlamasdan
    setCurrentTreatmentId(treatmentId);
    setTreatmentNotes('Muolaja muvaffaqiyatli bajarildi.');
    setShowMedicineModal(true);
  };

  const handleNoteTemplateSelect = (template) => {
    setQuickNoteTemplate(template.value);
    setTreatmentNotes(template.value);
  };

  const handleShowMedicineModal = (treatmentId) => {
    setCurrentTreatmentId(treatmentId);
    setShowMedicineModal(true);
  };

  const handleMedicineConfirm = (selectedMedicines) => {
    if (currentTreatmentId) {
      handleCompleteTreatment(currentTreatmentId, selectedMedicines);
      setCurrentTreatmentId(null);
    }
  };

  const handleBedClick = (e) => {
    // Agar tugmaga bosilgan bo'lsa, modal ochmaslik
    if (e.target.closest('button')) {
      return;
    }
    
    // Faqat hamshiraga biriktirilgan bemorlar uchun modal ochish
    if (hasMyTreatments && patientId) {
      loadTreatments();
    }
  };

  // Group treatments by urgency
  const groupedTreatments = {
    urgent: treatments.filter(t => t.prescription_type === 'URGENT' && t.status === 'pending'),
    regular: treatments.filter(t => t.prescription_type === 'REGULAR' && t.status === 'pending'),
    chronic: treatments.filter(t => t.prescription_type === 'CHRONIC' && t.status === 'pending'),
    completed: treatments.filter(t => t.status === 'completed')
  };

  const totalPending = groupedTreatments.urgent.length + groupedTreatments.regular.length + groupedTreatments.chronic.length;
  const totalCompleted = groupedTreatments.completed.length;
  const completionPercentage = treatments.length > 0 ? Math.round((totalCompleted / treatments.length) * 100) : 0;

  // Render treatment card
  const renderTreatmentCard = (treatment, type) => {
    const isCompleting = completingTreatment === treatment.id;
    
    const typeConfig = {
      urgent: { 
        bg: 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20',
        border: 'border-2 border-red-200 dark:border-red-800',
        icon: 'emergency',
        iconColor: 'text-red-600'
      },
      regular: { 
        bg: 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
        border: 'border-2 border-blue-200 dark:border-blue-800',
        icon: 'medication',
        iconColor: 'text-blue-600'
      },
      chronic: { 
        bg: 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20',
        border: 'border-2 border-purple-200 dark:border-purple-800',
        icon: 'calendar_month',
        iconColor: 'text-purple-600'
      }
    };

    const config = typeConfig[type];

    return (
      <div key={treatment.id} className={`${config.bg} ${config.border} rounded-2xl p-4 transition-all duration-300 hover:shadow-lg`}>
        {isCompleting ? (
          // Yakunlash formi
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-white">check_circle</span>
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">Muolajani yakunlash</h4>
            </div>

            {/* Quick note templates */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                💬 Tez izoh tanlash
              </label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {noteTemplates.slice(0, 4).map((template, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleNoteTemplateSelect(template)}
                    className={`px-3 py-2 text-xs font-medium rounded-xl transition-all ${
                      quickNoteTemplate === template.value
                        ? 'bg-green-500 text-white shadow-lg scale-105'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom note */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                📝 Maxsus izoh (ixtiyoriy)
              </label>
              <textarea
                value={treatmentNotes}
                onChange={(e) => {
                  setTreatmentNotes(e.target.value);
                  setQuickNoteTemplate('');
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-xl text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                rows="3"
                placeholder="Qo'shimcha izoh yozing..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCompletingTreatment(null);
                  setTreatmentNotes('');
                  setQuickNoteTemplate('');
                }}
                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold transition-all"
              >
                ← Bekor qilish
              </button>
              <button
                onClick={() => handleShowMedicineModal(treatment.id)}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">check_circle</span>
                Tasdiqlash
              </button>
            </div>
          </div>
        ) : (
          // Muolaja ma'lumotlari
          <div>
            <div className="flex items-start gap-3 mb-3">
              <div className={`w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-md ${config.border}`}>
                <span className={`material-symbols-outlined text-2xl ${config.iconColor}`}>{config.icon}</span>
              </div>
              <div className="flex-1">
                <h5 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{treatment.medication_name}</h5>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="material-symbols-outlined text-base">medication</span>
                  <span>Doza: <strong>{treatment.dosage}</strong></span>
                </div>
                {/* Progress indicator */}
                {treatment.total_doses > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600 dark:text-gray-400">
                        Bajarildi: <strong>{treatment.completed_doses || 0}/{treatment.total_doses}</strong>
                      </span>
                      <span className="font-bold text-blue-600">
                        {Math.round(((treatment.completed_doses || 0) / treatment.total_doses) * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-600 transition-all duration-500"
                        style={{ width: `${((treatment.completed_doses || 0) / treatment.total_doses) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Details - ALWAYS show, not just when frequency_per_day exists */}
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-3 mb-3 space-y-2">
              {/* Frequency and Duration */}
              {treatment.frequency_per_day && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-base text-blue-600">schedule</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    Kuniga <strong>{treatment.frequency_per_day} marta</strong>
                    {treatment.duration_days && <>, <strong>{treatment.duration_days} kun</strong> davomida</>}
                  </span>
                </div>
              )}
              
              {/* Schedule Times */}
              {treatment.schedule_times && treatment.schedule_times.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <span className="material-symbols-outlined text-base text-purple-600">alarm</span>
                  <div className="flex-1">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Qabul qilish vaqtlari:</div>
                    <div className="flex flex-wrap gap-1">
                      {treatment.schedule_times.map((time, idx) => (
                        <span key={idx} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg text-xs font-semibold">
                          {time}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Prescription Type Badge */}
              <div className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-base text-amber-600">label</span>
                <span className="text-gray-700 dark:text-gray-300">
                  Turi: <strong className={`
                    ${treatment.prescription_type === 'URGENT' ? 'text-red-600' : ''}
                    ${treatment.prescription_type === 'REGULAR' ? 'text-blue-600' : ''}
                    ${treatment.prescription_type === 'CHRONIC' ? 'text-purple-600' : ''}
                    ${!treatment.prescription_type ? 'text-gray-600' : ''}
                  `}>
                    {treatment.prescription_type === 'URGENT' && 'Shoshilinch'}
                    {treatment.prescription_type === 'REGULAR' && 'Oddiy'}
                    {treatment.prescription_type === 'CHRONIC' && 'Surunkali'}
                    {!treatment.prescription_type && 'Belgilanmagan'}
                  </strong>
                </span>
              </div>
              
              {/* Scheduled Date/Time */}
              {treatment.scheduled_time && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-base text-green-600">event</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    Rejalashtirilgan: <strong>{new Date(treatment.scheduled_time).toLocaleString('uz-UZ', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</strong>
                  </span>
                </div>
              )}
              
              {/* Nurse Assignment */}
              {treatment.nurse_id && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-base text-teal-600">medical_services</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    Hamshira: <strong>
                      {treatment.nurse_id?.first_name} {treatment.nurse_id?.last_name}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            {/* Instructions - Always visible, not just when expanded */}
            {treatment.instructions && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 mb-3 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-base flex-shrink-0">info</span>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Ko'rsatmalar:</div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{treatment.instructions}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handleQuickComplete(treatment.id)}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">bolt</span>
                Tez yakunlash
              </button>
              <button
                onClick={() => setCompletingTreatment(treatment.id)}
                className="px-4 py-3 bg-white dark:bg-gray-800 border-2 border-green-500 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 font-semibold transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">edit_note</span>
                Izoh bilan
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render completed treatment card
  const renderCompletedTreatmentCard = (treatment) => {
    return (
      <div key={treatment.id} className="bg-green-50 dark:bg-green-900/10 border-2 border-green-200 dark:border-green-800 rounded-xl p-4 opacity-90">
        <div className="flex items-start gap-3 mb-2">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-white text-xl">check</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-bold text-gray-900 dark:text-white text-base">{treatment.medication_name}</p>
              <span className="px-2 py-0.5 bg-green-600 text-white rounded-full text-xs font-bold">✓ Bajarildi</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Doza: <strong>{treatment.dosage}</strong></p>
            
            {/* Completed details */}
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              {treatment.completed_at && (
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  <span>Bajarilgan vaqt: {new Date(treatment.completed_at).toLocaleString('uz-UZ', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
              )}
              
              {treatment.completion_notes && (
                <div className="flex items-start gap-1 mt-2 p-2 bg-white dark:bg-gray-800 rounded-lg">
                  <span className="material-symbols-outlined text-sm">note</span>
                  <span className="flex-1">{treatment.completion_notes}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div 
        onClick={handleBedClick}
        className={`relative ${hasMyTreatments && patientId ? 'cursor-pointer' : ''} ${isNurseCalling ? 'nurse-call-active' : ''}`}
      >
        {/* Nurse Call Indicator */}
        {isNurseCalling && (
          <div className="absolute -top-2 -right-2 z-10">
            <div className="relative">
              <span className="material-symbols-outlined nurse-call-bell text-red-500 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg">
                notifications_active
              </span>
              <span className="absolute top-0 right-0 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            </div>
          </div>
        )}
        
        {/* Treatment Timer - shows in top-right corner */}
        {hasMyTreatments && patientId && treatments.length > 0 && (
          <TreatmentTimer 
            treatments={treatments} 
            audioEnabled={audioEnabled}
            playAlarmSound={playAlarmSound}
          />
        )}
        
        {children}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slideUp" onClick={(e) => e.stopPropagation()}>
            
            {/* Header with patient info and progress */}
            <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-gray-100 dark:border-gray-700">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {patientName?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{patientName}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">bed</span>
                      Xona {roomNumber}, Ko'rpa {bedNumber}
                    </p>
                  </div>
                </div>
                
                {/* Progress bar */}
                {treatments.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-gray-600 dark:text-gray-400">
                        Bajarilish: {totalCompleted}/{treatments.length}
                      </span>
                      <span className="font-bold text-green-600">{completionPercentage}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-500 ease-out"
                        style={{ width: `${completionPercentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => {
                  setShowModal(false);
                  setCompletingTreatment(null);
                  setTreatmentNotes('');
                  setQuickNoteTemplate('');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors ml-4"
              >
                <span className="material-symbols-outlined text-gray-500">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">Muolajalar yuklanmoqda...</p>
                </div>
              ) : treatments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-5xl text-gray-400">medication</span>
                  </div>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Muolajalar yo'q</p>
                  <p className="text-gray-500 dark:text-gray-400">Bu koykada hozircha muolajalar mavjud emas</p>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Urgent treatments */}
                  {groupedTreatments.urgent.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 rounded-full">
                          <span className="material-symbols-outlined text-red-600 text-lg">emergency</span>
                          <span className="text-sm font-bold text-red-700 dark:text-red-400">Shoshilinch</span>
                          <span className="px-2 py-0.5 bg-red-600 text-white rounded-full text-xs font-bold">
                            {groupedTreatments.urgent.length}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {groupedTreatments.urgent.map(treatment => renderTreatmentCard(treatment, 'urgent'))}
                      </div>
                    </div>
                  )}

                  {/* Regular treatments */}
                  {groupedTreatments.regular.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                          <span className="material-symbols-outlined text-blue-600 text-lg">medication</span>
                          <span className="text-sm font-bold text-blue-700 dark:text-blue-400">Oddiy muolajalar</span>
                          <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-xs font-bold">
                            {groupedTreatments.regular.length}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {groupedTreatments.regular.map(treatment => renderTreatmentCard(treatment, 'regular'))}
                      </div>
                    </div>
                  )}

                  {/* Chronic treatments */}
                  {groupedTreatments.chronic.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                          <span className="material-symbols-outlined text-purple-600 text-lg">calendar_month</span>
                          <span className="text-sm font-bold text-purple-700 dark:text-purple-400">Surunkali</span>
                          <span className="px-2 py-0.5 bg-purple-600 text-white rounded-full text-xs font-bold">
                            {groupedTreatments.chronic.length}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {groupedTreatments.chronic.map(treatment => renderTreatmentCard(treatment, 'chronic'))}
                      </div>
                    </div>
                  )}

                  {/* Completed treatments */}
                  {groupedTreatments.completed.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                          <span className="material-symbols-outlined text-green-600 text-lg">check_circle</span>
                          <span className="text-sm font-bold text-green-700 dark:text-green-400">Bajarilgan muolajalar</span>
                          <span className="px-2 py-0.5 bg-green-600 text-white rounded-full text-xs font-bold">
                            {groupedTreatments.completed.length}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {groupedTreatments.completed.map(treatment => renderCompletedTreatmentCard(treatment))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dori tanlash modali */}
      <MedicineSelectionModal
        isOpen={showMedicineModal}
        onClose={() => {
          setShowMedicineModal(false);
          setCurrentTreatmentId(null);
        }}
        onConfirm={handleMedicineConfirm}
        admissionType={admissionType}
      />
    </>
  );
}
