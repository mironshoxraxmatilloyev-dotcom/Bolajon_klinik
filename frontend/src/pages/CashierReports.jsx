/**
 * CASHIER REPORTS PAGE
 * Kasir hisobotlari sahifasi - Admin uchun
 */

import { useState, useEffect } from 'react';
import cashierReportService from '../services/cashierReportService';
import toast, { Toaster } from 'react-hot-toast';

export default function CashierReports() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [totals, setTotals] = useState({});
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await cashierReportService.getCashierReports(dateRange);
      
      if (response.success) {
        setReports(response.data);
        setTotals(response.totals || {});
      }
    } catch (error) {
      console.error('Load reports error:', error);
      toast.error('Hisobotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const viewDetails = async (reportId) => {
    try {
      const response = await cashierReportService.getCashierReport(reportId);
      if (response.success) {
        setSelectedReport(response.data);
        setShowModal(true);
      }
    } catch (error) {
      console.error('View details error:', error);
      toast.error('Tafsilotlarni yuklashda xatolik');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ').format(amount || 0) + ' so\'m';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('uz-UZ', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} soat ${mins} daqiqa`;
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-3">
              <span className="material-symbols-outlined text-4xl">receipt_long</span>
              KASIR HISOBOTLARI
            </h1>
            <p className="text-lg opacity-90 mt-1">Kunlik ish hisobotlari</p>
          </div>
          <button
            onClick={loadReports}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined">refresh</span>
            Yangilash
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Dan:</label>
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
              className="px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Gacha:</label>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
              className="px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-12 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">description</span>
            </div>
            <div>
              <p className="text-sm opacity-90">Jami Hisobotlar</p>
              <p className="text-2xl font-black">{totals.total_reports || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-12 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">receipt</span>
            </div>
            <div>
              <p className="text-sm opacity-90">Jami Fakturalar</p>
              <p className="text-2xl font-black">{totals.total_invoices || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-12 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">payments</span>
            </div>
            <div>
              <p className="text-sm opacity-90">Jami Summa</p>
              <p className="text-2xl font-black">{formatCurrency(totals.total_amount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-12 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">check_circle</span>
            </div>
            <div>
              <p className="text-sm opacity-90">To'langan</p>
              <p className="text-2xl font-black">{formatCurrency(totals.paid_amount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Hisobotlar Ro'yxati</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Sana</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Xodim</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Ish Vaqti</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">Fakturalar</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">To'langan</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Jami Summa</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    <span className="material-symbols-outlined text-6xl mb-4 block">inbox</span>
                    Hisobotlar topilmadi
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {formatDate(report.date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {report.staff_id?.first_name} {report.staff_id?.last_name}
                      <br />
                      <span className="text-xs text-gray-500">{report.staff_id?.employee_id}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatTime(report.check_in_time)} - {formatTime(report.check_out_time)}
                      <br />
                      <span className="text-xs">{formatDuration(report.work_duration)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {report.total_invoices}
                      </div>
                      <div className="text-xs text-gray-500">
                        {report.unpaid_invoices > 0 && (
                          <span className="text-red-600">{report.unpaid_invoices} to'lanmagan</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {report.paid_invoices}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(report.total_amount)}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">
                        To'langan: {formatCurrency(report.paid_amount)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => viewDetails(report._id)}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        Batafsil
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {showModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Hisobot Tafsilotlari
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Staff Info */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">Xodim Ma'lumotlari</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">F.I.O:</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {selectedReport.staff_id?.first_name} {selectedReport.staff_id?.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Xodim ID:</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {selectedReport.staff_id?.employee_id}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Kelish vaqti:</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatTime(selectedReport.check_in_time)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Ketish vaqti:</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatTime(selectedReport.check_out_time)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Invoices List */}
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-4">Yaratilgan Fakturalar</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Faktura №</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Bemor</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Summa</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">To'langan</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">Holat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {selectedReport.invoices?.map((invoice, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-2 text-sm font-mono text-gray-900 dark:text-white">
                            {invoice.invoice_number}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                            {invoice.patient_name}
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(invoice.total_amount)}
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-green-600 dark:text-green-400">
                            {formatCurrency(invoice.paid_amount)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              invoice.payment_status === 'paid'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                : invoice.payment_status === 'partial'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                              {invoice.payment_status === 'paid' ? 'To\'langan' : 
                               invoice.payment_status === 'partial' ? 'Qisman' : 'To\'lanmagan'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
