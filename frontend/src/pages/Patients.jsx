import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/dashboard/StatusBadge';
import AddPatientModal from '../components/AddPatientModal';
import { patientService } from '../services/patientService';

const Patients = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDoctor = user?.role_name === 'doctor' || user?.role?.name === 'doctor' || user?.role_name === 'Shifokor' || user?.role?.name === 'Shifokor' || user?.role_name === 'Doctor' || user?.role?.name === 'Doctor';
  
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  });

  useEffect(() => {
    loadPatients();
  }, [pagination.page, searchTerm]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const response = await patientService.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm
      });
      
      // API response: { success: true, data: [...], pagination: {...} }
      if (response.success && response.data) {
        setPatients(response.data);
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            total: response.pagination.total || 0,
            totalPages: response.pagination.totalPages || 0
          }));
        }
      }
    } catch (error) {
      console.error('Load patients error:', error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    // Reset to page 1 when searching
    setPagination(prev => ({ ...prev, page: 1 }));
    loadPatients();
  };

  const getStatusConfig = (balance, debtLimit) => {
    if (balance >= 0) {
      return { status: 'success', text: t('patients.active') };
    } else if (Math.abs(balance) > debtLimit) {
      return { status: 'error', text: t('patients.blocked') };
    } else {
      return { status: 'warning', text: t('patients.debt') };
    }
  };

  const formatPhone = (phone) => {
    if (!phone) return '-';
    return phone.replace(/(\+998)(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{t('patients.title')}</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            {isDoctor ? `${t('patients.completedPatients')}: ` : `${t('patients.totalPatients')}: `}{pagination.total} {t('patients.patientsCount')}
          </p>
        </div>
        {!isDoctor && (
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2 flex-shrink-0"
          >
            <span className="material-symbols-outlined">add</span>
            <span>{t('dashboard.newPatient')}</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400">
            search
          </span>
          <input
            type="text"
            placeholder={t('patients.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
          />
          {loading && (
            <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2">
              <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {/* Patients Table/Cards */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading && patients.length === 0 ? (
          <div className="p-12 text-center">
            <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
              person_off
            </span>
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? t('patients.notFound') : t('patients.noPatients')}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-max">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap">
                      {t('patients.fullName')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap">
                      {t('patients.phone')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap">
                      Telegram Kod
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap">
                      {t('patients.birthDate')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap">
                      {t('patients.balance')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap">
                      {t('patients.status')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap">
                      {t('patients.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {patients.map((patient) => {
                    const statusConfig = getStatusConfig(
                      patient.current_balance || 0, 
                      patient.debt_limit || 500000
                    );
                    const fullName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
                    
                    return (
                      <tr
                        key={patient.id}
                        onClick={() => navigate(`/patients/${patient.id}`)}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 text-sm font-semibold text-primary">
                          {patient.patient_number || `#${patient.id.slice(0, 8)}`}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {patient.photo_url ? (
                              <img
                                src={patient.photo_url}
                                alt={fullName}
                                className="size-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                                {patient.first_name?.[0] || '?'}{patient.last_name?.[0] || ''}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {fullName || t('patients.unknown')}
                              </p>
                              {patient.telegram_username && (
                                <p className="text-xs text-gray-500">@{patient.telegram_username}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {formatPhone(patient.phone)}
                        </td>
                        <td className="px-6 py-4">
                          {patient.access_code ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-lg font-bold text-sm tracking-wider">
                              <span className="material-symbols-outlined text-base">qr_code</span>
                              {patient.access_code}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {patient.birth_date ? new Date(patient.birth_date).toLocaleDateString('uz-UZ') : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-bold ${
                            (patient.current_balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {(patient.current_balance || 0) >= 0 ? '+' : ''}{(patient.current_balance || 0).toLocaleString()} so'm
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge
                            status={statusConfig.status}
                            text={statusConfig.text}
                          />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/patients/${patient.id}`);
                            }}
                            className="text-primary hover:text-green-700 transition-colors"
                          >
                            <span className="material-symbols-outlined">visibility</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {patients.map((patient) => {
                const statusConfig = getStatusConfig(
                  patient.current_balance || 0, 
                  patient.debt_limit || 500000
                );
                const fullName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
                
                return (
                  <div
                    key={patient.id}
                    onClick={() => navigate(`/patients/${patient.id}`)}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    {/* Header: Avatar + Name + ID */}
                    <div className="flex items-start gap-3 mb-3">
                      {patient.photo_url ? (
                        <img
                          src={patient.photo_url}
                          alt={fullName}
                          className="size-12 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0">
                          {patient.first_name?.[0] || '?'}{patient.last_name?.[0] || ''}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-gray-900 dark:text-white break-words">
                              {fullName || t('patients.unknown')}
                            </p>
                            {patient.telegram_username && (
                              <p className="text-xs text-gray-500 break-words">@{patient.telegram_username}</p>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-primary whitespace-nowrap flex-shrink-0">
                            {patient.patient_number || `#${patient.id.slice(0, 8)}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Info Grid */}
                    <div className="space-y-2 text-sm">
                      {/* Access Code - Telegram bot uchun */}
                      {patient.access_code && (
                        <div className="flex items-center justify-between gap-2 bg-green-50 dark:bg-green-900/20 p-2 rounded-lg border border-green-200 dark:border-green-800">
                          <span className="text-green-700 dark:text-green-400 flex items-center gap-1.5 text-xs">
                            <span className="material-symbols-outlined text-base">qr_code</span>
                            Telegram kod
                          </span>
                          <span className="font-bold text-green-900 dark:text-green-300 text-base tracking-wider">
                            {patient.access_code}
                          </span>
                        </div>
                      )}
                      
                      {/* Phone */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base">phone</span>
                          {t('patients.phoneLabel')}
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white break-words text-right">
                          {formatPhone(patient.phone)}
                        </span>
                      </div>

                      {/* Birth Date */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base">cake</span>
                          {t('patients.birthDateLabel')}
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {patient.birth_date ? new Date(patient.birth_date).toLocaleDateString('uz-UZ') : '-'}
                        </span>
                      </div>

                      {/* Balance */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base">account_balance_wallet</span>
                          {t('patients.balanceLabel')}
                        </span>
                        <span className={`font-bold ${
                          (patient.current_balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {(patient.current_balance || 0) >= 0 ? '+' : ''}{(patient.current_balance || 0).toLocaleString()} so'm
                        </span>
                      </div>

                      {/* Status */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base">info</span>
                          {t('patients.statusLabel')}
                        </span>
                        <StatusBadge
                          status={statusConfig.status}
                          text={statusConfig.text}
                        />
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/patients/${patient.id}`);
                        }}
                        className="w-full px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-semibold hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-lg">visibility</span>
                        {t('patients.viewDetails')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.total > pagination.limit && (
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}
                </p>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="flex-1 sm:flex-none px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('patients.previous')}
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page * pagination.limit >= pagination.total}
                    className="flex-1 sm:flex-none px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('patients.next')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Patient Modal */}
      <AddPatientModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          loadPatients();
        }}
      />
    </div>
  );
};

export default Patients;
