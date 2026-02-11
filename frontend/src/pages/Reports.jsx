import React, { useState, useEffect } from 'react';
import reportsService from '../services/reportsService';
import cashierReportService from '../services/cashierReportService';
import toast, { Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import DateInput from '../components/DateInput';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('financial');
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

      if (dashboard.success) setDashboardStats(dashboard.data);
      if (financial.success) setFinancialReport(financial.data);
      if (debtors.success) setDebtorsReport(debtors.data);
      if (patients.success) setPatientsReport(patients.data);
      if (services.success) setServicesReport(services.data);
      if (cashier.success) {
        setCashierReports(cashier.data);
        setCashierTotals(cashier.totals || {});
      }
    } catch (error) {
      console.error('Load error:', error);
      toast.error('Xatolik: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    try {
      if (!financialReport.transactions || financialReport.transactions.length === 0) {
        toast.error('Export qilish uchun ma\'lumot yo\'q');
        return;
      }

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

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      ws['!cols'] = [
        { wch: 5 }, { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Moliyaviy hisobot');
      const fileName = `Moliyaviy_hisobot_${dateRange.from}_${dateRange.to}.xlsx`;
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
            <DateInput value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} className="px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Gacha:</label>
            <DateInput value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} className="px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" />
          </div>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="material-symbols-outlined text-4xl opacity-80">today</span>
            <span className="text-sm opacity-80">Bugun</span>
          </div>
          <p className="text-4xl font-black">{dashboardStats.today?.total_revenue_with_inpatient?.toLocaleString() || 0} so'm</p>
          <p className="text-sm opacity-90 mt-2">Kunlik daromad</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="material-symbols-outlined text-4xl opacity-80">calendar_month</span>
            <span className="text-sm opacity-80">Oy</span>
          </div>
          <p className="text-4xl font-black">{dashboardStats.month?.total_revenue_with_inpatient?.toLocaleString() || 0} so'm</p>
          <p className="text-sm opacity-90 mt-2">Oylik daromad</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="material-symbols-outlined text-4xl opacity-80">bed</span>
            <span className="text-sm opacity-80">Statsionar</span>
          </div>
          <p className="text-4xl font-black">{dashboardStats.month?.inpatient_revenue_50_percent?.toLocaleString() || 0} so'm</p>
          <p className="text-sm opacity-90 mt-2">Oylik statsionar</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.location.href = '/expenses'}>
          <div className="flex items-center justify-between mb-2">
            <span className="material-symbols-outlined text-4xl opacity-80">receipt_long</span>
            <span className="text-sm opacity-80">Xarajatlar</span>
          </div>
          <p className="text-4xl font-black">{dashboardStats.month?.expenses?.toLocaleString() || 0} so'm</p>
          <p className="text-sm opacity-90 mt-2">Oylik xarajatlar</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-4 px-6 overflow-x-auto">
            {[
              { id: 'financial', label: 'Moliyaviy', icon: 'payments' },
              { id: 'debtors', label: 'Qarzdorlar', icon: 'account_balance_wallet' },
              { id: 'patients', label: 'Bemorlar', icon: 'group' },
              { id: 'services', label: 'Xizmatlar', icon: 'medical_services' },
              { id: 'cashier', label: 'Kasir Hisobotlari', icon: 'receipt_long' }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-primary text-primary font-semibold' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900'}`}>
                <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-6">

          {/* Financial Tab */}
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
              
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Batafsil to'lovlar</h3>
                  <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors">
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
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{new Date(row.date).toLocaleDateString('uz-UZ')}</td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">{row.invoice_number}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{row.patient_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{row.patient_number}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">{parseFloat(row.total_amount || 0).toLocaleString()} so'm</td>
                            <td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400">{parseFloat(row.paid_amount || 0).toLocaleString()} so'm</td>
                            <td className="px-4 py-3 text-sm text-right text-red-600 dark:text-red-400">{parseFloat(row.debt_amount || 0).toLocaleString()} so'm</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.payment_status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : row.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                                {row.payment_status === 'paid' ? 'To\'langan' : row.payment_status === 'partial' ? 'Qisman' : 'Kutilmoqda'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">Ma'lumot topilmadi</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Debtors Tab */}
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
                            <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">{debtor.patient_number}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{debtor.patient_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{debtor.phone || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">{debtor.total_invoices}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-red-600 dark:text-red-400">{parseFloat(debtor.total_debt || 0).toLocaleString()} so'm</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">Qarzdorlar topilmadi</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Patients Tab */}
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
                          <td colSpan="2" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">Ma'lumot topilmadi</td>
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
                          <td colSpan="4" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">Ma'lumot topilmadi</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Services Tab */}
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
                          <td colSpan="4" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">Ma'lumot topilmadi</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Cashier Tab */}
          {activeTab === 'cashier' && (
            <div className="space-y-6">
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
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{new Date(report.date).toLocaleDateString('uz-UZ')}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{report.staff_id?.first_name} {report.staff_id?.last_name}</td>
                            <td className="px-4 py-3 text-center text-lg font-bold text-gray-900 dark:text-white">{report.total_invoices}</td>
                            <td className="px-4 py-3 text-center text-lg font-bold text-green-600 dark:text-green-400">{report.paid_invoices}</td>
                            <td className="px-4 py-3 text-right text-lg font-bold text-gray-900 dark:text-white">{(report.total_amount || 0).toLocaleString()} so'm</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">Hisobotlar topilmadi</td>
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
