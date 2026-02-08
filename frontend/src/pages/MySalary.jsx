/**
 * MY SALARY PAGE
 * Xodimlar uchun o'z maoshlarini ko'rish sahifasi
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import staffSalaryService from '../services/staffSalaryService';
import toast, { Toaster } from 'react-hot-toast';

export default function MySalary() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data
  const [salaryData, setSalaryData] = useState(null);
  const [bonusesData, setBonusesData] = useState(null);
  const [commissionsData, setCommissionsData] = useState(null);
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'commissions') {
      loadCommissions();
    }
  }, [activeTab, selectedMonth, selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [salaryResponse, bonusesResponse] = await Promise.all([
        staffSalaryService.getMySalary(),
        staffSalaryService.getMyBonuses()
      ]);

      console.log('💰 Salary response:', salaryResponse);
      console.log('🎁 Bonuses response:', bonusesResponse);

      if (salaryResponse.success) {
        setSalaryData(salaryResponse.data);
      }

      if (bonusesResponse.success) {
        console.log('📋 Setting bonuses data:', bonusesResponse.data);
        console.log('📋 Penalties count:', bonusesResponse.data.penalties?.length);
        console.log('📋 Penalties:', bonusesResponse.data.penalties);
        setBonusesData(bonusesResponse.data);
      }

    } catch (error) {
      console.error('Load data error:', error);
      toast.error('Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const loadCommissions = async () => {
    try {
      const response = await staffSalaryService.getMyCommissions(selectedMonth, selectedYear);
      if (response.success) {
        setCommissionsData(response.data);
      }
    } catch (error) {
      console.error('Load commissions error:', error);
      toast.error('Komissiyalarni yuklashda xatolik');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ').format(amount || 0) + ' so\'m';
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getMonthName = (month) => {
    const months = [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
    ];
    return months[month - 1];
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

  if (!salaryData) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">Maosh ma'lumotlari topilmadi</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black">MENING MAOSHIM</h1>
            <p className="text-lg opacity-90 mt-1">
              {salaryData.staff.firstName} {salaryData.staff.lastName}
            </p>
            <p className="text-sm opacity-75">{salaryData.staff.role}</p>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined">refresh</span>
            Yangilash
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Base Salary */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-12 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">payments</span>
            </div>
            <div>
              <p className="text-sm opacity-90">Asosiy Maosh</p>
              <p className="text-2xl font-black">{formatCurrency(salaryData.currentSalary.baseSalary)}</p>
            </div>
          </div>
          <div className="text-xs opacity-75 mt-2">
            {salaryData.currentSalary.effectiveFrom && 
              `${formatDate(salaryData.currentSalary.effectiveFrom)} dan`
            }
          </div>
        </div>

        {/* This Month */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-12 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">calendar_month</span>
            </div>
            <div>
              <p className="text-sm opacity-90">Shu Oy</p>
              <p className="text-2xl font-black">{formatCurrency(salaryData.thisMonth.total)}</p>
            </div>
          </div>
          <div className="text-xs opacity-75 mt-2">
            {getMonthName(new Date().getMonth() + 1)} {new Date().getFullYear()}
          </div>
        </div>

        {/* Average Salary */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-12 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">trending_up</span>
            </div>
            <div>
              <p className="text-sm opacity-90">O'rtacha Maosh</p>
              <p className="text-2xl font-black">{formatCurrency(salaryData.statistics.averageSalary)}</p>
            </div>
          </div>
          <div className="text-xs opacity-75 mt-2">
            {salaryData.statistics.monthsWorked} oylik o'rtacha
          </div>
        </div>

        {/* Total Earned */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-12 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
            </div>
            <div>
              <p className="text-sm opacity-90">Jami Olgan</p>
              <p className="text-2xl font-black">{formatCurrency(salaryData.statistics.totalEarned)}</p>
            </div>
          </div>
          <div className="text-xs opacity-75 mt-2">
            {salaryData.statistics.lastPayment && 
              `Oxirgi: ${formatDate(salaryData.statistics.lastPayment.payment_date)}`
            }
          </div>
        </div>
      </div>

      {/* Next Payment Info */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 rounded-xl p-6 border-2 border-green-200 dark:border-green-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-16 bg-green-500 rounded-xl flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-3xl">event</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Keyingi To'lov</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{formatDate(salaryData.nextPayment.date)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Taxminiy: {formatCurrency(salaryData.nextPayment.estimatedAmount)}
              </p>
            </div>
          </div>
          <div className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold">
            {salaryData.nextPayment.status === 'paid' ? '✓ To\'langan' : '⏳ Kutilmoqda'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-800">
          <div className="flex gap-2 px-4 overflow-x-auto scrollbar-hide">
            {[
              { id: 'overview', label: 'Umumiy', icon: 'dashboard' },
              { id: 'history', label: 'Tarix', icon: 'history' },
              { id: 'bonuses', label: 'Bonuslar', icon: 'star' },
              { id: 'commissions', label: 'Komissiyalar', icon: 'percent' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold">Shu Oylik Tafsilotlar</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Asosiy Maosh</span>
                    <span className="font-bold text-lg">{formatCurrency(salaryData.thisMonth.baseSalary)}</span>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Komissiyalar</span>
                    <span className="font-bold text-lg text-green-600 dark:text-green-400">
                      +{formatCurrency(salaryData.thisMonth.commissions)}
                    </span>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Bonuslar</span>
                    <span className="font-bold text-lg text-green-600 dark:text-green-400">
                      +{formatCurrency(salaryData.thisMonth.bonuses)}
                    </span>
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Jarima</span>
                    <span className="font-bold text-lg text-red-600 dark:text-red-400">
                      -{formatCurrency(salaryData.thisMonth.penalties)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">JAMI</p>
                    <p className="text-3xl font-black">{formatCurrency(salaryData.thisMonth.total)}</p>
                  </div>
                  <span className="material-symbols-outlined text-5xl opacity-50">account_balance</span>
                </div>
              </div>

              {/* Work Statistics */}
              <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined">bar_chart</span>
                  Ish Statistikasi
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-3xl font-black text-green-600 dark:text-green-400">
                      {salaryData.statistics.monthsWorked}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Ish Oylari</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-3xl font-black text-green-600 dark:text-green-400">
                      {salaryData.history.filter(h => h.payment_status === 'paid').length}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">To'langan</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-3xl font-black text-yellow-600 dark:text-yellow-400">
                      {salaryData.history.filter(h => h.payment_status === 'pending').length}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Kutilmoqda</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="text-3xl font-black text-purple-600 dark:text-purple-400">
                      {Math.round((salaryData.statistics.totalEarned / (salaryData.statistics.monthsWorked || 1)) / 1000)}K
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">O'rtacha/Oy</p>
                  </div>
                </div>
              </div>

              {/* Salary Growth Chart */}
              {salaryData.history.length > 0 && (
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6">
                  <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined">show_chart</span>
                    Maosh O'sishi (Oxirgi 6 Oy)
                  </h4>
                  <div className="space-y-3">
                    {salaryData.history.slice(0, 6).reverse().map((record, index) => {
                      const maxSalary = Math.max(...salaryData.history.slice(0, 6).map(r => parseFloat(r.total_salary)));
                      const percentage = (parseFloat(record.total_salary) / maxSalary) * 100;
                      return (
                        <div key={index}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-semibold">{getMonthName(record.month)} {record.year}</span>
                            <span className="font-bold text-primary">{formatCurrency(record.total_salary)}</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-green-500 to-teal-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Maosh Tarixi</h3>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Jami: {salaryData.history.length} oy
                </div>
              </div>
              
              {salaryData.history.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700">history</span>
                  <p className="text-gray-500 dark:text-gray-400 mt-4">Tarix mavjud emas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {salaryData.history.map((record, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-4">
                          <div className={`size-12 rounded-lg flex items-center justify-center ${
                            record.payment_status === 'paid' 
                              ? 'bg-green-100 dark:bg-green-900/30' 
                              : 'bg-yellow-100 dark:bg-yellow-900/30'
                          }`}>
                            <span className={`material-symbols-outlined ${
                              record.payment_status === 'paid' 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-yellow-600 dark:text-yellow-400'
                            }`}>
                              {record.payment_status === 'paid' ? 'check_circle' : 'schedule'}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-lg">{getMonthName(record.month)} {record.year}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {record.payment_status === 'paid' ? '✓ To\'langan' : '⏳ Kutilmoqda'}
                              {record.payment_date && ` • ${formatDate(record.payment_date)}`}
                            </p>
                            {record.payment_method && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {record.payment_method === 'bank_transfer' ? '🏦 Bank o\'tkazmasi' : 
                                 record.payment_method === 'cash' ? '💵 Naqd' : 
                                 record.payment_method === 'card' ? '💳 Karta' : record.payment_method}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-primary">{formatCurrency(record.total_salary)}</p>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                            <p>Asosiy: {formatCurrency(record.base_salary)}</p>
                            {parseFloat(record.service_commissions || 0) > 0 && (
                              <p className="text-green-600 dark:text-green-400">
                                +Komissiya: {formatCurrency(record.service_commissions)}
                              </p>
                            )}
                            {parseFloat(record.other_bonuses || 0) > 0 && (
                              <p className="text-green-600 dark:text-green-400">
                                +Bonus: {formatCurrency(record.other_bonuses)}
                              </p>
                            )}
                            {parseFloat(record.penalties || 0) > 0 && (
                              <p className="text-red-600 dark:text-red-400">
                                -Jarima: {formatCurrency(record.penalties)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bonuses Tab */}
          {activeTab === 'bonuses' && bonusesData && (
            <div className="space-y-6">
              {/* Bonuses */}
              <div>
                <h3 className="text-xl font-bold mb-4">Bonuslar</h3>
                {bonusesData.bonuses.length === 0 ? (
                  <p className="text-center py-8 text-gray-500 dark:text-gray-400">Bonuslar yo'q</p>
                ) : (
                  <div className="space-y-2">
                    {bonusesData.bonuses.map(bonus => (
                      <div key={bonus.id} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold">{bonus.bonus_type}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{bonus.reason}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatDate(bonus.bonus_date)}</p>
                          </div>
                          <p className="text-xl font-bold text-green-600 dark:text-green-400">
                            +{formatCurrency(bonus.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Penalties - Pending */}
              {bonusesData.penalties.filter(p => p.status === 'pending').length > 0 && (
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span>Tasdiqlash Kutilmoqda</span>
                    <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-sm rounded-full">
                      {bonusesData.penalties.filter(p => p.status === 'pending').length}
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {bonusesData.penalties
                      .filter(p => p.status === 'pending')
                      .map(penalty => (
                        <div key={penalty.id} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold">{penalty.penalty_type}</p>
                                <span className="px-2 py-0.5 bg-yellow-200 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 text-xs rounded-full font-semibold">
                                  ⏳ Kutilmoqda
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{penalty.reason}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDate(penalty.penalty_date)} • {getMonthName(penalty.month)} {penalty.year}
                              </p>
                            </div>
                            <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                              -{formatCurrency(penalty.amount)}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Penalties - Approved */}
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span>Tasdiqlangan Jarimalar</span>
                  {bonusesData.penalties.filter(p => p.status === 'approved').length > 0 && (
                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-full">
                      {bonusesData.penalties.filter(p => p.status === 'approved').length}
                    </span>
                  )}
                </h3>
                {bonusesData.penalties.filter(p => p.status === 'approved').length === 0 ? (
                  <p className="text-center py-8 text-gray-500 dark:text-gray-400">Tasdiqlangan jarimalar yo'q</p>
                ) : (
                  <div className="space-y-2">
                    {bonusesData.penalties
                      .filter(p => p.status === 'approved')
                      .map(penalty => (
                        <div key={penalty.id} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold">{penalty.penalty_type}</p>
                                <span className="px-2 py-0.5 bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300 text-xs rounded-full font-semibold">
                                  ✓ Tasdiqlangan
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{penalty.reason}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDate(penalty.penalty_date)} • {getMonthName(penalty.month)} {penalty.year}
                              </p>
                            </div>
                            <p className="text-xl font-bold text-red-600 dark:text-red-400">
                              -{formatCurrency(penalty.amount)}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Commissions Tab */}
          {activeTab === 'commissions' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h3 className="text-xl font-bold">Komissiyalar</h3>
                <div className="flex gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>{getMonthName(month)}</option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              {commissionsData && (
                <>
                  <div className="bg-gradient-to-r from-purple-500 to-green-500 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Jami Komissiya</p>
                        <p className="text-3xl font-black">{formatCurrency(commissionsData.total)}</p>
                        <p className="text-sm opacity-75 mt-1">{commissionsData.count} ta xizmat</p>
                      </div>
                      <span className="material-symbols-outlined text-5xl opacity-50">percent</span>
                    </div>
                  </div>

                  {commissionsData.records.length === 0 ? (
                    <p className="text-center py-12 text-gray-500 dark:text-gray-400">Komissiyalar yo'q</p>
                  ) : (
                    <div className="space-y-2">
                      {commissionsData.records.map(record => (
                        <div key={record.id} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold">{record.service_name}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Xizmat summasi: {formatCurrency(record.service_amount)}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">{formatDate(record.service_date)}</p>
                            </div>
                            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                              {formatCurrency(record.commission_earned)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
