import { useState, useEffect } from 'react';
import expenseService from '../services/expenseService';
import Modal from '../components/Modal';
import AlertModal from '../components/AlertModal';
import ConfirmModal from '../components/ConfirmModal';
import toast, { Toaster } from 'react-hot-toast';

const Expenses = () => {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState({
    total_expense: 0,
    monthly_expense: 0,
    yearly_expense: 0,
    by_category: []
  });
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // Modal states
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    category: 'Boshqa',
    description: '',
    date: new Date().toISOString().slice(0, 16),
    payment_method: 'Naqd',
    receipt_number: ''
  });

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

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const params = {
        month: selectedMonth,
        limit: 100
      };

      const [expensesData, statsData] = await Promise.all([
        expenseService.getExpenses(params),
        expenseService.getStats({ month: selectedMonth })
      ]);

      if (expensesData.success) {
        setExpenses(expensesData.data);
      }

      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (error) {
      console.error('Load data error:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        showAlert(
          'Sessiya muddati tugagan. Iltimos, qaytadan kiring.',
          'error',
          'Autentifikatsiya xatosi'
        );
        // Redirect to login after 2 seconds
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }, 2000);
      } else if (error.response?.status === 403) {
        showAlert(
          'Sizda bu sahifaga kirish huquqi yo\'q. Iltimos, admin sifatida kiring.',
          'error',
          'Ruxsat yo\'q'
        );
      } else {
        showAlert('Ma\'lumotlarni yuklashda xatolik', 'error', 'Xatolik');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setExpenseForm({
        title: expense.title,
        amount: expense.amount,
        description: expense.description || '',
        date: new Date(expense.date).toISOString().slice(0, 16)
      });
    } else {
      setEditingExpense(null);
      setExpenseForm({
        title: '',
        amount: '',
        description: '',
        date: new Date().toISOString().slice(0, 16)
      });
    }
    setShowExpenseModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!expenseForm.title || !expenseForm.amount) {
      showAlert('Iltimos, barcha majburiy maydonlarni to\'ldiring', 'warning', 'Ogohlantirish');
      return;
    }

    try {
      if (editingExpense) {
        const response = await expenseService.updateExpense(editingExpense._id, expenseForm);
        if (response.success) {
          showAlert('Xarajat muvaffaqiyatli yangilandi!', 'success', 'Muvaffaqiyatli');
        }
      } else {
        const response = await expenseService.createExpense(expenseForm);
        if (response.success) {
          showAlert('Xarajat muvaffaqiyatli qo\'shildi!', 'success', 'Muvaffaqiyatli');
        }
      }

      setShowExpenseModal(false);
      loadData();
    } catch (error) {
      console.error('Submit expense error:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        showAlert(
          'Sessiya muddati tugagan. Iltimos, qaytadan kiring.',
          'error',
          'Autentifikatsiya xatosi'
        );
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }, 2000);
      } else if (error.response?.status === 403) {
        showAlert(
          'Sizda bu amalni bajarish huquqi yo\'q.',
          'error',
          'Ruxsat yo\'q'
        );
      } else {
        showAlert('Xatolik yuz berdi: ' + (error.response?.data?.message || error.message), 'error', 'Xatolik');
      }
    }
  };

  const handleDelete = (expense) => {
    showConfirm(
      `"${expense.title}" xarajatini o'chirmoqchimisiz?`,
      async () => {
        try {
          const response = await expenseService.deleteExpense(expense._id);
          if (response.success) {
            showAlert('Xarajat muvaffaqiyatli o\'chirildi!', 'success', 'Muvaffaqiyatli');
            loadData();
          }
        } catch (error) {
          console.error('Delete expense error:', error);
          
          // Check if it's an authentication error
          if (error.response?.status === 401) {
            showAlert(
              'Sessiya muddati tugagan. Iltimos, qaytadan kiring.',
              'error',
              'Autentifikatsiya xatosi'
            );
            setTimeout(() => {
              localStorage.removeItem('token');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
              window.location.href = '/login';
            }, 2000);
          } else if (error.response?.status === 403) {
            showAlert(
              'Sizda bu amalni bajarish huquqi yo\'q.',
              'error',
              'Ruxsat yo\'q'
            );
          } else {
            showAlert('Xatolik yuz berdi: ' + (error.response?.data?.message || error.message), 'error', 'Xatolik');
          }
        }
      },
      {
        title: 'Xarajatni o\'chirish',
        type: 'danger',
        confirmText: 'O\'chirish',
        cancelText: 'Bekor qilish'
      }
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
    <div className="p-8 space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">Xarajatlar</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Klinika xarajatlarini boshqarish
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:opacity-90 flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          Xarajat qo'shish
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
          <span className="material-symbols-outlined text-3xl mb-2">account_balance_wallet</span>
          <p className="text-4xl font-black">{formatCurrency(stats.total_expense)}</p>
          <p className="text-sm opacity-90 mt-1">Umumiy xarajat</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <span className="material-symbols-outlined text-3xl mb-2">calendar_month</span>
          <p className="text-4xl font-black">{formatCurrency(stats.monthly_expense)}</p>
          <p className="text-sm opacity-90 mt-1">Oylik xarajat</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <span className="material-symbols-outlined text-3xl mb-2">calendar_today</span>
          <p className="text-4xl font-black">{formatCurrency(stats.yearly_expense)}</p>
          <p className="text-sm opacity-90 mt-1">Yillik xarajat</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Oy
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Xarajatlar ro'yxati ({expenses.length})
          </h2>
        </div>

        {expenses.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
              receipt_long
            </span>
            <p className="text-gray-500 dark:text-gray-400">
              {selectedCategory === 'all' ? 'Xarajatlar yo\'q' : 'Bu kategoriyada xarajatlar yo\'q'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">№</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Sana</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Sarlavha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Kategoriya</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Summa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">To'lov usuli</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {expenses.map((expense, index) => (
                  <tr key={expense._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(expense.date)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{expense.title}</p>
                      {expense.description && (
                        <p className="text-xs text-gray-500 mt-1">{expense.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 rounded text-xs font-semibold">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {expense.payment_method}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(expense)}
                          className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                          title="Tahrirlash"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(expense)}
                          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          title="O'chirish"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expense Modal */}
      <Modal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        title={editingExpense ? 'Xarajatni tahrirlash' : 'Yangi xarajat qo\'shish'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Sarlavha <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={expenseForm.title}
              onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Masalan: Elektr energiyasi to'lovi"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Summa (so'm) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Sana va vaqt <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={expenseForm.date}
              onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Izoh
            </label>
            <textarea
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              rows="3"
              placeholder="Qo'shimcha ma'lumot..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowExpenseModal(false)}
              className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:opacity-90"
            >
              {editingExpense ? 'Yangilash' : 'Qo\'shish'}
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

export default Expenses;
