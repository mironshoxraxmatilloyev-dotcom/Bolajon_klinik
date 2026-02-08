import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import labReagentService from '../services/labReagentService';
import Modal from '../components/Modal';
import AlertModal from '../components/AlertModal';
import ConfirmModal from '../components/ConfirmModal';

const LabPharmacy = () => {
  const [loading, setLoading] = useState(true);
  const [reagents, setReagents] = useState([]);
  const [filteredReagents, setFilteredReagents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showReagentModal, setShowReagentModal] = useState(false);
  const [editingReagent, setEditingReagent] = useState(null);
  const [reagentForm, setReagentForm] = useState({
    name: '',
    country_of_origin: '',
    expiry_date: '',
    total_tests: '',
    total_price: '',
    notes: ''
  });

  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  useEffect(() => {
    loadReagents();
  }, []);

  useEffect(() => {
    filterReagents();
  }, [reagents, statusFilter, searchQuery]);

  const loadReagents = async () => {
    try {
      setLoading(true);
      const response = await labReagentService.getReagents();
      if (response.success) {
        setReagents(response.data);
      }
    } catch (error) {
      console.error('Load reagents error:', error);
      toast.error('Reaktivlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const filterReagents = () => {
    let filtered = [...reagents];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.country_of_origin?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredReagents(filtered);
  };

  const showAlert = (message, type = 'info', title = '') => {
    setAlertModal({ isOpen: true, title, message, type });
  };

  const showConfirm = (message, onConfirm, options = {}) => {
    setConfirmModal({
      isOpen: true,
      title: options.title || 'Tasdiqlash',
      message,
      onConfirm,
      ...options
    });
  };

  const handleOpenModal = (reagent = null) => {
    if (reagent) {
      setEditingReagent(reagent);
      setReagentForm({
        name: reagent.name,
        country_of_origin: reagent.country_of_origin || '',
        expiry_date: new Date(reagent.expiry_date).toISOString().slice(0, 10),
        total_tests: reagent.total_tests,
        total_price: reagent.total_price,
        notes: reagent.notes || ''
      });
    } else {
      setEditingReagent(null);
      setReagentForm({
        name: '',
        country_of_origin: '',
        expiry_date: '',
        total_tests: '',
        total_price: '',
        notes: ''
      });
    }
    setShowReagentModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!reagentForm.name || !reagentForm.expiry_date || !reagentForm.total_tests || !reagentForm.total_price) {
      showAlert('Iltimos, barcha majburiy maydonlarni to\'ldiring', 'warning', 'Ogohlantirish');
      return;
    }

    try {
      if (editingReagent) {
        const response = await labReagentService.updateReagent(editingReagent._id, reagentForm);
        if (response.success) {
          showAlert('Reaktiv muvaffaqiyatli yangilandi!', 'success', 'Muvaffaqiyatli');
        }
      } else {
        const response = await labReagentService.createReagent(reagentForm);
        if (response.success) {
          showAlert('Reaktiv muvaffaqiyatli qo\'shildi!', 'success', 'Muvaffaqiyatli');
        }
      }

      setShowReagentModal(false);
      loadReagents();
    } catch (error) {
      console.error('Submit reagent error:', error);
      showAlert('Xatolik: ' + (error.response?.data?.message || error.message), 'error', 'Xatolik');
    }
  };

  const handleDelete = (reagent) => {
    showConfirm(
      `"${reagent.name}" reaktivini o'chirmoqchimisiz?`,
      async () => {
        try {
          const response = await labReagentService.deleteReagent(reagent._id);
          if (response.success) {
            showAlert('Reaktiv muvaffaqiyatli o\'chirildi!', 'success', 'Muvaffaqiyatli');
            loadReagents();
          }
        } catch (error) {
          console.error('Delete reagent error:', error);
          showAlert('Xatolik: ' + (error.response?.data?.message || error.message), 'error', 'Xatolik');
        }
      },
      {
        title: 'Reaktivni o\'chirish',
        type: 'danger',
        confirmText: 'O\'chirish',
        cancelText: 'Bekor qilish'
      }
    );
  };

  const calculatePricePerTest = () => {
    if (reagentForm.total_price && reagentForm.total_tests) {
      return Math.ceil(parseFloat(reagentForm.total_price) / parseInt(reagentForm.total_tests));
    }
    return 0;
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { text: 'Faol', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
      low_stock: { text: 'Kam qoldi', class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
      expired: { text: 'Muddati o\'tgan', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
      depleted: { text: 'Tugagan', class: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' }
    };
    return badges[status] || badges.active;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('uz-UZ');
  };

  // Yaroqlilik muddatini hisoblash va rang berish
  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { color: 'gray', text: 'Noma\'lum', class: 'bg-gray-100 text-gray-700', progressClass: 'bg-gray-400' };

    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      // Muddati o'tgan - Qizil
      return {
        color: 'red',
        text: `${Math.abs(daysUntilExpiry)} kun oldin muddati o'tgan`,
        class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-300',
        progressClass: 'bg-red-500',
        percentage: 0
      };
    } else if (daysUntilExpiry <= 30) {
      // 30 kun yoki kamroq - Qizil
      return {
        color: 'red',
        text: `${daysUntilExpiry} kun qoldi`,
        class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-300',
        progressClass: 'bg-red-500',
        percentage: (daysUntilExpiry / 30) * 100
      };
    } else if (daysUntilExpiry <= 90) {
      // 31-90 kun - Sariq
      return {
        color: 'yellow',
        text: `${daysUntilExpiry} kun qoldi`,
        class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300',
        progressClass: 'bg-yellow-500',
        percentage: (daysUntilExpiry / 90) * 100
      };
    } else {
      // 90 kundan ko'p - Yashil
      return {
        color: 'green',
        text: `${daysUntilExpiry} kun qoldi`,
        class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300',
        progressClass: 'bg-green-500',
        percentage: 100
      };
    }
  };

  // Statistika uchun reaktivlarni hisoblash
  const getReagentStats = () => {
    const now = new Date();
    
    let activeCount = 0;
    let expiringSoonCount = 0; // 30 kun yoki kamroq
    let expiredCount = 0;
    
    reagents.forEach(reagent => {
      const expiry = new Date(reagent.expiry_date);
      const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) {
        expiredCount++;
      } else if (daysUntilExpiry <= 30) {
        expiringSoonCount++;
      } else {
        activeCount++;
      }
    });
    
    return {
      active: activeCount,
      expiringSoon: expiringSoonCount,
      expired: expiredCount,
      total: reagents.length
    };
  };

  const stats = getReagentStats();

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
    <div className="p-8 space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">Lab Reaktivlari</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Laboratoriya reaktivlarini boshqarish
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:opacity-90 flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          Reaktiv qo'shish
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Qidiruv
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nomi yoki ishlab chiqarilgan joyi..."
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Barchasi</option>
              <option value="active">Faol</option>
              <option value="low_stock">Kam qoldi</option>
              <option value="expired">Muddati o'tgan</option>
              <option value="depleted">Tugagan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <span className="material-symbols-outlined text-3xl mb-2">check_circle</span>
          <p className="text-3xl font-black">{stats.active}</p>
          <p className="text-sm opacity-90 mt-1">Faol reaktivlar</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white">
          <span className="material-symbols-outlined text-3xl mb-2">warning</span>
          <p className="text-3xl font-black">{stats.expiringSoon}</p>
          <p className="text-sm opacity-90 mt-1">Kam qolgan</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
          <span className="material-symbols-outlined text-3xl mb-2">event_busy</span>
          <p className="text-3xl font-black">{stats.expired}</p>
          <p className="text-sm opacity-90 mt-1">Muddati o'tgan</p>
        </div>

        <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl p-6 text-white">
          <span className="material-symbols-outlined text-3xl mb-2">inventory_2</span>
          <p className="text-3xl font-black">{reagents.length}</p>
          <p className="text-sm opacity-90 mt-1">Jami reaktivlar</p>
        </div>
      </div>

      {/* Reagents Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Nomi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Ishlab chiqarilgan joyi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Qolgan/Jami</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Bitta testga</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Yaroqlilik</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredReagents.length > 0 ? (
                filteredReagents.map((reagent) => {
                  const expiryStatus = getExpiryStatus(reagent.expiry_date);
                  
                  return (
                  <tr key={reagent._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 dark:text-white">{reagent.name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {reagent.country_of_origin || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white">{reagent.remaining_tests}</span>
                        <span className="text-gray-500 dark:text-gray-400">/</span>
                        <span className="text-gray-600 dark:text-gray-400">{reagent.total_tests}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                        <div
                          className={`h-1.5 rounded-full ${
                            reagent.remaining_tests / reagent.total_tests > 0.5 ? 'bg-green-500' :
                            reagent.remaining_tests / reagent.total_tests > 0.2 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${(reagent.remaining_tests / reagent.total_tests) * 100}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-primary">
                      {formatCurrency(reagent.price_per_test)}
                    </td>
                    <td className="px-4 py-3">
                      <div className={`p-2 rounded-lg border-2 ${expiryStatus.class}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="material-symbols-outlined text-sm">schedule</span>
                          <p className="text-xs font-semibold">{formatDate(reagent.expiry_date)}</p>
                        </div>
                        <p className="text-xs">{expiryStatus.text}</p>
                        {expiryStatus.percentage !== undefined && (
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
                            <div
                              className={`h-1 rounded-full ${expiryStatus.progressClass}`}
                              style={{ width: `${expiryStatus.percentage}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(reagent.status).class}`}>
                        {getStatusBadge(reagent.status).text}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(reagent)}
                          className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                          title="Tahrirlash"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(reagent)}
                          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          title="O'chirish"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Reaktivlar topilmadi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reagent Modal */}
      <Modal
        isOpen={showReagentModal}
        onClose={() => setShowReagentModal(false)}
        title={editingReagent ? 'Reaktivni tahrirlash' : 'Yangi reaktiv qo\'shish'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Nomi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reagentForm.name}
              onChange={(e) => setReagentForm({ ...reagentForm, name: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Masalan: Glyukoza test reagenti"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Ishlab chiqarilgan joyi
            </label>
            <input
              type="text"
              value={reagentForm.country_of_origin}
              onChange={(e) => setReagentForm({ ...reagentForm, country_of_origin: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Mamlakat nomi"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Nechta bemorga yetadi <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={reagentForm.total_tests}
                onChange={(e) => setReagentForm({ ...reagentForm, total_tests: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="100"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Umumiy narx (so'm) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={reagentForm.total_price}
                onChange={(e) => setReagentForm({ ...reagentForm, total_price: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="500000"
                min="0"
                required
              />
            </div>
          </div>

          {reagentForm.total_tests && reagentForm.total_price && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Bitta bemorga: <span className="font-bold text-primary">{formatCurrency(calculatePricePerTest())}</span>
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Yaroqlilik muddati <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={reagentForm.expiry_date}
              onChange={(e) => setReagentForm({ ...reagentForm, expiry_date: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Izoh
            </label>
            <textarea
              value={reagentForm.notes}
              onChange={(e) => setReagentForm({ ...reagentForm, notes: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              rows="3"
              placeholder="Qo'shimcha ma'lumot..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowReagentModal(false)}
              className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:opacity-90"
            >
              {editingReagent ? 'Yangilash' : 'Qo\'shish'}
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

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal({ ...confirmModal, isOpen: false });
        }}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
      />
    </div>
  );
};

export default LabPharmacy;
