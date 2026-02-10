import { useState } from 'react';
import { publicService } from '../services/publicApi';
import PhoneInput from './PhoneInput';
import DateInput from './DateInput';

const AppointmentModal = ({ isOpen, onClose, selectedDoctor = null }) => {
  const [formData, setFormData] = useState({
    patient_name: '',
    patient_phone: '+998',
    patient_email: '',
    doctor_id: selectedDoctor?.id || '',
    preferred_date: '',
    preferred_time: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await publicService.createAppointment(formData);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFormData({
          patient_name: '',
          patient_phone: '+998',
          patient_email: '',
          doctor_id: '',
          preferred_date: '',
          preferred_time: '',
          reason: ''
        });
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2 className="text-2xl font-black mb-6">Qabulga Yozilish</h2>

        {success ? (
          <div className="text-center py-8">
            <div className="size-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-green-600 text-4xl">check_circle</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Muvaffaqiyatli!</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Arizangiz qabul qilindi. Tez orada siz bilan bog'lanamiz.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Ism Familiya *</label>
              <input
                type="text"
                required
                value={formData.patient_name}
                onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700"
                placeholder="Ism va familiyangizni kiriting"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Telefon *</label>
              <PhoneInput
                required
                value={formData.patient_phone}
                onChange={(e) => setFormData({ ...formData, patient_phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700"
                placeholder="+998 90 123 45 67"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input
                type="email"
                value={formData.patient_email}
                onChange={(e) => setFormData({ ...formData, patient_email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Sana *</label>
              <DateInput
                required
                value={formData.preferred_date}
                onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Vaqt *</label>
              <input
                type="time"
                required
                value={formData.preferred_time}
                onChange={(e) => setFormData({ ...formData, preferred_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Sabab</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700"
                placeholder="Qabul sababini yozing..."
              ></textarea>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Yuborilmoqda...' : 'Yuborish'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AppointmentModal;
