import { useState, useEffect } from 'react';
import payrollService from '../services/payrollService';
import staffService from '../services/staffService';
import toast, { Toaster } from 'react-hot-toast';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function PayrollManagement() {
  const [activeTab, setActiveTab] = useState('staff'); // 'monthly' o'rniga 'staff' default
  const [loading, setLoading] = useState(false);
  
  // Role translation function
  const getRoleNameUz = (role) => {
    const roleMap = {
      'admin': 'Administrator',
      'doctor': 'Shifokor',
      'nurse': 'Hamshira',
      'laborant': 'Laborant',
      'pharmacist': 'Dorixona',
      'sanitar': 'Tozalovchi'
    };
    return roleMap[role] || role;
  };
  
  // Monthly payroll
  const [monthlyPayroll, setMonthlyPayroll] = useState([]);
  const [payrollStats, setPayrollStats] = useState({
    totalStaff: 0,
    totalSalary: 0,
    totalBonusesCount: 0,
    totalPenaltiesCount: 0
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Staff salaries
  const [staffSalaries, setStaffSalaries] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  
  // Bonuses, Penalties
  const [bonuses, setBonuses] = useState([]);
  const [penalties, setPenalties] = useState([]);
  
  // Modals
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [payrollDetails, setPayrollDetails] = useState(null);
  const [editingSalary, setEditingSalary] = useState(null);

  useEffect(() => {
    loadData();
  }, [activeTab, selectedMonth, selectedYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'monthly') {
        const data = await payrollService.getMonthlyPayroll({
          month: selectedMonth,
          year: selectedYear
        });
        if (data.success) {
          setMonthlyPayroll(data.data);
          if (data.statistics) {
            setPayrollStats(data.statistics);
          }
        }
      } else if (activeTab === 'staff') {
        const [salariesData, staffData] = await Promise.all([
          payrollService.getStaffSalaries(),
          staffService.getStaff()
        ]);
        if (salariesData.success) {
          const salariesWithRoleNames = salariesData.data.map(s => ({
            ...s,
            role_name: getRoleNameUz(s.role),
            commission_type: s.calculation_type === 'per_room' ? 'fixed' : 
                           s.calculation_type === 'commission' ? 'percentage' : 'fixed',
            commission_value: s.calculation_type === 'per_room' ? s.room_cleaning_rate :
                            s.calculation_type === 'commission' ? s.commission_rate : s.base_salary
          }));
          setStaffSalaries(salariesWithRoleNames);
        }
        if (staffData.success) {
          const staffWithRoleNames = staffData.data.map(s => ({
            ...s,
            role_name: getRoleNameUz(s.role)
          }));
          setAllStaff(staffWithRoleNames);
        }
      } else if (activeTab === 'bonuses') {
        const [bonusesData, staffData] = await Promise.all([
          payrollService.getBonuses(),
          staffService.getStaff()
        ]);
        if (bonusesData.success) setBonuses(bonusesData.data);
        if (staffData.success) setAllStaff(staffData.data);
      } else if (activeTab === 'penalties') {
        const [penaltiesData, staffData] = await Promise.all([
          payrollService.getPenalties(),
          staffService.getStaff()
        ]);
        if (penaltiesData.success) setPenalties(penaltiesData.data);
        if (staffData.success) setAllStaff(staffData.data);
      }
    } catch (error) {
      console.error('Load error:', error);
      toast.error('Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateMonthly = async () => {
    if (!confirm(`${selectedMonth}/${selectedYear} uchun maoshlarni hisoblashni xohlaysizmi?`)) return;
    
    setLoading(true);
    try {
      const response = await payrollService.calculateMonthly({
        month: selectedMonth,
        year: selectedYear
      });
      
      if (response.success) {
        toast.success(response.message);
        loadData();
      }
    } catch (error) {
      console.error('Calculate error:', error);
      toast.error('Hisoblashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!confirm('Maoshni tasdiqlaysizmi?')) return;
    
    try {
      const response = await payrollService.approvePayroll(id);
      if (response.success) {
        toast.success('Tasdiqlandi');
        loadData();
      }
    } catch (error) {
      toast.error('Xatolik yuz berdi');
    }
  };

  const handlePay = async (payroll) => {
    setSelectedPayroll(payroll);
    setShowPayModal(true);
  };

  const handleViewDetails = async (payroll) => {
    setLoading(true);
    try {
      const response = await payrollService.getStaffDetails(
        payroll.staff_id,
        payroll.month,
        payroll.year
      );
      
      if (response.success) {
        setPayrollDetails(response.data);
        setShowDetailsModal(true);
      }
    } catch (error) {
      toast.error('Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSalary = (staff) => {
    setEditingSalary(staff);
    // Load staff if not loaded
    if (allStaff.length === 0) {
      loadStaffData();
    }
    setShowSalaryModal(true);
  };

  const loadStaffData = async () => {
    try {
      const staffData = await staffService.getStaff();
      if (staffData.success) {
        const staffWithRoleNames = staffData.data.map(s => ({
          ...s,
          role_name: getRoleNameUz(s.role)
        }));
        setAllStaff(staffWithRoleNames);
      }
    } catch (error) {
      console.error('❌ Load staff error:', error);
      toast.error('Xodimlarni yuklashda xatolik');
    }
  };

  const handleDeleteSalary = async (staff) => {
    if (!confirm(`${staff.staff_name} ning maoshini o'chirmoqchimisiz?`)) return;
    
    try {
      const response = await payrollService.deleteStaffSalary(staff.id);
      if (response.success) {
        toast.success('Maosh o\'chirildi');
        loadData();
      }
    } catch (error) {
      toast.error('Xatolik yuz berdi');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
      approved: 'bg-green-100 text-green-700 ring-1 ring-green-200',
      paid: 'bg-green-100 text-green-700 ring-1 ring-green-200'
    };
    const labels = {
      draft: 'Qoralama',
      approved: 'Tasdiqlangan',
      paid: 'To\'langan'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getBonusTypeLabel = (type) => {
    const labels = {
      performance: 'Ish samaradorligi',
      achievement: 'Yutuq',
      holiday: 'Bayram',
      other: 'Boshqa'
    };
    return labels[type] || type;
  };

  const getPenaltyTypeLabel = (type) => {
    const labels = {
      late: 'Kechikish',
      absence: 'Kelmaslik',
      violation: 'Qoidabuzarlik',
      other: 'Boshqa'
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-green-600 to-green-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="size-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center ring-4 ring-white/30">
              <span className="material-symbols-outlined text-6xl">payments</span>
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight">MAOSHLAR TIZIMI</h1>
              <p className="text-xl opacity-95 mt-1">Xodimlar ish haqi boshqaruvi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2 px-6 overflow-x-auto">
            {[
              // { id: 'monthly', label: 'Oylik maoshlar', icon: 'calendar_month', color: 'purple' }, // YASHIRILGAN
              { id: 'staff', label: 'Xodimlar maoshi', icon: 'badge', color: 'indigo' },
              { id: 'bonuses', label: 'Bonuslar', icon: 'star', color: 'green' },
              { id: 'penalties', label: 'Jarimalar', icon: 'warning', color: 'red' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-bold border-b-4 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? `border-${tab.color}-500 text-${tab.color}-600 bg-${tab.color}-50`
                    : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:bg-gray-700'
                }`}
              >
                <span className="material-symbols-outlined text-2xl">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-8">
          {/* OYLIK MAOSHLAR */}
          {activeTab === 'monthly' && (
            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="size-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl">group</span>
                    </div>
                    <span className="text-4xl font-black">{payrollStats.totalStaff}</span>
                  </div>
                  <p className="text-sm font-bold opacity-90">Jami xodimlar</p>
                  <p className="text-xs opacity-75 mt-1">Maosh oluvchilar soni</p>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="size-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl">payments</span>
                    </div>
                    <span className="text-2xl font-black">
                      {(payrollStats.totalSalary / 1000000).toFixed(1)}M
                    </span>
                  </div>
                  <p className="text-sm font-bold opacity-90">Jami maosh</p>
                  <p className="text-xs opacity-75 mt-1">
                    {formatCurrency(payrollStats.totalSalary)}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="size-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl">star</span>
                    </div>
                    <span className="text-4xl font-black">
                      {payrollStats.totalBonusesCount}
                    </span>
                  </div>
                  <p className="text-sm font-bold opacity-90">Bonuslar soni</p>
                  <p className="text-xs opacity-75 mt-1">Jami bonuslar</p>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="size-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl">warning</span>
                    </div>
                    <span className="text-4xl font-black">
                      {payrollStats.totalPenaltiesCount}
                    </span>
                  </div>
                  <p className="text-sm font-bold opacity-90">Jarimalar soni</p>
                  <p className="text-xs opacity-75 mt-1">Jami jarimalar</p>
                </div>
              </div>

              {/* Month/Year Selector */}
              <div className="flex items-center gap-4">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-5 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>
                      {new Date(2026, month - 1).toLocaleString('uz-UZ', { month: 'long' })}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-5 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Charts Section */}
              {monthlyPayroll.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bar Chart - Top 10 Maoshlar */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-6 shadow-lg">
                    <h4 className="text-xl font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-purple-600">bar_chart</span>
                      Eng yuqori maoshlar (Top 10)
                    </h4>
                    <Bar
                      data={{
                        labels: monthlyPayroll
                          .sort((a, b) => parseFloat(b.net_salary) - parseFloat(a.net_salary))
                          .slice(0, 10)
                          .map(p => p.staff_name.split(' ')[0]),
                        datasets: [{
                          label: 'Jami maosh',
                          data: monthlyPayroll
                            .sort((a, b) => parseFloat(b.net_salary) - parseFloat(a.net_salary))
                            .slice(0, 10)
                            .map(p => parseFloat(p.net_salary)),
                          backgroundColor: 'rgba(147, 51, 234, 0.8)',
                          borderColor: 'rgba(147, 51, 234, 1)',
                          borderWidth: 2,
                          borderRadius: 8
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                          legend: {
                            display: false
                          },
                          tooltip: {
                            callbacks: {
                              label: (context) => {
                                return 'Maosh: ' + new Intl.NumberFormat('uz-UZ').format(context.parsed.y) + ' so\'m';
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              callback: (value) => {
                                return (value / 1000000).toFixed(1) + 'M';
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>

                  {/* Doughnut Chart - Status bo'yicha */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-6 shadow-lg">
                    <h4 className="text-xl font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-purple-600">donut_large</span>
                      Maoshlar holati
                    </h4>
                    <Doughnut
                      data={{
                        labels: ['To\'langan', 'Tasdiqlangan', 'Qoralama'],
                        datasets: [{
                          data: [
                            monthlyPayroll.filter(p => p.status === 'paid').length,
                            monthlyPayroll.filter(p => p.status === 'approved').length,
                            monthlyPayroll.filter(p => p.status === 'draft').length
                          ],
                          backgroundColor: [
                            'rgba(34, 197, 94, 0.8)',
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(251, 191, 36, 0.8)'
                          ],
                          borderColor: [
                            'rgba(34, 197, 94, 1)',
                            'rgba(59, 130, 246, 1)',
                            'rgba(251, 191, 36, 1)'
                          ],
                          borderWidth: 2
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: {
                              padding: 20,
                              font: {
                                size: 14,
                                weight: 'bold'
                              }
                            }
                          },
                          tooltip: {
                            callbacks: {
                              label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return context.label + ': ' + context.parsed + ' (' + percentage + '%)';
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-purple-600 text-3xl">payments</span>
                    </div>
                  </div>
                </div>
              ) : monthlyPayroll.length === 0 ? (
                <div className="space-y-6">
                  {/* Sample Charts Preview */}
                  <div className="space-y-6">
                    {/* Sample Bar Chart */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-6 shadow-lg">
                      <h4 className="text-xl font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-purple-600">bar_chart</span>
                        Eng yuqori maoshlar
                      </h4>
                      <Bar
                        data={{
                          labels: ['Xodim 1', 'Xodim 2', 'Xodim 3', 'Xodim 4', 'Xodim 5', 'Xodim 6', 'Xodim 7', 'Xodim 8', 'Xodim 9', 'Xodim 10'],
                          datasets: [{
                            label: 'Jami maosh',
                            data: [8500000, 7200000, 6800000, 5500000, 4800000, 4200000, 3800000, 3500000, 3000000, 2500000],
                            backgroundColor: 'rgba(147, 51, 234, 0.8)',
                            borderColor: 'rgba(147, 51, 234, 1)',
                            borderWidth: 2,
                            borderRadius: 8
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: true,
                          plugins: {
                            legend: {
                              display: false
                            },
                            tooltip: {
                              callbacks: {
                                label: (context) => {
                                  return 'Maosh: ' + new Intl.NumberFormat('uz-UZ').format(context.parsed.y) + ' so\'m';
                                }
                              }
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                callback: (value) => {
                                  return (value / 1000000).toFixed(1) + 'M';
                                }
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-purple-600 to-green-600 text-white">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-bold">Xodim</th>
                          <th className="px-6 py-4 text-left text-sm font-bold">Lavozim</th>
                          <th className="px-6 py-4 text-right text-sm font-bold">Asosiy maosh</th>
                          <th className="px-6 py-4 text-right text-sm font-bold">Foizlar</th>
                          <th className="px-6 py-4 text-right text-sm font-bold">Bonuslar</th>
                          <th className="px-6 py-4 text-right text-sm font-bold">Jarimalar</th>
                          <th className="px-6 py-4 text-right text-sm font-bold">Jami</th>
                          <th className="px-6 py-4 text-center text-sm font-bold">Status</th>
                          <th className="px-6 py-4 text-center text-sm font-bold">Amallar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {monthlyPayroll.map(payroll => (
                          <tr key={payroll.id} className="hover:bg-purple-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{payroll.staff_name}</td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{payroll.role_name}</td>
                            <td className="px-6 py-4 text-right font-semibold">{formatCurrency(payroll.base_salary)}</td>
                            <td className="px-6 py-4 text-right text-green-600 font-semibold">+{formatCurrency(payroll.service_commissions)}</td>
                            <td className="px-6 py-4 text-right text-green-600 font-semibold">+{formatCurrency(payroll.shift_bonuses + payroll.other_bonuses)}</td>
                            <td className="px-6 py-4 text-right text-red-600 font-semibold">-{formatCurrency(payroll.penalties)}</td>
                            <td className="px-6 py-4 text-right font-black text-xl text-purple-600">{formatCurrency(payroll.net_salary)}</td>
                            <td className="px-6 py-4 text-center">{getStatusBadge(payroll.status)}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleViewDetails(payroll)}
                                  className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                  title="Batafsil"
                                >
                                  <span className="material-symbols-outlined text-xl">visibility</span>
                                </button>
                                {payroll.status === 'draft' && (
                                  <button
                                    onClick={() => handleApprove(payroll.id)}
                                    className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                    title="Tasdiqlash"
                                  >
                                    <span className="material-symbols-outlined text-xl">check_circle</span>
                                  </button>
                                )}
                                {payroll.status === 'approved' && (
                                  <button
                                    onClick={() => handlePay(payroll)}
                                    className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                                    title="To'lash"
                                  >
                                    <span className="material-symbols-outlined text-xl">payments</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gradient-to-r from-gray-50 to-gray-100 font-bold">
                        <tr>
                          <td colSpan="6" className="px-6 py-4 text-right text-lg">JAMI:</td>
                          <td className="px-6 py-4 text-right text-2xl text-purple-700">
                            {formatCurrency(monthlyPayroll.reduce((sum, p) => sum + parseFloat(p.net_salary), 0))}
                          </td>
                          <td colSpan="2"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* XODIMLAR MAOSHI */}
          {activeTab === 'staff' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white">Xodimlar komissiyasi</h3>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">Xodimlar uchun komissiya foizi yoki stavkasini belgilang</p>
                </div>
                <button
                  onClick={() => {
                    if (allStaff.length === 0) loadStaffData();
                    setShowSalaryModal(true);
                  }}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-green-600 text-white rounded-xl hover:from-purple-700 hover:to-green-700 font-bold flex items-center gap-3 shadow-lg hover:shadow-xl transition-all"
                >
                  <span className="material-symbols-outlined text-2xl">add_circle</span>
                  Komissiya o'rnatish
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-purple-600 text-3xl">payments</span>
                    </div>
                  </div>
                </div>
              ) : staffSalaries.length === 0 ? (
                <div className="text-center py-20 bg-gradient-to-br from-purple-50 to-green-50 dark:bg-gradient-to-br dark:from-purple-900/20 dark:to-green-900/20 rounded-2xl border-2 border-dashed border-purple-200 dark:border-purple-800">
                  <div className="w-28 h-28 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-6xl">account_balance_wallet</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Hali komissiya o'rnatilmagan</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-8">Xodimlar uchun komissiya foizi yoki stavkasini belgilang</p>
                  <button
                    onClick={() => {
                      if (allStaff.length === 0) loadStaffData();
                      setShowSalaryModal(true);
                    }}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-green-600 text-white rounded-xl hover:from-purple-700 hover:to-green-700 font-bold inline-flex items-center gap-3 shadow-lg hover:shadow-xl transition-all"
                  >
                    <span className="material-symbols-outlined text-2xl">add_circle</span>
                    Birinchi komissiyani o'rnatish
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {staffSalaries.map(staff => (
                    <div 
                      key={staff.staff_id} 
                      className="group bg-white rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-400 hover:shadow-2xl transition-all duration-300 overflow-hidden"
                    >
                      <div className="bg-gradient-to-r from-purple-600 to-green-600 p-5">
                        <div className="flex items-center gap-4">
                          <div className="size-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center ring-2 ring-white/30">
                            <span className="material-symbols-outlined text-white text-3xl">person</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-white text-lg truncate">{staff.staff_name}</p>
                            <p className="text-purple-100 text-sm font-semibold">{staff.role_name}</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 space-y-4">
                        <div className="bg-gradient-to-br from-purple-50 to-green-50 dark:bg-gradient-to-br dark:from-purple-900/20 dark:to-green-900/20 rounded-xl p-5 border-2 border-purple-100 dark:border-purple-800">
                          <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">
                            {staff.role_name === 'Administrator' 
                              ? 'Oylik maosh'
                              : staff.role_name === 'Tozalovchi' || staff.role_name === 'Sanitar' 
                              ? 'Xona uchun stavka' 
                              : 'Komissiya foizi'}
                          </p>
                          <p className="text-3xl font-black text-purple-700 dark:text-purple-300">
                            {staff.commission_type === 'percentage' 
                              ? `${staff.commission_value}%` 
                              : formatCurrency(staff.commission_value)}
                          </p>
                          {staff.commission_type === 'percentage' && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                              {staff.role_name === 'Shifokor' && 'Bemorlar to\'lagan puldan'}
                              {staff.role_name === 'Laborant' && 'Analiz uchun to\'lagan puldan'}
                              {staff.role_name === 'Hamshira' && 'Dori uchun to\'lagan puldan'}
                              {staff.role_name === 'Dorixona' && 'Sotilgan dorilardan'}
                              {!['Shifokor', 'Laborant', 'Hamshira', 'Dorixona'].includes(staff.role_name) && 'Xizmat uchun to\'lagan puldan'}
                            </p>
                          )}
                          {staff.commission_type === 'fixed' && staff.role_name === 'Administrator' && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                              Oylik fix maosh
                            </p>
                          )}
                          {staff.commission_type === 'fixed' && (staff.role_name === 'Tozalovchi' || staff.role_name === 'Sanitar') && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                              Har bir xona tozalagani uchun
                            </p>
                          )}
                        </div>

                        {staff.effective_from && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="material-symbols-outlined text-gray-400 text-lg">calendar_today</span>
                            <span className="text-gray-600 dark:text-gray-300">Amal qiladi:</span>
                            <span className="font-bold text-gray-900 dark:text-white">
                              {new Date(staff.effective_from).toLocaleDateString('uz-UZ', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                        )}

                        {staff.id ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl">
                              <span className="material-symbols-outlined text-green-600 text-sm">check_circle</span>
                              <span className="text-xs font-bold text-green-700">Aktiv</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                              <span className="material-symbols-outlined text-amber-600 text-sm">info</span>
                              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Komissiya o'rnatilmagan</span>
                            </div>
                          </div>
                        )}

                        {staff.id && (
                          <div className="flex gap-3 pt-2">
                            <button
                              onClick={() => handleEditSalary(staff)}
                              className="flex-1 px-4 py-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 font-bold flex items-center justify-center gap-2 transition-all group-hover:shadow-lg"
                            >
                              <span className="material-symbols-outlined text-lg">edit</span>
                              <span className="text-sm">Tahrirlash</span>
                            </button>
                            <button
                              onClick={() => handleDeleteSalary(staff)}
                              className="flex-1 px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 font-bold flex items-center justify-center gap-2 transition-all group-hover:shadow-lg"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                              <span className="text-sm">O'chirish</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* BONUSLAR */}
          {activeTab === 'bonuses' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white">Bonuslar va mukofotlar</h3>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">Xodimlar uchun bonus va mukofotlar</p>
                </div>
                <button
                  onClick={() => setShowBonusModal(true)}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-bold flex items-center gap-3 shadow-lg hover:shadow-xl transition-all"
                >
                  <span className="material-symbols-outlined text-2xl">add_circle</span>
                  Bonus qo'shish
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-green-600 text-3xl">star</span>
                    </div>
                  </div>
                </div>
              ) : bonuses.length === 0 ? (
                <div className="text-center py-20 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-dashed border-green-200">
                  <div className="w-28 h-28 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-green-600 text-6xl">star</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Bonuslar yo'q</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-8">Xodimlar uchun bonus qo'shing</p>
                  <button
                    onClick={() => setShowBonusModal(true)}
                    className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-bold inline-flex items-center gap-3 shadow-lg hover:shadow-xl transition-all"
                  >
                    <span className="material-symbols-outlined text-2xl">add_circle</span>
                    Birinchi bonusni qo'shish
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {bonuses.map(bonus => (
                    <div 
                      key={bonus.id} 
                      className="group bg-white rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-green-400 hover:shadow-2xl transition-all duration-300 overflow-hidden"
                    >
                      <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-5">
                        <div className="flex items-center gap-4">
                          <div className="size-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center ring-2 ring-white/30">
                            <span className="material-symbols-outlined text-white text-3xl">star</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-white text-lg truncate">{bonus.staff_name}</p>
                            <p className="text-green-100 text-sm font-semibold">{bonus.role_name}</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 space-y-4">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-100">
                          <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2">Bonus miqdori</p>
                          <p className="text-3xl font-black text-green-700">
                            {formatCurrency(bonus.amount)}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-400 text-lg">category</span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">Turi:</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{getBonusTypeLabel(bonus.bonus_type)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-400 text-lg">calendar_today</span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">Sana:</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {new Date(bonus.bonus_date).toLocaleDateString('uz-UZ')}
                            </span>
                          </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                          <p className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">Sabab</p>
                          <p className="text-sm text-gray-900 dark:text-white">{bonus.reason}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* JARIMALAR */}
          {activeTab === 'penalties' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white">Jarimalar va chegirmalar</h3>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">Xodimlar uchun jarimalar</p>
                </div>
                <button
                  onClick={() => setShowPenaltyModal(true)}
                  className="px-8 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 font-bold flex items-center gap-3 shadow-lg hover:shadow-xl transition-all"
                >
                  <span className="material-symbols-outlined text-2xl">add_circle</span>
                  Jarima qo'shish
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-red-600 text-3xl">warning</span>
                    </div>
                  </div>
                </div>
              ) : penalties.length === 0 ? (
                <div className="text-center py-20 bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl border-2 border-dashed border-red-200">
                  <div className="w-28 h-28 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-red-600 text-6xl">warning</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Jarimalar yo'q</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-8">Xodimlar uchun jarima qo'shing</p>
                  <button
                    onClick={() => setShowPenaltyModal(true)}
                    className="px-8 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 font-bold inline-flex items-center gap-3 shadow-lg hover:shadow-xl transition-all"
                  >
                    <span className="material-symbols-outlined text-2xl">add_circle</span>
                    Birinchi jarimani qo'shish
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {penalties.map(penalty => (
                    <div 
                      key={penalty.id} 
                      className="group bg-white rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-red-400 hover:shadow-2xl transition-all duration-300 overflow-hidden"
                    >
                      <div className="bg-gradient-to-r from-red-600 to-rose-600 p-5">
                        <div className="flex items-center gap-4">
                          <div className="size-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center ring-2 ring-white/30">
                            <span className="material-symbols-outlined text-white text-3xl">warning</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-white text-lg truncate">{penalty.staff_name}</p>
                            <p className="text-red-100 text-sm font-semibold">{penalty.role_name}</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 space-y-4">
                        <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-5 border-2 border-red-100">
                          <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">Jarima miqdori</p>
                          <p className="text-3xl font-black text-red-700">
                            {formatCurrency(penalty.amount)}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-400 text-lg">category</span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">Turi:</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{getPenaltyTypeLabel(penalty.penalty_type)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-400 text-lg">calendar_today</span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">Sana:</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {new Date(penalty.penalty_date).toLocaleDateString('uz-UZ')}
                            </span>
                          </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                          <p className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">Sabab</p>
                          <p className="text-sm text-gray-900 dark:text-white">{penalty.reason}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && payrollDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-3xl font-black text-gray-900 dark:text-white">Maosh detallari</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-3 hover:bg-gray-100 dark:bg-gray-700 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-purple-50 to-green-50 rounded-2xl p-6 border-2 border-purple-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-1">Asosiy maosh</p>
                    <p className="text-xl font-black text-gray-900 dark:text-white">{formatCurrency(payrollDetails.base_salary)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-1">Foizlar</p>
                    <p className="text-xl font-black text-green-600">+{formatCurrency(payrollDetails.service_commissions)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-1">Bonuslar</p>
                    <p className="text-xl font-black text-green-600">+{formatCurrency(payrollDetails.shift_bonuses + payrollDetails.other_bonuses)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-1">Jarimalar</p>
                    <p className="text-xl font-black text-red-600">-{formatCurrency(payrollDetails.penalties)}</p>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t-2 border-purple-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-900 dark:text-white">Jami to'lanadigan:</span>
                    <span className="text-3xl font-black text-purple-600">{formatCurrency(payrollDetails.net_salary)}</span>
                  </div>
                </div>
              </div>

              {payrollDetails.services && payrollDetails.services.length > 0 && (
                <div>
                  <h4 className="font-black text-xl mb-4">Bajarilgan xizmatlar</h4>
                  <div className="space-y-3">
                    {payrollDetails.services.map((service, idx) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:bg-gray-700 transition-colors">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{service.service_name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{new Date(service.service_date).toLocaleDateString('uz-UZ')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 dark:text-gray-300">Xizmat: {formatCurrency(service.service_amount)}</p>
                          <p className="font-black text-green-600">Foiz: {formatCurrency(service.commission_earned)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Salary Modal */}
      {showSalaryModal && (
        <SalaryModal
          staff={allStaff}
          editingSalary={editingSalary}
          onClose={() => {
            setShowSalaryModal(false);
            setEditingSalary(null);
          }}
          onSuccess={() => {
            setShowSalaryModal(false);
            setEditingSalary(null);
            loadData();
          }}
        />
      )}

      {/* Bonus Modal */}
      {showBonusModal && (
        <BonusModal
          staff={allStaff}
          onClose={() => setShowBonusModal(false)}
          onSuccess={() => {
            setShowBonusModal(false);
            loadData();
          }}
        />
      )}

      {/* Penalty Modal */}
      {showPenaltyModal && (
        <PenaltyModal
          staff={allStaff}
          onClose={() => setShowPenaltyModal(false)}
          onSuccess={() => {
            setShowPenaltyModal(false);
            loadData();
          }}
        />
      )}



      {/* Pay Modal */}
      {showPayModal && selectedPayroll && (
        <PaymentModal
          payroll={selectedPayroll}
          onClose={() => {
            setShowPayModal(false);
            setSelectedPayroll(null);
          }}
          onSuccess={() => {
            setShowPayModal(false);
            setSelectedPayroll(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// Salary Modal Component
function SalaryModal({ staff, editingSalary, onClose, onSuccess }) {
  const [selectedStaff, setSelectedStaff] = useState(editingSalary?.staff_id || '');
  const [selectedRole, setSelectedRole] = useState(editingSalary?.role_name || '');
  const [commissionType, setCommissionType] = useState(editingSalary?.commission_type || 'percentage');
  const [commissionValue, setCommissionValue] = useState(editingSalary?.commission_value || '');
  const [effectiveFrom, setEffectiveFrom] = useState(
    editingSalary?.effective_from 
      ? new Date(editingSalary.effective_from).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);

  // Xodim tanlanganda uning lavozimini olish
  const handleStaffChange = (staffId) => {
    setSelectedStaff(staffId);
    const selectedStaffData = staff.find(s => s.id === staffId);
    if (selectedStaffData) {
      setSelectedRole(selectedStaffData.role_name);
      
      // Lavozimga qarab default qiymatlarni o'rnatish
      if (selectedStaffData.role_name === 'Administrator') {
        setCommissionType('fixed');
        setCommissionValue('5000000'); // 5,000,000 so'm default
      } else if (selectedStaffData.role_name === 'Shifokor') {
        setCommissionType('percentage');
        setCommissionValue('30'); // 30% default
      } else if (selectedStaffData.role_name === 'Laborant') {
        setCommissionType('percentage');
        setCommissionValue('15'); // 15% default
      } else if (selectedStaffData.role_name === 'Hamshira') {
        setCommissionType('percentage');
        setCommissionValue('20'); // 20% default
      } else if (selectedStaffData.role_name === 'Dorixona') {
        setCommissionType('percentage');
        setCommissionValue('10'); // 10% default
      } else if (selectedStaffData.role_name === 'Tozalovchi' || selectedStaffData.role_name === 'Sanitar') {
        setCommissionType('fixed');
        setCommissionValue('50000'); // 50,000 so'm per xona default
      } else {
        setCommissionType('percentage');
        setCommissionValue('10');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;
      
      if (editingSalary) {
        response = await payrollService.updateStaffSalary(editingSalary.id, {
          commission_type: commissionType,
          commission_value: parseFloat(commissionValue),
          effective_from: effectiveFrom
        });
      } else {
        response = await payrollService.setStaffSalary({
          staff_id: selectedStaff,
          role_name: selectedRole,
          commission_type: commissionType,
          commission_value: parseFloat(commissionValue),
          effective_from: effectiveFrom
        });
      }

      if (response.success) {
        toast.success(response.message || 'Muvaffaqiyatli saqlandi');
        onSuccess();
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Xatolik yuz berdi';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Lavozimga qarab label va placeholder
  const getCommissionLabel = () => {
    if (selectedRole === 'Administrator') {
      return 'Oylik maosh (so\'m)';
    }
    if (selectedRole === 'Tozalovchi' || selectedRole === 'Sanitar') {
      return 'Xona tozalash uchun stavka (so\'m)';
    }
    return 'Komissiya foizi (%)';
  };

  const getCommissionPlaceholder = () => {
    if (selectedRole === 'Administrator') return 'Masalan: 5000000 (oylik fix maosh)';
    if (selectedRole === 'Shifokor') return 'Masalan: 30 (bemorlar to\'lagan puldan 30%)';
    if (selectedRole === 'Laborant') return 'Masalan: 15 (analiz uchun to\'lagan puldan 15%)';
    if (selectedRole === 'Hamshira') return 'Masalan: 20 (dori uchun to\'lagan puldan 20%)';
    if (selectedRole === 'Dorixona') return 'Masalan: 10 (sotilgan dorilardan 10%)';
    if (selectedRole === 'Tozalovchi' || selectedRole === 'Sanitar') return 'Masalan: 50000 (har bir xona uchun)';
    return 'Masalan: 10';
  };

  const getCommissionDescription = () => {
    if (selectedRole === 'Administrator') {
      return '💡 Administrator uchun oylik fix maosh belgilanadi';
    }
    if (selectedRole === 'Shifokor') {
      return '💡 Shifokor tekshirgan bemorlar to\'lagan puldan belgilangan foiz oylik maosh sifatida beriladi';
    }
    if (selectedRole === 'Laborant') {
      return '💡 Laborant analiz qilgan bemorlar laboratoriya xizmati uchun to\'lagan puldan belgilangan foiz oylik maosh sifatida beriladi';
    }
    if (selectedRole === 'Hamshira') {
      return '💡 Hamshira muolaja qilgan bemorlar dori uchun to\'lagan puldan belgilangan foiz oylik maosh sifatida beriladi';
    }
    if (selectedRole === 'Dorixona') {
      return '💡 Dorixonachi sotilgan dorilarning belgilangan foizi oylik maosh sifatida beriladi';
    }
    if (selectedRole === 'Tozalovchi' || selectedRole === 'Sanitar') {
      return '💡 Tozalovchi har bir xona tozalagani uchun belgilangan stavka oylik maosh sifatida beriladi';
    }
    return '💡 Xodim bajargan xizmatlar uchun belgilangan foiz oylik maosh sifatida beriladi';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black text-gray-900 dark:text-white">
            {editingSalary ? 'Komissiyani tahrirlash' : 'Komissiya o\'rnatish'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!editingSalary && (
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">Xodim *</label>
              <select
                value={selectedStaff}
                onChange={(e) => handleStaffChange(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                required
              >
                <option value="">Xodimni tanlang</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name} - {s.role_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {editingSalary && (
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border-2 border-purple-100 dark:border-purple-800">
              <p className="text-sm text-gray-600 dark:text-gray-300 font-semibold">Xodim:</p>
              <p className="font-black text-lg text-gray-900 dark:text-white">{editingSalary.staff_name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{editingSalary.role_name}</p>
            </div>
          )}

          {selectedRole && (
            <>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border-2 border-green-100 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-200 leading-relaxed">
                  {getCommissionDescription()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">
                  {getCommissionLabel()} *
                </label>
                <input
                  type="number"
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                  placeholder={getCommissionPlaceholder()}
                  required
                  min="0"
                  max={commissionType === 'percentage' ? '100' : undefined}
                  step={commissionType === 'percentage' ? '0.1' : '1000'}
                />
                {commissionType === 'percentage' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    0 dan 100 gacha foiz kiriting
                  </p>
                )}
                {commissionType === 'fixed' && selectedRole === 'Administrator' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Oylik fix maosh summasi (so'm)
                  </p>
                )}
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">Amal qilish sanasi *</label>
            <input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 font-bold transition-all"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-green-600 text-white rounded-xl hover:from-purple-700 hover:to-green-700 font-bold disabled:opacity-50 transition-all shadow-lg"
            >
              {loading ? 'Yuklanmoqda...' : editingSalary ? 'Yangilash' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Bonus Modal Component
function BonusModal({ staff, onClose, onSuccess }) {
  const [selectedStaff, setSelectedStaff] = useState('');
  const [bonusType, setBonusType] = useState('performance');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [bonusDate, setBonusDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const date = new Date(bonusDate);
      const response = await payrollService.addBonus({
        staff_id: selectedStaff,
        bonus_type: bonusType,
        amount: parseFloat(amount),
        reason,
        month: date.getMonth() + 1,
        year: date.getFullYear()
      });

      if (response.success) {
        toast.success('Bonus qo\'shildi');
        onSuccess();
      } else {
        toast.error(response.message || 'Xatolik yuz berdi');
      }
    } catch (error) {
      console.error('Bonus add error:', error);
      toast.error(error.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black text-gray-900 dark:text-white">Bonus qo'shish</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:bg-gray-700 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">Xodim *</label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
              required
            >
              <option value="">Xodimni tanlang</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} - {s.role_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">Bonus turi *</label>
            <select
              value={bonusType}
              onChange={(e) => setBonusType(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
              required
            >
              <option value="performance">Ish samaradorligi</option>
              <option value="achievement">Yutuq</option>
              <option value="holiday">Bayram</option>
              <option value="other">Boshqa</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">Miqdor (so'm) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
              placeholder="0"
              required
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">Sabab *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
              rows="3"
              placeholder="Bonus berilish sababi..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">Sana *</label>
            <input
              type="date"
              value={bonusDate}
              onChange={(e) => setBonusDate(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-300 font-bold transition-all"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-bold disabled:opacity-50 transition-all shadow-lg"
            >
              {loading ? 'Yuklanmoqda...' : 'Qo\'shish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Penalty Modal Component
function PenaltyModal({ staff, onClose, onSuccess }) {
  const [selectedStaff, setSelectedStaff] = useState('');
  const [penaltyType, setPenaltyType] = useState('late');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [penaltyDate, setPenaltyDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const date = new Date(penaltyDate);
      const response = await payrollService.addPenalty({
        staff_id: selectedStaff,
        penalty_type: penaltyType,
        amount: parseFloat(amount),
        reason,
        month: date.getMonth() + 1,
        year: date.getFullYear()
      });

      if (response.success) {
        toast.success('Jarima qo\'shildi');
        onSuccess();
      } else {
        toast.error(response.message || 'Xatolik yuz berdi');
      }
    } catch (error) {
      console.error('Penalty add error:', error);
      toast.error(error.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black text-gray-900 dark:text-white">Jarima qo'shish</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:bg-gray-700 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">Xodim *</label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all"
              required
            >
              <option value="">Xodimni tanlang</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} - {s.role_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">Jarima turi *</label>
            <select
              value={penaltyType}
              onChange={(e) => setPenaltyType(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all"
              required
            >
              <option value="late">Kechikish</option>
              <option value="absence">Kelmaslik</option>
              <option value="violation">Qoidabuzarlik</option>
              <option value="other">Boshqa</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">Miqdor (so'm) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all"
              placeholder="0"
              required
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">Sabab *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all"
              rows="3"
              placeholder="Jarima sababi..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">Sana *</label>
            <input
              type="date"
              value={penaltyDate}
              onChange={(e) => setPenaltyDate(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-300 font-bold transition-all"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 font-bold disabled:opacity-50 transition-all shadow-lg"
            >
              {loading ? 'Yuklanmoqda...' : 'Qo\'shish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Payment Modal Component
function PaymentModal({ payroll, onClose, onSuccess }) {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await payrollService.payPayroll(payroll.id, {
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        notes
      });

      if (response.success) {
        toast.success('Maosh to\'landi');
        onSuccess();
      }
    } catch (error) {
      toast.error('Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black text-gray-900 dark:text-white">Maosh to'lash</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:bg-gray-700 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-green-50 rounded-2xl p-6 mb-6 border-2 border-purple-100">
          <p className="font-bold text-gray-900 dark:text-white text-lg mb-2">{payroll.staff_name}</p>
          <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">To'lanadigan summa</p>
          <p className="text-3xl font-black text-purple-700">
            {new Intl.NumberFormat('uz-UZ').format(payroll.net_salary)} so'm
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">To'lov usuli *</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
              required
            >
              <option value="cash">Naqd pul</option>
              <option value="bank_transfer">Bank o'tkazmasi</option>
              <option value="card">Karta</option>
            </select>
          </div>

          {paymentMethod !== 'cash' && (
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">Reference raqami</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                placeholder="Tranzaksiya raqami"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">Izoh</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
              rows="3"
              placeholder="Qo'shimcha ma'lumot..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-300 font-bold transition-all"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-green-600 text-white rounded-xl hover:from-purple-700 hover:to-green-700 font-bold disabled:opacity-50 transition-all shadow-lg"
            >
              {loading ? 'Yuklanmoqda...' : 'To\'lash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

