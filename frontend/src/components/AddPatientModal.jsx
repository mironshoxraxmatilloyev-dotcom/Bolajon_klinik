import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { patientService } from '../services/patientService';
import PhoneInput from './PhoneInput';
import YearInput from './YearInput';

const AddPatientModal = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    birth_date: '',
    gender: 'male',
    pinfl: '',
    address: '',
    house_number: ''
  });

  const validateStep1 = () => {
    const newErrors = {};
    
    if (!formData.first_name.trim()) {
      newErrors.first_name = t('messages.requiredField');
    }
    
    if (!formData.last_name.trim()) {
      newErrors.last_name = t('messages.requiredField');
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = t('messages.requiredField');
    } else if (!/^\+998\d{9}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = t('messages.invalidPhone');
    }
    
    if (!formData.birth_date) {
      newErrors.birth_date = t('messages.requiredField');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2); // Faqat keyingi qismga o'tish, saqlamaslik
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Form submit'ni to'xtatish
    
    // Agar 1-qismda bo'lsa, faqat keyingi qismga o'tish
    if (step === 1) {
      if (validateStep1()) {
        setStep(2);
      }
      return; // Saqlamasdan to'xtash
    }
    
    // 2-qismda bo'lsa, saqla
    try {
      setLoading(true);
      setErrors({});
      
      // Telefon raqamini formatlash
      const cleanPhone = formData.phone.replace(/\s/g, '');
      
      // Backend uchun ma'lumotlarni tayyorlash
      const patientData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: cleanPhone,
        date_of_birth: formData.birth_date,
        gender: formData.gender,
        passport_number: formData.pinfl && formData.pinfl.length === 14 ? formData.pinfl : null, // Faqat to'liq 14 ta raqam bo'lsa yuborish
        address: formData.address || null,
        house_number: formData.house_number || null
      };
      
      console.log('Sending patient data:', patientData);
      
      await patientService.createPatient(patientData);
      
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Create patient error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      setErrors({
        submit: error.response?.data?.error || error.response?.data?.message || error.message || 'Xatolik yuz berdi'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      first_name: '',
      last_name: '',
      phone: '',
      birth_date: '',
      gender: 'male',
      pinfl: '',
      address: '',
      house_number: ''
    });
    setStep(1);
    setErrors({});
    onClose();
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`h-1.5 w-16 rounded-full transition-all ${step >= 1 ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
          <div className={`h-1.5 w-16 rounded-full transition-all ${step >= 2 ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
            {step === 1 ? 'Asosiy ma\'lumotlar' : 'Qo\'shimcha ma\'lumotlar'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {step === 1 ? 'Bemor haqida asosiy ma\'lumotlarni kiriting' : 'Ixtiyoriy ma\'lumotlarni to\'ldiring'}
          </p>
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              {errors.submit}
            </p>
          </div>
        )}

        {/* Step 1: Asosiy ma'lumotlar */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Ism va Familiya */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Ism <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="Aziza"
                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
                    errors.first_name ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'
                  } rounded-xl input-focus text-gray-900 dark:text-white placeholder-gray-400`}
                  autoFocus
                />
                {errors.first_name && (
                  <p className="mt-1 text-xs text-red-600">{errors.first_name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Familiya <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Karimova"
                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
                    errors.last_name ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'
                  } rounded-xl input-focus text-gray-900 dark:text-white placeholder-gray-400`}
                />
                {errors.last_name && (
                  <p className="mt-1 text-xs text-red-600">{errors.last_name}</p>
                )}
              </div>
            </div>

            {/* Telefon */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {t('patients.phone')} <span className="text-red-500">*</span>
              </label>
              <PhoneInput
                required
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="+998 90 123 45 67"
                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
                  errors.phone ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'
                } rounded-xl input-focus text-gray-900 dark:text-white placeholder-gray-400`}
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
              )}
            </div>

            {/* Tug'ilgan yil va Jinsi */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Tug'ilgan yili <span className="text-red-500">*</span>
                </label>
                {/* Faqat yil kiritish */}
                <YearInput
                  required
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
                    errors.birth_date ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'
                  } rounded-xl input-focus text-gray-900 dark:text-white`}
                />
                {errors.birth_date && (
                  <p className="mt-1 text-xs text-red-600">{errors.birth_date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('patients.gender')} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: 'male' })}
                    className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                      formData.gender === 'male'
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {t('patients.male')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: 'female' })}
                    className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                      formData.gender === 'female'
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {t('patients.female')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Qo'shimcha ma'lumotlar */}
        {step === 2 && (
          <div className="space-y-4">
            {/* JShShIR */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {t('patients.pinfl')}
                <span className="ml-2 text-xs text-gray-500 font-normal">(ixtiyoriy)</span>
              </label>
              <input
                type="text"
                value={formData.pinfl}
                onChange={(e) => setFormData({ ...formData, pinfl: e.target.value.replace(/\D/g, '').slice(0, 14) })}
                placeholder="12345678901234"
                maxLength="14"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl input-focus text-gray-900 dark:text-white placeholder-gray-400"
              />
              <p className="mt-1 text-xs text-gray-500">14 raqamli shaxsiy identifikatsiya raqami</p>
            </div>

            {/* Manzil va Uy raqami */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('patients.address')}
                  <span className="ml-2 text-xs text-gray-500 font-normal">(ixtiyoriy)</span>
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows="3"
                  placeholder="Toshkent sh., Yunusobod t., Amir Temur ko'chasi 123"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl input-focus text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                ></textarea>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Uy raqami
                  <span className="ml-2 text-xs text-gray-500 font-normal">(ixtiyoriy)</span>
                </label>
                <input
                  type="text"
                  value={formData.house_number}
                  onChange={(e) => setFormData({ ...formData, house_number: e.target.value })}
                  placeholder="123"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl input-focus text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          {step === 2 && (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors btn-hover"
            >
              Orqaga
            </button>
          )}
          
          {step === 1 ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleNext();
              }}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition-opacity btn-hover flex items-center justify-center gap-2"
            >
              Keyingi
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity btn-hover flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">check</span>
                  {t('common.save')}
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default AddPatientModal;
