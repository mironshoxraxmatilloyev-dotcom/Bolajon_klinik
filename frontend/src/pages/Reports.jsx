import { useState, useEffect } from 'react';
import reportsService from '../services/reportsService';
import cashierReportService from '../services/cashierReportService';
import toast, { Toaster } from 'react-hot-toast';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import DateInput from '../components/DateInput';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('charts');
  const [cashierReports, setCashierReports] = useState([]);
  const [cashierTotals, setCashierTotals] = useState({});
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  const [dashboardStats, setDashboardStats] = useState({});
  const [financialReport, setFinancialReport] = useState({ daily: [], summary: {}, transactions: [] });
  const [debtorsReport, setDebtorsReport] = useState({ debtors: [], summary: {} });
  const [patientsReport, setPatientsReport] = useState({ new_patients: [], total_patients: 0, frequent_patients: [] });
  const [servicesReport, setServicesReport] = useState([]);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [dashboard, financial, debtors, patients, services, cashier] = await Promise.all([
        reportsService.getDashboardStats(),
        reportsService.getFinancialReport(dateRange.from, dateRange.to),
        reportsService.getDebtorsReport(),
        reportsService.getPatientsReport(dateRange.from, dateRange.to),
        reportsService.getServicesReport(dateRange.from, dateRange.to),
        cashierReportService.getCashierReports({ start_date: dateRange.from, end_date: dateRange.to })
      ]);

      console.log('Dashboard data:', dashboard);
      console.log('Financial data:', financial);
      console.log('Debtors data:', debtors);
      console.log('Patients data:', patients);
      console.log('Services data:', services);
      console.log('Cashier data:', cashier);

      if (dashboard.success) setDashboardStats(dashboard.data);
      if (financial.success) setFinancialReport(financial.data);
      if (debtors.success) setDebtorsReport(debtors.data);
      if (patients.success) {
        console.log('Setting patients report:', patients.data);
        setPatientsReport(patients.data);
      }
      if (services.success) setServicesReport(services.data);
      if (cashier.success) {
        setCashierReports(cashier.data);
        setCashierTotals(cashier.totals || {});
      }
    } catch (error) {
      console.error('Load error:', error);
      console.error('Error response:', error.response);
      toast.error('Xatolik: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Excel export funksiyasi
  const exportToExcel = () => {
    try {
      if (!financialReport.transactions || financialReport.transactions.length === 0) {
        toast.error('Export qilish uchun ma\'lumot yo\'q');
        return;
      }

      // Ma'lumotlarni Excel uchun tayyorlash
      const excelData = financialReport.transactions.map((row, index) => ({
        '№': index + 1,
        'Sana': new Date(row.date).toLocaleDateString('uz-UZ'),
        'Faktura №': row.invoice_number,
        'Bemor': row.patient_name,
        'Bemor №': row.patient_number,
        'Jami summa': parseFloat(row.total_amount || 0),
        'To\'langan': parseFloat(row.paid_amount || 0),
        'Qarz': parseFloat(row.debt_amount || 0),
        'Holat': row.payment_status === 'paid' ? 'To\'langan' : row.payment_status === 'partial' ? 'Qisman' : 'Kutilmoqda'
      }));

      // Workbook yaratish
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Ustunlar kengligini sozlash
      ws['!cols'] = [
        { wch: 5 },  // №
        { wch: 12 }, // Sana
        { wch: 15 }, // Faktura №
        { wch: 25 }, // Bemor
        { wch: 12 }, // Bemor №
        { wch: 15 }, // Jami summa
        { wch: 15 }, // To'langan
        { wch: 15 }, // Qarz
        { wch: 12 }  // Holat
      ];

      // Worksheet'ni workbook'ga qo'shish
      XLSX.utils.book_append_sheet(wb, ws, 'Moliyaviy hisobot');

      // Fayl nomini yaratish
      const fileName = `Moliyaviy_hisobot_${dateRange.from}_${dateRange.to}.xlsx`;

      // Faylni yuklab olish
      XLSX.writeFile(wb, fileName);

      toast.success('Excel fayl muvaffaqiyatli yuklandi!');
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Excel export xatosi: ' + error.message);
    }
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

  return (
    <div className="p-8 space-y-6">
      <Toaster position="top-right" />
      
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <span className="material-symbols-outlined text-4xl">assessment</span>
          Hisobotlar
        </h1>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Dan:</label>
            <DateInput
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Gacha:</label>
            <DateInput
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Dashboard Stats - Always Visible */}
      <div className="space-y-6">
        {/* Revenue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="material-symbols-outlined text-4xl opacity-80">today</span>
              <span className="text-sm opacity-80">Bugun</span>
            </div>
            <p className="text-4xl font-black">{dashboardStats.today?.total_revenue_with_inpatient?.toLocaleString() || 0} so'm</p>
            <p className="text-sm opacity-90 mt-2">Kunlik daromad (statsionar 50% bilan)</p>
            <p className="text-xs opacity-75 mt-1">Sof: {dashboardStats.today?.net_revenue?.toLocaleString() || 0} so'm</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="material-symbols-outlined text-4xl opacity-80">calendar_month</span>
              <span className="text-sm opacity-80">Oy</span>
            </div>
            <p className="text-4xl font-black">{dashboardStats.month?.total_revenue_with_inpatient?.toLocaleString() || 0} so'm</p>
            <p className="text-sm opacity-90 mt-2">Oylik daromad (statsionar 50% bilan)</p>
            <p className="text-xs opacity-75 mt-1">Sof: {dashboardStats.month?.net_revenue?.toLocaleString() || 0} so'm</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="material-symbols-outlined text-4xl opacity-80">bed</span>
              <span className="text-sm opacity-80">Statsionar</span>
            </div>
            <p className="text-4xl font-black">{dashboardStats.month?.inpatient_revenue_50_percent?.toLocaleString() || 0} so'm</p>
            <p className="text-sm opacity-90 mt-2">Oylik statsionar (faqat 50%)</p>
          </div>

          <div 
            className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.location.href = '/expenses'}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="material-symbols-outlined text-4xl opacity-80">receipt_long</span>
              <span className="text-sm opacity-80">Xarajatlar</span>
            </div>
            <p className="text-4xl font-black">{dashboardStats.month?.expenses?.toLocaleString() || 0} so'm</p>
            <p className="text-sm opacity-90 mt-2">Oylik xarajatlar</p>
            <p className="text-xs opacity-75 mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              Batafsil ko'rish
            </p>
          </div>
        </div>

        {/* Other Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl p-6 text-white">
            <span className="material-symbols-outlined text-4xl mb-2">group</span>
            <p className="text-3xl font-bold">{dashboardStats.today?.patients || 0}</p>
            <p className="text-sm opacity-90 mt-1">Bugungi bemorlar</p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
            <span className="material-symbols-outlined text-4xl mb-2">star</span>
            <p className="text-3xl font-bold">{dashboardStats.total?.bonuses_count || 0}</p>
            <p className="text-sm opacity-90 mt-1">Bonuslar soni</p>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
            <span className="material-symbols-outlined text-4xl mb-2">warning</span>
            <p className="text-3xl font-bold">{dashboardStats.total?.penalties_count || 0}</p>
            <p className="text-sm opacity-90 mt-1">Jarimalar soni</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-4 px-6 overflow-x-auto">
            {[
              { id: 'charts', label: 'Diagrammalar', icon: 'bar_chart' },
              { id: 'financial', label: 'Moliyaviy', icon: 'payments' },
              { id: 'debtors', label: 'Qarzdorlar', icon: 'account_balance_wallet' },
              { id: 'patients', label: 'Bemorlar', icon: 'group' },
              { id: 'services', label: 'Xizmatlar', icon: 'medical_services' },
              { id: 'cashier', label: 'Kasir Hisobotlari', icon: 'receipt_long' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-6">

          {/* Charts Tab */}
          {activeTab === 'charts' && (
            <div className="space-y-6">
              {/* Payment Methods Pie Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined">donut_large</span>
                  To'lov usullari
                </h3>
                {financialReport.revenue_by_method && financialReport.revenue_by_method.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={financialReport.revenue_by_method.map(item => ({
                          name: item._id === 'cash' ? 'Naqd' : item._id === 'card' ? 'Karta' : 'O\'tkazma',
                          value: item.total
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent, value }) => `${name}: ${(percent * 100).toFixed(0)}% (${value.toLocaleString()} so'm)`}
                        innerRadius={80}
                        outerRadius={140}
                        fill="#8884d8"
                        dataKey="value"
                        paddingAngle={5}
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#3b82f6" />
                        <Cell fill="#8b5cf6" />
                      </Pie>
                      <Tooltip formatter={(value) => `${value.toLocaleString()} so'm`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                    Ma'lumot topilmadi
                  </div>
                )}
              </div>

              {/* Daily Revenue Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined">show_chart</span>
                  Kunlik daromad
                </h3>
                {financialReport.daily && financialReport.daily.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={financialReport.daily}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => `${value.toLocaleString()} so'm`} />
                      <Legend />
                      <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} name="Daromad" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                    Ma'lumot topilmadi
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Jami hisob-fakturalar</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{financialReport.summary?.total_invoices || 0}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Jami summa</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{parseFloat(financialReport.summary?.total_amount || 0).toLocaleString()} so'm</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">To'langan</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{parseFloat(financialReport.summary?.paid_amount || 0).toLocaleString()} so'm</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Qarzdorlik</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{parseFloat(financialReport.summary?.debt_amount || 0).toLocaleString()} so'm</p>
                </div>
              </div>
              
              {/* Batafsil jadval */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Batafsil to'lovlar</h3>
                  <button
                    onClick={exportToExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    <span className="material-symbols-outlined">download</span>
                    Excel yuklab olish
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Sana</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Faktura №</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Bemor</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Bemor №</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Jami</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">To'langan</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Qarz</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">Holat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {financialReport.transactions && financialReport.transactions.length > 0 ? (
                        financialReport.transactions.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                              {new Date(row.date).toLocaleDateString('uz-UZ')}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">
                              {row.invoice_number}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                              {row.patient_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {row.patient_number}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">
                              {parseFloat(row.total_amount || 0).toLocaleString()} so'm
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400">
                              {parseFloat(row.paid_amount || 0).toLocaleString()} so'm
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-red-600 dark:text-red-400">
                              {parseFloat(row.debt_amount || 0).toLocaleString()} so'm
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                row.payment_status === 'paid' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                  : row.payment_status === 'partial'
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                              }`}>
                                {row.payment_status === 'paid' ? 'To\'langan' : row.payment_status === 'partial' ? 'Qisman' : 'Kutilmoqda'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            Ma'lumot topilmadi
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'debtors' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Qarzdorlar soni</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{debtorsReport.summary?.total_debtors || 0}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Jami qarzdorlik</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{debtorsReport.summary?.total_debt?.toLocaleString() || 0} so'm</p>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Qarzdorlar ro'yxati</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Bemor raqami</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">F.I.O</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Telefon</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Hisob-fakturalar</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Qarzdorlik</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {debtorsReport.debtors && debtorsReport.debtors.length > 0 ? (
                        debtorsReport.debtors.map((debtor, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">
                              {debtor.patient_number}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                              {debtor.patient_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {debtor.phone || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                              {debtor.total_invoices}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-red-600 dark:text-red-400">
                              {parseFloat(debtor.total_debt || 0).toLocaleString()} so'm
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            Qarzdorlar topilmadi
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'patients' && (
            <div className="space-y-6">
              <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-lg p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">Jami bemorlar</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{patientsReport.total_patients || 0}</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Yangi bemorlar (kunlik)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Sana</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Bemorlar soni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {patientsReport.new_patients && patientsReport.new_patients.length > 0 ? (
                        patientsReport.new_patients.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{new Date(row.date).toLocaleDateString('uz-UZ')}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{row.count}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="2" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            Ma'lumot topilmadi
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Eng ko'p kelgan bemorlar</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Bemor raqami</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">F.I.O</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Tashriflar soni</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Jami xarajat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {patientsReport.frequent_patients && patientsReport.frequent_patients.length > 0 ? (
                        patientsReport.frequent_patients.map((patient, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">{patient.patient_number}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{patient.patient_name}</td>
                            <td className="px-4 py-3 text-sm font-bold text-green-600 dark:text-green-400">{patient.visit_count}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-green-600 dark:text-green-400">{parseFloat(patient.total_spent || 0).toLocaleString()} so'm</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            Ma'lumot topilmadi
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Xizmatlar statistikasi</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Xizmat nomi</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Foydalanish</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Miqdor</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Tushum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {servicesReport && servicesReport.length > 0 ? (
                        servicesReport.map((service, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{service.service_name}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">{service.count}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">{service.quantity}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-green-600 dark:text-green-400">{parseFloat(service.revenue || 0).toLocaleString()} so'm</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            Ma'lumot topilmadi
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Cashier Reports Tab */}
          {activeTab === 'cashier' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Jami Hisobotlar</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{cashierTotals.total_reports || 0}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Jami Fakturalar</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{cashierTotals.total_invoices || 0}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-500 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Jami Summa</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{(cashierTotals.total_amount || 0).toLocaleString()} so'm</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">To'langan</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{(cashierTotals.paid_amount || 0).toLocaleString()} so'm</p>
                </div>
              </div>

              {/* Reports Table */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Kasir Hisobotlari</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Sana</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Xodim</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">Fakturalar</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">To'langan</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Jami Summa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {cashierReports && cashierReports.length > 0 ? (
                        cashierReports.map((report, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                              {new Date(report.date).toLocaleDateString('uz-UZ')}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                              {report.staff_id?.first_name} {report.staff_id?.last_name}
                            </td>
                            <td className="px-4 py-3 text-center text-lg font-bold text-gray-900 dark:text-white">
                              {report.total_invoices}
                            </td>
                            <td className="px-4 py-3 text-center text-lg font-bold text-green-600 dark:text-green-400">
                              {report.paid_invoices}
                            </td>
                            <td className="px-4 py-3 text-right text-lg font-bold text-gray-900 dark:text-white">
                              {(report.total_amount || 0).toLocaleString()} so'm
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            Hisobotlar topilmadi
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}


