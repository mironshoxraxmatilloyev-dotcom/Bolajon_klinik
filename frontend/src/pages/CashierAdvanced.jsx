import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import billingService from '../services/billingService';
import patientService from '../services/patientService';
import servicesService from '../services/servicesService';
import api from '../services/api';
import Modal from '../components/Modal';
import AlertModal from '../components/AlertModal';
import ConfirmModal from '../components/ConfirmModal';
import QRCode from 'qrcode';
import PhoneInput from '../components/PhoneInput';
import YearInput from '../components/YearInput';

const CashierAdvanced = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    today_revenue: 0,
    month_revenue: 0,
    pending_invoices: 0,
    pending_payments: 0
  });
  const [invoices, setInvoices] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [services, setServices] = useState([]);
  const [activeTab, setActiveTab] = useState('new-invoice');
  
  // Services Management State
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    price: '',
    duration_minutes: '',
    description: '',
    is_active: true
  });
  
  // New Invoice State
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientSearch, setPatientSearch] = useState('');
  const lastScanTimeRef = useRef(0);
  const [searchResults, setSearchResults] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [onDutyDoctors, setOnDutyDoctors] = useState([]);
  
  // Patient Creation State
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [patientForm, setPatientForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    date_of_birth: '',
    gender: 'male',
    address: '',
    house_number: ''
  });
  
  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Alert and Confirm modals
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
  const [transactionId, setTransactionId] = useState('');
  
  // QR Modal
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    loadData();
    loadAllPatients(); // Barcha bemorlarni yuklash
    loadServices(); // Xizmatlarni yuklash
    loadInvoices(); // Hisob-fakturalarni yuklash
    loadTransactions(); // Tranzaksiyalarni yuklash
    loadStats(); // Statistikani yuklash
    loadOnDutyDoctors(); // Dejur shifokorlarni yuklash
  }, []);

  useEffect(() => {
    if (patientSearch.length >= 2) {
      searchPatients();
    } else {
      setSearchResults([]); // Qidiruv bo'sh bo'lsa, barcha bemorlarni ko'rsatish
    }
  }, [patientSearch]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, invoicesData, transactionsData, servicesData, patientsData] = await Promise.all([
        billingService.getStats(),
        billingService.getInvoices({ limit: 20 }),
        billingService.getTransactions({ limit: 10 }),
        servicesService.getServices(),
        api.get('/patients/search', { params: { q: '', limit: 100 } })
      ]);
      
      if (statsData.success) setStats(statsData.data);
      if (invoicesData.success) setInvoices(invoicesData.data);
      if (transactionsData.success) setRecentTransactions(transactionsData.data);
      if (servicesData.success) setServices(servicesData.data);
      if (patientsData.data.success) setSearchResults(patientsData.data.data);
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const servicesData = await servicesService.getServices();
      if (servicesData.success) {
        setServices(servicesData.data);
      }
    } catch (error) {
      console.error('Load services error:', error);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await billingService.getStats();
      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  const loadInvoices = async () => {
    try {
      const invoicesData = await billingService.getInvoices({ limit: 20 });
      if (invoicesData.success) {
        setInvoices(invoicesData.data);
      }
    } catch (error) {
      console.error('Load invoices error:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const transactionsData = await billingService.getTransactions({ limit: 10 });
      if (transactionsData.success) {
        setRecentTransactions(transactionsData.data);
      }
    } catch (error) {
      console.error('Load transactions error:', error);
    }
  };

  const loadAllPatients = async () => {
    try {
      const response = await patientService.getAllPatients();
      const patientsData = response.data?.data || [];
      setSearchResults(patientsData);
    } catch (error) {
      console.error('Load all patients error:', error);
    }
  };

  const loadOnDutyDoctors = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get('/chief-doctor/on-duty-schedule', {
        params: {
          start_date: today,
          end_date: today
        }
      });
      
      if (response.data.success) {
        // Faqat bugungi va faol shifokorlar
        const activeDoctors = response.data.data.filter(shift => 
          shift.status === 'scheduled' || shift.status === 'active'
        );
        setOnDutyDoctors(activeDoctors);
      }
    } catch (error) {
      console.error('Load on-duty doctors error:', error);
      // Xatolik bo'lsa ham davom etish (dejur shifokorlar ixtiyoriy)
    }
  };

  const searchPatients = async () => {
    try {
      const response = await api.get('/patients/search', {
        params: {
          q: patientSearch
        }
      });
      if (response.data.success) {
        setSearchResults(response.data.data);
      }
    } catch (error) {
      console.error('Search patients error:', error);
    }
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    try {
      const response = await patientService.createPatient(patientForm);
      if (response.success) {
        showAlert('Bemor muvaffaqiyatli qo\'shildi!', 'success', 'Muvaffaqiyat');
        setShowPatientModal(false);
        setPatientForm({
          first_name: '',
          last_name: '',
          phone: '',
          date_of_birth: '',
          gender: 'male',
          address: '',
          house_number: ''
        });
        // Yangi bemorni tanlash
        setSelectedPatient(response.data);
        setPatientSearch(`${response.data.first_name} ${response.data.last_name}`);
        // Qidiruv natijalarini yangilash
        await searchPatients();
      }
    } catch (error) {
      console.error('Create patient error:', error);
      showAlert(error.response?.data?.message || 'Bemor qo\'shishda xatolik', 'error', 'Xatolik');
    }
  };

  const addServiceToInvoice = (service) => {
    const serviceId = service._id || service.id;
    const existingItem = invoiceItems.find(item => item.service_id === serviceId);
    
    if (existingItem) {
      setInvoiceItems(invoiceItems.map(item =>
        item.service_id === serviceId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setInvoiceItems([...invoiceItems, {
        service_id: serviceId,
        description: service.name,
        quantity: 1,
        unit_price: parseFloat(service.price) || 0,
        discount_percentage: 0
      }]);
    }
  };

  const removeServiceFromInvoice = (serviceId) => {
    setInvoiceItems(invoiceItems.filter(item => item.service_id !== serviceId));
  };

  const updateItemQuantity = (serviceId, quantity) => {
    if (quantity < 1) return;
    setInvoiceItems(invoiceItems.map(item =>
      item.service_id === serviceId ? { ...item, quantity } : item
    ));
  };

  const calculateSubtotal = () => {
    return invoiceItems.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unit_price;
      const itemDiscount = itemTotal * (item.discount_percentage / 100);
      return sum + (itemTotal - itemDiscount);
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() - discount;
  };

  const handleCreateInvoice = async () => {
    if (!selectedPatient) {
      showAlert('Iltimos, bemorni tanlang', 'warning', 'Ogohlantirish');
      return;
    }
    
    if (invoiceItems.length === 0) {
      showAlert('Iltimos, xizmatlarni tanlang', 'warning', 'Ogohlantirish');
      return;
    }

    try {
      // selectedPatient ichida patient obyekti bor
      const patient = selectedPatient.patient || selectedPatient;
      
      if (!patient || !patient.id) {
        showAlert('Bemor ma\'lumotlari noto\'g\'ri', 'error', 'Xatolik');
        return;
      }

      // Faqat kerakli maydonlarni yuborish
      const items = invoiceItems.map(item => ({
        service_id: item.service_id,
        quantity: item.quantity
      }));

      const invoiceData = {
        patient_id: patient.id,
        items: items,
        discount_amount: discount || 0,
        notes: notes || ''
      };

      // Agar shifokor tanlangan bo'lsa, qo'shish (ixtiyoriy)
      if (selectedDoctor) {
        invoiceData.doctor_id = selectedDoctor;
      }

      const response = await billingService.createInvoice(invoiceData);

      if (response.success) {
        // Qayta qabul chegirmasi haqida xabar
        let message = 'Hisob-faktura muvaffaqiyatli yaratildi!';
        if (response.data?.revisit_discount > 0) {
          message += `\n\n🎉 ${response.data.revisit_discount_reason}`;
        }
        
        showAlert(message, 'success', 'Muvaffaqiyatli');
        // Reset form
        setSelectedPatient(null);
        setInvoiceItems([]);
        setDiscount(0);
        setNotes('');
        setPatientSearch('');
        setSelectedDoctor(null); // Shifokorni ham reset qilish
        await loadInvoices(); // Hisob-fakturalarni qayta yuklash
        await loadTransactions(); // Tranzaksiyalarni qayta yuklash
        await loadStats(); // Statistikani qayta yuklash
        setActiveTab('invoices');
      }
    } catch (error) {
      console.error('Create invoice error:', error);
      console.error('Error response:', error.response?.data);
      showAlert('Xatolik yuz berdi: ' + (error.response?.data?.message || error.message), 'error', 'Xatolik');
    }
  };

  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentAmount((invoice.total_amount - invoice.paid_amount).toString());
    setShowPaymentModal(true);
  };

  const handleProcessPayment = async () => {
    if (!selectedInvoice || !paymentAmount) return;

    try {
      const response = await billingService.addPayment(selectedInvoice.id, {
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        reference_number: transactionId,
        notes: ''
      });

      if (response.success) {
        showAlert('To\'lov muvaffaqiyatli qabul qilindi!', 'success', 'Muvaffaqiyatli');
        setShowPaymentModal(false);
        setSelectedInvoice(null);
        setPaymentAmount('');
        setTransactionId('');
        await loadInvoices(); // Hisob-fakturalarni qayta yuklash
        await loadTransactions(); // Tranzaksiyalarni qayta yuklash
        await loadStats(); // Statistikani qayta yuklash
      }
    } catch (error) {
      console.error('Process payment error:', error);
      showAlert(error.response?.data?.message || 'Xatolik yuz berdi', 'error', 'Xatolik');
    }
  };

  const generateInvoiceQR = async (invoice) => {
    try {
      const qrData = JSON.stringify({
        type: 'invoice',
        id: invoice.id,
        number: invoice.invoice_number,
        amount: invoice.total_amount
      });
      const qrUrl = await QRCode.toDataURL(qrData);
      setQrCodeUrl(qrUrl);
      setSelectedInvoice(invoice);
      setShowQRModal(true);
    } catch (error) {
      console.error('Generate QR error:', error);
    }
  };

  const printInvoice = async (invoice) => {
    try {
      // Get full invoice details
      const response = await billingService.getInvoiceById(invoice.id);
      if (!response.success) {
        showAlert('Faktura ma\'lumotlarini yuklashda xatolik', 'error', 'Xatolik');
        return;
      }

      const invoiceData = response.data;
      const items = invoiceData.items || [];
      
      // Generate QR code
      const qrData = JSON.stringify({
        type: 'invoice',
        id: invoiceData.id,
        number: invoiceData.invoice_number,
        amount: invoiceData.total_amount
      });
      const qrUrl = await QRCode.toDataURL(qrData, { width: 150 });

      // Create print window
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Hisob-faktura ${invoiceData.invoice_number}</title>
          <style>
            @media print {
              @page { margin: 0; }
              body { margin: 1cm; }
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.4;
              color: #000;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .info-section {
              margin-bottom: 15px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            th, td {
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f0f0f0;
              font-weight: bold;
            }
            .text-right {
              text-align: right;
            }
            .totals {
              margin-top: 15px;
              float: right;
              width: 300px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
            }
            .totals-row.grand-total {
              border-top: 2px solid #000;
              font-weight: bold;
              font-size: 16px;
              padding-top: 10px;
            }
            .footer {
              margin-top: 40px;
              clear: both;
              text-align: center;
            }
            .qr-code {
              text-align: center;
              margin: 20px 0;
            }
            .qr-code img {
              width: 150px;
              height: 150px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>KLINIKA HISOB-FAKTURASI</h1>
            <p>Faktura raqami: <strong>${invoiceData.invoice_number}</strong></p>
            <p>Sana: ${formatDate(invoiceData.created_at)}</p>
          </div>

          <div class="info-section">
            <div class="info-row">
              <strong>Bemor:</strong>
              <span>${invoiceData.first_name} ${invoiceData.last_name}</span>
            </div>
            <div class="info-row">
              <strong>Bemor raqami:</strong>
              <span>${invoiceData.patient_number}</span>
            </div>
            <div class="info-row">
              <strong>Telefon:</strong>
              <span>${invoiceData.phone}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px;">№</th>
                <th>Xizmat nomi</th>
                <th style="width: 80px;" class="text-right">Miqdor</th>
                <th style="width: 120px;" class="text-right">Narx</th>
                <th style="width: 120px;" class="text-right">Jami</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.service_name || item.description}</td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">${formatCurrency(item.unit_price)}</td>
                  <td class="text-right">${formatCurrency(item.total_price || (item.quantity * item.unit_price))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row grand-total">
              <span>TO'LOV SUMMASI:</span>
              <strong>${formatCurrency(invoiceData.total_amount)}</strong>
            </div>
            <div class="totals-row">
              <span>To'langan:</span>
              <strong>${formatCurrency(invoiceData.paid_amount)}</strong>
            </div>
            <div class="totals-row">
              <span>Qoldiq:</span>
              <strong>${formatCurrency(invoiceData.total_amount - invoiceData.paid_amount)}</strong>
            </div>
          </div>

          <div class="qr-code">
            <img src="${qrUrl}" alt="QR Code" />
            <p>To'lov uchun QR kodni skanerlang</p>
          </div>

          <div class="footer">
            <p>Rahmat! Sog'ligingiz yaxshi bo'lsin!</p>
            <p style="font-size: 10px; color: #666;">Ushbu hujjat elektron tarzda yaratilgan va imzo talab qilmaydi</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error('Print invoice error:', error);
      showAlert('Chop etishda xatolik yuz berdi', 'error', 'Xatolik');
    }
  };

  // Service Management Functions
  const openServiceModal = (service = null) => {
    if (service) {
      setEditingService(service);
      setServiceForm({
        name: service.name,
        price: service.price,
        duration_minutes: service.duration_minutes || '',
        description: service.description || '',
        is_active: service.is_active
      });
    } else {
      setEditingService(null);
      setServiceForm({
        name: '',
        price: '',
        duration_minutes: '',
        description: '',
        is_active: true
      });
    }
    setShowServiceModal(true);
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    
    if (!serviceForm.name || !serviceForm.price) {
      showAlert('Iltimos, barcha majburiy maydonlarni to\'ldiring', 'warning', 'Ogohlantirish');
      return;
    }

    try {
      const data = {
        name: serviceForm.name,
        category: serviceForm.name, // Xizmat nomi kategoriya sifatida
        price: parseFloat(serviceForm.price),
        description: serviceForm.description || '',
        is_active: serviceForm.is_active
      };

      if (editingService) {
        const response = await servicesService.updateService(editingService._id || editingService.id, data);
        if (response.success) {
          showAlert('Xizmat muvaffaqiyatli yangilandi!', 'success', 'Muvaffaqiyatli');
        }
      } else {
        const response = await servicesService.createService(data);
        if (response.success) {
          showAlert('Xizmat muvaffaqiyatli qo\'shildi!', 'success', 'Muvaffaqiyatli');
        }
      }

      setShowServiceModal(false);
      await loadServices(); // Faqat xizmatlarni qayta yuklash
      setActiveTab('services'); // Xizmatlar tabiga o'tish
    } catch (error) {
      console.error('Service submit error:', error);
      showAlert('Xatolik yuz berdi: ' + (error.response?.data?.message || error.message), 'error', 'Xatolik');
    }
  };

  const handleDeleteService = async (serviceId) => {
    showConfirm(
      'Ushbu xizmatni o\'chirishni tasdiqlaysizmi?',
      async () => {
        try {
          const response = await servicesService.deleteService(serviceId);
          if (response.success) {
            showAlert('Xizmat muvaffaqiyatli o\'chirildi!', 'success', 'Muvaffaqiyatli');
            await loadServices();
          }
        } catch (error) {
          console.error('Delete service error:', error);
          showAlert('Xatolik yuz berdi: ' + (error.response?.data?.message || error.message), 'error', 'Xatolik');
        }
      },
      {
        title: 'Xizmatni o\'chirish',
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
    return new Date(date).toLocaleDateString('uz-UZ', {
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
          <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">Kassa</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Hisob-fakturalar va to'lovlarni boshqarish
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-4 px-6">
            {[
              { id: 'new-invoice', label: 'Yangi hisob-faktura', icon: 'add_circle' },
              { id: 'invoices', label: 'Hisob-fakturalar', icon: 'receipt_long' },
              { id: 'transactions', label: 'Tranzaksiyalar', icon: 'history' },
              { id: 'services', label: 'Xizmatlar', icon: 'medical_services' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* New Invoice Tab */}
          {activeTab === 'new-invoice' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Patient & Services */}
              <div className="lg:col-span-2 space-y-6">
                {/* Patient Search */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Bemorni tanlang
                    </label>
                    <button
                      onClick={() => setShowPatientModal(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:opacity-90 transition-all"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                      Yangi bemor
                    </button>
                  </div>
                  
                  {/* Search input for filtering */}
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      const now = Date.now();
                      
                      // Agar oxirgi scan'dan 500ms o'tmagan bo'lsa, ignore qilish (duplicate scan)
                      if (now - lastScanTimeRef.current < 500) {
                        console.log('Duplicate scan detected (too fast), ignoring...');
                        return;
                      }
                      
                      // Oxirgi scan vaqtini yangilash
                      lastScanTimeRef.current = now;
                      setPatientSearch(newValue);
                    }}
                    placeholder="Bemor nomini yozing..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                  />
                  
                  <select
                    value={selectedPatient?.id || selectedPatient?._id || ''}
                    onChange={async (e) => {
                      if (e.target.value) {
                        try {
                          const response = await api.get(`/patients/${e.target.value}`);
                          if (response.data.success) {
                            const patientData = response.data.data;
                            setSelectedPatient(patientData);
                          }
                        } catch (error) {
                          console.error('Error loading patient:', error);
                          showAlert('Bemorni yuklashda xatolik', 'error', 'Xatolik');
                        }
                      } else {
                        setSelectedPatient(null);
                      }
                    }}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Bemorni tanlang...</option>
                    {searchResults
                      .filter(patient => {
                        if (!patientSearch) return true;
                        const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
                        const phone = patient.phone || '';
                        const search = patientSearch.toLowerCase();
                        return fullName.includes(search) || phone.includes(search);
                      })
                      .map(patient => (
                        <option key={patient.id || patient._id} value={patient.id || patient._id}>
                          {patient.first_name} {patient.last_name} - {patient.phone}
                        </option>
                      ))
                    }
                  </select>
                  
                  {selectedPatient && (
                    <div className="mt-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {selectedPatient.patient?.first_name || selectedPatient.first_name} {selectedPatient.patient?.last_name || selectedPatient.last_name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {selectedPatient.patient?.patient_number || selectedPatient.patient_number} • Balans: {formatCurrency((selectedPatient.patient?.current_balance || selectedPatient.current_balance) || 0)}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedPatient(null)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      </div>
                      
                      {/* Revisit Discount Info */}
                      {(() => {
                        const lastVisitDate = selectedPatient.patient?.last_visit_date || selectedPatient.last_visit_date;
                        if (!lastVisitDate) return null;
                        
                        const lastVisit = new Date(lastVisitDate);
                        lastVisit.setHours(0, 0, 0, 0); // Faqat sanani solishtirish
                        
                        const today = new Date();
                        today.setHours(0, 0, 0, 0); // Faqat sanani solishtirish
                        
                        const daysDiff = Math.floor((today - lastVisit) / (1000 * 60 * 60 * 24));
                        
                        if (daysDiff === 0) {
                          return (
                            <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-green-600 dark:text-green-400">local_offer</span>
                                <div>
                                  <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                                    🎉 Bugungi qayta qabul: 100% (BEPUL)
                                  </p>
                                  <p className="text-xs text-green-700 dark:text-green-300">
                                    Bugun allaqachon qabul bo'lgansiz - qo'shimcha to'lov yo'q!
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        } else if (daysDiff >= 1 && daysDiff <= 3) {
                          return (
                            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">local_offer</span>
                                <div>
                                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                                    🎉 Qayta qabul chegirmasi: 100% (BEPUL)
                                  </p>
                                  <p className="text-xs text-blue-700 dark:text-blue-300">
                                    Oxirgi qabul: {daysDiff} kun oldin ({lastVisit.toLocaleDateString('uz-UZ')})
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        } else if (daysDiff >= 4 && daysDiff <= 7) {
                          return (
                            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">local_offer</span>
                                <div>
                                  <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                                    🎁 Qayta qabul chegirmasi: 50%
                                  </p>
                                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                    Oxirgi qabul: {daysDiff} kun oldin ({lastVisit.toLocaleDateString('uz-UZ')})
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        } else if (daysDiff >= 8) {
                          return (
                            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Oxirgi qabul: {daysDiff} kun oldin ({lastVisit.toLocaleDateString('uz-UZ')})
                              </p>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>

                {/* Services List */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Xizmatlar
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {services.map(service => (
                      <button
                        key={service._id || service.id}
                        onClick={() => addServiceToInvoice(service)}
                        disabled={!selectedPatient}
                        className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <p className="font-semibold text-gray-900 dark:text-white">{service.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{service.category_name || service.category}</p>
                        <p className="text-primary font-bold mt-1">{formatCurrency(service.price)}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Doctor Selection (Optional) */}
                {invoiceItems.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Shifokor (ixtiyoriy)
                    </label>
                    <select
                      value={selectedDoctor || ''}
                      onChange={(e) => setSelectedDoctor(e.target.value || null)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Shifokor tanlanmagan</option>
                      {onDutyDoctors.length > 0 && (
                        <optgroup label="🟢 Navbatdagi shifokorlar (bugun)">
                          {onDutyDoctors.map(shift => (
                            <option 
                              key={shift._id} 
                              value={shift.doctor_id?._id || shift.doctor_id?.id}
                            >
                              👨‍⚕️ {shift.doctor_id?.first_name} {shift.doctor_id?.last_name} 
                              {shift.doctor_id?.specialization ? ` - ${shift.doctor_id.specialization}` : ''}
                              {' '}({shift.start_time} - {shift.end_time})
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    {onDutyDoctors.length > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">info</span>
                        Bugun {onDutyDoctors.length} ta shifokor navbatda
                      </p>
                    )}
                    {onDutyDoctors.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">info</span>
                        Bugun navbatdagi shifokorlar yo'q
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Invoice Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 h-fit sticky top-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Hisob-faktura</h3>
                
                {invoiceItems.length === 0 ? (
                  <div className="text-center py-8">
                    <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-700 mb-2">
                      shopping_cart
                    </span>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Xizmatlar tanlanmagan</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invoiceItems.map(item => (
                      <div key={item.service_id} className="flex items-center justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.description}</p>
                          <p className="text-xs text-gray-500">{formatCurrency(item.unit_price)} × {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateItemQuantity(item.service_id, item.quantity - 1)}
                            className="size-6 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            <span className="material-symbols-outlined text-sm">remove</span>
                          </button>
                          <span className="text-sm font-semibold w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateItemQuantity(item.service_id, item.quantity + 1)}
                            className="size-6 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            <span className="material-symbols-outlined text-sm">add</span>
                          </button>
                          <button
                            onClick={() => removeServiceFromInvoice(item.service_id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Jami:</span>
                    <span className="font-semibold">{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">Chegirma:</label>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        const subtotal = calculateSubtotal();
                        const maxDiscount = subtotal * 0.20; // 20% chegirma
                        
                        // Qabulxonachi uchun 20% cheklov
                        const userRole = (user?.role?.name || user?.role_name || '').toLowerCase();
                        if (userRole === 'reception' || userRole === 'qabulxona' || userRole === 'receptionist') {
                          if (value > maxDiscount) {
                            showAlert(`Qabulxonachi maksimal 20% (${formatCurrency(maxDiscount)}) chegirma bera oladi`, 'warning', 'Chegirma cheklovi');
                            setDiscount(maxDiscount);
                            return;
                          }
                        }
                        
                        setDiscount(value);
                      }}
                      className="flex-1 px-3 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-sm"
                      placeholder="0"
                    />
                  </div>
                  
                  {/* Chegirma cheklovi haqida ogohlantirish */}
                  {(() => {
                    const userRole = (user?.role?.name || user?.role_name || '').toLowerCase();
                    if (userRole === 'reception' || userRole === 'qabulxona' || userRole === 'receptionist') {
                      const subtotal = calculateSubtotal();
                      const maxDiscount = subtotal * 0.20;
                      return (
                        <div className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">info</span>
                          Maksimal chegirma: 20% ({formatCurrency(maxDiscount)})
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span>To'lov:</span>
                    <span className="text-primary">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Izohlar..."
                    rows="2"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-sm"
                  />
                </div>

                <button
                  onClick={handleCreateInvoice}
                  disabled={!selectedPatient || invoiceItems.length === 0}
                  className="w-full mt-4 px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">check_circle</span>
                  Hisob-faktura yaratish
                </button>
              </div>
            </div>
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div className="space-y-4">
              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
                    receipt_long
                  </span>
                  <p className="text-gray-500 dark:text-gray-400">Hisob-fakturalar yo'q</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map(invoice => (
                    <div key={invoice.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <p className="font-bold text-primary">{invoice.invoice_number}</p>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              invoice.payment_status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                              invoice.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                              'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                              {invoice.payment_status === 'paid' ? 'To\'langan' : 
                               invoice.payment_status === 'partial' ? 'Qisman' : 'To\'lanmagan'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {invoice.first_name} {invoice.last_name} • {invoice.patient_number}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{formatDate(invoice.created_at)}</p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatCurrency(invoice.total_amount)}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            To'langan: {formatCurrency(invoice.paid_amount)}
                          </p>
                          {invoice.payment_status !== 'paid' && (
                            <p className="text-sm text-red-600 font-semibold">
                              Qoldi: {formatCurrency(invoice.total_amount - invoice.paid_amount)}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => printInvoice(invoice)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 flex items-center gap-1"
                            title="Chop etish"
                          >
                            <span className="material-symbols-outlined text-lg">print</span>
                            Chop
                          </button>
                          {invoice.payment_status !== 'paid' && (
                            <button
                              onClick={() => openPaymentModal(invoice)}
                              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90"
                            >
                              To'lov
                            </button>
                          )}
                          {invoice.payment_status === 'paid' && (
                            <button
                              onClick={() => generateInvoiceQR(invoice)}
                              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
                              title="QR kod"
                            >
                              <span className="material-symbols-outlined">qr_code</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              {recentTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
                    history
                  </span>
                  <p className="text-gray-500 dark:text-gray-400">Tranzaksiyalar yo'q</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTransactions.map(transaction => (
                    <div key={transaction.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`size-12 rounded-lg flex items-center justify-center ${
                            transaction.payment_method === 'CASH' ? 'bg-green-100 text-green-600' :
                            transaction.payment_method === 'CARD' ? 'bg-green-100 text-green-600' :
                            'bg-purple-100 text-purple-600'
                          }`}>
                            <span className="material-symbols-outlined">
                              {transaction.payment_method === 'CASH' ? 'payments' :
                               transaction.payment_method === 'CARD' ? 'credit_card' : 'account_balance'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {transaction.first_name} {transaction.last_name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {transaction.invoice_number} • {transaction.payment_method}
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(transaction.created_at)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-green-600">
                            +{formatCurrency(transaction.amount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1">
                  <p className="text-gray-600 dark:text-gray-400">
                    Jami: {services.length} ta xizmat
                  </p>
                </div>
                
                <button
                  onClick={() => openServiceModal()}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">add</span>
                  Xizmat qo'shish
                </button>
              </div>

              {services.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
                    medical_services
                  </span>
                  <p className="text-gray-500 dark:text-gray-400">
                    Xizmatlar yo'q
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map(service => (
                    <div key={service._id || service.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 dark:text-white">{service.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{service.category_name}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          service.is_active 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                          {service.is_active ? 'Faol' : 'Nofaol'}
                        </span>
                      </div>
                      
                      <p className="text-2xl font-black text-primary mb-2">
                        {formatCurrency(service.price)}
                      </p>
                      
                      {service.duration_minutes && (
                        <p className="text-sm text-gray-500 mb-2">
                          <span className="material-symbols-outlined text-sm align-middle">schedule</span>
                          {' '}{service.duration_minutes} daqiqa
                        </p>
                      )}
                      
                      {service.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {service.description}
                        </p>
                      )}
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => openServiceModal(service)}
                          className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600"
                        >
                          Tahrirlash
                        </button>
                        <button
                          onClick={() => handleDeleteService(service._id || service.id)}
                          className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Service Modal */}
      <Modal isOpen={showServiceModal} onClose={() => setShowServiceModal(false)}>
        <form onSubmit={handleServiceSubmit} className="space-y-4">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">
            {editingService ? 'Xizmatni tahrirlash' : 'Yangi xizmat qo\'shish'}
          </h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Xizmat nomi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={serviceForm.name}
              onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Masalan: Qon tahlili"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Narx (so'm) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={serviceForm.price}
                onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Davomiyligi (daqiqa)
              </label>
              <input
                type="number"
                value={serviceForm.duration_minutes}
                onChange={(e) => setServiceForm({ ...serviceForm, duration_minutes: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Tavsif
            </label>
            <textarea
              value={serviceForm.description}
              onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
              rows="3"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Xizmat haqida qisqacha ma'lumot..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={serviceForm.is_active}
              onChange={(e) => setServiceForm({ ...serviceForm, is_active: e.target.checked })}
              className="size-4 text-primary focus:ring-primary rounded"
            />
            <label htmlFor="is_active" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Faol xizmat
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowServiceModal(false)}
              className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90"
            >
              {editingService ? 'Saqlash' : 'Qo\'shish'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)}>
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">To'lov qabul qilish</h2>
          
          {selectedInvoice && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Hisob-faktura</p>
              <p className="font-bold text-gray-900 dark:text-white">{selectedInvoice.invoice_number}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Jami: {formatCurrency(selectedInvoice.total_amount)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                To'langan: {formatCurrency(selectedInvoice.paid_amount)}
              </p>
              <p className="text-lg font-bold text-red-600 mt-1">
                Qoldi: {formatCurrency(selectedInvoice.total_amount - selectedInvoice.paid_amount)}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              To'lov summasi <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              To'lov usuli <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'cash', label: 'Naqd', icon: 'payments' },
                { value: 'card', label: 'Karta', icon: 'credit_card' },
                { value: 'transfer', label: 'O\'tkazma', icon: 'account_balance' }
              ].map(method => (
                <button
                  key={method.value}
                  onClick={() => setPaymentMethod(method.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    paymentMethod === method.value
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl">{method.icon}</span>
                  <p className="text-xs font-semibold mt-1">{method.label}</p>
                </button>
              ))}
            </div>
          </div>

          {(paymentMethod === 'CARD' || paymentMethod === 'TRANSFER' || paymentMethod === 'ONLINE') && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Tranzaksiya ID
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Tranzaksiya ID ni kiriting"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setShowPaymentModal(false)}
              className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleProcessPayment}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90"
            >
              To'lovni qabul qilish
            </button>
          </div>
        </div>
      </Modal>

      {/* QR Code Modal */}
      <Modal isOpen={showQRModal} onClose={() => setShowQRModal(false)} size="sm">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">Hisob-faktura QR</h2>
          {selectedInvoice && (
            <>
              <p className="text-gray-600 dark:text-gray-400">{selectedInvoice.invoice_number}</p>
              {qrCodeUrl && (
                <div className="flex justify-center">
                  <img src={qrCodeUrl} alt="QR Code" className="size-64" />
                </div>
              )}
              <p className="text-sm text-gray-500">
                Summa: {formatCurrency(selectedInvoice.total_amount)}
              </p>
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.download = `${selectedInvoice.invoice_number}-qr.png`;
                  link.href = qrCodeUrl;
                  link.click();
                }}
                className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:opacity-90"
              >
                Yuklab olish
              </button>
            </>
          )}
        </div>
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

      {/* Patient Creation Modal */}
      <Modal
        isOpen={showPatientModal}
        onClose={() => {
          setShowPatientModal(false);
          setPatientForm({
            first_name: '',
            last_name: '',
            phone: '',
            date_of_birth: '',
            gender: 'male',
            address: '',
            house_number: ''
          });
        }}
        title="Yangi bemor qo'shish"
      >
        <form onSubmit={handleCreatePatient} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Ism *
              </label>
              <input
                type="text"
                value={patientForm.first_name}
                onChange={(e) => setPatientForm({ ...patientForm, first_name: e.target.value })}
                required
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ism"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Familiya *
              </label>
              <input
                type="text"
                value={patientForm.last_name}
                onChange={(e) => setPatientForm({ ...patientForm, last_name: e.target.value })}
                required
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Familiya"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Telefon *
            </label>
            <PhoneInput
              value={patientForm.phone}
              onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
              required
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="+998 90 123 45 67"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Tug'ilgan yili
              </label>
              <YearInput
                value={patientForm.date_of_birth}
                onChange={(e) => setPatientForm({ ...patientForm, date_of_birth: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Jinsi
              </label>
              <select
                value={patientForm.gender}
                onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="male">Erkak</option>
                <option value="female">Ayol</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Manzil
              </label>
              <textarea
                value={patientForm.address}
                onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                rows="2"
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Manzil"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Uy raqami
              </label>
              <input
                type="text"
                value={patientForm.house_number}
                onChange={(e) => setPatientForm({ ...patientForm, house_number: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Uy raqami"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowPatientModal(false);
                setPatientForm({
                  first_name: '',
                  last_name: '',
                  phone: '',
                  date_of_birth: '',
                  gender: 'male',
                  address: '',
                  house_number: ''
                });
              }}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-all"
            >
              Saqlash
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CashierAdvanced;
