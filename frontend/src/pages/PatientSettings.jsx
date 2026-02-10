import { useState, useEffect } from 'react';
import patientPortalService from '../services/patientPortalService';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import PhoneInput from '../components/PhoneInput';

const PatientSettings = () => {
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  
  // Appearance settings
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'auto');
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'uz');
  
  // Profile data
  const [profileData, setProfileData] = useState({
    patient_number: '',
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    telegram_username: '',
    birth_date: '',
    gender: '',
    blood_type: ''
  });
  
  // Edit forms
  const [nameForm, setNameForm] = useState({
    first_name: '',
    last_name: ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  const [contactForm, setContactForm] = useState({
    phone: '',
    address: '',
    telegram_username: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  // Auto theme based on time
  const getAutoTheme = () => {
    const hour = new Date().getHours();
    // 7:00 - 19:00 = light, 19:00 - 7:00 = dark
    const isDark = hour < 7 || hour >= 19;
    return isDark ? 'dark' : 'light';
  };

  const applyTheme = (themeToApply) => {
    if (themeToApply === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    // Apply theme
    let appliedTheme = theme;
    let interval;
    
    if (theme === 'auto') {
      appliedTheme = getAutoTheme();
      applyTheme(appliedTheme);
      
      // Check every minute for auto theme
      interval = setInterval(() => {
        const newTheme = getAutoTheme();
        applyTheme(newTheme);
      }, 60000);
    } else {
      applyTheme(theme);
    }
    
    localStorage.setItem('theme', theme);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [theme]);

  useEffect(() => {
    // Apply language immediately without reload
    const currentLang = i18n.language;
    if (language !== currentLang) {
      i18n.changeLanguage(language);
      localStorage.setItem('language', language);
      document.documentElement.lang = language;
      
      const langName = language === 'uz' ? 'O\'zbekcha' : language === 'ru' ? 'Русский' : 'English';
      toast.success(`Til o'zgartirildi: ${langName}`);
    }
  }, [language, i18n]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await patientPortalService.getProfile();
      if (response.success) {
        setProfileData(response.data);
      }
    } catch (error) {
      console.error('Profile load error:', error);
      toast.error('Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleEditName = () => {
    setNameForm({
      first_name: profileData.first_name || '',
      last_name: profileData.last_name || ''
    });
    setShowNameModal(true);
  };

  const handleEditContact = () => {
    setContactForm({
      phone: profileData.phone || '',
      address: profileData.address || '',
      telegram_username: profileData.telegram_username || ''
    });
    setShowContactModal(true);
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    
    if (!nameForm.first_name || !nameForm.last_name) {
      toast.error('Ism va familiya majburiy');
      return;
    }
    
    try {
      setSaving(true);
      const response = await patientPortalService.updateProfile({
        first_name: nameForm.first_name,
        last_name: nameForm.last_name
      });
      
      if (response.success) {
        toast.success('Ism va familiya muvaffaqiyatli yangilandi');
        setShowNameModal(false);
        loadProfile();
      }
    } catch (error) {
      console.error('Name update error:', error);
      toast.error(error.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      const response = await patientPortalService.updateProfile(contactForm);
      
      if (response.success) {
        toast.success('Aloqa ma\'lumotlari yangilandi');
        setShowContactModal(false);
        loadProfile();
      }
    } catch (error) {
      console.error('Contact update error:', error);
      toast.error(error.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Yangi parollar mos kelmaydi');
      return;
    }
    
    if (passwordForm.new_password.length < 6) {
      toast.error('Parol kamida 6 belgidan iborat bo\'lishi kerak');
      return;
    }
    
    try {
      setSaving(true);
      const response = await patientPortalService.changePassword({
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password
      });
      
      if (response.success) {
        toast.success('Parol muvaffaqiyatli o\'zgartirildi');
        setShowPasswordModal(false);
        setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error(error.response?.data?.message || 'Eski parol noto\'g\'ri');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <Toaster position="top-right" />
      
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Sozlamalar</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Shaxsiy ma'lumotlarni boshqarish</p>
      </div>

      <div className="space-y-4">
        {/* Bemor ma'lumotlari */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined">person</span>
              Shaxsiy ma'lumotlar
            </h2>
          </div>
          
          <div className="space-y-4">
            {/* Bemor raqami */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Bemor raqami</p>
                <p className="font-semibold text-gray-900 dark:text-white text-lg">{profileData.patient_number}</p>
              </div>
            </div>

            {/* Ism va Familiya */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">F.I.O</p>
                <p className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg break-words">
                  {profileData.first_name} {profileData.last_name}
                </p>
              </div>
              <button
                onClick={handleEditName}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 flex items-center justify-center gap-2 flex-shrink-0"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
                <span className="hidden sm:inline">Tahrirlash</span>
                <span className="sm:hidden">O'zgartirish</span>
              </button>
            </div>

            {/* Tug'ilgan sana, Jins, Qon guruhi */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-600 dark:text-gray-400">Tug'ilgan sana</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {profileData.birth_date ? new Date(profileData.birth_date).toLocaleDateString('uz-UZ') : '-'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-600 dark:text-gray-400">Jins</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {profileData.gender === 'male' ? 'Erkak' : profileData.gender === 'female' ? 'Ayol' : '-'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-600 dark:text-gray-400">Qon guruhi</p>
                <p className="font-semibold text-gray-900 dark:text-white">{profileData.blood_type || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Aloqa ma'lumotlari */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined">contact_phone</span>
              Aloqa ma'lumotlari
            </h2>
            <button
              onClick={handleEditContact}
              className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 flex items-center justify-center gap-2 flex-shrink-0"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
              <span className="hidden sm:inline">Tahrirlash</span>
              <span className="sm:hidden">O'zgartirish</span>
            </button>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <span className="material-symbols-outlined text-gray-600 dark:text-gray-400 flex-shrink-0">phone</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">Telefon</p>
                <p className="font-semibold text-gray-900 dark:text-white break-words">{profileData.phone || '-'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <span className="material-symbols-outlined text-gray-600 dark:text-gray-400 flex-shrink-0">home</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">Manzil</p>
                <p className="font-semibold text-gray-900 dark:text-white break-words">{profileData.address || '-'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <span className="material-symbols-outlined text-gray-600 dark:text-gray-400 flex-shrink-0">send</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">Telegram</p>
                <p className="font-semibold text-gray-900 dark:text-white break-words">{profileData.telegram_username || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Xavfsizlik */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined">lock</span>
              Xavfsizlik
            </h2>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 flex items-center justify-center gap-2 flex-shrink-0"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
              <span className="hidden sm:inline">Parolni o'zgartirish</span>
              <span className="sm:hidden">Parol</span>
            </button>
          </div>
          
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400">info</span>
              <div>
                <p className="font-semibold text-green-900 dark:text-green-300">Xavfsizlik</p>
                <p className="text-sm text-green-700 dark:text-green-200 mt-1">
                  Parolni muntazam o'zgartiring va hech kimga aytmang
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ko'rinish sozlamalari */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">palette</span>
            Ko'rinish
          </h2>
          
          <div className="space-y-6">
            {/* Theme */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Mavzu
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                    theme === 'light'
                      ? 'border-green-600 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl sm:text-3xl mb-1 sm:mb-2 text-yellow-500">light_mode</span>
                  <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">Yorug'</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1 hidden sm:block">Kunduzgi</p>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                    theme === 'dark'
                      ? 'border-green-600 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl sm:text-3xl mb-1 sm:mb-2 text-green-500">dark_mode</span>
                  <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">Qorong'i</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1 hidden sm:block">Tungi</p>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('auto')}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                    theme === 'auto'
                      ? 'border-green-600 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl sm:text-3xl mb-1 sm:mb-2 text-purple-500">brightness_auto</span>
                  <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">Avtomatik</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1 hidden sm:block">Vaqtga qarab</p>
                </button>
              </div>
              {theme && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-xs sm:text-sm text-green-700 dark:text-green-300 flex items-start gap-2">
                    <span className="material-symbols-outlined text-base sm:text-lg flex-shrink-0 mt-0.5">check_circle</span>
                    <span className="break-words">
                      {theme === 'auto' 
                        ? 'Mavzu avtomatik: 7:00-19:00 yorug\', 19:00-7:00 qorong\'i'
                        : 'Mavzu saqlandi'
                      }
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Til
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {[
                  { value: 'uz', label: 'O\'zbekcha', flag: 'UZ' },
                  { value: 'ru', label: 'Русский', flag: 'RU' },
                  { value: 'en', label: 'English', flag: 'GB' }
                ].map((lang) => (
                  <button
                    key={lang.value}
                    type="button"
                    onClick={() => setLanguage(lang.value)}
                    className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                      language === lang.value
                        ? 'border-green-600 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500'
                    }`}
                  >
                    <span className="text-2xl sm:text-3xl mb-1 sm:mb-2 block font-bold text-gray-700 dark:text-gray-300">{lang.flag}</span>
                    <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white break-words">{lang.label}</p>
                  </button>
                ))}
              </div>
              {language && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-xs sm:text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base sm:text-lg flex-shrink-0">check_circle</span>
                    Til saqlandi
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Name Edit Modal */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white pr-2">Ism va familiyani o'zgartirish</h2>
              <button
                onClick={() => setShowNameModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveName} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Ism *
                </label>
                <input
                  type="text"
                  value={nameForm.first_name}
                  onChange={(e) => setNameForm({ ...nameForm, first_name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Familiya *
                </label>
                <input
                  type="text"
                  value={nameForm.last_name}
                  onChange={(e) => setNameForm({ ...nameForm, last_name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNameModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-semibold hover:opacity-90"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Edit Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white pr-2">Aloqa ma'lumotlarini o'zgartirish</h2>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Telefon
                </label>
                <PhoneInput
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="+998901234567"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Manzil
                </label>
                <input
                  type="text"
                  value={contactForm.address}
                  onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Toshkent shahar..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Telegram
                </label>
                <input
                  type="text"
                  value={contactForm.telegram_username}
                  onChange={(e) => setContactForm({ ...contactForm, telegram_username: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="@username"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-semibold hover:opacity-90"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white pr-2">Parolni o'zgartirish</h2>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Eski parol *
                </label>
                <input
                  type="password"
                  value={passwordForm.old_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Yangi parol *
                </label>
                <input
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Kamida 6 ta belgi</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Yangi parolni tasdiqlang *
                </label>
                <input
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                  minLength={6}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-semibold hover:opacity-90"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'O\'zgartirilmoqda...' : 'O\'zgartirish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientSettings;
