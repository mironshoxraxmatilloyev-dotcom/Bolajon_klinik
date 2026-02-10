import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import staffService from '../services/staffService';
import Modal from '../components/Modal';
import AlertModal from '../components/AlertModal';
import ConfirmModal from '../components/ConfirmModal';
import PhoneInput from '../components/PhoneInput';
import DateInput from '../components/DateInput';

const StaffManagementAdvanced = () => {
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Alert and Confirm modals
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const showAlert = (message, type = 'info', title = '') => {
    setAlertModal({ isOpen: true, title, message, type });
  };

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
  
  // Modal states
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // Stepper uchun
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffForm, setStaffForm] = useState({
    username: '',
    password: '',
    email: '',
    role_id: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    phone: '+998',
    specialization: '',
    license_number: '',
    hire_date: new Date().toISOString().split('T')[0],
    salary: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  // Role nomlarini o'zbekchaga mapping qilish
  const getRoleDisplayName = (roleName) => {
    const roleNames = {
      'admin': 'Administrator',
      'doctor': 'Shifokor',
      'nurse': 'Hamshira',
      'laborant': 'Laborant',
      'pharmacist': 'Dorixonachi',
      'sanitar': 'Tozalovchi',
      'masseur': 'Massajchi',
      'speech_therapist': 'Logoped',
      'patient': 'Bemor'
    };
    return roleNames[roleName?.toLowerCase()] || roleName;
  };

  const getRoleNameFromDisplay = (displayName) => {
    const roleMap = {
      'Administrator': 'admin',
      'Shifokor': 'doctor',
      'Hamshira': 'nurse',
      'Laborant': 'laborant',
      'Dorixonachi': 'pharmacist',
      'Tozalovchi': 'sanitar',
      'Massajchi': 'masseur',
      'Logoped': 'speech_therapist',
      'Bemor': 'patient'
    };
    return roleMap[displayName] || displayName?.toLowerCase();
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [staffData, rolesData] = await Promise.all([
        staffService.getStaff(),
        staffService.getRoles()
      ]);
      
      if (staffData.success) setStaff(staffData.data);
      if (rolesData.success) {
        setRoles(rolesData.data);
      }
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openStaffModal = (staffMember = null) => {
    setCurrentStep(1); // Step'ni reset qilish
    if (staffMember) {
      setEditingStaff(staffMember);
      setStaffForm({
        username: '',
        password: '',
        email: staffMember.email || '',
        role_id: staffMember.role_id || '',
        first_name: staffMember.first_name || '',
        last_name: staffMember.last_name || '',
        middle_name: staffMember.middle_name || '',
        phone: staffMember.phone || '+998',
        specialization: staffMember.specialization || '',
        license_number: staffMember.license_number || '',
        hire_date: staffMember.hire_date ? staffMember.hire_date.split('T')[0] : '',
        salary: staffMember.salary || ''
      });
    } else {
      setEditingStaff(null);
      setStaffForm({
        username: '',
        password: '',
        email: '',
        role_id: '',
        first_name: '',
        last_name: '',
        middle_name: '',
        phone: '+998',
        specialization: '',
        license_number: '',
        hire_date: new Date().toISOString().split('T')[0],
        salary: ''
      });
    }
    setShowStaffModal(true);
  };

  const handleNextStep = () => {
    // Validate current step before moving to next
    if (currentStep === 1) {
      if (!staffForm.username || !staffForm.password || !staffForm.role_id) {
        showAlert('Iltimos, barcha majburiy maydonlarni to\'ldiring', 'warning', 'Ogohlantirish');
        return;
      }
    } else if (currentStep === 2) {
      if (!staffForm.first_name || !staffForm.last_name || !staffForm.phone) {
        showAlert('Iltimos, barcha majburiy maydonlarni to\'ldiring', 'warning', 'Ogohlantirish');
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    
    if (editingStaff) {
      // Update staff
      if (!staffForm.first_name || !staffForm.last_name || !staffForm.phone) {
        showAlert('Iltimos, barcha majburiy maydonlarni to\'ldiring', 'warning', 'Ogohlantirish');
        return;
      }

      try {
        const data = {
          email: staffForm.email,
          first_name: staffForm.first_name,
          last_name: staffForm.last_name,
          middle_name: staffForm.middle_name,
          phone: staffForm.phone,
          specialization: staffForm.specialization,
          license_number: staffForm.license_number,
          salary: staffForm.salary ? parseFloat(staffForm.salary) : null
        };

        const response = await staffService.updateStaff(editingStaff.id, data);
        if (response.success) {
          showAlert('Xodim muvaffaqiyatli yangilandi!', 'success', 'Muvaffaqiyatli');
          setShowStaffModal(false);
          loadData();
        }
      } catch (error) {
        console.error('Update staff error:', error);
        showAlert(error.response?.data?.message || 'Xatolik yuz berdi', 'error', 'Xatolik');
      }
    } else {
      // Create staff
      if (!staffForm.username || !staffForm.password || !staffForm.role_id ||
          !staffForm.first_name || !staffForm.last_name || !staffForm.phone) {
        showAlert('Iltimos, barcha majburiy maydonlarni to\'ldiring', 'warning', 'Ogohlantirish');
        return;
      }

      // Shifokor uchun qo'shimcha validatsiya
      const selectedRole = roles.find(r => r.id === parseInt(staffForm.role_id));
      if (selectedRole?.name === 'doctor') {
        if (!staffForm.specialization || !staffForm.license_number) {
          showAlert('Shifokor uchun mutaxassislik va litsenziya raqami majburiy', 'warning', 'Ogohlantirish');
          return;
        }
      }

      try {
        const data = {
          ...staffForm,
          salary: staffForm.salary ? parseFloat(staffForm.salary) : null
        };

        const response = await staffService.createStaff(data);
        
        if (response.success) {
          showAlert('Xodim muvaffaqiyatli qo\'shildi!', 'success', 'Muvaffaqiyatli');
          setShowStaffModal(false);
          loadData();
        }
      } catch (error) {
        console.error('Create staff error:', error);
        console.error('Error response:', error.response?.data);
        showAlert(error.response?.data?.message || 'Xatolik yuz berdi', 'error', 'Xatolik');
      }
    }
  };

  const handleDeleteStaff = async (staffId) => {
    showConfirm(
      'Ushbu xodimni o\'chirishni tasdiqlaysizmi?',
      async () => {
        try {
          const response = await staffService.deleteStaff(staffId);
          if (response.success) {
            showAlert('Xodim muvaffaqiyatli o\'chirildi!', 'success', 'Muvaffaqiyatli');
            loadData();
          }
        } catch (error) {
          console.error('Delete staff error:', error);
          showAlert('Xatolik yuz berdi', 'error', 'Xatolik');
        }
      },
      {
        title: 'Xodimni o\'chirish',
        type: 'danger',
        confirmText: 'O\'chirish',
        cancelText: 'Bekor qilish'
      }
    );
  };

  const handleToggleStatus = async (staffMember) => {
    try {
      const response = await staffService.updateStaff(staffMember.id, {
        is_active: !staffMember.user_active
      });
      if (response.success) {
        showAlert('Xodim holati o\'zgartirildi!', 'success', 'Muvaffaqiyatli');
        loadData();
      }
    } catch (error) {
      console.error('Toggle status error:', error);
      showAlert('Xatolik yuz berdi', 'error', 'Xatolik');
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
  };

  const filteredStaff = staff.filter(member => {
    if (filterRole !== 'all' && member.role !== filterRole) return false;
    if (filterStatus === 'active' && !member.user_active) return false;
    if (filterStatus === 'inactive' && member.user_active) return false;
    return true;
  });

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

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">Xodimlar boshqaruvi</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Jami: {staff.length} ta xodim
          </p>
        </div>
        <button
          onClick={() => openStaffModal()}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          Xodim qo'shish
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Lavozim
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <option value="all">Barchasi</option>
              {roles.map(role => (
                <option key={role.id} value={role.name}>{role.display_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Holat
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <option value="all">Barchasi</option>
              <option value="active">Faol</option>
              <option value="inactive">Nofaol</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        {filteredStaff.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
              group
            </span>
            <p className="text-gray-500 dark:text-gray-400">Xodimlar topilmadi</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredStaff.map((member) => (
              <div key={member.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="size-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                      <span className="text-2xl font-black">
                        {member.first_name[0]}{member.last_name[0]}
                      </span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {member.first_name} {member.last_name} {member.middle_name}
                        </p>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          member.user_active
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                          {member.user_active ? 'Faol' : 'Nofaol'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {getRoleDisplayName(member.role)} {member.specialization && `• ${member.specialization}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {member.phone} • {member.email}
                      </p>
                      {member.license_number && (
                        <p className="text-xs text-gray-500">
                          Litsenziya: {member.license_number}
                        </p>
                      )}
                      {member.access_code && (
                        <div className="mt-1 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <span className="material-symbols-outlined text-sm text-blue-600 dark:text-blue-400">qr_code</span>
                          <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300">
                            {member.access_code}
                          </span>
                          <span className="text-xs text-blue-600 dark:text-blue-400">Bot kodi</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {member.salary && (
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Maosh</p>
                        <p className="font-bold text-gray-900 dark:text-white">
                          {formatCurrency(member.salary)}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleStatus(member)}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                          member.user_active
                            ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                            : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
                        title={member.user_active ? 'Faolsizlantirish' : 'Faollashtirish'}
                      >
                        <span className="material-symbols-outlined text-lg">
                          {member.user_active ? 'block' : 'check_circle'}
                        </span>
                      </button>
                      <button
                        onClick={() => openStaffModal(member)}
                        className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600"
                        title="Tahrirlash"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(member.id)}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600"
                        title="O'chirish"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Staff Modal */}
      <Modal 
        isOpen={showStaffModal} 
        onClose={() => setShowStaffModal(false)} 
        size="sm"
        title={editingStaff ? 'Xodimni tahrirlash' : 'Yangi xodim qo\'shish'}
      >
        <form onSubmit={handleStaffSubmit} className="space-y-3">
          {/* Stepper Indicator - Only for new staff */}
          {!editingStaff && (
            <div className="flex items-center justify-center gap-2 -mt-2 mb-3">
                <div className={`size-9 rounded-xl flex items-center justify-center font-bold transition-all ${
                  currentStep >= 1 
                    ? 'bg-primary text-white shadow-lg scale-110' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                }`}>
                  1
                </div>
                
                <div className={`h-1 w-16 rounded-full transition-all ${
                  currentStep >= 2 ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                }`}></div>
                
                <div className={`size-9 rounded-xl flex items-center justify-center font-bold transition-all ${
                  currentStep >= 2 
                    ? 'bg-primary text-white shadow-lg scale-110' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                }`}>
                  2
                </div>
                
                <div className={`h-1 w-16 rounded-full transition-all ${
                  currentStep >= 3 ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                }`}></div>
                
                <div className={`size-9 rounded-xl flex items-center justify-center font-bold transition-all ${
                  currentStep >= 3 
                    ? 'bg-primary text-white shadow-lg scale-110' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                }`}>
                  3
                </div>
              </div>
            )}
      

          {/* Step 1: Login ma'lumotlari - Only for new staff */}
          {!editingStaff && currentStep === 1 && (
            <div className="space-y-3 animate-fadeIn">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <span className="material-symbols-outlined text-base">info</span>
                  <span className="text-xs font-semibold">Login ma'lumotlari</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">person</span>
                      Foydalanuvchi nomi <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={staffForm.username}
                    onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm"
                    placeholder="username"
                  />
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">lock</span>
                      Parol <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <input
                    type="password"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">badge</span>
                    Lavozim <span className="text-red-500">*</span>
                  </span>
                </label>
                <select
                  value={staffForm.role_id}
                  onChange={(e) => setStaffForm({ ...staffForm, role_id: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm"
                >
                  <option value="">Lavozimni tanlang</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.display_name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Shaxsiy ma'lumotlar */}
          {(!editingStaff && currentStep === 2) || editingStaff ? (
            <div className="space-y-3 animate-fadeIn">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <span className="material-symbols-outlined text-base">account_circle</span>
                  <span className="text-xs font-semibold">Shaxsiy ma'lumotlar</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="group">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Ism <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={staffForm.first_name}
                    onChange={(e) => setStaffForm({ ...staffForm, first_name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm"
                    placeholder="Ism"
                    required
                  />
                </div>

                <div className="group">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Familiya <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={staffForm.last_name}
                    onChange={(e) => setStaffForm({ ...staffForm, last_name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm"
                    placeholder="Familiya"
                    required
                  />
                </div>

                <div className="group">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Otasining ismi
                  </label>
                  <input
                    type="text"
                    value={staffForm.middle_name}
                    onChange={(e) => setStaffForm({ ...staffForm, middle_name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm"
                    placeholder="Otasining ismi"
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">phone</span>
                    Telefon <span className="text-red-500">*</span>
                  </span>
                </label>
                <PhoneInput
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm"
                  placeholder="+998 XX XXX XX XX"
                  required
                />
              </div>
            </div>
          ) : null}

          {/* Step 3: Qo'shimcha ma'lumotlar - Only for new staff */}
          {!editingStaff && currentStep === 3 && (
            <div className="space-y-3 animate-fadeIn">
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-2">
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                  <span className="material-symbols-outlined text-base">work</span>
                  <span className="text-xs font-semibold">Qo'shimcha ma'lumotlar</span>
                </div>
              </div>

              {/* Mutaxassislik va litsenziya - faqat tibbiy xodimlar uchun */}
              {(() => {
                const selectedRole = roles.find(r => r.id === parseInt(staffForm.role_id));
                const roleName = selectedRole?.name || '';
                const needsSpecialization = ['doctor', 'nurse', 'laborant', 'pharmacist'].includes(roleName);
                
                return needsSpecialization && (
                  <div className="space-y-3">
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-base">medical_services</span>
                          Mutaxassislik {roleName === 'doctor' && <span className="text-red-500">*</span>}
                        </span>
                      </label>
                      <input
                        type="text"
                        value={staffForm.specialization}
                        onChange={(e) => setStaffForm({ ...staffForm, specialization: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm"
                        placeholder={roleName === 'doctor' ? 'Masalan: Kardiolog' : roleName === 'nurse' ? 'Masalan: Operatsion hamshira' : roleName === 'laborant' ? 'Masalan: Klinik laborant' : 'Mutaxassislik'}
                        required={roleName === 'doctor'}
                      />
                    </div>

                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-base">verified</span>
                          Litsenziya raqami {roleName === 'doctor' && <span className="text-red-500">*</span>}
                        </span>
                      </label>
                      <input
                        type="text"
                        value={staffForm.license_number}
                        onChange={(e) => setStaffForm({ ...staffForm, license_number: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm"
                        placeholder="LIC-12345"
                        required={roleName === 'doctor'}
                      />
                    </div>
                  </div>
                );
              })()}

              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">calendar_today</span>
                    Ishga qabul qilingan sana <span className="text-red-500">*</span>
                  </span>
                </label>
                <DateInput
                  value={staffForm.hire_date}
                  onChange={(e) => setStaffForm({ ...staffForm, hire_date: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm"
                  required
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
            {/* Bekor qilish button - always visible */}
            <button
              type="button"
              onClick={() => setShowStaffModal(false)}
              className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex items-center gap-2 text-sm"
            >
              <span className="material-symbols-outlined text-base">close</span>
              Bekor qilish
            </button>

            {/* Oldingi button - visible on steps 2 and 3 for new staff */}
            {!editingStaff && currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-5 py-2.5 bg-gray-500 text-white rounded-xl font-semibold hover:bg-gray-600 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl text-sm"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Orqaga
              </button>
            )}

            {/* Keyingi button - visible on steps 1 and 2 for new staff */}
            {!editingStaff && currentStep < 3 && (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex-1 px-5 py-2.5 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all flex items-center justify-center gap-2 shadow-lg text-sm"
              >
                Keyingi
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            )}

            {/* Qo'shish/Saqlash button - visible on step 3 for new staff or always for editing */}
            {(editingStaff || currentStep === 3) && (
              <button
                type="submit"
                className="flex-1 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all flex items-center justify-center gap-2 shadow-lg text-sm"
              >
                <span className="material-symbols-outlined text-base">
                  {editingStaff ? 'save' : 'check_circle'}
                </span>
                {editingStaff ? 'Saqlash' : 'Qo\'shish'}
              </button>
            )}
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
    </div>
  );
};

export default StaffManagementAdvanced;
