import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { patientService } from '../services/patientService';
import PatientQRModal from '../components/PatientQRModal';
import PhoneInput from '../components/PhoneInput';
import DateInput from '../components/DateInput';

const PatientEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showQRModal, setShowQRModal] = useState(false);
  const [patientData, setPatientData] = useState(null);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    birth_date: '',
    gender: 'Male',
    pinfl: '',
    address: ''
  });

  useEffect(() => {
    loadPatient();
  }, [id]);

  const loadPatient = async () => {
    try {
      setLoading(true);
      const response = await patientService.getPatient(id);
      
      if (response.success && response.data?.patient) {
        const patient = response.data.patient;
        setPatientData(patient); // Store full patient data for QR modal
        setFormData({
          first_name: patient.first_name || '',
          last_name: patient.last_name || '',
          phone: patient.phone || '',
          birth_date: patient.birth_date ? patient.birth_date.split('T')[0] : '',
          gender: patient.gender || 'Male',
          pinfl: patient.pinfl || '',
          address: patient.address || ''
        });
      }
    } catch (error) {
      console.error('Load patient error:', error);
      setErrors({ load: 'Bemor ma\'lumotlarini yuklashda xatolik' });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'Ism majburiy';
    }
    
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Familiya majburiy';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefon majburiy';
    } else if (!/^\+998\d{9}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Telefon raqami noto\'g\'ri';
    }
    
    if (!formData.birth_date) {
      newErrors.birth_date = 'Tug\'ilgan sana majburiy';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSaving(true);
      setErrors({});
      
      const cleanPhone = formData.phone.replace(/\s/g, '');
      
      const patientData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: cleanPhone,
        birth_date: formData.birth_date,
        gender: formData.gender,
        pinfl: formData.pinfl && formData.pinfl.length === 14 ? formData.pinfl : null,
        address: formData.address || null
      };
      
      await patientService.updatePatient(id, patientData);
      
      navigate(`/patients/${id}`);
    } catch (error) {
      console.error('Update patient error:', error);
      setErrors({
        submit: error.response?.data?.error || error.response?.data?.message || 'Xatolik yuz berdi'
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    
    if (!value.startsWith('998')) {
      value = '998' + value;
    }
    
    value = value.slice(0, 12);
    
    let formatted = '+998';
    if (value.length > 3) formatted += ' ' + value.slice(3, 5);
    if (value.length > 5) formatted += ' ' + value.slice(5, 8);
    if (value.length > 8) formatted += ' ' + value.slice(8, 10);
    if (value.length > 10) formatted += ' ' + value.slice(10, 12);
    
    setFormData({ ...formData, phone: formatted });
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
    <>
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/patients/${id}`)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Orqaga
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              Bemorni tahrirlash
            </h1>
            {patientData && (
              <button
                onClick={() => setShowQRModal(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 flex items-center gap-2"
              >
                <span className="material-symbols-outlined">qr_code</span>
                QR Kod
              </button>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
          {errors.load && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-400">{errors.load}</p>
            </div>
          )}

          {errors.submit && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-400">{errors.submit}</p>
            </div>
          )}

          {/* Asosiy ma'lumotlar */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Asosiy ma'lumotlar</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Ism <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
                    errors.first_name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-primary`}
                  placeholder="Ism"
                />
                {errors.first_name && (
                  <p className="mt-1 text-sm text-red-500">{errors.first_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Familiya <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
                    errors.last_name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-primary`}
                  placeholder="Familiya"
                />
                {errors.last_name && (
                  <p className="mt-1 text-sm text-red-500">{errors.last_name}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Telefon <span className="text-red-500">*</span>
                </label>
                <PhoneInput
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
                    errors.phone ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-primary`}
                  placeholder="+998 90 123 45 67"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Tug'ilgan sana <span className="text-red-500">*</span>
                </label>
                <DateInput
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
                    errors.birth_date ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-primary`}
                />
                {errors.birth_date && (
                  <p className="mt-1 text-sm text-red-500">{errors.birth_date}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Jinsi <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="Male"
                    checked={formData.gender === 'Male'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Erkak</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="Female"
                    checked={formData.gender === 'Female'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Ayol</span>
                </label>
              </div>
            </div>
          </div>

          {/* Qo'shimcha ma'lumotlar */}
          <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Qo'shimcha ma'lumotlar</h3>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                PINFL (14 raqam)
              </label>
              <input
                type="text"
                value={formData.pinfl}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 14);
                  setFormData({ ...formData, pinfl: value });
                }}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="12345678901234"
                maxLength="14"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Ixtiyoriy. PINFL 14 ta raqamdan iborat bo'lishi kerak.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Manzil
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows="3"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Yashash manzili"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate(`/patients/${id}`)}
              className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700"
              disabled={saving}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>

    {/* QR Code Modal */}
    {showQRModal && patientData && (
      <PatientQRModal
        patient={patientData}
        onClose={() => setShowQRModal(false)}
      />
    )}
    </>
  );
};

export default PatientEdit;
