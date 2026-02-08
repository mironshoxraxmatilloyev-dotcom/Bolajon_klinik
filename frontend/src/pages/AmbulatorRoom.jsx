import { useState, useEffect, useRef } from 'react';
import ambulatorInpatientService from '../services/ambulatorInpatientService';
import patientService from '../services/patientService';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../contexts/AuthContext';
import BedTreatmentWrapper from '../components/BedTreatmentWrapper';
import { io } from 'socket.io-client';

export default function AmbulatorRoom() {
  const { user } = useAuth();
  
  // Audio notification system for Ambulator (Ambulatorxona)
  const [audioEnabled, setAudioEnabled] = useState(() => {
    return localStorage.getItem('ambulator_audio_enabled') === 'true';
  });
  const audioRef = useRef(null);
  const audioTimeoutRef = useRef(null);
  const [nurseCallsMap, setNurseCallsMap] = useState(new Map()); // patientId -> call data
  
  // Role checking - turli formatlarni qo'llab-quvvatlash
  const userRole = user?.role?.name || user?.role_name;
  const isNurse = userRole?.toLowerCase() === 'hamshira' || userRole?.toLowerCase() === 'nurse';
  const isDoctor = userRole?.toLowerCase() === 'shifokor' || userRole?.toLowerCase() === 'doctor';
  const isAdmin = userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'administrator';
  const isReadOnly = isNurse || isDoctor; // Hamshira va shifokor faqat ko'radi
  
  // Hamshiraga biriktirilgan bemorlar ID'lari
  const [myPatientIds, setMyPatientIds] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('map');
  const [selectedFloor, setSelectedFloor] = useState(null); // Barcha qavatlar
  const [visualMap, setVisualMap] = useState({ floors: {}, total_beds: 0 });
  const [treatments, setTreatments] = useState([]);
  const [pendingCalls, setPendingCalls] = useState([]);
  const [cabinets, setCabinets] = useState([]);
  const [stats, setStats] = useState({});
  const [rooms, setRooms] = useState([]);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomForm, setRoomForm] = useState({
    room_number: '',
    floor_number: 1,
    room_type: 'standard',
    hourly_rate: 0, // BEPUL
    bed_count: 2,
    department: 'ambulator' // Ambulator bo'limi
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
      console.log('✅ WebSocket connected (Ambulator)');
    });
    
    socket.on('nurse-call', (data) => {
      console.log('🔔 Nurse call received (Ambulator):', data);
      
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
      console.log('⏰ Treatment notification received (Ambulator):', data);
      
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
    console.log('🔘 toggleAudio clicked (Ambulator), current state:', audioEnabled);
    
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    localStorage.setItem('ambulator_audio_enabled', newState.toString());
    
    console.log('🔘 New audio state:', newState);
    
    if (newState) {
      toast.success('🔊 Ovozli ogohlantirish yoqildi (Ambulatorxona)');
      // Test sound
      console.log('🎵 Playing test sound...');
      playAlarmSound();
    } else {
      toast.success('🔇 Ovozli ogohlantirish o\'chirildi (Ambulatorxona)');
    }
  };

  // Play alarm sound (audio fayl)
  const playAlarmSound = () => {
    console.log('🔊 playAlarmSound called (Ambulator)');
    
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
        ambulatorInpatientService.getVisualMap(selectedFloor),
        ambulatorInpatientService.getMedicineCabinets(selectedFloor),
        ambulatorInpatientService.getRooms() // Barcha qavatlar
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
        ambulatorInpatientService.getVisualMap(selectedFloor), // Tanlangan qavat uchun
        ambulatorInpatientService.getVisualMap(), // Barcha qavatlar uchun (statistika)
        ambulatorInpatientService.getTreatmentSchedule({ status: 'pending' }),
        ambulatorInpatientService.getPendingCalls(),
        ambulatorInpatientService.getMedicineCabinets(selectedFloor),
        ambulatorInpatientService.getStats(),
        ambulatorInpatientService.getRooms() // Barcha qavatlar
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
      const response = await ambulatorInpatientService.getComplaints();
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
      const response = await ambulatorInpatientService.acknowledgeComplaint(complaintId);
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
      const response = await ambulatorInpatientService.resolveComplaint(complaintId, notes);
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
        const result = await ambulatorInpatientService.updateRoom(editingRoom.id, roomForm);
        if (result.success) {
          toast.success('Xona yangilandi!');
          setShowRoomModal(false);
          setEditingRoom(null);
          setRoomForm({
            room_number: '',
            floor_number: 1,
            room_type: 'standard',
            hourly_rate: 0,
            bed_count: 2,
            department: 'ambulator'
          });
          loadData();
        }
      } else {
        // Yangi yaratish
        const dataToSend = {
          ...roomForm,
          department: 'ambulator' // Ambulator bo'limi
        };
        
        const result = await ambulatorInpatientService.createRoom(dataToSend);
        
        if (result.success) {
          toast.success(`Xona va ${roomForm.bed_count} ta koyka yaratildi!`);
          setShowRoomModal(false);
          setRoomForm({
            room_number: '',
            floor_number: 1,
            room_type: 'standard',
            hourly_rate: 0,
            bed_count: 2,
            department: 'ambulator'
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
      hourly_rate: parseFloat(room.hourly_rate)
    });
    setShowRoomModal(true);
  };

  const handleDeleteRoom = async (roomId, roomNumber) => {
    showConfirm(
      `Xona ${roomNumber} va uning koykalarini o'chirmoqchimisiz?`,
      async () => {
        try {
          const result = await ambulatorInpatientService.deleteRoom(roomId);
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
        'UNPAID': 'unpaid',
        'available': 'available',
        'occupied': 'occupied',
        'cleaning': 'cleaning',
        'maintenance': 'maintenance'
      };
      
      const frontendStatus = statusMap[currentStatus] || (typeof currentStatus === 'string' ? currentStatus.toLowerCase() : 'available');
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
              const dischargeResult = await ambulatorInpatientService.dischargePatient(bed.admission_id, {
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
              toast.success('Koyka bo\'shatildi');
              loadData();
            }
          } catch (dischargeError) {
            console.error('Discharge error:', dischargeError);
            console.error('Error response:', dischargeError.response);
            console.error('Error data:', dischargeError.response?.data);
            console.error('Error status:', dischargeError.response?.status);
            const errorMessage = dischargeError.response?.data?.message || dischargeError.message;
            console.error('Error message:', errorMessage);
            toast.error('Xatolik: ' + errorMessage);
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
      
      const result = await ambulatorInpatientService.createAdmission(admissionData);
      
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
              <h1 className="text-4xl font-black">
                AMBULATOR XONA TIZIMI ISHLAYAPTI!
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
                {!isReadOnly && rooms.length > 0 && (
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
                  {!isReadOnly && (
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
                        
                        {!isReadOnly && (
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
                            
                            // Status mapping - bed_status ustunidan olamiz
                            const statusMap = {
                              'FREE': 'available',
                              'OCCUPIED': 'occupied',
                              'CLEANING': 'cleaning',
                              'MAINTENANCE': 'maintenance',
                              'UNPAID': 'unpaid',
                              'available': 'available',
                              'occupied': 'occupied',
                              'cleaning': 'cleaning',
                              'maintenance': 'maintenance'
                            };
                            
                            // bed.bed_status yoki bed.status dan olamiz
                            const bedStatus = bed.bed_status || bed.status || 'available';
                            const frontendStatus = statusMap[bedStatus] || (typeof bedStatus === 'string' ? bedStatus.toLowerCase() : 'available');
                            
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
                                admissionType="outpatient"
                                isNurseCalling={nurseCallsMap.has(bedDetails.patient_id)}
                                audioEnabled={audioEnabled}
                                playAlarmSound={playAlarmSound}
                              >
                                <div
                                  className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                                    frontendStatus === 'available'
                                      ? 'bg-green-50 border-green-500 dark:bg-green-900/20'
                                      : frontendStatus === 'occupied'
                                      ? 'bg-red-50 border-red-500 dark:bg-red-900/20'
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
                                      onClick={() => handleBedStatusToggle(bed, bed.bed_status || bed.status)}
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
                          Soatlik narx: <span className="font-bold text-green-600 dark:text-green-400">
                            BEPUL ✓
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
                    hourly_rate: 0,
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
                  Soatlik narx (BEPUL) (so'm)
                </label>
                <input
                  type="number"
                  required
                  value={roomForm.hourly_rate}
                  onChange={(e) => setRoomForm({ ...roomForm, hourly_rate: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary focus:outline-none dark:bg-gray-700 dark:text-white"
                  placeholder="0"
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
                      hourly_rate: 0,
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
