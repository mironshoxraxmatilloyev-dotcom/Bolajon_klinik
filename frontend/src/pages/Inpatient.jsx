import { useState, useEffect, useRef } from 'react';
import inpatientRoomService from '../services/inpatientRoomService';
import patientService from '../services/patientService';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../contexts/AuthContext';
import BedTreatmentWrapper from '../components/BedTreatmentWrapper';
import { io } from 'socket.io-client';

export default function Inpatient() {
  const { user } = useAuth();
  
  // Audio notification system for Inpatient (Statsionar)
  const [audioEnabled, setAudioEnabled] = useState(() => {
    return localStorage.getItem('inpatient_audio_enabled') === 'true';
  });
  const audioRef = useRef(null);
  const audioTimeoutRef = useRef(null);
  
  // Role checking
  const userRole = user?.role?.name || user?.role_name;
  const isNurse = userRole?.toLowerCase() === 'hamshira' || userRole?.toLowerCase() === 'nurse';
  const isDoctor = userRole?.toLowerCase() === 'shifokor' || userRole?.toLowerCase() === 'doctor';
  const isAdmin = userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'administrator';
  const isReadOnly = isNurse || isDoctor; // Hamshira va shifokor faqat ko'radi
  const canAddRoom = isAdmin; // Faqat admin xona qo'sha oladi
  
  // Hamshiraga biriktirilgan bemorlar ID'lari
  const [myPatientIds, setMyPatientIds] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('map');
  const [selectedFloor, setSelectedFloor] = useState(null); // Barcha qavatlar
  const [visualMap, setVisualMap] = useState({ floors: {}, total_beds: 0 });
  const [treatments, setTreatments] = useState([]);
  const [pendingCalls, setPendingCalls] = useState([]);
  const [nurseCallsMap, setNurseCallsMap] = useState(new Map()); // patientId -> call data
  const [cabinets, setCabinets] = useState([]);
  const [stats, setStats] = useState({});
  const [rooms, setRooms] = useState([]);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomForm, setRoomForm] = useState({
    room_number: '',
    floor_number: 1,
    room_type: 'standard',
    daily_rate: 200000,
    bed_count: 2,
    department: 'inpatient' // Statsionar bo'limi
  });
  
  // Bemor tanlash modali
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [selectedBed, setSelectedBed] = useState(null);
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);
  
  // Yangi state'lar
  const [complaints, setComplaints] = useState([]);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [qrTicket, setQrTicket] = useState(null);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [treatmentNotification, setTreatmentNotification] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  
  // Mutaxasis biriktirish modali
  const [showSpecialistModal, setShowSpecialistModal] = useState(false);
  const [showSpecialistListModal, setShowSpecialistListModal] = useState(false);
  const [selectedBedForSpecialist, setSelectedBedForSpecialist] = useState(null);
  const [assignedSpecialists, setAssignedSpecialists] = useState([]);
  const [specialistForm, setSpecialistForm] = useState({
    specialist_type: '',
    doctor_name: '',
    appointment_time: '',
    price: '',
    notes: ''
  });

  const showConfirm = (message, onConfirm, options = {}) => {
    setConfirmModal({ 
      isOpen: true, 
      title: options.title || 'Tasdiqlash',
      message, 
      onConfirm,
      type: options.type || 'warning',
      confirmText: options.confirmText || 'Tasdiqlash',
      cancelText: options.cancelText || 'Bekor qilish'
    });
  };

  useEffect(() => {
    loadData();
    
    // Audio ref'ni null qilib boshlash (audio fayl uchun)
    audioRef.current = null;
    
    // WebSocket ulanishi
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    const socket = io(apiUrl.replace('/api/v1', ''));
    
    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
    });
    
    socket.on('nurse-call', (data) => {
      console.log('🔔 Nurse call received:', data);
      
      // Ovoz chiqarish (agar yoqilgan bo'lsa - barcha chaqiruvlar uchun)
      if (audioEnabled) {
        playAlarmSound();
      }
      
      // Qo'ng'iroqni map'ga qo'shish
      setNurseCallsMap(prev => {
        const newMap = new Map(prev);
        newMap.set(data.patientId, {
          ...data,
          timestamp: new Date(data.timestamp)
        });
        return newMap;
      });
      
      // Toast xabari
      toast.error(
        `🚨 BEMOR CHAQIRYAPTI!\n${data.patientName}\nXona: ${data.roomNumber}, Ko'rpa: ${data.bedNumber}`,
        {
          duration: 10000,
          position: 'top-center',
          style: {
            background: '#ef4444',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '16px'
          }
        }
      );
      
      // 30 soniyadan keyin qo'ng'iroqni o'chirish
      setTimeout(() => {
        setNurseCallsMap(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.patientId);
          return newMap;
        });
      }, 30000);
    });
    
    // Treatment notification listener
    socket.on('treatment-notification', (data) => {
      console.log('⏰ Treatment notification received:', data);
      
      // Modal oynani ochish
      setTreatmentNotification(data);
      setShowTreatmentModal(true);
      
      // Ovoz chiqarish (agar yoqilgan bo'lsa)
      if (audioEnabled) {
        playAlarmSound();
      }
      
      toast.success(`⏰ Muolaja vaqti! ${data.patientName} - ${data.medicationName}`, {
        duration: 10000,
        icon: '💊'
      });
    });
    
    return () => {
      socket.disconnect();
      if (audioTimeoutRef.current) {
        clearTimeout(audioTimeoutRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioEnabled]);

  // Qavat o'zgarganida faqat kerakli ma'lumotlarni yangilash
  useEffect(() => {
    if (!loading) {
      loadFloorData();
    }
  }, [selectedFloor]);

  // Toggle audio notifications
  const toggleAudio = (e) => {
    e.preventDefault(); // Sahifa yangilanishini oldini olish
    console.log('🔘 toggleAudio clicked, current state:', audioEnabled);
    
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    localStorage.setItem('inpatient_audio_enabled', newState.toString());
    
    console.log('🔘 New audio state:', newState);
    
    if (newState) {
      toast.success('🔊 Ovozli ogohlantirish yoqildi (Statsionar)');
      // Test sound
      console.log('🎵 Playing test sound...');
      playAlarmSound();
    } else {
      toast.success('🔇 Ovozli ogohlantirish o\'chirildi (Statsionar)');
    }
  };

  // Play alarm sound (audio fayl)
  const playAlarmSound = () => {
    console.log('🔊 playAlarmSound called');
    
    // Agar avvalgi ovoz o'ynayotgan bo'lsa, to'xtatish
    if (audioRef.current) {
      console.log('⏹ Stopping previous audio');
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Yangi audio obyekt yaratish
    const audioPath = '/sounds/sound.mp3';
    console.log('🎵 Creating audio with path:', audioPath);
    
    const audio = new Audio(audioPath);
    audio.volume = 0.8; // 80% ovoz balandligi
    audio.loop = true; // Takrorlansin
    
    audioRef.current = audio;
    
    // Ovozni boshlash
    console.log('▶️ Attempting to play audio...');
    audio.play()
      .then(() => {
        console.log('✅ Audio playing successfully!');
        toast.success('🔊 Ovoz chiqmoqda...');
      })
      .catch(error => {
        console.error('❌ Audio play error:', error);
        toast.error('Ovozni chiqarib bo\'lmadi. Brauzer ruxsat bermagan bo\'lishi mumkin.');
      });
    
    // 10 soniyadan keyin to'xtatish
    audioTimeoutRef.current = setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        console.log('⏹ Alarm sound stopped after 10 seconds');
      }
    }, 10000); // 10 seconds
  };

  const loadFloorData = async () => {
    try {
      // Faqat qavat bilan bog'liq ma'lumotlarni yangilash
      const [mapData, cabinetData, roomsData] = await Promise.all([
        inpatientRoomService.getVisualMap(selectedFloor),
        inpatientRoomService.getMedicineCabinets(selectedFloor),
        inpatientRoomService.getRooms() // Barcha qavatlar
      ]);
      
      if (mapData.success) setVisualMap(mapData.data);
      if (cabinetData.success) setCabinets(cabinetData.data);
      if (roomsData.success) setRooms(roomsData.data);
    } catch (error) {
      console.error('Load floor data error:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cache bypass uchun timestamp qo'shamiz
      const timestamp = Date.now();
      
      const promises = [
        inpatientRoomService.getVisualMap(selectedFloor), // Tanlangan qavat uchun
        inpatientRoomService.getVisualMap(), // Barcha qavatlar uchun (statistika)
        inpatientRoomService.getTreatmentSchedule({ status: 'pending' }),
        inpatientRoomService.getPendingCalls(),
        inpatientRoomService.getMedicineCabinets(selectedFloor),
        inpatientRoomService.getStats(),
        inpatientRoomService.getRooms() // Barcha qavatlar
      ];
      
      // Agar hamshira bo'lsa, unga biriktirilgan bemorlarni ham yuklash
      if (isNurse) {
        promises.push(
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1'}/nurse/treatments`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }).then(res => res.json())
        );
      }
      
      const results = await Promise.all(promises);
      const [mapData, allMapData, treatmentData, callsData, cabinetData, statsData, roomsData, myTreatmentsData] = results;
      
      if (mapData.success) setVisualMap(mapData.data);
      if (treatmentData.success) setTreatments(treatmentData.data);
      if (callsData.success) setPendingCalls(callsData.data);
      if (cabinetData.success) setCabinets(cabinetData.data);
      if (statsData.success) setStats(statsData.data);
      if (roomsData.success) {
        setRooms(roomsData.data);
      }
      
      // Hamshiraga biriktirilgan bemorlar ID'larini saqlash
      if (isNurse && myTreatmentsData?.success) {
        const patientIds = [...new Set(myTreatmentsData.data.map(t => t.patient_id?._id || t.patient_id).filter(Boolean))];
        setMyPatientIds(patientIds);
        console.log('My patient IDs:', patientIds);
      }
      
      // Barcha qavatlar statistikasini alohida state ga saqlash
      if (allMapData.success) {
        setStats(prev => ({
          ...prev,
          allBeds: allMapData.data
        }));
      }
      
      // Complaints feature disabled - not needed
      setComplaints([]);
    } catch (error) {
      console.error('Load error:', error);
      toast.error('Xatolik: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const loadComplaints = async () => {
    try {
      const response = await inpatientRoomService.getComplaints();
      if (response.success) {
        setComplaints(response.data);
      }
    } catch (error) {
      console.error('Load complaints error:', error);
      // Silently fail - complaints feature might not be available
      setComplaints([]);
    }
  };

  const handleAcknowledgeComplaint = async (complaintId) => {
    try {
      const response = await inpatientRoomService.acknowledgeComplaint(complaintId);
      if (response.success) {
        toast.success('Shikoyat qabul qilindi');
        loadComplaints();
      }
    } catch (error) {
      toast.error('Xatolik: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleResolveComplaint = async (complaintId) => {
    const notes = prompt('Hal qilish izohi:');
    if (!notes) return;
    
    try {
      const response = await inpatientRoomService.resolveComplaint(complaintId, notes);
      if (response.success) {
        toast.success('Shikoyat hal qilindi');
        loadComplaints();
      }
    } catch (error) {
      toast.error('Xatolik: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    
    console.log('=== FRONTEND CREATE ROOM ===');
    console.log('roomForm:', roomForm);
    console.log('bed_count:', roomForm.bed_count, 'type:', typeof roomForm.bed_count);
    
    try {
      if (editingRoom) {
        // Tahrirlash
        const result = await inpatientRoomService.updateRoom(editingRoom.id, roomForm);
        if (result.success) {
          toast.success('Xona yangilandi!');
          setShowRoomModal(false);
          setEditingRoom(null);
          setRoomForm({
            room_number: '',
            floor_number: 1,
            room_type: 'standard',
            daily_rate: 200000,
            bed_count: 2,
            department: 'inpatient'
          });
          loadData();
        }
      } else {
        // Yangi yaratish
        const dataToSend = {
          ...roomForm,
          department: 'inpatient' // Statsionar bo'limi
        };
        
        const result = await inpatientRoomService.createRoom(dataToSend);
        
        if (result.success) {
          toast.success(`Xona va ${roomForm.bed_count} ta koyka yaratildi!`);
          setShowRoomModal(false);
          setRoomForm({
            room_number: '',
            floor_number: 1,
            room_type: 'standard',
            daily_rate: 200000,
            bed_count: 2,
            department: 'inpatient'
          });
          loadData();
        }
      }
    } catch (error) {
      console.error('=== FRONTEND ERROR ===');
      console.error('Error:', error);
      console.error('Response:', error.response?.data);
      toast.error('Xatolik: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEditRoom = (room) => {
    setEditingRoom(room);
    setRoomForm({
      room_number: room.room_number,
      floor_number: room.floor,
      room_type: room.room_type,
      daily_rate: parseFloat(room.daily_rate)
    });
    setShowRoomModal(true);
  };

  const handleDeleteRoom = async (roomId, roomNumber) => {
    showConfirm(
      `Xona ${roomNumber} va uning koykalarini o'chirmoqchimisiz?`,
      async () => {
        try {
          const result = await inpatientRoomService.deleteRoom(roomId);
          if (result.success) {
            toast.success('Xona o\'chirildi!');
            loadData();
          }
        } catch (error) {
          toast.error('Xatolik: ' + (error.response?.data?.message || error.message));
        }
      },
      {
        title: 'Xonani o\'chirish',
        type: 'danger',
        confirmText: 'O\'chirish',
        cancelText: 'Bekor qilish'
      }
    );
  };

  const handleBedStatusToggle = async (bed, currentStatus) => {
    try {
      // Status mapping: database -> frontend -> database
      const statusMap = {
        'FREE': 'available',
        'OCCUPIED': 'occupied',
        'CLEANING': 'cleaning',
        'MAINTENANCE': 'maintenance',
        'UNPAID': 'unpaid'
      };
      
      const frontendStatus = statusMap[currentStatus] || (currentStatus ? currentStatus.toLowerCase() : 'available');
      const newStatus = frontendStatus === 'available' ? 'occupied' : 'available';
      
      // Agar band qilmoqchi bo'lsa, modal oynani ochish
      if (newStatus === 'occupied') {
        // Bemorlar ro'yxatini olish
        const patientsResponse = await patientService.getPatients();
        if (patientsResponse.success && patientsResponse.data.length > 0) {
          setPatients(patientsResponse.data);
          setFilteredPatients(patientsResponse.data);
          setSelectedBed(bed); // Save the whole bed object
          setShowPatientModal(true);
        } else {
          toast.error('Bemorlar topilmadi');
        }
        return;
      }
      
      // Bo'shatish - admission'ni discharge qilish
      showConfirm(
        'Bemorni chiqarishni tasdiqlaysizmi?',
        async () => {
          try {
            // bed.admission_id mavjud bo'lsa, to'g'ridan-to'g'ri discharge qilish
            if (bed.admission_id) {
              const dischargeNotes = prompt('Chiqarish izohi (ixtiyoriy):') || '';
              const dischargeResult = await inpatientRoomService.dischargePatient(bed.admission_id, {
                discharge_type: 'normal',
                discharge_notes: dischargeNotes
              });
              
              if (dischargeResult.success) {
                toast.success('Bemor chiqarildi');
                loadData();
                return;
              } else {
                toast.error('Chiqarishda xatolik: ' + (dischargeResult.message || 'Noma\'lum xatolik'));
              }
            } else {
              // Admission topilmasa, faqat koyka statusini o'zgartirish
              console.log('No admission found, just freeing bed');
              toast.success('Koyka bo\'shatildi');
              loadData();
            }
          } catch (dischargeError) {
            console.error('Discharge error:', dischargeError);
            toast.error('Xatolik: ' + (dischargeError.response?.data?.message || dischargeError.message));
          }
        },
        {
          title: 'Bemorni chiqarish',
          type: 'warning',
          confirmText: 'Chiqarish',
          cancelText: 'Bekor qilish'
        }
      );
    } catch (error) {
      console.error('Bed toggle error:', error);
      toast.error('Xatolik: ' + (error.response?.data?.message || error.message));
    }
  };

  const handlePatientSelect = async (patientId) => {
    try {
      // Bemorni tanlash
      const selectedPatient = patients.find(p => p.id === patientId);
      if (!selectedPatient) {
        toast.error('Bemor topilmadi');
        return;
      }
      
      // Admission ma'lumotlarini so'rash
      const admissionReason = prompt('Yotqizish sababi:');
      if (!admissionReason || admissionReason.trim() === '') {
        toast.error('Yotqizish sababi kiritilmadi');
        return;
      }
      
      const diagnosis = prompt('Tashxis (ixtiyoriy):');
      
      // selectedBed is now the actual bed object with room_id and bed_number
      let roomId, bedNumber;
      
      if (typeof selectedBed === 'object' && selectedBed.room_id && selectedBed.bed_number) {
        // New format: bed object
        roomId = selectedBed.room_id;
        bedNumber = selectedBed.bed_number;
      } else if (typeof selectedBed === 'string' && selectedBed.includes('-bed-')) {
        // Old format: "roomId-bed-bedNumber"
        const parts = selectedBed.split('-bed-');
        roomId = parts[0];
        bedNumber = parseInt(parts[1]) || 1;
      } else {
        // Fallback
        roomId = selectedBed;
        bedNumber = 1;
      }
      
      // Admission yaratish
      const admissionData = {
        patient_id: patientId,
        room_id: roomId,
        bed_number: bedNumber,
        diagnosis: diagnosis ? diagnosis.trim() : admissionReason.trim(),
        notes: admissionReason.trim()
      };
      
      console.log('=== CREATING ADMISSION ===');
      console.log('Admission data:', admissionData);
      
      const result = await inpatientRoomService.createAdmission(admissionData);
      
      console.log('Admission result:', result);
      
      if (result.success) {
        toast.success(`${selectedPatient.first_name} ${selectedPatient.last_name} yotqizildi`);
        setShowPatientModal(false);
        setSelectedBed(null);
        setPatientSearch('');
        loadData();
      }
    } catch (error) {
      console.error('Create admission error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.message;
      toast.error('Xatolik: ' + errorMessage);
    }
  };

  const handlePatientSearch = (searchTerm) => {
    setPatientSearch(searchTerm);
    
    if (!searchTerm.trim()) {
      setFilteredPatients(patients);
      return;
    }
    
    const filtered = patients.filter(patient => {
      const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
      const patientNumber = patient.patient_number.toLowerCase();
      const search = searchTerm.toLowerCase();
      
      return fullName.includes(search) || patientNumber.includes(search);
    });
    
    setFilteredPatients(filtered);
  };

  // Biriktirilgan mutaxasislarni yuklash
  const loadAssignedSpecialists = async (patientId) => {
    try {
      console.log('=== LOADING SPECIALISTS ===');
      console.log('Patient ID:', patientId);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1'}/appointments/patient/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      console.log('Response:', data);
      
      if (data.success) {
        setAssignedSpecialists(data.data || []);
        console.log('Specialists set:', data.data);
      } else {
        setAssignedSpecialists([]);
        console.log('No specialists found');
      }
    } catch (error) {
      console.error('Load specialists error:', error);
      setAssignedSpecialists([]);
    }
  };

  // Mutaxasis biriktirish
  const handleAssignSpecialist = async (e) => {
    e.preventDefault();
    
    console.log('=== ASSIGN SPECIALIST ===');
    console.log('Form data:', specialistForm);
    console.log('Selected bed:', selectedBedForSpecialist);
    
    if (!specialistForm.specialist_type || !specialistForm.doctor_name || !specialistForm.appointment_time || !specialistForm.price) {
      toast.error('Barcha majburiy maydonlarni to\'ldiring');
      return;
    }
    
    try {
      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1'}/appointments/specialist`;
      console.log('API URL:', apiUrl);
      
      const requestBody = {
        patient_id: selectedBedForSpecialist.patient.patient_id,
        doctor_name: specialistForm.doctor_name,
        specialist_type: specialistForm.specialist_type,
        appointment_time: specialistForm.appointment_time,
        price: parseFloat(specialistForm.price),
        notes: specialistForm.notes,
        admission_id: selectedBedForSpecialist.patient.admission_id
      };
      console.log('Request body:', requestBody);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        toast.success('Mutaxasis muvaffaqiyatli biriktirildi va hisob-faktura yaratildi!');
        
        // Formani tozalash
        setSpecialistForm({
          specialist_type: '',
          doctor_name: '',
          appointment_time: '',
          price: '',
          notes: ''
        });
        
        // Mutaxasis biriktirish modalini yopish
        setShowSpecialistModal(false);
        
        // Biriktirilgan mutaxasislarni qayta yuklash
        await loadAssignedSpecialists(selectedBedForSpecialist.patient.patient_id);
        
        // Biriktirilgan mutaxasislar modalini ochish
        setShowSpecialistListModal(true);
        
        // Ma'lumotlarni yangilash
        loadData();
      } else {
        console.error('Error response:', data);
        toast.error(data.message || 'Xatolik yuz berdi');
      }
    } catch (error) {
      console.error('Assign specialist error:', error);
      toast.error('Xatolik: ' + (error.response?.data?.message || error.message));
    }
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

  const currentFloorBeds = visualMap.floors[selectedFloor] || [];

  return (
    <div className="p-8 space-y-6">
      <Toaster position="top-right" />
      
      {/* SUCCESS BANNER */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-6xl">check_circle</span>
            <div>
              <h1 className="text-4xl font-black flex items-center gap-3">
                <span className="material-symbols-outlined text-5xl">verified</span>
                YANGI STATSIONAR TIZIMI ISHLAYAPTI!
              </h1>
              <p className="text-xl mt-2">Vaqt: {new Date().toLocaleString('uz-UZ')}</p>
            </div>
          </div>
          
          {/* Audio Toggle Button */}
          <button
            type="button"
            onClick={toggleAudio}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${
              audioEnabled 
                ? 'bg-white text-green-600 hover:bg-green-50' 
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
            title={audioEnabled ? 'Ovozni o\'chirish' : 'Ovozni yoqish'}
          >
            <span className="material-symbols-outlined text-2xl">
              {audioEnabled ? 'volume_up' : 'volume_off'}
            </span>
            <span>
              {audioEnabled ? 'Ovoz yoqilgan' : 'Ovoz o\'chirilgan'}
            </span>
          </button>
        </div>
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white/20 rounded-lg p-4">
            <p className="text-sm opacity-90">Jami xonalar</p>
            <p className="text-3xl font-bold">{stats.total_rooms || 0}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <p className="text-sm opacity-90">Bo'sh</p>
            <p className="text-3xl font-bold">{stats.available_rooms || 0}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <p className="text-sm opacity-90">Band</p>
            <p className="text-3xl font-bold">{stats.occupied_rooms || 0}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <p className="text-sm opacity-90">Tozalanmoqda</p>
            <p className="text-3xl font-bold">{stats.maintenance_rooms || 0}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <span className="material-symbols-outlined text-3xl mb-2">hotel</span>
          <p className="text-4xl font-black">{stats.active_admissions || 0}</p>
          <p className="text-sm opacity-90 mt-1">Faol bemorlar</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <span className="material-symbols-outlined text-3xl mb-2">bed</span>
          <p className="text-4xl font-black">{stats.total_beds || 0}</p>
          <p className="text-sm opacity-90 mt-1">Jami koykalar</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
          <span className="material-symbols-outlined text-3xl mb-2">check_circle</span>
          <p className="text-4xl font-black">{stats.available_beds || 0}</p>
          <p className="text-sm opacity-90 mt-1">Bo'sh koykalar</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <span className="material-symbols-outlined text-3xl mb-2">person</span>
          <p className="text-4xl font-black">{stats.occupied_beds || 0}</p>
          <p className="text-sm opacity-90 mt-1">Band koykalar</p>
        </div>
      </div>

      {/* Floor Selector - OLIB TASHLANDI, endi barcha qavatlar ko'rinadi */}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-4 px-6">
            {[
              { id: 'map', label: 'Koykalar Xaritasi', icon: 'map' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'map' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold">Xonalar: {rooms.length} ta</h3>
                {canAddRoom && (
                  <button
                    onClick={() => setShowRoomModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <span className="material-symbols-outlined">add</span>
                    Xona qo'shish
                  </button>
                )}
              </div>
              {rooms.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">meeting_room</span>
                  <p className="text-gray-500">Bu qavatda xonalar yo'q</p>
                  {canAddRoom && (
                    <button
                      onClick={() => setShowRoomModal(true)}
                      className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                    >
                      Xona qo'shish
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-all"
                    >
                      {/* Xona rasmi va tugmalar */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl text-white">meeting_room</span>
                          </div>
                          <div>
                            <h4 className="text-2xl font-bold text-gray-900 dark:text-white">
                              Xona {room.room_number}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {room.room_type === 'standard' ? 'Standart' : 
                               room.room_type === 'vip' ? 'VIP' : 
                               room.room_type === 'icu' ? 'Reanimatsiya' : room.room_type}
                            </p>
                          </div>
                        </div>
                        
                        {canAddRoom && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditRoom(room)}
                              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                              title="Tahrirlash"
                            >
                              <span className="material-symbols-outlined">edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteRoom(room.id, room.room_number)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="O'chirish"
                            >
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Koykalar */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Koykalar:
                          </p>
                          {room.beds && room.beds.length > 2 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {room.beds.length} ta koyka
                            </span>
                          )}
                        </div>
                        {room.beds && room.beds.length > 0 ? (
                          <div className={`space-y-3 ${
                            room.beds.length > 2 
                              ? 'max-h-[200px] overflow-y-auto beds-scroll-container pr-2' 
                              : ''
                          }`}>
                            {room.beds.map((bed) => {
                            // Visual map dan bemor ma'lumotlarini topish
                            const bedDetails = currentFloorBeds.find(b => b.id === bed.id) || bed;
                            
                            // Status mapping
                            const statusMap = {
                              'FREE': 'available',
                              'OCCUPIED': 'occupied',
                              'CLEANING': 'cleaning',
                              'MAINTENANCE': 'maintenance',
                              'UNPAID': 'unpaid'
                            };
                            
                            // Safely handle status - check if bed.status exists and is a string
                            const frontendStatus = bed.status 
                              ? (statusMap[bed.status] || (typeof bed.status === 'string' ? bed.status.toLowerCase() : 'available'))
                              : 'available';
                            
                            // YANGI: Barcha band koykalar uchun muolajalarni ko'rsatish
                            const hasMyTreatments = isNurse && bedDetails.patient_id;
                            
                            return (
                              <BedTreatmentWrapper
                                key={bed.id}
                                patientId={bedDetails.patient_id}
                                patientName={bedDetails.first_name ? `${bedDetails.first_name} ${bedDetails.last_name}` : ''}
                                roomNumber={room.room_number}
                                bedNumber={bed.bed_number}
                                onTreatmentComplete={loadData}
                                hasMyTreatments={hasMyTreatments}
                                admissionType="inpatient"
                                isNurseCalling={nurseCallsMap.has(bedDetails.patient_id)}
                                audioEnabled={audioEnabled}
                                playAlarmSound={playAlarmSound}
                              >
                                <div
                                  onClick={() => {
                                    // Faqat band koykalar uchun mutaxasislar ro'yxatini ko'rsatish
                                    if (frontendStatus === 'occupied' && bedDetails.patient_id && !isReadOnly) {
                                      setSelectedBedForSpecialist({
                                        bed: bed,
                                        patient: bedDetails,
                                        room: room
                                      });
                                      // Biriktirilgan mutaxasislarni yuklash
                                      loadAssignedSpecialists(bedDetails.patient_id);
                                      setShowSpecialistListModal(true);
                                    }
                                  }}
                                  className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                                    frontendStatus === 'available'
                                      ? 'bg-green-50 border-green-500 dark:bg-green-900/20'
                                      : frontendStatus === 'occupied'
                                      ? 'bg-red-50 border-red-500 dark:bg-red-900/20 cursor-pointer hover:shadow-md'
                                      : frontendStatus === 'cleaning'
                                      ? 'bg-gray-50 border-gray-500 dark:bg-gray-900/20'
                                      : 'bg-yellow-50 border-yellow-500 dark:bg-yellow-900/20'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-2xl">
                                      {frontendStatus === 'available' ? 'bed' : 
                                       frontendStatus === 'occupied' ? 'hotel' : 
                                       frontendStatus === 'cleaning' ? 'cleaning_services' : 'bed'}
                                    </span>
                                    <div>
                                      <p className="font-bold">Koyka {bed.bed_number}</p>
                                      <p className="text-xs text-gray-600 dark:text-gray-400">
                                        {frontendStatus === 'available' ? 'Bo\'sh' :
                                         frontendStatus === 'occupied' ? 'Band' :
                                         frontendStatus === 'cleaning' ? 'Tozalanmoqda' : frontendStatus}
                                      </p>
                                      {bedDetails.first_name && (
                                        <>
                                          <p className="text-xs font-semibold mt-1">
                                            {bedDetails.first_name} {bedDetails.last_name}
                                          </p>
                                          {/* OLIB TASHLANDI: Barcha hamshiralar barcha bemorlarni ko'radi
                                          {hasMyTreatments && (
                                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-semibold">
                                              💊 Sizning bemorngiz
                                            </p>
                                          )}
                                          */}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {!isReadOnly && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation(); // Koyka click'ini to'xtatish
                                        handleBedStatusToggle(bed, bed.status);
                                      }}
                                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                        frontendStatus === 'available'
                                          ? 'bg-red-500 text-white hover:bg-red-600'
                                          : 'bg-green-500 text-white hover:bg-green-600'
                                      }`}
                                    >
                                      {frontendStatus === 'available' ? 'Band qilish' : 'Bo\'shatish'}
                                    </button>
                                  )}
                                </div>
                              </BedTreatmentWrapper>
                            );
                          })}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Koykalar yo'q</p>
                        )}
                      </div>

                      {/* Narx */}
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Kunlik narx: <span className="font-bold text-gray-900 dark:text-white">
                            {room.daily_rate?.toLocaleString()} so'm
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Xona qo'shish modali */}
      {showRoomModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-3xl">meeting_room</span>
                {editingRoom ? 'Xonani tahrirlash' : 'Yangi xona qo\'shish'}
              </h3>
              <button
                onClick={() => {
                  setShowRoomModal(false);
                  setEditingRoom(null);
                  setRoomForm({
                    room_number: '',
                    floor_number: selectedFloor,
                    room_type: 'standard',
                    daily_rate: 200000,
                    bed_count: 2
                  });
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Xona raqami
                </label>
                <input
                  type="text"
                  required
                  value={roomForm.room_number}
                  onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary focus:outline-none dark:bg-gray-700 dark:text-white"
                  placeholder="101"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Xona turi
                </label>
                <select
                  value={roomForm.room_type}
                  onChange={(e) => setRoomForm({ ...roomForm, room_type: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary focus:outline-none dark:bg-gray-700 dark:text-white"
                >
                  <option value="standard">Standart</option>
                  <option value="vip">VIP</option>
                  <option value="icu">Reanimatsiya</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Kunlik narx (so'm)
                </label>
                <input
                  type="number"
                  required
                  value={roomForm.daily_rate}
                  onChange={(e) => setRoomForm({ ...roomForm, daily_rate: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary focus:outline-none dark:bg-gray-700 dark:text-white"
                  placeholder="200000"
                  step="10000"
                />
              </div>

              {!editingRoom && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Koykalar soni
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="10"
                    value={roomForm.bed_count}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value >= 1 && value <= 10) {
                        setRoomForm({ ...roomForm, bed_count: value });
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary focus:outline-none dark:bg-gray-700 dark:text-white"
                    placeholder="2"
                  />
                  <p className="text-xs text-gray-500 mt-1">1 dan 10 gacha koyka qo'shishingiz mumkin</p>
                </div>
              )}

              <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-300 flex items-center gap-2">
                  <span className="material-symbols-outlined">info</span>
                  {editingRoom 
                    ? 'Xona ma\'lumotlarini yangilang'
                    : `Xona yaratilganda avtomatik ${roomForm.bed_count} ta koyka qo'shiladi`}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRoomModal(false);
                    setEditingRoom(null);
                    setRoomForm({
                      room_number: '',
                      floor_number: selectedFloor,
                      room_type: 'standard',
                      daily_rate: 200000,
                      bed_count: 2
                    });
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">{editingRoom ? 'save' : 'add'}</span>
                  {editingRoom ? 'Saqlash' : 'Yaratish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bemor tanlash modali */}
      {showPatientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-3xl">person_search</span>
                Bemor tanlang
              </h3>
              <button
                onClick={() => {
                  setShowPatientModal(false);
                  setSelectedBed(null);
                  setPatientSearch('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            </div>

            {/* Search */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  search
                </span>
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => handlePatientSearch(e.target.value)}
                  placeholder="Bemor ismi yoki raqamini kiriting..."
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary focus:outline-none dark:bg-gray-700 dark:text-white"
                  autoFocus
                />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {filteredPatients.length} ta bemor topildi
              </p>
            </div>

            {/* Patients List */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredPatients.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">person_off</span>
                  <p className="text-gray-500">Bemorlar topilmadi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPatients.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => handlePatientSelect(patient.id)}
                      className="w-full p-4 bg-gray-50 dark:bg-gray-900 hover:bg-green-50 dark:hover:bg-green-900/20 border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 rounded-xl transition-all text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {patient.first_name.charAt(0)}{patient.last_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400">
                              {patient.first_name} {patient.last_name}
                            </p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">badge</span>
                                {patient.patient_number}
                              </span>
                              {patient.phone && (
                                <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-sm">phone</span>
                                  {patient.phone}
                                </span>
                              )}
                              {patient.birth_date && (
                                <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-sm">cake</span>
                                  {new Date(patient.birth_date).toLocaleDateString('uz-UZ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-2xl text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400">
                          arrow_forward
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowPatientModal(false);
                  setSelectedBed(null);
                  setPatientSearch('');
                }}
                className="w-full px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold transition-colors"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Biriktirilgan mutaxasislar ro'yxati modali */}
      {showSpecialistListModal && selectedBedForSpecialist && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-2xl">
              <div>
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-3xl">medical_information</span>
                  Biriktirilgan mutaxasislar
                </h3>
                <p className="text-sm opacity-90 mt-1">
                  Bemor: {selectedBedForSpecialist.patient.first_name} {selectedBedForSpecialist.patient.last_name}
                </p>
                <p className="text-xs opacity-75">
                  Xona {selectedBedForSpecialist.room.room_number}, Ko'rpa {selectedBedForSpecialist.bed.bed_number}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSpecialistListModal(false);
                  setSelectedBedForSpecialist(null);
                  setAssignedSpecialists([]);
                }}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            </div>

            {/* Mutaxasislar ro'yxati */}
            <div className="flex-1 overflow-y-auto p-6">
              {assignedSpecialists.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">person_off</span>
                  <p className="text-gray-500 dark:text-gray-400">Hali mutaxasis biriktirilmagan</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignedSpecialists.map((specialist, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">person</span>
                            <p className="font-bold text-lg">{specialist.doctor_name}</p>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className="text-gray-600 dark:text-gray-400">
                              <span className="font-semibold">Mutaxasis:</span> {specialist.specialist_type_label || specialist.specialist_type}
                            </p>
                            <p className="text-gray-600 dark:text-gray-400">
                              <span className="font-semibold">Kelish vaqti:</span> {new Date(specialist.appointment_time).toLocaleString('uz-UZ')}
                            </p>
                            <p className="text-gray-600 dark:text-gray-400">
                              <span className="font-semibold">Narx:</span> {specialist.price?.toLocaleString()} so'm
                            </p>
                            {specialist.notes && (
                              <p className="text-gray-600 dark:text-gray-400">
                                <span className="font-semibold">Izoh:</span> {specialist.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer - Mutaxasis biriktirish tugmasi */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowSpecialistListModal(false);
                  setShowSpecialistModal(true);
                }}
                className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">person_add</span>
                Mutaxasis biriktirish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mutaxasis biriktirish modali */}
      {showSpecialistModal && selectedBedForSpecialist && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-2xl">
              <div>
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-3xl">person_add</span>
                  Mutaxasis biriktirish
                </h3>
                <p className="text-sm opacity-90 mt-1">
                  Bemor: {selectedBedForSpecialist.patient.first_name} {selectedBedForSpecialist.patient.last_name}
                </p>
                <p className="text-xs opacity-75">
                  Xona {selectedBedForSpecialist.room.room_number}, Ko'rpa {selectedBedForSpecialist.bed.bed_number}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSpecialistModal(false);
                  setSelectedBedForSpecialist(null);
                  setSpecialistForm({
                    specialist_type: '',
                    doctor_name: '',
                    appointment_time: '',
                    price: '',
                    notes: ''
                  });
                }}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAssignSpecialist} className="p-6 space-y-4">
              {/* Mutaxasis turi */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Mutaxasis turi <span className="text-red-500">*</span>
                </label>
                <select
                  value={specialistForm.specialist_type}
                  onChange={(e) => setSpecialistForm({ ...specialistForm, specialist_type: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary focus:outline-none dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Tanlang...</option>
                  <option value="therapist">Terapevt</option>
                  <option value="surgeon">Xirurg</option>
                  <option value="cardiologist">Kardiolog</option>
                  <option value="neurologist">Nevrolog</option>
                  <option value="pediatrician">Pediatr</option>
                  <option value="gynecologist">Ginekolog</option>
                  <option value="orthopedist">Ortoped</option>
                  <option value="dermatologist">Dermatolog</option>
                  <option value="ophthalmologist">Oftalmolog</option>
                  <option value="ent">LOR</option>
                </select>
              </div>

              {/* Shifokor ism-familiyasi */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Shifokor ism-familiyasi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={specialistForm.doctor_name}
                  onChange={(e) => setSpecialistForm({ ...specialistForm, doctor_name: e.target.value })}
                  placeholder="Masalan: Alisher Navoiy"
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary focus:outline-none dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              {/* Kelish vaqti */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Kelish vaqti <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={specialistForm.appointment_time}
                  onChange={(e) => setSpecialistForm({ ...specialistForm, appointment_time: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary focus:outline-none dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              {/* Narx */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Narx (so'm) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={specialistForm.price}
                  onChange={(e) => setSpecialistForm({ ...specialistForm, price: e.target.value })}
                  placeholder="Masalan: 150000"
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary focus:outline-none dark:bg-gray-700 dark:text-white"
                  required
                  min="0"
                />
              </div>

              {/* Izoh */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Izoh (ixtiyoriy)
                </label>
                <textarea
                  value={specialistForm.notes}
                  onChange={(e) => setSpecialistForm({ ...specialistForm, notes: e.target.value })}
                  placeholder="Qo'shimcha ma'lumot..."
                  rows="3"
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary focus:outline-none dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">check</span>
                  Biriktirish
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSpecialistModal(false);
                    setSelectedBedForSpecialist(null);
                    setSpecialistForm({
                      specialist_type: '',
                      doctor_name: '',
                      appointment_time: '',
                      price: '',
                      notes: ''
                    });
                  }}
                  className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold transition-colors"
                >
                  Bekor qilish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
      />

      {/* Treatment Notification Modal */}
      {showTreatmentModal && treatmentNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full animate-bounce-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 rounded-t-2xl text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center animate-pulse shadow-lg">
                  <img src="/logo.svg" alt="Logo" className="w-12 h-12" />
                </div>
                <div>
                  <h2 className="text-2xl font-black">⏰ MUOLAJA VAQTI!</h2>
                  <p className="text-sm opacity-90">Darhol yordam bering</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border-2 border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-3 mb-3">
                  <span className="material-symbols-outlined text-3xl text-orange-600">person</span>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Bemor</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{treatmentNotification.patientName}</p>
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Bemor №: {treatmentNotification.patientNumber}
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-3xl text-blue-600">medication</span>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Dori</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{treatmentNotification.medicationName}</p>
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Doza: {treatmentNotification.dosage}
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border-2 border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-3xl text-purple-600">schedule</span>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Vaqt</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {new Date(treatmentNotification.scheduledTime).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-b-2xl flex gap-3">
              <button
                onClick={() => {
                  setShowTreatmentModal(false);
                  setTreatmentNotification(null);
                  // Stop audio
                  if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                  }
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg"
              >
                ✅ Tushundim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
