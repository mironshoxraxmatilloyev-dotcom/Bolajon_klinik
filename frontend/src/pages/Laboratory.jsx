import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import laboratoryService from '../services/laboratoryService';
import patientService from '../services/patientService';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import LabPharmacy from './LabPharmacy';

export default function Laboratory() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('orders'); // orders, tests, results, pharmacy
  const [loading, setLoading] = useState(false);
  
  // Orders
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  
  // Tests
  const [tests, setTests] = useState([]);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('today');
  
  // Modals
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Form data
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    loadData();
  }, [activeTab, filterStatus, filterDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'orders') {
        await loadOrders();
        await loadStats();
      } else if (activeTab === 'tests') {
        await loadTests();
      }
    } catch (error) {
      toast.error('Xatolik: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    const params = {};
    
    if (filterStatus !== 'all') {
      params.status = filterStatus;
    }
    
    if (filterDate === 'today') {
      params.date_from = new Date().toISOString().split('T')[0];
    } else if (filterDate === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      params.date_from = weekAgo.toISOString().split('T')[0];
    }
    
    const response = await laboratoryService.getOrders(params);
    setOrders(response.data);
  };

  const loadStats = async () => {
    const params = {};
    
    if (filterDate === 'today') {
      params.date_from = new Date().toISOString().split('T')[0];
    } else if (filterDate === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      params.date_from = weekAgo.toISOString().split('T')[0];
    } else if (filterDate === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      params.date_from = monthAgo.toISOString().split('T')[0];
    }
    // 'all' uchun parametr yuborilmaydi
    
    const response = await laboratoryService.getStats(params);
    setStats(response.data);
  };

  const loadTests = async () => {
    const response = await laboratoryService.getTests({ is_active: true });
    setTests(response.data);
  };

  const loadPatientsAndDoctors = async () => {
    try {
      const [patientsRes, staffRes] = await Promise.all([
        patientService.getPatients(),
        api.get('/staff')
      ]);
      setPatients(patientsRes.data);
      
      // Faqat laborantlarni filtrlash
      const allStaff = staffRes.data.data || staffRes.data;
      const laborants = allStaff.filter(staff => 
        staff.role_name === 'laborant' || 
        staff.role_name === 'Laborant' ||
        (staff.role && (staff.role.name === 'laborant' || staff.role.name === 'Laborant'))
      );
      
      setDoctors(laborants);
    } catch (error) {
      toast.error('Xodimlarni yuklashda xatolik');
    }
  };

  const handleNewOrder = async () => {
    await loadPatientsAndDoctors();
    await loadTests();
    setShowNewOrderModal(true);
  };

  const handleEnterResult = (order) => {
    setSelectedOrder(order);
    setShowResultModal(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
      sample_taken: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
      in_progress: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
      ready: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
      approved: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
      cancelled: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
    };
    return colors[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: t('lab.pending'),
      sample_taken: t('lab.sampleTaken'),
      in_progress: t('lab.inProgress'),
      ready: t('lab.ready'),
      approved: t('lab.approved'),
      cancelled: t('lab.cancelled')
    };
    return texts[status] || status;
  };

  const isAdmin = user?.role?.name === 'admin' || user?.role?.name === 'Administrator' || user?.role_name === 'admin' || user?.role_name === 'Administrator';
  const isLaborant = user?.role?.name === 'laborant' || user?.role?.name === 'Laborant' || user?.role?.name === 'Lab' || user?.role_name === 'laborant' || user?.role_name === 'Laborant' || user?.role_name === 'Lab';
  const isDoctor = user?.role?.name === 'doctor' || user?.role?.name === 'Shifokor' || user?.role?.name === 'Doctor' || user?.role_name === 'doctor' || user?.role_name === 'Shifokor' || user?.role_name === 'Doctor';
  const isReception = user?.role?.name === 'reception' || 
                      user?.role?.name === 'Reception' || 
                      user?.role?.name === 'receptionist' || 
                      user?.role?.name === 'Receptionist' || 
                      user?.role?.name === 'Qabulxona' || 
                      user?.role_name === 'reception' || 
                      user?.role_name === 'Reception' || 
                      user?.role_name === 'receptionist' || 
                      user?.role_name === 'Receptionist' || 
                      user?.role_name === 'Qabulxona';

  // Debug
  console.log('=== LABORATORY PAGE ===');
  console.log('User:', user);
  console.log('User role:', user?.role);
  console.log('User role_name:', user?.role_name);
  console.log('isAdmin:', isAdmin);
  console.log('isLaborant:', isLaborant);
  console.log('isDoctor:', isDoctor);
  console.log('isReception:', isReception);

  return (
    <div className="p-3 sm:p-4 sm:p-4 sm:p-6 lg:p-4 sm:p-6 lg:p-8 space-y-3 sm:space-y-4 sm:space-y-4 sm:space-y-6">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 sm:gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-2xl sm:text-3xl font-black text-gray-900 dark:text-white break-words">{t('lab.pageTitle')}</h1>
          <p className="text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            {t('lab.pageSubtitle')}
          </p>
        </div>
        
        {(isAdmin || isDoctor || isReception) && (
          <button
            onClick={handleNewOrder}
            className="w-full sm:w-auto px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-primary text-white rounded-lg sm:rounded-lg sm:rounded-xl font-semibold hover:opacity-90 flex items-center justify-center gap-2 sm:gap-2 sm:gap-3"
          >
            <span className="material-symbols-outlined">add</span>
            <span>{t('lab.newOrder')}</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (isAdmin || isLaborant) && (
        <>
          {/* Admin uchun kengaytirilgan statistika */}
          {isAdmin && (
            <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 sm:gap-3 sm:gap-4 mb-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg sm:rounded-xl p-5 border-2 border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <span className="material-symbols-outlined text-2xl sm:text-3xl text-blue-600">payments</span>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Bugungi tushum</p>
                    <p className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-400">
                      {(stats.today_revenue || 0).toLocaleString()} so'm
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg sm:rounded-xl p-5 border-2 border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <span className="material-symbols-outlined text-2xl sm:text-3xl text-green-600">group</span>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Bugungi bemorlar</p>
                    <p className="text-xl sm:text-2xl font-black text-green-700 dark:text-green-400">
                      {stats.today_patients || 0} ta
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg sm:rounded-xl p-5 border-2 border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <span className="material-symbols-outlined text-2xl sm:text-3xl text-purple-600">check_circle</span>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Bugun tayyor</p>
                    <p className="text-xl sm:text-2xl font-black text-purple-700 dark:text-purple-400">
                      {stats.completed_today || 0} ta
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Reaktiv statistikasi (faqat admin) */}
          {isAdmin && stats.reagent_stats && (
            <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-5 border border-gray-200 dark:border-gray-700 mb-4">
              <h3 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2 sm:gap-2 sm:gap-3">
                <span className="material-symbols-outlined text-purple-600">science</span>
                Lab Reaktivlar Statistikasi
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg sm:rounded-lg sm:rounded-xl">
                  <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{stats.reagent_stats.total}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Jami</p>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg sm:rounded-lg sm:rounded-xl">
                  <p className="text-xl sm:text-2xl font-black text-green-700 dark:text-green-400">{stats.reagent_stats.active}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Yaroqli</p>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg sm:rounded-lg sm:rounded-xl">
                  <p className="text-xl sm:text-2xl font-black text-red-700 dark:text-red-400">{stats.reagent_stats.expired}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Yaroqsiz</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg sm:rounded-lg sm:rounded-xl">
                  <p className="text-xl sm:text-2xl font-black text-yellow-700 dark:text-yellow-400">{stats.reagent_stats.low_stock}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Kam qolgan</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg sm:rounded-lg sm:rounded-xl">
                  <p className="text-xl sm:text-2xl font-black text-gray-700 dark:text-gray-400">{stats.reagent_stats.depleted}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Tugagan</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Buyurtmalar statistikasi */}
          <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 sm:gap-3 sm:gap-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg sm:rounded-lg sm:rounded-xl p-3 sm:p-4 sm:p-5 border-l-4 border-yellow-500">
              <p className="text-xs sm:text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('lab.pending')}</p>
              <p className="text-2xl sm:text-2xl sm:text-3xl font-black text-yellow-700 dark:text-yellow-400">{stats.pending_orders || 0}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg sm:rounded-lg sm:rounded-xl p-3 sm:p-4 sm:p-5 border-l-4 border-purple-500">
              <p className="text-xs sm:text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('lab.inProgress')}</p>
              <p className="text-2xl sm:text-2xl sm:text-3xl font-black text-purple-700 dark:text-purple-400">{stats.in_progress_orders || 0}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg sm:rounded-lg sm:rounded-xl p-3 sm:p-4 sm:p-5 border-l-4 border-green-500">
              <p className="text-xs sm:text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400">Jami buyurtmalar</p>
              <p className="text-2xl sm:text-2xl sm:text-3xl font-black text-green-700 dark:text-green-400">{stats.total_orders || 0}</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg sm:rounded-lg sm:rounded-xl p-3 sm:p-4 sm:p-5 border-l-4 border-orange-500">
              <p className="text-xs sm:text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400">Bugun tayyor</p>
              <p className="text-2xl sm:text-2xl sm:text-3xl font-black text-orange-700 dark:text-orange-400">{stats.completed_today || 0}</p>
            </div>
          </div>
        </>
      )}

      {/* Tabs */}
      <div className="flex gap-2 sm:gap-2 sm:gap-3 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'orders'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          {t('lab.orders')}
        </button>
        {(isAdmin || isLaborant) && (
          <button
            onClick={() => setActiveTab('tests')}
            className={`px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'tests'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {t('lab.testsCatalog')}
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setActiveTab('pharmacy')}
            className={`px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 font-semibold transition-colors whitespace-nowrap flex items-center gap-2 sm:gap-2 sm:gap-3 ${
              activeTab === 'pharmacy'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base sm:text-lg">science</span>
            Lab Dorixonasi
          </button>
        )}
      </div>

      {/* Filters */}
      {activeTab === 'orders' && (
        <div className="flex flex-col sm:flex-col sm:flex-row gap-2 sm:gap-3 sm:gap-3 sm:gap-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:flex-1 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg sm:rounded-lg sm:rounded-xl text-sm sm:text-sm sm:text-base"
          >
            <option value="all">{t('lab.allStatuses')}</option>
            <option value="pending">{t('lab.pending')}</option>
            <option value="sample_taken">{t('lab.sampleTaken')}</option>
            <option value="in_progress">{t('lab.inProgress')}</option>
            <option value="ready">{t('lab.ready')}</option>
            <option value="approved">{t('lab.approved')}</option>
          </select>
          
          <select
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full sm:flex-1 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg sm:rounded-lg sm:rounded-xl text-sm sm:text-sm sm:text-base"
          >
            <option value="today">{t('lab.today')}</option>
            <option value="week">{t('lab.lastWeek')}</option>
            <option value="month">{t('lab.lastMonth')}</option>
            <option value="all">{t('lab.all')}</option>
          </select>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : activeTab === 'orders' ? (
        <OrdersList 
          orders={orders} 
          onEnterResult={handleEnterResult}
          onRefresh={loadData}
          isAdmin={isAdmin}
          isLaborant={isLaborant}
          isDoctor={isDoctor}
          isReception={isReception}
          getStatusColor={getStatusColor}
          getStatusText={getStatusText}
          t={t}
        />
      ) : activeTab === 'tests' ? (
        <TestsCatalog tests={tests} onRefresh={loadData} t={t} />
      ) : activeTab === 'pharmacy' && isAdmin ? (
        <LabPharmacy />
      ) : null}

      {/* Modals */}
      {showNewOrderModal && (
        <NewOrderModal
          isOpen={showNewOrderModal}
          onClose={() => setShowNewOrderModal(false)}
          patients={patients}
          doctors={doctors}
          tests={tests}
          onSuccess={loadData}
          t={t}
        />
      )}

      {showResultModal && selectedOrder && (
        <ResultModal
          isOpen={showResultModal}
          onClose={() => {
            setShowResultModal(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
          onSuccess={loadData}
          t={t}
        />
      )}
    </div>
  );
}

// OrdersList component
function OrdersList({ orders, onEnterResult, onRefresh, isAdmin, isLaborant, isDoctor, isReception, getStatusColor, getStatusText, t }) {
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await laboratoryService.updateOrderStatus(orderId, newStatus);
      toast.success(t('lab.statusUpdated'));
      onRefresh();
    } catch (error) {
      toast.error(t('lab.error'));
    }
  };

  const handleApprove = async (resultId) => {
    try {
      await laboratoryService.approveResult(resultId);
      toast.success(t('lab.resultApproved'));
      onRefresh();
    } catch (error) {
      toast.error(t('lab.error'));
    }
  };

  if (orders.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl p-4 sm:p-6 lg:p-8 sm:p-12 text-center border border-gray-200 dark:border-gray-800">
        <span className="material-symbols-outlined text-5xl sm:text-6xl text-gray-300 dark:text-gray-700 mb-4">science</span>
        <p className="text-sm sm:text-sm sm:text-base text-gray-500 dark:text-gray-400">{t('lab.noOrders')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden sm:block">
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-left text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">{t('lab.orderNumber')}</th>
              <th className="px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-left text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">{t('lab.patient')}</th>
              <th className="px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-left text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">{t('lab.test')}</th>
              <th className="px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-left text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">{t('lab.doctor')}</th>
              <th className="px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-left text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">{t('lab.date')}</th>
              <th className="px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-left text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">{t('lab.status')}</th>
              <th className="px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-left text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">{t('lab.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-sm sm:text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{order.order_number}</td>
                <td className="px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-sm sm:text-sm sm:text-base">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{order.patient_name}</p>
                    <p className="text-gray-500 dark:text-gray-400">{order.patient_number}</p>
                  </div>
                </td>
                <td className="px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-sm sm:text-sm sm:text-base text-gray-900 dark:text-white">{order.test_name}</td>
                <td className="px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-sm sm:text-sm sm:text-base text-gray-700 dark:text-gray-300">{order.doctor_name}</td>
                <td className="px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-sm sm:text-sm sm:text-base text-gray-700 dark:text-gray-300">
                  {new Date(order.order_date).toLocaleDateString('uz-UZ')}
                </td>
                <td className="px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </td>
                <td className="px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
                  <div className="flex gap-2 sm:gap-2 sm:gap-3 flex-wrap">
                    {isLaborant && order.status === 'pending' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'in_progress')}
                        className="px-3 py-1 bg-green-500 text-white rounded text-xs font-semibold hover:bg-green-600 whitespace-nowrap"
                      >
                        Namuna olindi
                      </button>
                    )}
                    {isLaborant && order.status === 'in_progress' && !order.result_id && (
                      <button
                        onClick={() => onEnterResult(order)}
                        className="px-3 py-1 bg-purple-500 text-white rounded text-xs font-semibold hover:bg-purple-600 whitespace-nowrap"
                      >
                        {t('lab.enterResult')}
                      </button>
                    )}
                    {order.result_id && (order.approved_at || isAdmin || isLaborant) && (
                      <button
                        onClick={() => window.open(`/laboratory/result/${order.id}`, '_blank')}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-xs font-semibold hover:bg-blue-600 whitespace-nowrap flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm sm:text-sm sm:text-base">download</span>
                        {t('lab.download')}
                      </button>
                    )}
                    {isAdmin && order.status === 'ready' && order.result_id && !order.approved_at && (
                      <button
                        onClick={() => handleApprove(order.result_id)}
                        className="px-3 py-1 bg-green-500 text-white rounded text-xs font-semibold hover:bg-green-600 whitespace-nowrap"
                      >
                        Tasdiqlash
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden sm:block p-3 sm:p-3 sm:p-4 space-y-2 sm:space-y-3">
        {orders.map((order) => (
          <div 
            key={order.id} 
            className="bg-gray-50 dark:bg-gray-800 rounded-lg sm:rounded-xl p-3 sm:p-4 border-2 border-gray-200 dark:border-gray-700 overflow-hidden sm:block"
          >
            {/* Order Number & Status */}
            <div className="flex items-center justify-between mb-3 gap-2 sm:gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-2 sm:gap-3 min-w-0 flex-1">
                <span className="material-symbols-outlined text-primary flex-shrink-0">science</span>
                <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">{order.order_number}</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 ${getStatusColor(order.status)}`}>
                {getStatusText(order.status)}
              </span>
            </div>

            {/* Order Details */}
            <div className="space-y-2 sm:space-y-2 sm:space-y-3 mb-3">
              {/* Patient */}
              <div className="flex items-start gap-2 sm:gap-2 sm:gap-3">
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-400 text-base sm:text-lg flex-shrink-0">person</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('lab.patient')}</p>
                  <p className="font-semibold text-gray-900 dark:text-white break-words">{order.patient_name}</p>
                  <p className="text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400 break-words">{order.patient_number}</p>
                </div>
              </div>

              {/* Test */}
              <div className="flex items-start gap-2 sm:gap-2 sm:gap-3">
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-400 text-base sm:text-lg flex-shrink-0">biotech</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('lab.test')}</p>
                  <p className="text-sm sm:text-sm sm:text-base text-gray-900 dark:text-white break-words">{order.test_name}</p>
                </div>
              </div>

              {/* Doctor */}
              <div className="flex items-start gap-2 sm:gap-2 sm:gap-3">
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-400 text-base sm:text-lg flex-shrink-0">medical_services</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('lab.doctor')}</p>
                  <p className="text-sm sm:text-sm sm:text-base text-gray-700 dark:text-gray-300 break-words">{order.doctor_name}</p>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-start gap-2 sm:gap-2 sm:gap-3">
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-400 text-base sm:text-lg flex-shrink-0">calendar_today</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('lab.date')}</p>
                  <p className="text-sm sm:text-sm sm:text-base text-gray-700 dark:text-gray-300">
                    {new Date(order.order_date).toLocaleDateString('uz-UZ')}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 sm:gap-2 sm:gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              {isLaborant && order.status === 'pending' && (
                <button
                  onClick={() => handleStatusChange(order.id, 'in_progress')}
                  className="w-full px-3 py-2 sm:py-2.5 bg-green-500 text-white rounded-lg sm:rounded-lg sm:rounded-xl text-sm sm:text-sm sm:text-base font-semibold hover:bg-green-600"
                >
                  Namuna olindi
                </button>
              )}
              {isLaborant && order.status === 'in_progress' && !order.result_id && (
                <button
                  onClick={() => onEnterResult(order)}
                  className="w-full px-3 py-2 sm:py-2.5 bg-purple-500 text-white rounded-lg sm:rounded-lg sm:rounded-xl text-sm sm:text-sm sm:text-base font-semibold hover:bg-purple-600"
                >
                  {t('lab.enterResult')}
                </button>
              )}
              {order.result_id && (order.approved_at || isAdmin || isLaborant) && (
                <button
                  onClick={() => window.open(`/laboratory/result/${order.id}`, '_blank')}
                  className="w-full px-3 py-2 sm:py-2.5 bg-blue-500 text-white rounded-lg sm:rounded-lg sm:rounded-xl text-sm sm:text-sm sm:text-base font-semibold hover:bg-blue-600 flex items-center justify-center gap-2 sm:gap-2 sm:gap-3"
                >
                  <span className="material-symbols-outlined text-base sm:text-lg">download</span>
                  Yuklab olish
                </button>
              )}
              {isAdmin && order.status === 'ready' && order.result_id && !order.approved_at && (
                <button
                  onClick={() => handleApprove(order.result_id)}
                  className="w-full px-3 py-2 sm:py-2.5 bg-green-500 text-white rounded-lg sm:rounded-lg sm:rounded-xl text-sm sm:text-sm sm:text-base font-semibold hover:bg-green-600"
                >
                  Tasdiqlash
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// TestsCatalog component with add/edit/delete functionality
function TestsCatalog({ tests, onRefresh, t }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [formData, setFormData] = useState({
    test_name: '',
    price: '',
    description: '',
    turnaround_time: '',
    category: ''
  });

  const handleAdd = () => {
    setEditingTest(null);
    setFormData({
      test_name: '',
      price: '',
      description: '',
      turnaround_time: '',
      category: ''
    });
    setShowAddModal(true);
  };

  const handleEdit = (test) => {
    setEditingTest(test);
    setFormData({
      test_name: test.test_name || '',
      price: test.price || '',
      description: test.description || '',
      turnaround_time: test.turnaround_time || '',
      category: test.category || ''
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Backend formatiga o'zgartirish
      const backendData = {
        name: formData.test_name,
        category: formData.category || 'Umumiy',
        price: formData.price,
        description: formData.description,
        duration_minutes: formData.turnaround_time ? parseInt(formData.turnaround_time) * 60 : null
      };

      if (editingTest) {
        await laboratoryService.updateTest(editingTest.id, backendData);
        toast.success('Xizmat yangilandi');
      } else {
        await laboratoryService.createTest(backendData);
        toast.success('Xizmat qo\'shildi');
      }
      setShowAddModal(false);
      onRefresh();
    } catch (error) {
      toast.error('Xatolik: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (testId) => {
    if (!window.confirm('Ushbu xizmatni o\'chirmoqchimisiz?')) return;
    try {
      await laboratoryService.deleteTest(testId);
      toast.success('Xizmat o\'chirildi');
      onRefresh();
    } catch (error) {
      toast.error('Xatolik: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 sm:p-4 sm:p-6 overflow-hidden sm:block">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg sm:text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Laboratoriya xizmatlari</h3>
        <button
          onClick={handleAdd}
          className="px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-primary text-white rounded-lg sm:rounded-lg sm:rounded-xl font-semibold hover:opacity-90 flex items-center gap-2 sm:gap-2 sm:gap-3"
        >
          <span className="material-symbols-outlined">add</span>
          Xizmat qo'shish
        </button>
      </div>

      {tests.length === 0 ? (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">science</span>
          <p className="text-gray-600 dark:text-gray-400">Hali xizmatlar qo'shilmagan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 sm:gap-3 sm:gap-4">
          {tests.map((test) => (
            <div key={test.id} className="border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-lg sm:rounded-xl p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 overflow-hidden sm:block">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-bold text-gray-900 dark:text-white break-words flex-1">{test.test_name}</h4>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(test)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <span className="material-symbols-outlined text-base sm:text-lg">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(test.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <span className="material-symbols-outlined text-base sm:text-lg">delete</span>
                  </button>
                </div>
              </div>
              <p className="text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400 break-words">{test.test_code}</p>
              <p className="text-base sm:text-lg font-semibold text-primary mt-2">
                {test.price?.toLocaleString() || 0} so'm
              </p>
              {test.description && (
                <p className="text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2 break-words">{test.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl max-w-xl sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl sm:text-2xl font-bold">{editingTest ? 'Xizmatni tahrirlash' : 'Yangi xizmat qo\'shish'}</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-sm sm:text-sm sm:text-base font-semibold mb-2">Xizmat nomi *</label>
                  <input
                    type="text"
                    value={formData.test_name}
                    onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
                    className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 border rounded-lg sm:rounded-lg sm:rounded-xl dark:bg-gray-900 dark:border-gray-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm sm:text-sm sm:text-base font-semibold mb-2">Narxi (so'm) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 border rounded-lg sm:rounded-lg sm:rounded-xl dark:bg-gray-900 dark:border-gray-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm sm:text-sm sm:text-base font-semibold mb-2">Tavsif</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 border rounded-lg sm:rounded-lg sm:rounded-xl dark:bg-gray-900 dark:border-gray-700"
                    rows="3"
                  />
                </div>

                <div>
                  <label className="block text-sm sm:text-sm sm:text-base font-semibold mb-2">Tayyorlanish vaqti (soat)</label>
                  <input
                    type="number"
                    value={formData.turnaround_time}
                    onChange={(e) => setFormData({ ...formData, turnaround_time: e.target.value })}
                    className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 border rounded-lg sm:rounded-lg sm:rounded-xl dark:bg-gray-900 dark:border-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm sm:text-sm sm:text-base font-semibold mb-2">Kategoriya</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 border rounded-lg sm:rounded-lg sm:rounded-xl dark:bg-gray-900 dark:border-gray-700"
                    placeholder="Masalan: Biokimyo, Gematologiya"
                  />
                </div>

                <div className="flex gap-2 sm:gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 border border-gray-300 rounded-lg sm:rounded-lg sm:rounded-xl hover:bg-gray-50"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-primary text-white rounded-lg sm:rounded-lg sm:rounded-xl hover:opacity-90"
                  >
                    {editingTest ? 'Yangilash' : 'Qo\'shish'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// NewOrderModal component
function NewOrderModal({ isOpen, onClose, patients, doctors, tests, onSuccess, t }) {
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    test_id: '',
    priority: 'normal',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.patient_id || !formData.test_id) {
      toast.error(t('lab.fillRequired'));
      return;
    }

    try {
      setLoading(true);
      const response = await laboratoryService.createOrder(formData);
      if (response.success) {
        toast.success(`${t('lab.orderCreated')} - Hisob-faktura: ${response.data.invoice_number}`);
      } else {
        toast.success(t('lab.orderCreated'));
      }
      onClose();
      onSuccess();
    } catch (error) {
      toast.error(t('lab.error') + ': ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl max-w-xl sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-3 sm:p-4 sm:p-4 sm:p-6 space-y-3 sm:space-y-4 sm:space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between mb-4 sticky top-0 bg-white dark:bg-gray-900 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl sm:text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{t('lab.newOrderTitle')}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex-shrink-0"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Bemor */}
          <div>
            <label className="block text-xs sm:text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('lab.patient')} <span className="text-red-500">{t('lab.required')}</span>
            </label>
            <select
              required
              value={formData.patient_id}
              onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
              className="w-full px-3 sm:px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 sm:py-2 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-sm sm:text-base"
            >
              <option value="">{t('lab.selectPatient')}</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.first_name} {patient.last_name} - {patient.patient_number}
                </option>
              ))}
            </select>
          </div>

          {/* Shifokor */}
          <div>
            <label className="block text-xs sm:text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('lab.doctor')}
            </label>
            <select
              value={formData.doctor_id}
              onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
              className="w-full px-3 sm:px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 sm:py-2 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-sm sm:text-base"
            >
              <option value="">{t('lab.selectDoctor')}</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.first_name} {doctor.last_name} - {doctor.specialization}
                </option>
              ))}
            </select>
          </div>

          {/* Tahlil */}
          <div>
            <label className="block text-xs sm:text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('lab.test')} <span className="text-red-500">{t('lab.required')}</span>
            </label>
            <select
              required
              value={formData.test_id}
              onChange={(e) => setFormData({ ...formData, test_id: e.target.value })}
              className="w-full px-3 sm:px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 sm:py-2 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-sm sm:text-base"
            >
              <option value="">{t('lab.selectTest')}</option>
              {tests.map((test) => (
                <option key={test.id} value={test.id}>
                  {test.name} - {test.price?.toLocaleString() || 0} so'm
                </option>
              ))}
            </select>
          </div>

          {/* Muhimlik */}
          <div>
            <label className="block text-xs sm:text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('lab.priority')}
            </label>
            <div className="flex flex-col sm:flex-col sm:flex-row gap-2 sm:gap-2 sm:gap-3 sm:gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, priority: 'normal' })}
                className={`flex-1 px-3 sm:px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 sm:py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all text-sm sm:text-sm sm:text-base ${
                  formData.priority === 'normal'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                {t('lab.normalPriority')}
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, priority: 'urgent' })}
                className={`flex-1 px-3 sm:px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 sm:py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all text-sm sm:text-sm sm:text-base ${
                  formData.priority === 'urgent'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                {t('lab.urgent')}
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, priority: 'stat' })}
                className={`flex-1 px-3 sm:px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 sm:py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all text-sm sm:text-sm sm:text-base ${
                  formData.priority === 'stat'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                {t('lab.stat')}
              </button>
            </div>
          </div>

          {/* Izoh */}
          <div>
            <label className="block text-xs sm:text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('lab.notes')}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows="3"
              className="w-full px-3 sm:px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 sm:py-2 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm sm:text-sm sm:text-base"
              placeholder={t('lab.notesPlaceholder')}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 sm:py-2 sm:py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg sm:rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 text-sm sm:text-sm sm:text-base"
            >
              {t('lab.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:flex-1 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 sm:py-2 sm:py-3 bg-primary text-white rounded-lg sm:rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 text-sm sm:text-sm sm:text-base"
            >
              {loading ? t('lab.loading') : t('lab.createOrder')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ResultModal component
function ResultModal({ isOpen, onClose, order, onSuccess, t }) {
  const [formData, setFormData] = useState({
    order_id: order?.id || '',
    result_value: '',
    result_text: '',
    unit: order?.test_unit || '',
    technician_notes: '',
    file_path: ''
  });
  const [loading, setLoading] = useState(false);
  
  // Биохимия uchun maxsus parametrlar
  const [biochemParams, setBiochemParams] = useState([
    { name: 'УМУМИЙ ОКСИЛ', value: '', normalRange: '66-85', unit: 'Г/Л' },
    { name: 'АЛБУМН', value: '', normalRange: '38-51', unit: 'Г/Л' },
    { name: 'ГЛЮКОЗА', value: '', normalRange: '4,2-6,4', unit: 'Ммоль/л' },
    { name: 'АЛТ', value: '', normalRange: '0-40', unit: 'Е/Л' },
    { name: 'АСТ', value: '', normalRange: '0-37', unit: 'Е/Л' },
    { name: 'УМУМИЙ БИЛЛИРУБИН', value: '', normalRange: '5-21', unit: 'Мкмоль/л' },
    { name: 'БОҒЛАНМАГАН БИЛЛИРУБИН', value: '', normalRange: '0-3,4', unit: 'Мкмоль/л' },
    { name: 'БОҒЛАНГАН БИЛЛИРУБИН', value: '', normalRange: '3,4-18,5', unit: 'Мкмоль/л' },
    { name: 'МОЧЕВИНА', value: '', normalRange: '1,7-8,3', unit: 'Ммоль/л' },
    { name: 'КРЕАТИНИН', value: '', normalRange: '53-97', unit: 'Мкмоль/л' },
    { name: 'КАЛИЙ', value: '', normalRange: '3,6-5,3', unit: 'Ммоль/л' },
    { name: 'КАЛЬЦИЙ', value: '', normalRange: '2,02-2,60', unit: 'Ммоль/л' },
    { name: 'ТЕМИР', value: '', normalRange: '6,4-28,6', unit: 'Ммоль/л' },
    { name: 'АЛЬФА-АМИЛАЗА', value: '', normalRange: '28-220', unit: 'Е/Л' },
    { name: 'УМУМИЙ ХОЛЕСТЕРИН', value: '', normalRange: '2,4-5,1', unit: 'Ммоль/л' },
    { name: 'С-РЕАКТИВ ОКСИЛ', value: '', normalRange: 'ОТР', unit: '' },
    { name: 'АНТИСТРЕПТОЛИЗИН-О', value: '', normalRange: 'ОТР', unit: '' },
    { name: 'РЕВМАТОИДЛИ ОМИЛ', value: '', normalRange: 'ОТР', unit: '' },
    { name: 'Ишқорий Фосфатаза', value: '', normalRange: '< 15 yosh<644, 15-17 yosh<483', unit: 'Е/Л' },
    { name: 'МАГНИЙ', value: '', normalRange: '0,8 - 1,0', unit: 'Ммоль/л' }
  ]);

  // Умумий қон таҳлили uchun parametrlar
  const [bloodTestParams, setBloodTestParams] = useState([
    { name: 'WBC\nЛейкоциты', value: '', normalRange: '4,0\n9,0', unit: '10⁹/л' },
    { name: 'LYM#\nЛимфоциты', value: '', normalRange: '0,8\n4,0', unit: '10⁹/л' },
    { name: 'Mon#\nМоноциты', value: '', normalRange: '0,1\n1,2', unit: '10⁹/л' },
    { name: 'Neu#\nНейтрофилы', value: '', normalRange: '2,0\n7,0', unit: '10⁹/л' },
    { name: 'Lym%\nЛимфоциты', value: '', normalRange: '20,0\n40,0', unit: '%' },
    { name: 'Mon%\nМоноциты', value: '', normalRange: '5,0\n10,0', unit: '%' },
    { name: 'Neu%\nНейтрофилы', value: '', normalRange: '50,0\n70,0', unit: '%' },
    { name: 'RBC\nЭритроциты', value: '', normalRange: '3,9\n6,0', unit: '10¹²/л' },
    { name: 'HGB\nГемоглобин (М)', value: '', normalRange: '130,0\n170,0', unit: 'г/л' },
    { name: 'HGB\nГемоглобин (Ж)', value: '', normalRange: '120,0\n150,0', unit: 'г/л' },
    { name: 'HCT\nГематокрит (М)', value: '', normalRange: '42,0\n54,0', unit: '%' },
    { name: 'HCT\nГематокрит (Ж)', value: '', normalRange: '35,0\n45,0', unit: '%' },
    { name: 'MCV\nСредний корпускулярный объём эритроцитов', value: '', normalRange: '80,0\n95,0', unit: 'фл' },
    { name: 'MCH\nСредний эритроцитарный гемоглобин', value: '', normalRange: '26,0\n34,0', unit: 'пг' },
    { name: 'MCHC\nСредняя клеточная концентрация гемоглобина', value: '', normalRange: '300,0\n370,0', unit: 'г/л' },
    { name: 'RDW-CV\nКоэффициент вариации ширины распределения эритроцитов', value: '', normalRange: '11,5\n14,5', unit: '%' },
    { name: 'RDW-SD\nСтандартное отклонение ширины распределения эритроцитов', value: '', normalRange: '35,0\n45,0', unit: 'фл' },
    { name: 'PLT\nЧисло тромбоцитов', value: '', normalRange: '180,0\n320,0', unit: '10⁹/л' },
    { name: 'MPV\nСредний объём тромбоцитов', value: '', normalRange: '7,0\n11,0', unit: 'фл' },
    { name: 'PDW\nШирина распределения тромбоцитов', value: '', normalRange: '10,0\n18,0', unit: '' },
    { name: 'PCT\nТромбокрит', value: '', normalRange: '0,1\n0,4', unit: '%' },
    { name: 'ESR\nСОЭ (М)', value: '', normalRange: '2,0\n10,0', unit: 'мм/час' },
    { name: 'ESR\nСОЭ (Ж)', value: '', normalRange: '2,0\n15,0', unit: 'мм/час' }
  ]);

  // Витамин Д uchun parametr
  const [vitaminDResult, setVitaminDResult] = useState('');

  // TORCH infeksiyasi uchun parametrlar
  const [torchParams, setTorchParams] = useState([
    { name: 'ЦМВ-Цитомегаловирус IgG', value: '', normalRange: '0-0.460\nОП' },
    { name: 'Hsv1/2-Герпес вирус IgG', value: '', normalRange: '0-0.480\nОП' },
    { name: 'Токсоплазма IgG', value: '', normalRange: '5.0-30\nКП' },
    { name: 'Микоплазма IgG', value: '', normalRange: '0-0.360\nОП' },
    { name: 'Уреаплазма IgG', value: '', normalRange: '0-0.354\nОП' },
    { name: 'Хламидия IgG', value: '', normalRange: '0-0.390\nОП' }
  ]);

  // Сийдик таҳлили uchun parametrlar
  const [urineParams, setUrineParams] = useState({
    miqdori: '',
    rangi: '',
    tiniqlik: '',
    nisbiy_zichlik: '',
    reaktsiya: '',
    oqsil: '',
    qand: '',
    epiteliy: '',
    leykotsit: '',
    eritrotsit: '',
    tuzlar: '',
    bakteriya: '',
    shilimshiq: ''
  });

  // Гормон таҳлили uchun parametrlar
  const [hormoneParams, setHormoneParams] = useState([
    { name: 'ПРЛ-Пролактин', value: '', normalRange: 'Женщины 1.2-19.5 нг/мл\nНе беременные женщине 1,5-18,5 нг/мл\nМужчины 1,8-17,0 нг/мл', unit: 'нг/мл' },
    { name: 'Т3 свободный-Трийодтиронин', value: '', normalRange: '1,8-4,2', unit: 'нг/мл' },
    { name: 'Т4 свободный-Тироксин', value: '', normalRange: 'М: 0.8-2.2 мкг/дл\nЖ: 0.7-2.0 мкг/дл', unit: 'мкг/дл' },
    { name: 'ТТГ-Тиреотропный гормон', value: '', normalRange: '0.3-4.0', unit: 'ммл/дл' },
    { name: 'Т3 общий-Трийодтиронин', value: '', normalRange: '0.69-2.02', unit: 'нг/мл' },
    { name: 'Т4 общий-Тироксин', value: '', normalRange: 'М: 4.4-10.8 мкг/дл\nЖ: 4.8-11.6 мкг/дл', unit: 'мкг/дл' },
    { name: 'Анти ТПО-Антитела к тиреопероксидаза', value: '', normalRange: '0-34', unit: 'МЕ/мл' }
  ]);

  // Онкомаркер таҳлили uchun parametrlar
  const [oncomarkerParams, setOncomarkerParams] = useState([
    { name: 'СА-125- рака яичников', value: '', normalRange: 'Муж: 0-35U/ml Жен: 0-35 U/ml\nБер: 1 трим 0-60 U/ml\nБер: 2 трим 0-150 U/ml\nБер: 3-трим 0-200 U/ml\nВ период лактации 0-80 U/ml\n0-28,0 U/ml', unit: '' },
    { name: 'СА-15-3- рака молочная железа', value: '', normalRange: '0-37,0 U/ml', unit: '' },
    { name: 'СА-19-9- рака поджелудочная железа', value: '', normalRange: '0-37,0 U/ml', unit: '' },
    { name: 'СА-72-4- рака желудка', value: '', normalRange: '0-4,0 U/ml', unit: '' },
    { name: 'ПСА- Простатический специфический антиген', value: '', normalRange: 'До 2,6 нг/мл (муж до 40лет)\nДо 4,0 нг/мл (муж старше 40лет)', unit: '' },
    { name: 'РЭА-раковый эмбриональный антиген', value: '', normalRange: '0-4,4 нг/мл ----курящие\n0,2-3,3 нг/мл ---некурящие', unit: '' }
  ]);

  // Коагулограмма uchun parametrlar
  const [coagulogramParams, setCoagulogramParams] = useState([
    { name: 'ПТИ', value: '', normalRange: '80-100', unit: '%' },
    { name: 'ПТВ', value: '', normalRange: '10.8-16.2', unit: 'СЕК' },
    { name: 'МНО', value: '', normalRange: '0.8-1.2', unit: '' },
    { name: 'АЧТВ', value: '', normalRange: '25-41', unit: 'СЕК' },
    { name: 'ФибГ', value: '', normalRange: '2,0-4,0', unit: 'г/л' }
  ]);

  // Липидный спектр uchun parametrlar
  const [lipidParams, setLipidParams] = useState([
    { name: 'Холестерин общий (ТС)', value: '', normalRange: 'Слабо повышенный уровень -5.7ммол/л\nПовышенный уровень -6.7ммол/л', unit: '' },
    { name: 'Холестерин-ЛПВП (HDL)', value: '', normalRange: 'Хороший прогноз- >М 1.42 Ж >1.68\nГруппа низкого риска- М 0.9-1.42\n- Ж 1.16-1.68\nГруппа высокого риска- М <0.9\n- Ж <1.16', unit: '' },
    { name: 'Холестерин-ЛПНП (LDL)', value: '', normalRange: 'Группа низкого риска ИБС- Муж <1.23\n- Жен <1.63\nГруппа высокого риска ИБС- Муж >4.45\n- Жен >4.32', unit: '' },
    { name: 'Холестерин-ЛПОНП', value: '', normalRange: '0.16-1.04ммол/л', unit: '' },
    { name: 'Триглицериды (TG)', value: '', normalRange: 'Рекомендуемый уровен-0.1-1.71\nПограничный уровень- 1.71-2.28', unit: '' }
  ]);

  const isBiochemistry = order?.test_name?.toLowerCase().includes('биохимия') || 
                         order?.test_name?.toLowerCase().includes('biochem');
  
  const isBloodTest = order?.test_name?.toLowerCase().includes('умумий қон') || 
                      order?.test_name?.toLowerCase().includes('қон таҳлили') ||
                      order?.test_name?.toLowerCase().includes('blood');
  
  const isVitaminD = order?.test_name?.toLowerCase().includes('витамин д') || 
                     order?.test_name?.toLowerCase().includes('витамин d') ||
                     order?.test_name?.toLowerCase().includes('vitamin d');
  
  const isTorch = order?.test_name?.toLowerCase().includes('торч') || 
                  order?.test_name?.toLowerCase().includes('torch') ||
                  order?.test_name?.toLowerCase().includes('тorch');
  
  const isUrine = order?.test_name?.toLowerCase().includes('сийдик') || 
                  order?.test_name?.toLowerCase().includes('сиёдик') ||
                  order?.test_name?.toLowerCase().includes('мочи') ||
                  order?.test_name?.toLowerCase().includes('urine');
  
  const isHormone = order?.test_name?.toLowerCase().includes('гормон') || 
                    order?.test_name?.toLowerCase().includes('hormone');
  
  const isOncomarker = order?.test_name?.toLowerCase().includes('онкомаркер') || 
                       order?.test_name?.toLowerCase().includes('oncomarker') ||
                       order?.test_name?.toLowerCase().includes('онко');
  
  const isCoagulogram = order?.test_name?.toLowerCase().includes('коагулограмма') || 
                        order?.test_name?.toLowerCase().includes('коагуло') ||
                        order?.test_name?.toLowerCase().includes('coagulo');
  
  const isLipid = order?.test_name?.toLowerCase().includes('липид') || 
                  order?.test_name?.toLowerCase().includes('lipid');

  const handleBiochemParamChange = (index, value) => {
    const newParams = [...biochemParams];
    newParams[index].value = value;
    setBiochemParams(newParams);
  };

  const handleBloodTestParamChange = (index, value) => {
    const newParams = [...bloodTestParams];
    newParams[index].value = value;
    setBloodTestParams(newParams);
  };

  const handleVitaminDChange = (value) => {
    setVitaminDResult(value);
  };

  const handleTorchParamChange = (index, value) => {
    const newParams = [...torchParams];
    newParams[index].value = value;
    setTorchParams(newParams);
  };

  const handleUrineParamChange = (field, value) => {
    setUrineParams({ ...urineParams, [field]: value });
  };

  const handleHormoneParamChange = (index, value) => {
    const newParams = [...hormoneParams];
    newParams[index].value = value;
    setHormoneParams(newParams);
  };

  const handleOncomarkerParamChange = (index, value) => {
    const newParams = [...oncomarkerParams];
    newParams[index].value = value;
    setOncomarkerParams(newParams);
  };

  const handleCoagulogramParamChange = (index, value) => {
    const newParams = [...coagulogramParams];
    newParams[index].value = value;
    setCoagulogramParams(newParams);
  };

  const handleLipidParamChange = (index, value) => {
    const newParams = [...lipidParams];
    newParams[index].value = value;
    setLipidParams(newParams);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isBiochemistry) {
      // Биохимия uchun
      const hasValues = biochemParams.some(p => p.value.trim() !== '');
      if (!hasValues) {
        toast.error('Kamida bitta parametr qiymatini kiriting');
        return;
      }
    } else if (isBloodTest) {
      // Умумий қон таҳлили uchun
      const hasValues = bloodTestParams.some(p => p.value.trim() !== '');
      if (!hasValues) {
        toast.error('Kamida bitta parametr qiymatini kiriting');
        return;
      }
    } else if (isVitaminD) {
      // Витамин Д uchun
      if (!vitaminDResult.trim()) {
        toast.error('Natijani kiriting');
        return;
      }
    } else if (isTorch) {
      // TORCH uchun
      const hasValues = torchParams.some(p => p.value.trim() !== '');
      if (!hasValues) {
        toast.error('Kamida bitta parametr qiymatini kiriting');
        return;
      }
    } else if (isUrine) {
      // Сийдик таҳлили uchun
      const hasValues = Object.values(urineParams).some(v => v.trim() !== '');
      if (!hasValues) {
        toast.error('Kamida bitta parametr qiymatini kiriting');
        return;
      }
    } else if (isHormone) {
      // Гормон таҳлили uchun
      const hasValues = hormoneParams.some(p => p.value.trim() !== '');
      if (!hasValues) {
        toast.error('Kamida bitta parametr qiymatini kiriting');
        return;
      }
    } else if (isOncomarker) {
      // Онкомаркер таҳлили uchun
      const hasValues = oncomarkerParams.some(p => p.value.trim() !== '');
      if (!hasValues) {
        toast.error('Kamida bitta parametr qiymatini kiriting');
        return;
      }
    } else if (isCoagulogram) {
      // Коагулограмма uchun
      const hasValues = coagulogramParams.some(p => p.value.trim() !== '');
      if (!hasValues) {
        toast.error('Kamida bitta parametr qiymatini kiriting');
        return;
      }
    } else if (isLipid) {
      // Липидный спектр uchun
      const hasValues = lipidParams.some(p => p.value.trim() !== '');
      if (!hasValues) {
        toast.error('Kamida bitta parametr qiymatini kiriting');
        return;
      }
    } else {
      // Oddiy tahlillar uchun
      if (!formData.result_value && !formData.result_text) {
        toast.error('Natijalarni kiriting');
        return;
      }
    }

    try {
      setLoading(true);
      
      if (isBiochemistry) {
        // Биохимия natijalarini yuborish
        const test_results = biochemParams
          .filter(p => p.value.trim() !== '')
          .map(p => ({
            parameter_name: p.name,
            value: p.value,
            unit: p.unit,
            normal_range: p.normalRange,
            is_normal: null
          }));

        await laboratoryService.submitResults(order.id, {
          test_results,
          notes: formData.technician_notes
        });
      } else if (isBloodTest) {
        // Умумий қон таҳлили natijalarini yuborish
        const test_results = bloodTestParams
          .filter(p => p.value.trim() !== '')
          .map(p => ({
            parameter_name: p.name,
            value: p.value,
            unit: p.unit,
            normal_range: p.normalRange,
            is_normal: null
          }));

        await laboratoryService.submitResults(order.id, {
          test_results,
          notes: formData.technician_notes
        });
      } else if (isVitaminD) {
        // Витамин Д natijalarini yuborish
        await laboratoryService.submitResults(order.id, {
          test_results: [{
            parameter_name: '25-OH Vitamin D',
            value: vitaminDResult,
            unit: 'нг/мл',
            normal_range: 'Выраженный дефицит-0,1-9нг/мл\nДостоточный уровень-30-100нг/мл\nУмеренный дефицит-10-29нг/мл\nВозможен токсичуский эффект-101-200нг/мл',
            is_normal: null
          }],
          notes: formData.technician_notes
        });
      } else if (isTorch) {
        // TORCH natijalarini yuborish
        const test_results = torchParams
          .filter(p => p.value.trim() !== '')
          .map(p => ({
            parameter_name: p.name,
            value: p.value,
            unit: '',
            normal_range: p.normalRange,
            is_normal: null
          }));

        await laboratoryService.submitResults(order.id, {
          test_results,
          notes: formData.technician_notes
        });
      } else if (isUrine) {
        // Сийдик таҳлили natijalarini yuborish
        const test_results = [
          { parameter_name: 'Миқдори', value: urineParams.miqdori, unit: 'л/мл', normal_range: '', is_normal: null },
          { parameter_name: 'Ранги', value: urineParams.rangi, unit: '', normal_range: '', is_normal: null },
          { parameter_name: 'Тиниқлиги', value: urineParams.tiniqlik, unit: '', normal_range: '', is_normal: null },
          { parameter_name: 'Нисбий зичлиги', value: urineParams.nisbiy_zichlik, unit: '', normal_range: '', is_normal: null },
          { parameter_name: 'Реакция', value: urineParams.reaktsiya, unit: '', normal_range: '', is_normal: null },
          { parameter_name: 'Оқсил', value: urineParams.oqsil, unit: '', normal_range: '', is_normal: null },
          { parameter_name: 'Қанд', value: urineParams.qand, unit: '', normal_range: '', is_normal: null },
          { parameter_name: 'Эпителий', value: urineParams.epiteliy, unit: '', normal_range: '', is_normal: null },
          { parameter_name: 'Лейкоцит', value: urineParams.leykotsit, unit: '', normal_range: '', is_normal: null },
          { parameter_name: 'Эритроцит', value: urineParams.eritrotsit, unit: '', normal_range: '', is_normal: null },
          { parameter_name: 'Тузлар', value: urineParams.tuzlar, unit: '', normal_range: '', is_normal: null },
          { parameter_name: 'Бактерия', value: urineParams.bakteriya, unit: '', normal_range: '', is_normal: null },
          { parameter_name: 'Шилимшиқ', value: urineParams.shilimshiq, unit: '', normal_range: '', is_normal: null }
        ].filter(p => p.value.trim() !== '');

        await laboratoryService.submitResults(order.id, {
          test_results,
          notes: formData.technician_notes
        });
      } else if (isHormone) {
        // Гормон таҳлили natijalarini yuborish
        const test_results = hormoneParams
          .filter(p => p.value.trim() !== '')
          .map(p => ({
            parameter_name: p.name,
            value: p.value,
            unit: p.unit,
            normal_range: p.normalRange,
            is_normal: null
          }));

        await laboratoryService.submitResults(order.id, {
          test_results,
          notes: formData.technician_notes
        });
      } else if (isOncomarker) {
        // Онкомаркер таҳлили natijalarini yuborish
        const test_results = oncomarkerParams
          .filter(p => p.value.trim() !== '')
          .map(p => ({
            parameter_name: p.name,
            value: p.value,
            unit: p.unit,
            normal_range: p.normalRange,
            is_normal: null
          }));

        await laboratoryService.submitResults(order.id, {
          test_results,
          notes: formData.technician_notes
        });
      } else if (isCoagulogram) {
        // Коагулограмма natijalarini yuborish
        const test_results = coagulogramParams
          .filter(p => p.value.trim() !== '')
          .map(p => ({
            parameter_name: p.name,
            value: p.value,
            unit: p.unit,
            normal_range: p.normalRange,
            is_normal: null
          }));

        await laboratoryService.submitResults(order.id, {
          test_results,
          notes: formData.technician_notes
        });
      } else if (isLipid) {
        // Липидный спектр natijalarini yuborish
        const test_results = lipidParams
          .filter(p => p.value.trim() !== '')
          .map(p => ({
            parameter_name: p.name,
            value: p.value,
            unit: p.unit,
            normal_range: p.normalRange,
            is_normal: null
          }));

        await laboratoryService.submitResults(order.id, {
          test_results,
          notes: formData.technician_notes
        });
      } else {
        // Oddiy tahlil natijalarini yuborish
        await laboratoryService.submitResults(order.id, {
          test_results: [{
            parameter_name: 'Natija',
            value: formData.result_value || formData.result_text,
            unit: formData.unit || '',
            normal_range: '',
            is_normal: null
          }],
          notes: formData.technician_notes
        });
      }

      toast.success('Natija muvaffaqiyatli kiritildi');
      onClose();
      onSuccess();
    } catch (error) {
      toast.error('Xatolik: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl max-w-2xl sm:max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-3 sm:p-4 sm:p-4 sm:p-6 space-y-3 sm:space-y-4 sm:space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between mb-4 sticky top-0 bg-white dark:bg-gray-900 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl sm:text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
              {isBiochemistry ? 'Биохимик таҳлил натижаси' : 
               isBloodTest ? 'Умумий қон таҳлили натижаси' : 
               isVitaminD ? 'Витамин Д натижаси' :
               isTorch ? 'ТОРЧ инфекция натижаси' :
               isUrine ? 'Сийдик таҳлили натижаси' :
               isHormone ? 'Гормон таҳлили натижаси' :
               isOncomarker ? 'Онкомаркер таҳлили натижаси' :
               isCoagulogram ? 'Коагулограмма натижаси' :
               isLipid ? 'Липидный спектр натижаси' :
               t('lab.enterResultTitle')}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex-shrink-0"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Buyurtma ma'lumotlari */}
          <div className="p-3 sm:p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg sm:rounded-lg sm:rounded-xl border border-green-200 dark:border-green-800 overflow-hidden sm:block">
            <p className="font-semibold text-gray-900 dark:text-white break-words">{order?.patient_name}</p>
            <p className="text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400 break-words">{order?.test_name}</p>
            <p className="text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400 break-words">Buyurtma: {order?.order_number}</p>
          </div>

          {isBiochemistry ? (
            /* Биохимия uchun jadval */
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 dark:border-gray-700">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <th className="border border-gray-300 dark:border-gray-700 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 text-left text-sm sm:text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                      №
                    </th>
                    <th className="border border-gray-300 dark:border-gray-700 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 text-left text-sm sm:text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                      ТАҲЛИЛ НОМИ
                    </th>
                    <th className="border border-gray-300 dark:border-gray-700 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 text-left text-sm sm:text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                      НАТИЖА
                    </th>
                    <th className="border border-gray-300 dark:border-gray-700 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 text-left text-sm sm:text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                      МЕ'ЁР
                    </th>
                    <th className="border border-gray-300 dark:border-gray-700 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 text-left text-sm sm:text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                      ЎЛЧОВ БИРЛИГИ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {biochemParams.map((param, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="border border-gray-300 dark:border-gray-700 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 text-sm sm:text-sm sm:text-base text-gray-900 dark:text-white">
                        {index + 1}.
                      </td>
                      <td className="border border-gray-300 dark:border-gray-700 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 text-sm sm:text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                        {param.name}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-700 px-2 py-2 sm:py-2.5">
                        <input
                          type="text"
                          value={param.value}
                          onChange={(e) => handleBiochemParamChange(index, e.target.value)}
                          className="w-full px-3 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-sm sm:text-base"
                          placeholder="Қиймат"
                        />
                      </td>
                      <td className="border border-gray-300 dark:border-gray-700 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 text-sm sm:text-sm sm:text-base text-blue-600 dark:text-blue-400 font-medium whitespace-pre-line">
                        {param.normalRange}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-700 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 text-sm sm:text-sm sm:text-base text-blue-600 dark:text-blue-400 font-medium">
                        {param.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : isBloodTest ? (
            /* Умумий қон таҳлили uchun jadval */
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 dark:border-gray-700">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <th className="border border-gray-300 dark:border-gray-700 px-2 py-2 sm:py-2.5 text-center text-sm sm:text-sm sm:text-base font-bold text-red-600 dark:text-red-400">
                      Показатель
                    </th>
                    <th className="border border-gray-300 dark:border-gray-700 px-2 py-2 sm:py-2.5 text-center text-sm sm:text-sm sm:text-base font-bold text-red-600 dark:text-red-400">
                      Результат
                    </th>
                    <th className="border border-gray-300 dark:border-gray-700 px-2 py-2 sm:py-2.5 text-center text-sm sm:text-sm sm:text-base font-bold text-red-600 dark:text-red-400">
                      Норма<br/>Erkak | Ayol
                    </th>
                    <th className="border border-gray-300 dark:border-gray-700 px-2 py-2 sm:py-2.5 text-center text-sm sm:text-sm sm:text-base font-bold text-red-600 dark:text-red-400">
                      Единица<br/>измерения
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bloodTestParams.map((param, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 sm:py-2.5 text-sm sm:text-sm sm:text-base font-semibold text-gray-900 dark:text-white whitespace-pre-line">
                        {param.name}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-700 px-2 py-2 sm:py-2.5">
                        <input
                          type="text"
                          value={param.value}
                          onChange={(e) => handleBloodTestParamChange(index, e.target.value)}
                          className="w-full px-3 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-sm sm:text-base text-center"
                          placeholder="—"
                        />
                      </td>
                      <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 sm:py-2.5 text-sm sm:text-sm sm:text-base text-blue-600 dark:text-blue-400 font-semibold text-center whitespace-pre-line">
                        {param.normalRange}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 sm:py-2.5 text-sm sm:text-sm sm:text-base text-blue-600 dark:text-blue-400 font-semibold text-center">
                        {param.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : isVitaminD ? (
            /* Витамин Д uchun jadval */
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border-2 border-gray-800">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <th className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-sm sm:text-sm sm:text-base font-bold text-yellow-600 dark:text-yellow-400">
                      Наименивование анализа
                    </th>
                    <th className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-sm sm:text-sm sm:text-base font-bold text-yellow-600 dark:text-yellow-400">
                      Результат
                    </th>
                    <th className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-sm sm:text-sm sm:text-base font-bold text-yellow-600 dark:text-yellow-400">
                      Норма
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center font-bold text-gray-900 dark:text-white">
                      25-OH Vitamin D
                    </td>
                    <td className="border-2 border-gray-800 px-3 py-2 sm:py-3">
                      <input
                        type="text"
                        value={vitaminDResult}
                        onChange={(e) => handleVitaminDChange(e.target.value)}
                        className="w-full px-3 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-primary text-center font-semibold"
                        placeholder="Natijani kiriting"
                      />
                    </td>
                    <td className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-sm sm:text-sm sm:text-base text-blue-600 dark:text-blue-400 font-semibold">
                      <div className="space-y-1">
                        <p>Выраженный дефицит-<span className="font-bold">0,1-9нг/мл</span></p>
                        <p>Достоточный уровень-<span className="font-bold">30-100нг/мл</span></p>
                        <p>Умеренный дефицит-<span className="font-bold">10-29нг/мл</span></p>
                        <p>Возможен токсичуский эффект-<span className="font-bold">101-200нг/мл</span></p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : isTorch ? (
            /* TORCH infeksiyasi uchun jadval */
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border-2 border-gray-800">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <th className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-sm sm:text-sm sm:text-base font-bold text-purple-600 dark:text-purple-400">
                      Наименивование анализа
                    </th>
                    <th className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-sm sm:text-sm sm:text-base font-bold text-purple-600 dark:text-purple-400">
                      Результат
                    </th>
                    <th className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-sm sm:text-sm sm:text-base font-bold text-purple-600 dark:text-purple-400">
                      Норма(ОП)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {torchParams.map((param, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-left font-bold text-gray-900 dark:text-white italic">
                        {param.name}
                      </td>
                      <td className="border-2 border-gray-800 px-3 py-2 sm:py-3">
                        <input
                          type="text"
                          value={param.value}
                          onChange={(e) => handleTorchParamChange(index, e.target.value)}
                          className="w-full px-3 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-primary text-center font-semibold"
                          placeholder="—"
                        />
                      </td>
                      <td className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-blue-600 dark:text-blue-400 font-semibold whitespace-pre-line">
                        {param.normalRange}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : isUrine ? (
            /* Сийдик таҳлили uchun forma */
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-4 rounded-lg sm:rounded-lg sm:rounded-xl">
                <h3 className="font-bold text-base sm:text-lg mb-3 text-blue-800 dark:text-blue-400">ФИЗИК-КИМЁВИЙ ХОССАСИ</h3>
                <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm sm:text-sm sm:text-base font-semibold mb-1">Миқдори (л/мл)</label>
                    <input
                      type="text"
                      value={urineParams.miqdori}
                      onChange={(e) => handleUrineParamChange('miqdori', e.target.value)}
                      className="w-full px-3 py-2 sm:py-2.5 border rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-sm sm:text-base font-semibold mb-1">Ранги</label>
                    <input
                      type="text"
                      value={urineParams.rangi}
                      onChange={(e) => handleUrineParamChange('rangi', e.target.value)}
                      className="w-full px-3 py-2 sm:py-2.5 border rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-sm sm:text-base font-semibold mb-1">Тиниқлиги</label>
                    <input
                      type="text"
                      value={urineParams.tiniqlik}
                      onChange={(e) => handleUrineParamChange('tiniqlik', e.target.value)}
                      className="w-full px-3 py-2 sm:py-2.5 border rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-sm sm:text-base font-semibold mb-1">Нисбий зичлиги</label>
                    <input
                      type="text"
                      value={urineParams.nisbiy_zichlik}
                      onChange={(e) => handleUrineParamChange('nisbiy_zichlik', e.target.value)}
                      className="w-full px-3 py-2 sm:py-2.5 border rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-sm sm:text-base font-semibold mb-1">Реакция</label>
                    <input
                      type="text"
                      value={urineParams.reaktsiya}
                      onChange={(e) => handleUrineParamChange('reaktsiya', e.target.value)}
                      className="w-full px-3 py-2 sm:py-2.5 border rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="—"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 p-3 sm:p-4 rounded-lg sm:rounded-lg sm:rounded-xl">
                <h3 className="font-bold text-base sm:text-lg mb-3 text-green-800 dark:text-green-400">МИКРОСКОПИЯ</h3>
                <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm sm:text-sm sm:text-base font-semibold mb-1">Оқсил</label>
                    <input
                      type="text"
                      value={urineParams.oqsil}
                      onChange={(e) => handleUrineParamChange('oqsil', e.target.value)}
                      className="w-full px-3 py-2 sm:py-2.5 border rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-sm sm:text-base font-semibold mb-1">Қанд</label>
                    <input
                      type="text"
                      value={urineParams.qand}
                      onChange={(e) => handleUrineParamChange('qand', e.target.value)}
                      className="w-full px-3 py-2 sm:py-2.5 border rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-sm sm:text-base font-semibold mb-1">Эпителий</label>
                    <input
                      type="text"
                      value={urineParams.epiteliy}
                      onChange={(e) => handleUrineParamChange('epiteliy', e.target.value)}
                      className="w-full px-3 py-2 sm:py-2.5 border rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-sm sm:text-base font-semibold mb-1">Лейкоцит</label>
                    <input
                      type="text"
                      value={urineParams.leykotsit}
                      onChange={(e) => handleUrineParamChange('leykotsit', e.target.value)}
                      className="w-full px-3 py-2 sm:py-2.5 border rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-sm sm:text-base font-semibold mb-1">Эритроцит</label>
                    <input
                      type="text"
                      value={urineParams.eritrotsit}
                      onChange={(e) => handleUrineParamChange('eritrotsit', e.target.value)}
                      className="w-full px-3 py-2 sm:py-2.5 border rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-sm sm:text-base font-semibold mb-1">Тузлар</label>
                    <input
                      type="text"
                      value={urineParams.tuzlar}
                      onChange={(e) => handleUrineParamChange('tuzlar', e.target.value)}
                      className="w-full px-3 py-2 sm:py-2.5 border rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-sm sm:text-base font-semibold mb-1">Бактерия</label>
                    <input
                      type="text"
                      value={urineParams.bakteriya}
                      onChange={(e) => handleUrineParamChange('bakteriya', e.target.value)}
                      className="w-full px-3 py-2 sm:py-2.5 border rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-sm sm:text-base font-semibold mb-1">Шилимшиқ</label>
                    <input
                      type="text"
                      value={urineParams.shilimshiq}
                      onChange={(e) => handleUrineParamChange('shilimshiq', e.target.value)}
                      className="w-full px-3 py-2 sm:py-2.5 border rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="—"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : isHormone ? (
            /* Гормон таҳлили uchun jadval */
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border-2 border-gray-800">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <th className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-sm sm:text-sm sm:text-base font-bold text-orange-600 dark:text-orange-400">
                      Наименивование анализа
                    </th>
                    <th className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-sm sm:text-sm sm:text-base font-bold text-orange-600 dark:text-orange-400">
                      Результат
                    </th>
                    <th className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-sm sm:text-sm sm:text-base font-bold text-orange-600 dark:text-orange-400">
                      Норма
                    </th>
                    <th className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-sm sm:text-sm sm:text-base font-bold text-orange-600 dark:text-orange-400">
                      Единица измерения
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {hormoneParams.map((param, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-left font-bold text-gray-900 dark:text-white">
                        {param.name}
                      </td>
                      <td className="border-2 border-gray-800 px-3 py-2 sm:py-3">
                        <input
                          type="text"
                          value={param.value}
                          onChange={(e) => handleHormoneParamChange(index, e.target.value)}
                          className="w-full px-3 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-primary text-center font-semibold"
                          placeholder="—"
                        />
                      </td>
                      <td className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-blue-600 dark:text-blue-400 font-semibold whitespace-pre-line">
                        {param.normalRange}
                      </td>
                      <td className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-blue-600 dark:text-blue-400 font-semibold">
                        {param.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : isOncomarker ? (
            /* Онкомаркер таҳлили uchun jadval */
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border-2 border-gray-800">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <th className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-sm sm:text-sm sm:text-base font-bold text-red-600 dark:text-red-400">
                      Наименивование анализа
                    </th>
                    <th className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-sm sm:text-sm sm:text-base font-bold text-red-600 dark:text-red-400">
                      Результат
                    </th>
                    <th className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-sm sm:text-sm sm:text-base font-bold text-red-600 dark:text-red-400">
                      Норма
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {oncomarkerParams.map((param, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-left font-bold text-gray-900 dark:text-white">
                        {param.name}
                      </td>
                      <td className="border-2 border-gray-800 px-3 py-2 sm:py-3">
                        <input
                          type="text"
                          value={param.value}
                          onChange={(e) => handleOncomarkerParamChange(index, e.target.value)}
                          className="w-full px-3 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-primary text-center font-semibold"
                          placeholder="—"
                        />
                      </td>
                      <td className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-blue-600 dark:text-blue-400 font-semibold whitespace-pre-line text-sm sm:text-sm sm:text-base">
                        {param.normalRange}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : isCoagulogram ? (
            /* Коагулограмма uchun jadval */
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border-2 border-gray-800">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <th className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-sm sm:text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                      Таҳлил номи
                    </th>
                    <th className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-sm sm:text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                      Натижа
                    </th>
                    <th className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-sm sm:text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                      Норма
                    </th>
                    <th className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-sm sm:text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                      Ўлчов бирлиги
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {coagulogramParams.map((param, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center font-bold text-gray-900 dark:text-white">
                        {param.name}
                      </td>
                      <td className="border-2 border-gray-800 px-3 py-2 sm:py-3">
                        <input
                          type="text"
                          value={param.value}
                          onChange={(e) => handleCoagulogramParamChange(index, e.target.value)}
                          className="w-full px-3 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-primary text-center font-semibold"
                          placeholder="—"
                        />
                      </td>
                      <td className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-blue-600 dark:text-blue-400 font-semibold">
                        {param.normalRange}
                      </td>
                      <td className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-blue-600 dark:text-blue-400 font-semibold">
                        {param.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : isLipid ? (
            /* Липидный спектр uchun jadval */
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border-2 border-gray-800">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <th className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-sm sm:text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                      Показатель
                    </th>
                    <th className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-sm sm:text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                      Результат
                    </th>
                    <th className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-center text-sm sm:text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                      Норма
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lipidParams.map((param, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-left font-bold text-gray-900 dark:text-white">
                        {param.name}
                      </td>
                      <td className="border-2 border-gray-800 px-3 py-2 sm:py-3">
                        <input
                          type="text"
                          value={param.value}
                          onChange={(e) => handleLipidParamChange(index, e.target.value)}
                          className="w-full px-3 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-primary text-center font-semibold"
                          placeholder="—"
                        />
                      </td>
                      <td className="border-2 border-gray-800 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-left text-blue-600 dark:text-blue-400 font-semibold whitespace-pre-line text-sm sm:text-sm sm:text-base">
                        {param.normalRange}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Oddiy tahlillar uchun textarea */
            <div>
              <label className="block text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Natija *
              </label>
              <textarea
                value={formData.result_text}
                onChange={(e) => setFormData({ ...formData, result_text: e.target.value })}
                rows="12"
                className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono text-sm sm:text-sm sm:text-base"
                placeholder="Natijalarni kiriting..."
                required
              />
            </div>
          )}

          {/* Izohlar */}
          <div>
            <label className="block text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Изоҳлар
            </label>
            <textarea
              value={formData.technician_notes}
              onChange={(e) => setFormData({ ...formData, technician_notes: e.target.value })}
              rows="3"
              className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm sm:text-sm sm:text-base"
              placeholder="Қўшимча изоҳлар..."
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 sm:py-2 sm:py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg sm:rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 text-sm sm:text-sm sm:text-base"
            >
              Бекор қилиш
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:flex-1 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 sm:py-2 sm:py-3 bg-primary text-white rounded-lg sm:rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 text-sm sm:text-sm sm:text-base"
            >
              {loading ? 'Юкланмоқда...' : 'Натижани юбориш'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
