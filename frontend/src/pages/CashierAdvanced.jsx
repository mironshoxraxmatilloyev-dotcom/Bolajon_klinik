import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import billingService from '../services/billingService';
import patientService from '../services/patientService';
import servicesService from '../services/servicesService';
import { queueService } from '../services/queueService';
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
  const [expandedCategories, setExpandedCategories] = useState({});
  const [serviceFilter, setServiceFilter] = useState('all'); // all, category
  const [serviceSearch, setServiceSearch] = useState('');
  const [activeTab, setActiveTab] = useState('new-invoice');
  
  // Services Management State
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    category: '',
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
  const [allDoctors, setAllDoctors] = useState([]);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [doctorSelectionMode, setDoctorSelectionMode] = useState(''); // 'queue' or 'onduty'
  
  // Laboratoriya uchun state'lar
  const [selectedLaborant, setSelectedLaborant] = useState(null);
  const [allLaborants, setAllLaborants] = useState([]);
  const [showLaborantModal, setShowLaborantModal] = useState(false);
  const [hasLabServices, setHasLabServices] = useState(false);
  const [hasNonLabServices, setHasNonLabServices] = useState(false);
  
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
  
  // Load saved form data from localStorage
  useEffect(() => {
    const savedPatientData = localStorage.getItem('patientFormHistory');
    if (savedPatientData) {
      try {
        const history = JSON.parse(savedPatientData);
        // Don't auto-fill, just keep history for autocomplete
      } catch (error) {
        console.error('Error loading patient form history:', error);
      }
    }
  }, []);
  
  // Save form data to localStorage when patient is created
  const savePatientFormHistory = (formData) => {
    try {
      const history = JSON.parse(localStorage.getItem('patientFormHistory') || '[]');
      
      // Add new entry
      const newEntry = {
        ...formData,
        timestamp: new Date().toISOString()
      };
      
      // Keep only last 50 entries
      const updatedHistory = [newEntry, ...history].slice(0, 50);
      
      localStorage.setItem('patientFormHistory', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error saving patient form history:', error);
    }
  };
  
  // Get autocomplete suggestions
  const getAutocompleteSuggestions = (field, value) => {
    try {
      const history = JSON.parse(localStorage.getItem('patientFormHistory') || '[]');
      
      if (!value || value.length < 2) return [];
      
      const suggestions = history
        .map(entry => entry[field])
        .filter(item => item && item.toLowerCase().includes(value.toLowerCase()))
        .filter((item, index, self) => self.indexOf(item) === index) // Remove duplicates
        .slice(0, 10);
      
      return suggestions;
    } catch (error) {
      return [];
    }
  };
  
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
    loadAllDoctors(); // Barcha shifokorlarni yuklash
    loadAllLaborants(); // Barcha laborantlarni yuklash
    
    // Clear any cached service data
    setInvoiceItems([]);
    
    // Laboratoriya kategoriyasini avtomatik ochish
    setExpandedCategories({ 'Laboratoriya': true });
  }, []);

  // Remove the useEffect that was causing slow typing
  // Patients are already loaded in loadAllPatients()
  // Filtering happens in the datalist automatically

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, invoicesData, transactionsData, patientsData] = await Promise.all([
        billingService.getStats(),
        billingService.getInvoices({ limit: 20 }),
        billingService.getTransactions({ limit: 10 }),
        api.get('/patients/search', { params: { q: '', limit: 100 } })
      ]);
      
      if (statsData.success) setStats(statsData.data);
      if (invoicesData.success) setInvoices(invoicesData.data);
      if (transactionsData.success) setRecentTransactions(transactionsData.data);
      // setServices ni olib tashladik - faqat loadServices ishlatiladi
      if (patientsData.data.success) setSearchResults(patientsData.data.data);
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      console.log('=== LOADING SERVICES START ===');
      
      let allServices = [];
      
      // 1. Billing xizmatlarini yuklash
      try {
        const servicesData = await servicesService.getServices();
        console.log('Billing services response:', servicesData);
        
        if (servicesData.success && servicesData.data) {
          allServices = [...servicesData.data];
          console.log('Billing services count:', allServices.length);
        }
      } catch (billingError) {
        console.error('Load billing services error:', billingError);
      }
      
      // 2. Laboratoriya testlarini yuklash
      try {
        console.log('Loading lab tests...');
        const labTestsResponse = await api.get('/laboratory/tests');
        console.log('Lab tests response:', labTestsResponse.data);
        
        if (labTestsResponse.data.success && labTestsResponse.data.data) {
          // Lab testlarni xizmat formatiga o'tkazish
          const labServices = labTestsResponse.data.data.map(test => ({
            _id: test._id || test.id,
            id: test._id || test.id,
            name: test.name,
            category: 'Laboratoriya',
            price: test.price || 0,
            description: test.description || '',
            is_active: test.is_active !== false
          }));
          
          console.log('Lab services converted:', labServices.length, 'tests');
          allServices = [...allServices, ...labServices];
        }
      } catch (labError) {
        console.error('Load lab tests error:', labError);
        // Lab testlar yuklanmasa ham davom etamiz
      }
      
      console.log('=== FINAL SERVICES ===');
      console.log('Total services:', allServices.length);
      console.log('All categories:', [...new Set(allServices.map(s => s.category))]);
      
      // State'ni yangilash
      setServices(allServices);
      
      console.log('=== LOADING SERVICES END ===');
    } catch (error) {
      console.error('Load services error:', error);
      showAlert('Xizmatlarni yuklashda xatolik', 'error', 'Xatolik');
    }
  };

  // Xizmatlarni kategoriya bo'yicha guruhlash
  const groupServicesByCategory = () => {
    console.log('=== GROUPING SERVICES ===');
    console.log('Total services to group:', services.length);
    console.log('Services:', services.map(s => ({ name: s.name, category: s.category })));
    
    const grouped = {};
    
    // Xizmatlarni tegishli kategoriyalarga joylashtirish
    services.forEach(service => {
      let category = service.category || 'Boshqa';
      
      // "Laboratoriya xizmatlari" ni "Laboratoriya" ga o'tkazish
      if (category === 'Laboratoriya xizmatlari') {
        console.log(`Converting category for ${service.name}: "Laboratoriya xizmatlari" -> "Laboratoriya"`);
        category = 'Laboratoriya';
      }
      
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(service);
    });
    
    console.log('Grouped categories:', Object.keys(grouped).map(cat => `${cat}: ${grouped[cat].length}`));
    
    // Kategoriyalarni tartiblash: Laboratoriya birinchi, keyin qolganlari
    const sortedGrouped = {};
    const categoryOrder = ['Laboratoriya', 'Shifokor ko\'rigi', 'Kunduzgi muolaja', 'Fizioterapiya xizmatlari'];
    
    // Avval tartiblangan kategoriyalarni qo'shish
    categoryOrder.forEach(cat => {
      if (grouped[cat] && grouped[cat].length > 0) {
        sortedGrouped[cat] = grouped[cat];
        console.log(`Added category "${cat}" with ${grouped[cat].length} services`);
      }
    });
    
    // Keyin qolgan kategoriyalarni qo'shish
    Object.keys(grouped).forEach(cat => {
      if (!categoryOrder.includes(cat) && grouped[cat].length > 0) {
        sortedGrouped[cat] = grouped[cat];
        console.log(`Added other category "${cat}" with ${grouped[cat].length} services`);
      }
    });
    
    console.log('=== GROUPING COMPLETE ===');
    console.log('Final categories:', Object.keys(sortedGrouped));
    
    return sortedGrouped;
  };

  // Xizmatlarni filtrlash
  const getFilteredServices = () => {
    let filtered = services;
    
    // Kategoriya bo'yicha filtrlash
    if (serviceFilter !== 'all') {
      filtered = filtered.filter(s => s.category === serviceFilter);
    }
    
    // Qidiruv
    if (serviceSearch) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        (s.category && s.category.toLowerCase().includes(serviceSearch.toLowerCase()))
      );
    }
    
    return filtered;
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
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

  const loadAllDoctors = async () => {
    try {
      const response = await queueService.getDoctors();
      if (response.success) {
        setAllDoctors(response.data);
      }
    } catch (error) {
      console.error('Load all doctors error:', error);
    }
  };

  const loadAllLaborants = async () => {
    try {
      const response = await api.get('/staff', {
        params: { role: 'Laborant' }
      });
      if (response.data.success) {
        setAllLaborants(response.data.data);
      }
    } catch (error) {
      console.error('Load laborants error:', error);
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
        
        // Save form data to history
        savePatientFormHistory(patientForm);
        
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
    console.log('=== ADD SERVICE DEBUG ===');
    console.log('Service object:', service);
    
    const serviceId = service._id || service.id;
    
    if (!serviceId) {
      console.error('Service ID not found!');
      showAlert('Xizmat ID topilmadi', 'error', 'Xatolik');
      return;
    }
    
    console.log('Adding service with ID:', serviceId);
    
    const existingItem = invoiceItems.find(item => item.service_id === serviceId);
    
    let updatedItems;
    if (existingItem) {
      // Miqdorni oshirish
      updatedItems = invoiceItems.map(item =>
        item.service_id === serviceId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      setInvoiceItems(updatedItems);
    } else {
      // Yangi xizmat qo'shish
      const newItem = {
        service_id: serviceId,
        description: service.name,
        quantity: 1,
        unit_price: parseFloat(service.price) || 0,
        discount_percentage: 0,
        category: service.category || 'Boshqa'
      };
      updatedItems = [...invoiceItems, newItem];
      setInvoiceItems(updatedItems);
    }
    
    // Har doim laboratoriya xizmatlarini tekshirish
    checkForLabServices(updatedItems);
    
    console.log('Service added successfully');
  };

  // Laboratoriya xizmatlarini tekshirish
  const checkForLabServices = (items) => {
    const hasLab = items.some(item => item.category === 'Laboratoriya');
    const hasNonLab = items.some(item => item.category !== 'Laboratoriya');
    
    console.log('Checking services:', { 
      items, 
      hasLab, 
      hasNonLab,
      categories: items.map(i => i.category)
    });
    
    setHasLabServices(hasLab);
    setHasNonLabServices(hasNonLab);
    
    // Agar laboratoriya xizmati bo'lmasa, laborantni tozalash
    if (!hasLab && selectedLaborant) {
      setSelectedLaborant(null);
    }
    
    // Agar laboratoriya bo'lmagan xizmat bo'lmasa, shifokorni tozalash
    if (!hasNonLab && selectedDoctor) {
      setSelectedDoctor(null);
      setDoctorSelectionMode('');
    }
  };

  const removeServiceFromInvoice = (serviceId) => {
    const updatedItems = invoiceItems.filter(item => item.service_id !== serviceId);
    setInvoiceItems(updatedItems);
    checkForLabServices(updatedItems); // Laboratoriya xizmatlarini qayta tekshirish
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

  const handleAddToQueue = async () => {
    if (!selectedPatient || !selectedDoctor) {
      showAlert('Bemor va shifokorni tanlang', 'warning', 'Ogohlantirish');
      return;
    }

    // Dejur shifokorga biriktirsa, navbatga qo'shmaslik
    if (doctorSelectionMode === 'onduty') {
      showAlert('Dejur shifokor tanlandi. Hisob-faktura yaratishda shifokor avtomatik biriktiriladi.', 'success', 'Muvaffaqiyatli');
      setShowDoctorModal(false);
      return;
    }

    try {
      const patient = selectedPatient.patient || selectedPatient;
      
      const queueData = {
        patient_id: patient.id,
        doctor_id: selectedDoctor,
        priority: 'normal',
        notes: invoiceItems.map(item => item.description).join(', ')
      };

      const response = await queueService.addToQueue(queueData);

      if (response.success) {
        showAlert('Bemor navbatga qo\'shildi!', 'success', 'Muvaffaqiyatli');
        setShowDoctorModal(false);
        setDoctorSelectionMode('');
      }
    } catch (error) {
      console.error('Add to queue error:', error);
      showAlert(error.response?.data?.message || 'Navbatga qo\'shishda xatolik', 'error', 'Xatolik');
    }
  };

  const openDoctorModal = (mode) => {
    setDoctorSelectionMode(mode);
    setShowDoctorModal(true);
  };

  const handleCreateInvoice = async () => {
    console.log('=== HANDLE CREATE INVOICE START ===');
    console.log('selectedPatient:', selectedPatient);
    console.log('invoiceItems:', invoiceItems);
    console.log('hasLabServices:', hasLabServices);
    console.log('hasNonLabServices:', hasNonLabServices);
    console.log('selectedLaborant:', selectedLaborant);
    console.log('selectedDoctor:', selectedDoctor);
    
    if (!selectedPatient) {
      showAlert('Iltimos, bemorni tanlang', 'warning', 'Ogohlantirish');
      return;
    }
    
    if (invoiceItems.length === 0) {
      showAlert('Iltimos, xizmatlarni tanlang', 'warning', 'Ogohlantirish');
      return;
    }

    // Laboratoriya xizmatlari uchun laborant majburiy
    if (hasLabServices && !selectedLaborant) {
      showAlert('Laboratoriya xizmatlari uchun laborantni tanlang', 'warning', 'Ogohlantirish');
      return;
    }

    // Boshqa xizmatlar uchun shifokor majburiy
    if (hasNonLabServices && !selectedDoctor) {
      showAlert('Iltimos, shifokor biriktiring yoki navbatga qo\'shing', 'warning', 'Ogohlantirish');
      return;
    }

    try {
      // selectedPatient ichida patient obyekti bor
      const patient = selectedPatient.patient || selectedPatient;
      
      if (!patient || !patient.id) {
        showAlert('Bemor ma\'lumotlari noto\'g\'ri', 'error', 'Xatolik');
        return;
      }

      console.log('=== INVOICE ITEMS DEBUG ===');
      console.log('Invoice items:', invoiceItems);

      // Faqat kerakli maydonlarni yuborish
      const items = invoiceItems.map(item => {
        console.log('Processing item:', item);
        return {
          service_id: item.service_id,
          quantity: item.quantity
        };
      });

      console.log('Items to send:', items);

      const invoiceData = {
        patient_id: patient.id,
        items: items,
        paid_amount: 0,
        payment_method: null,
        discount_amount: discount || 0,
        notes: notes || ''
      };

      // Shifokor (agar boshqa xizmatlar bo'lsa)
      if (hasNonLabServices && selectedDoctor) {
        invoiceData.doctor_id = selectedDoctor;
      }

      console.log('Invoice data to send:', invoiceData);

      const response = await billingService.createInvoice(invoiceData);

      console.log('Invoice created:', response);
      console.log('Response data:', response.data);
      console.log('Invoice object:', response.data?.invoice);
      console.log('hasLabServices:', hasLabServices);
      console.log('selectedLaborant:', selectedLaborant);

      if (response.success) {
        // Agar laboratoriya xizmatlari bo'lsa, lab order yaratish
        let labOrdersCreated = false;
        if (hasLabServices && selectedLaborant) {
          try {
            const labItems = invoiceItems.filter(item => item.category === 'Laboratoriya');
            
            console.log('Creating lab orders for', labItems.length, 'tests');
            console.log('Lab items:', labItems);
            
            // Har bir test uchun alohida buyurtma yaratish
            for (const labItem of labItems) {
              const labOrderData = {
                patient_id: patient.id,
                test_id: labItem.service_id,
                laborant_id: selectedLaborant,
                invoice_id: response.data?.invoice?._id || response.data?.invoice?.id || response.data?.id,
                priority: 'normal',
                notes: notes || ''
              };

              console.log('Creating lab order:', labOrderData);
              
              // Agar invoice_id yo'q bo'lsa, xatolik
              if (!labOrderData.invoice_id) {
                console.error('Invoice ID not found in response:', response.data);
                throw new Error('Invoice ID topilmadi');
              }
              
              const labResponse = await api.post('/laboratory/orders', labOrderData);
              
              if (labResponse.data.success) {
                console.log('Lab order created successfully for test:', labItem.description);
                labOrdersCreated = true;
              }
            }
          } catch (labError) {
            console.error('Lab order creation error:', labError);
            console.error('Lab error response:', labError.response?.data);
            // Lab order xatosi bo'lsa ham, invoice yaratilgan
            showAlert('Hisob-faktura yaratildi, lekin laboratoriya buyurtmasida xatolik: ' + (labError.response?.data?.message || labError.message), 'warning', 'Ogohlantirish');
            return; // Xatolik bo'lsa, davom etmaymiz
          }
        } else {
          console.log('Lab order NOT created. Reason:', {
            hasLabServices,
            selectedLaborant,
            invoiceItems: invoiceItems.map(i => ({ desc: i.description, cat: i.category }))
          });
        }

        // Qayta qabul chegirmasi haqida xabar
        let message = 'Hisob-faktura muvaffaqiyatli yaratildi!';
        if (response.data?.revisit_discount > 0) {
          message += `\n\n🎉 ${response.data.revisit_discount_reason}`;
        }
        if (labOrdersCreated) {
          message += '\n\nLaboratoriya buyurtmasi yaratildi.';
        }
        
        showAlert(message, 'success', 'Muvaffaqiyatli');
        // Reset form
        setSelectedPatient(null);
        setInvoiceItems([]);
        setDiscount(0);
        setNotes('');
        setPatientSearch('');
        setSelectedDoctor(null);
        setSelectedLaborant(null);
        setHasLabServices(false);
        setHasNonLabServices(false);
        setDoctorSelectionMode('');
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
      // Items array'ini olish - avval items, keyin services, keyin bo'sh array
      let items = invoiceData.items || [];
      
      // Agar items bo'sh bo'lsa, services array'ini ishlatish
      if (items.length === 0 && invoiceData.services && invoiceData.services.length > 0) {
        items = invoiceData.services.map(s => ({
          service_name: s.service_name,
          description: s.service_name,
          quantity: s.quantity || 1,
          unit_price: s.price,
          total_price: (s.quantity || 1) * s.price
        }));
      }
      
      // Agar hali ham bo'sh bo'lsa va metadata bor bo'lsa (mutaxasis uchun)
      if (items.length === 0 && invoiceData.metadata && invoiceData.metadata.specialist_type) {
        items = [{
          service_name: `${invoiceData.metadata.specialist_type} - ${invoiceData.metadata.doctor_name || 'Mutaxasis'}`,
          description: `${invoiceData.metadata.specialist_type} - ${invoiceData.metadata.doctor_name || 'Mutaxasis'}`,
          quantity: 1,
          unit_price: invoiceData.total_amount,
          total_price: invoiceData.total_amount
        }];
      }

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
              border: 1px solid #ddd;
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
              border: none !important;
            }
            .totals::before {
              display: none !important;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              border: none !important;
            }
            .totals-row::before {
              display: none !important;
            }
            .totals-row.grand-total {
              font-weight: bold;
              font-size: 16px;
              padding-top: 10px;
              border: none !important;
            }
            .totals-row.grand-total::before {
              display: none !important;
            }
            .footer {
              margin-top: 40px;
              clear: both;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display: flex; align-items: center; justify-content: center; gap: 15px;">
              <img src="/image.jpg" alt="Bolajon Logo" style="width: 60px; height: 60px; object-fit: contain;" />
              <h1>KLINIKA HISOB-FAKTURASI</h1>
            </div>
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

          <div class="totals" style="border-top: none;">
            <div class="totals-row grand-total" style="border-top: none; padding-top: 0;">
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
        category: service.category || '',
        price: service.price,
        duration_minutes: service.duration_minutes || '',
        description: service.description || '',
        is_active: service.is_active
      });
    } else {
      setEditingService(null);
      setServiceForm({
        name: '',
        category: '',
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
        category: serviceForm.category || 'Boshqa',
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
          // Save to history
          saveServiceFormHistory(serviceForm);
        }
      }

      setShowServiceModal(false);
      await loadServices(); // Faqat xizmatlarni qayta yuklash
      
      // Qo'shilgan xizmatning kategoriyasini ochish
      if (data.category) {
        setExpandedCategories(prev => ({
          ...prev,
          [data.category]: true
        }));
      }
      
      setActiveTab('services'); // Xizmatlar tabiga o'tish
    } catch (error) {
      console.error('Service submit error:', error);
      showAlert('Xatolik yuz berdi: ' + (error.response?.data?.message || error.message), 'error', 'Xatolik');
    }
  };
  
  // Save service form history
  const saveServiceFormHistory = (formData) => {
    try {
      const history = JSON.parse(localStorage.getItem('serviceFormHistory') || '[]');
      
      const newEntry = {
        ...formData,
        timestamp: new Date().toISOString()
      };
      
      const updatedHistory = [newEntry, ...history].slice(0, 50);
      localStorage.setItem('serviceFormHistory', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error saving service form history:', error);
    }
  };
  
  // Get service autocomplete suggestions
  const getServiceAutocompleteSuggestions = (field, value) => {
    try {
      const history = JSON.parse(localStorage.getItem('serviceFormHistory') || '[]');
      
      if (!value || value.length < 2) return [];
      
      const suggestions = history
        .map(entry => entry[field])
        .filter(item => item && item.toLowerCase().includes(value.toLowerCase()))
        .filter((item, index, self) => self.indexOf(item) === index)
        .slice(0, 10);
      
      return suggestions;
    } catch (error) {
      return [];
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
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">Kassa</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Hisob-fakturalar va to'lovlarni boshqarish
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-3 sm:gap-4 px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8">
            {[
              { id: 'new-invoice', label: 'Yangi hisob-faktura', icon: 'add_circle' },
              { id: 'invoices', label: 'Hisob-fakturalar', icon: 'receipt_long' },
              { id: 'transactions', label: 'Tranzaksiyalar', icon: 'history' },
              { id: 'services', label: 'Xizmatlar', icon: 'medical_services' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 sm:gap-2 sm:gap-3 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-3 sm:py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-base sm:text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {/* New Invoice Tab */}
          {activeTab === 'new-invoice' && (
            <div className="grid grid-cols-1 lg:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Left: Patient & Services */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {/* Patient Search */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
                      Bemorni tanlang
                    </label>
                    <button
                      onClick={() => setShowPatientModal(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-sm sm:text-sm sm:text-base rounded-lg sm:rounded-lg sm:rounded-xl hover:opacity-90 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm sm:text-base">add</span>
                      Yangi bemor
                    </button>
                  </div>
                  
                  {/* Searchable select with datalist */}
                  <input
                    list="patients-list"
                    value={patientSearch}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setPatientSearch(newValue);
                      
                      // Find and select patient if exact match (without API call)
                      const matchedPatient = searchResults.find(p => {
                        const fullName = `${p.first_name} ${p.last_name} - ${p.phone}`;
                        return fullName === newValue;
                      });
                      
                      if (matchedPatient) {
                        // Only load full patient data when selected
                        api.get(`/patients/${matchedPatient.id || matchedPatient._id}`)
                          .then(response => {
                            if (response.data.success) {
                              setSelectedPatient(response.data.data);
                            }
                          })
                          .catch(error => {
                            console.error('Error loading patient:', error);
                          });
                      } else if (!newValue) {
                        setSelectedPatient(null);
                      }
                    }}
                    placeholder="Bemorni qidiring yoki tanlang..."
                    className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    autoComplete="off"
                  />
                  
                  <datalist id="patients-list">
                    {searchResults.map(patient => (
                      <option 
                        key={patient.id || patient._id} 
                        value={`${patient.first_name} ${patient.last_name} - ${patient.phone}`}
                      />
                    ))}
                  </datalist>
                  
                  {selectedPatient && (
                    <div className="mt-3 p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg sm:rounded-lg sm:rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {selectedPatient.patient?.first_name || selectedPatient.first_name} {selectedPatient.patient?.last_name || selectedPatient.last_name}
                          </p>
                          <p className="text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400">
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
                            <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg sm:rounded-lg sm:rounded-xl border border-green-200 dark:border-green-800">
                              <div className="flex items-center gap-2 sm:gap-2 sm:gap-3">
                                <span className="material-symbols-outlined text-green-600 dark:text-green-400">local_offer</span>
                                <div>
                                  <p className="text-sm sm:text-sm sm:text-base font-semibold text-green-900 dark:text-green-100">
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
                            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg sm:rounded-lg sm:rounded-xl border border-blue-200 dark:border-blue-800">
                              <div className="flex items-center gap-2 sm:gap-2 sm:gap-3">
                                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">local_offer</span>
                                <div>
                                  <p className="text-sm sm:text-sm sm:text-base font-semibold text-blue-900 dark:text-blue-100">
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
                            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg sm:rounded-lg sm:rounded-xl border border-yellow-200 dark:border-yellow-800">
                              <div className="flex items-center gap-2 sm:gap-2 sm:gap-3">
                                <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">local_offer</span>
                                <div>
                                  <p className="text-sm sm:text-sm sm:text-base font-semibold text-yellow-900 dark:text-yellow-100">
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
                            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg sm:rounded-lg sm:rounded-xl">
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

                {/* Services List by Category */}
                <div>
                  <label className="block text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Xizmatlar
                  </label>
                  <div className="space-y-2 sm:space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
                    {Object.entries(groupServicesByCategory()).map(([category, categoryServices]) => (
                      <div key={category} className="border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-lg sm:rounded-xl overflow-hidden sm:block">
                        {/* Category Header */}
                        <button
                          onClick={() => toggleCategory(category)}
                          className="w-full p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-between transition-colors"
                        >
                          <span className="font-semibold text-gray-900 dark:text-white">{category}</span>
                          <div className="flex items-center gap-2 sm:gap-2 sm:gap-3">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {categoryServices.length} ta xizmat
                            </span>
                            <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">
                              {expandedCategories[category] ? 'expand_less' : 'expand_more'}
                            </span>
                          </div>
                        </button>
                        
                        {/* Category Services */}
                        {expandedCategories[category] && (
                          <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2 sm:gap-3 p-2 bg-white dark:bg-gray-900">
                            {categoryServices.map(service => (
                              <button
                                key={service._id || service.id}
                                onClick={() => addServiceToInvoice(service)}
                                disabled={!selectedPatient}
                                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg sm:rounded-lg sm:rounded-xl text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <p className="font-semibold text-gray-900 dark:text-white text-sm sm:text-sm sm:text-base">{service.name}</p>
                                <p className="text-primary font-bold mt-1">{formatCurrency(service.price)}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Doctor Selection Buttons */}
                {invoiceItems.length > 0 && selectedPatient && hasNonLabServices && (
                  <div className="space-y-2 sm:space-y-3">
                    <label className="block text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
                      Shifokor biriktirish <span className="text-red-500">*</span>
                    </label>
                    
                    {selectedDoctor ? (
                      <div className="p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg sm:rounded-lg sm:rounded-xl border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 sm:gap-2 sm:gap-3">
                            <span className="material-symbols-outlined text-green-600">check_circle</span>
                            <div>
                              <p className="font-semibold text-green-900 dark:text-green-100">
                                Shifokor tanlandi
                              </p>
                              <p className="text-xs text-green-700 dark:text-green-300">
                                {doctorSelectionMode === 'onduty' ? 'Dejur shifokor' : 'Navbatga qo\'shildi'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedDoctor(null);
                              setDoctorSelectionMode('');
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <span className="material-symbols-outlined">close</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                          <button
                            onClick={() => openDoctorModal('onduty')}
                            className="px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-green-500 text-white rounded-lg sm:rounded-lg sm:rounded-xl text-sm sm:text-sm sm:text-base font-semibold hover:bg-green-600 flex items-center justify-center gap-2 sm:gap-2 sm:gap-3"
                          >
                            <span className="material-symbols-outlined">medical_services</span>
                            Dejur shifokor
                          </button>
                          
                          <button
                            onClick={() => openDoctorModal('queue')}
                            className="px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-blue-500 text-white rounded-lg sm:rounded-lg sm:rounded-xl text-sm sm:text-sm sm:text-base font-semibold hover:bg-blue-600 flex items-center justify-center gap-2 sm:gap-2 sm:gap-3"
                          >
                            <span className="material-symbols-outlined">queue</span>
                            Navbatga qo'shish
                          </button>
                        </div>
                        
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg sm:rounded-lg sm:rounded-xl border border-yellow-200 dark:border-yellow-800">
                          <p className="text-xs text-yellow-800 dark:text-yellow-200 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm sm:text-sm sm:text-base">warning</span>
                            Hisob-faktura yaratish uchun shifokor biriktirish yoki navbatga qo'shish majburiy
                          </p>
                        </div>
                        
                        {onDutyDoctors.length > 0 && (
                          <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm sm:text-sm sm:text-base">info</span>
                            Bugun {onDutyDoctors.length} ta shifokor navbatda
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Laborant Selection */}
                {invoiceItems.length > 0 && selectedPatient && hasLabServices && (
                  <div className="space-y-2 sm:space-y-3">
                    <label className="block text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
                      Laborant biriktirish <span className="text-red-500">*</span>
                    </label>
                    
                    {selectedLaborant ? (
                      <div className="space-y-2">
                        <div className="p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg sm:rounded-lg sm:rounded-xl border border-purple-200 dark:border-purple-800">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 sm:gap-2 sm:gap-3">
                              <span className="material-symbols-outlined text-purple-600">science</span>
                              <div>
                                <p className="font-semibold text-purple-900 dark:text-purple-100">
                                  {allLaborants.find(l => l._id === selectedLaborant)?.full_name || 'Laborant'}
                                </p>
                                <p className="text-xs text-purple-700 dark:text-purple-300">
                                  {allLaborants.find(l => l._id === selectedLaborant)?.phone || 'Telefon yo\'q'}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => setSelectedLaborant(null)}
                              className="text-red-600 hover:text-red-700"
                              title="Laborantni olib tashlash"
                            >
                              <span className="material-symbols-outlined">close</span>
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowLaborantModal(true)}
                          className="w-full px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/40 flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined">swap_horiz</span>
                          Laborantni o'zgartirish
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setShowLaborantModal(true)}
                          className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-purple-500 text-white rounded-lg sm:rounded-lg sm:rounded-xl text-sm sm:text-sm sm:text-base font-semibold hover:bg-purple-600 flex items-center justify-center gap-2 sm:gap-2 sm:gap-3"
                        >
                          <span className="material-symbols-outlined">science</span>
                          Laborant tanlash
                        </button>
                        
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg sm:rounded-lg sm:rounded-xl border border-yellow-200 dark:border-yellow-800">
                          <p className="text-xs text-yellow-800 dark:text-yellow-200 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm sm:text-sm sm:text-base">warning</span>
                            Laboratoriya xizmatlari uchun laborant tanlash majburiy
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Invoice Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg sm:rounded-lg sm:rounded-xl p-4 sm:p-6 h-fit sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white">Hisob-faktura</h3>
                  {invoiceItems.length > 0 && (
                    <button
                      onClick={() => {
                        setInvoiceItems([]);
                        setDiscount(0);
                        setNotes('');
                      }}
                      className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                      title="Hammasini tozalash"
                    >
                      <span className="material-symbols-outlined text-sm sm:text-sm sm:text-base">delete_sweep</span>
                      Tozalash
                    </button>
                  )}
                </div>
                
                {invoiceItems.length === 0 ? (
                  <div className="text-center py-4 sm:py-6 lg:py-8">
                    <span className="material-symbols-outlined text-3xl sm:text-4xl text-gray-300 dark:text-gray-700 mb-2">
                      shopping_cart
                    </span>
                    <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-sm sm:text-base">Xizmatlar tanlanmagan</p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {invoiceItems.map(item => (
                      <div key={item.service_id} className="flex items-center justify-between gap-2 sm:gap-2 sm:gap-3">
                        <div className="flex-1">
                          <p className="text-sm sm:text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{item.description}</p>
                          <p className="text-xs text-gray-500">{formatCurrency(item.unit_price)} × {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-2 sm:gap-3">
                          <button
                            onClick={() => updateItemQuantity(item.service_id, item.quantity - 1)}
                            className="size-6 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            <span className="material-symbols-outlined text-sm sm:text-sm sm:text-base">remove</span>
                          </button>
                          <span className="text-sm sm:text-sm sm:text-base font-semibold w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateItemQuantity(item.service_id, item.quantity + 1)}
                            className="size-6 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            <span className="material-symbols-outlined text-sm sm:text-sm sm:text-base">add</span>
                          </button>
                          <button
                            onClick={() => removeServiceFromInvoice(item.service_id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <span className="material-symbols-outlined text-sm sm:text-sm sm:text-base">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2 sm:space-y-2 sm:space-y-3">
                  <div className="flex justify-between text-sm sm:text-sm sm:text-base">
                    <span className="text-gray-600 dark:text-gray-400">Jami:</span>
                    <span className="font-semibold">{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 sm:gap-2 sm:gap-3">
                    <label className="text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400">Chegirma:</label>
                    <input
                      type="number"
                      value={discount || ''}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        
                        // Agar input bo'sh bo'lsa, 0 qo'yish
                        if (inputValue === '' || inputValue === null || inputValue === undefined) {
                          setDiscount(0);
                          return;
                        }
                        
                        const value = parseFloat(inputValue);
                        
                        // Agar son bo'lmasa, ignore qilish
                        if (isNaN(value)) {
                          return;
                        }
                        
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
                      onFocus={(e) => {
                        // Focus bo'lganda 0 ni olib tashlash
                        if (discount === 0) {
                          e.target.value = '';
                        }
                      }}
                      onBlur={(e) => {
                        // Blur bo'lganda bo'sh bo'lsa 0 qo'yish
                        if (e.target.value === '') {
                          setDiscount(0);
                        }
                      }}
                      className="flex-1 px-3 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-sm sm:text-sm sm:text-base"
                      placeholder="0"
                      min="0"
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
                          <span className="material-symbols-outlined text-sm sm:text-sm sm:text-base">info</span>
                          Maksimal chegirma: 20% ({formatCurrency(maxDiscount)})
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  <div className="flex justify-between text-base sm:text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
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
                    className="w-full px-3 py-2 sm:py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-sm sm:text-sm sm:text-base"
                  />
                </div>

                <button
                  onClick={handleCreateInvoice}
                  disabled={
                    !selectedPatient || 
                    invoiceItems.length === 0 || 
                    (hasLabServices && !selectedLaborant) ||
                    (hasNonLabServices && !selectedDoctor)
                  }
                  className="w-full mt-4 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-primary text-white rounded-lg sm:rounded-lg sm:rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-2 sm:gap-3"
                >
                  <span className="material-symbols-outlined">check_circle</span>
                  Hisob-faktura yaratish
                </button>
              </div>
            </div>
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div className="space-y-3 sm:space-y-4">
              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
                    receipt_long
                  </span>
                  <p className="text-gray-500 dark:text-gray-400">Hisob-fakturalar yo'q</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {invoices.map(invoice => {
                    // Xizmatlar nomini olish
                    const serviceNames = invoice.items?.map(item => item.description || item.service_name).join(', ') || 'Xizmatlar';
                    const shortServiceName = serviceNames.length > 60 ? serviceNames.substring(0, 60) + '...' : serviceNames;
                    
                    return (
                    <div key={invoice.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg sm:rounded-lg sm:rounded-xl p-3 sm:p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <p className="font-bold text-lg text-gray-900 dark:text-white">{shortServiceName}</p>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              invoice.payment_status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                              invoice.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                              'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                              {invoice.payment_status === 'paid' ? 'To\'langan' : 
                               invoice.payment_status === 'partial' ? 'Qisman' : 'To\'lanmagan'}
                            </span>
                          </div>
                          <p className="text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                            {invoice.first_name} {invoice.last_name} • {invoice.patient_number}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {invoice.invoice_number} • {formatDate(invoice.created_at)}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                            {formatCurrency(invoice.total_amount)}
                          </p>
                          <p className="text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400">
                            To'langan: {formatCurrency(invoice.paid_amount)}
                          </p>
                          {invoice.payment_status !== 'paid' && (
                            <p className="text-sm sm:text-sm sm:text-base text-red-600 font-semibold">
                              Qoldi: {formatCurrency(invoice.total_amount - invoice.paid_amount)}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex gap-2 sm:gap-2 sm:gap-3 ml-4">
                          <button
                            onClick={() => printInvoice(invoice)}
                            className="px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-green-500 text-white rounded-lg sm:rounded-lg sm:rounded-xl text-sm sm:text-sm sm:text-base font-semibold hover:bg-green-600 flex items-center gap-1"
                            title="Chop etish"
                          >
                            <span className="material-symbols-outlined text-base sm:text-lg">print</span>
                            Chop
                          </button>
                          {invoice.payment_status !== 'paid' && (
                            <button
                              onClick={() => openPaymentModal(invoice)}
                              className="px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-primary text-white rounded-lg sm:rounded-lg sm:rounded-xl text-sm sm:text-sm sm:text-base font-semibold hover:opacity-90"
                            >
                              To'lov
                            </button>
                          )}
                          {invoice.payment_status === 'paid' && (
                            <button
                              onClick={() => generateInvoiceQR(invoice)}
                              className="px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg sm:rounded-lg sm:rounded-xl text-sm sm:text-sm sm:text-base font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
                              title="QR kod"
                            >
                              <span className="material-symbols-outlined">qr_code</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="space-y-3 sm:space-y-4">
              {recentTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
                    history
                  </span>
                  <p className="text-gray-500 dark:text-gray-400">Tranzaksiyalar yo'q</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {recentTransactions.map(transaction => (
                    <div key={transaction.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg sm:rounded-lg sm:rounded-xl p-3 sm:p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className={`size-12 rounded-lg sm:rounded-lg sm:rounded-xl flex items-center justify-center ${
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
                            <p className="text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400">
                              {transaction.invoice_number} • {transaction.payment_method}
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(transaction.created_at)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg sm:text-xl font-bold text-green-600">
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
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div className="flex-1">
                  <p className="text-gray-600 dark:text-gray-400">
                    Jami: {getFilteredServices().length} ta xizmat
                  </p>
                </div>
                
                <button
                  onClick={() => openServiceModal()}
                  className="px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-primary text-white rounded-lg sm:rounded-lg sm:rounded-xl text-sm sm:text-sm sm:text-base font-semibold hover:opacity-90 flex items-center gap-2 sm:gap-2 sm:gap-3"
                >
                  <span className="material-symbols-outlined">add</span>
                  Xizmat qo'shish
                </button>
              </div>

              {/* Filter and Search */}
              <div className="flex flex-col sm:flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    placeholder="Xizmat qidirish..."
                    className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">Barcha kategoriyalar</option>
                  <option value="Laboratoriya">Laboratoriya</option>
                  <option value="Shifokor ko'rigi">Shifokor ko'rigi</option>
                  <option value="Kunduzgi muolaja">Kunduzgi muolaja</option>
                  <option value="Laboratoriya xizmatlari">Laboratoriya xizmatlari</option>
                  <option value="Fizioterapiya xizmatlari">Fizioterapiya xizmatlari</option>
                  <option value="Boshqa">Boshqa</option>
                </select>
              </div>

              {getFilteredServices().length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
                    medical_services
                  </span>
                  <p className="text-gray-500 dark:text-gray-400">
                    {serviceSearch || serviceFilter !== 'all' ? 'Xizmat topilmadi' : 'Xizmatlar yo\'q'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {getFilteredServices().map(service => (
                    <div key={service._id || service.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg sm:rounded-lg sm:rounded-xl p-3 sm:p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 dark:text-white">{service.name}</h3>
                        </div>
                      </div>
                      
                      <p className="text-xl sm:text-2xl font-black text-primary mb-2">
                        {formatCurrency(service.price)}
                      </p>
                      
                      {service.duration_minutes && (
                        <p className="text-sm sm:text-sm sm:text-base text-gray-500 mb-2">
                          <span className="material-symbols-outlined text-sm sm:text-sm sm:text-base align-middle">schedule</span>
                          {' '}{service.duration_minutes} daqiqa
                        </p>
                      )}
                      
                      {service.description && (
                        <p className="text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {service.description}
                        </p>
                      )}
                      
                      <div className="flex gap-2 sm:gap-2 sm:gap-3">
                        <button
                          onClick={() => openServiceModal(service)}
                          className="flex-1 px-3 py-2 sm:py-2.5 bg-green-500 text-white rounded-lg sm:rounded-lg sm:rounded-xl text-sm sm:text-sm sm:text-base font-semibold hover:bg-green-600"
                        >
                          Tahrirlash
                        </button>
                        <button
                          onClick={() => handleDeleteService(service._id || service.id)}
                          className="px-3 py-2 sm:py-2.5 bg-red-500 text-white rounded-lg sm:rounded-lg sm:rounded-xl text-sm sm:text-sm sm:text-base font-semibold hover:bg-red-600"
                        >
                          <span className="material-symbols-outlined text-base sm:text-lg">delete</span>
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
        <form onSubmit={handleServiceSubmit} className="space-y-3 sm:space-y-4">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
            {editingService ? 'Xizmatni tahrirlash' : 'Yangi xizmat qo\'shish'}
          </h2>

          <div>
            <label className="block text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Xizmat nomi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={serviceForm.name}
              onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
              list="service-name-suggestions"
              className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Masalan: Qon tahlili"
              required
            />
            <datalist id="service-name-suggestions">
              {getServiceAutocompleteSuggestions('name').map((suggestion, index) => (
                <option key={index} value={suggestion} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Kategoriya <span className="text-red-500">*</span>
            </label>
            <select
              value={serviceForm.category}
              onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
              className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="">Kategoriya tanlang</option>
              <option value="Laboratoriya">Laboratoriya</option>
              <option value="Shifokor ko'rigi">Shifokor ko'rigi</option>
              <option value="Kunduzgi muolaja">Kunduzgi muolaja</option>
              <option value="Fizioterapiya xizmatlari">Fizioterapiya xizmatlari</option>
              <option value="Boshqa">Boshqa</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Narx (so'm) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={serviceForm.price || ''}
                onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                onFocus={(e) => {
                  if (serviceForm.price === '0' || serviceForm.price === 0 || serviceForm.price === '') {
                    e.target.value = '';
                  }
                }}
                className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Davomiyligi (daqiqa)
              </label>
              <input
                type="number"
                value={serviceForm.duration_minutes || ''}
                onChange={(e) => setServiceForm({ ...serviceForm, duration_minutes: e.target.value })}
                onFocus={(e) => {
                  if (serviceForm.duration_minutes === '0' || serviceForm.duration_minutes === 0 || serviceForm.duration_minutes === '') {
                    e.target.value = '';
                  }
                }}
                className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Tavsif
            </label>
            <textarea
              value={serviceForm.description}
              onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
              rows="3"
              list="service-description-suggestions"
              className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Xizmat haqida qisqacha ma'lumot..."
            />
            <datalist id="service-description-suggestions">
              {getServiceAutocompleteSuggestions('description').map((suggestion, index) => (
                <option key={index} value={suggestion} />
              ))}
            </datalist>
          </div>

          <div className="flex items-center gap-2 sm:gap-2 sm:gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={serviceForm.is_active}
              onChange={(e) => setServiceForm({ ...serviceForm, is_active: e.target.checked })}
              className="size-4 text-primary focus:ring-primary rounded"
            />
            <label htmlFor="is_active" className="text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
              Faol xizmat
            </label>
          </div>

          <div className="flex gap-2 sm:gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowServiceModal(false)}
              className="flex-1 px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg sm:rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="flex-1 px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-primary text-white rounded-lg sm:rounded-xl font-semibold hover:opacity-90"
            >
              {editingService ? 'Saqlash' : 'Qo\'shish'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)}>
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">To'lov qabul qilish</h2>
          
          {selectedInvoice && (
            <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg sm:rounded-lg sm:rounded-xl">
              <p className="text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400">Hisob-faktura</p>
              <p className="font-bold text-gray-900 dark:text-white">{selectedInvoice.invoice_number}</p>
              <p className="text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2">
                Jami: {formatCurrency(selectedInvoice.total_amount)}
              </p>
              <p className="text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400">
                To'langan: {formatCurrency(selectedInvoice.paid_amount)}
              </p>
              <p className="text-base sm:text-lg font-bold text-red-600 mt-1">
                Qoldi: {formatCurrency(selectedInvoice.total_amount - selectedInvoice.paid_amount)}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
              To'lov summasi <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={paymentAmount || ''}
              onChange={(e) => setPaymentAmount(e.target.value)}
              onFocus={(e) => {
                if (paymentAmount === '0' || paymentAmount === 0) {
                  e.target.value = '';
                }
              }}
              className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
              To'lov usuli <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2 sm:gap-3">
              {[
                { value: 'cash', label: 'Naqd', icon: 'payments' },
                { value: 'card', label: 'Karta', icon: 'credit_card' },
                { value: 'transfer', label: 'O\'tkazma', icon: 'account_balance' }
              ].map(method => (
                <button
                  key={method.value}
                  onClick={() => setPaymentMethod(method.value)}
                  className={`p-3 rounded-lg sm:rounded-lg sm:rounded-xl border-2 transition-all ${
                    paymentMethod === method.value
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl sm:text-2xl">{method.icon}</span>
                  <p className="text-xs font-semibold mt-1">{method.label}</p>
                </button>
              ))}
            </div>
          </div>

          {(paymentMethod === 'CARD' || paymentMethod === 'TRANSFER' || paymentMethod === 'ONLINE') && (
            <div>
              <label className="block text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Tranzaksiya ID
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Tranzaksiya ID ni kiriting"
              />
            </div>
          )}

          <div className="flex gap-2 sm:gap-3 pt-4">
            <button
              onClick={() => setShowPaymentModal(false)}
              className="flex-1 px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg sm:rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleProcessPayment}
              className="flex-1 px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-primary text-white rounded-lg sm:rounded-xl font-semibold hover:opacity-90"
            >
              To'lovni qabul qilish
            </button>
          </div>
        </div>
      </Modal>

      {/* QR Code Modal */}
      <Modal isOpen={showQRModal} onClose={() => setShowQRModal(false)} size="sm">
        <div className="text-center space-y-3 sm:space-y-4">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">Hisob-faktura QR</h2>
          {selectedInvoice && (
            <>
              <p className="text-gray-600 dark:text-gray-400">{selectedInvoice.invoice_number}</p>
              {qrCodeUrl && (
                <div className="flex justify-center">
                  <img src={qrCodeUrl} alt="QR Code" className="size-64" />
                </div>
              )}
              <p className="text-sm sm:text-sm sm:text-base text-gray-500">
                Summa: {formatCurrency(selectedInvoice.total_amount)}
              </p>
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.download = `${selectedInvoice.invoice_number}-qr.png`;
                  link.href = qrCodeUrl;
                  link.click();
                }}
                className="px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-primary text-white rounded-lg sm:rounded-lg sm:rounded-xl font-semibold hover:opacity-90"
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
        <form onSubmit={handleCreatePatient} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Ism *
              </label>
              <input
                type="text"
                list="first-name-suggestions"
                value={patientForm.first_name}
                onChange={(e) => setPatientForm({ ...patientForm, first_name: e.target.value })}
                required
                className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ism"
                autoComplete="off"
              />
              <datalist id="first-name-suggestions">
                {getAutocompleteSuggestions('first_name', patientForm.first_name).map((suggestion, index) => (
                  <option key={index} value={suggestion} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Familiya *
              </label>
              <input
                type="text"
                list="last-name-suggestions"
                value={patientForm.last_name}
                onChange={(e) => setPatientForm({ ...patientForm, last_name: e.target.value })}
                required
                className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Familiya"
                autoComplete="off"
              />
              <datalist id="last-name-suggestions">
                {getAutocompleteSuggestions('last_name', patientForm.last_name).map((suggestion, index) => (
                  <option key={index} value={suggestion} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Telefon *
            </label>
            <PhoneInput
              value={patientForm.phone}
              onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
              required
              className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="+998 90 123 45 67"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Tug'ilgan yili
              </label>
              <YearInput
                value={patientForm.date_of_birth}
                onChange={(e) => setPatientForm({ ...patientForm, date_of_birth: e.target.value })}
                className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Jinsi
              </label>
              <select
                value={patientForm.gender}
                onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="male">Erkak</option>
                <option value="female">Ayol</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Manzil
              </label>
              <textarea
                value={patientForm.address}
                onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                rows="2"
                list="address-suggestions"
                className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Manzil"
              />
              <datalist id="address-suggestions">
                {getAutocompleteSuggestions('address').map((suggestion, index) => (
                  <option key={index} value={suggestion} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm sm:text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Uy raqami
              </label>
              <input
                type="text"
                value={patientForm.house_number}
                onChange={(e) => setPatientForm({ ...patientForm, house_number: e.target.value })}
                list="house-number-suggestions"
                className="w-full px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Uy raqami"
              />
              <datalist id="house-number-suggestions">
                {getAutocompleteSuggestions('house_number').map((suggestion, index) => (
                  <option key={index} value={suggestion} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="flex gap-2 sm:gap-3 pt-4">
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
              className="flex-1 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg sm:rounded-lg sm:rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="flex-1 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-primary text-white rounded-lg sm:rounded-lg sm:rounded-xl hover:opacity-90 transition-all"
            >
              Saqlash
            </button>
          </div>
        </form>
      </Modal>

      {/* Doctor Selection Modal */}
      <Modal
        isOpen={showDoctorModal}
        onClose={() => {
          setShowDoctorModal(false);
          setSelectedDoctor(null);
          setDoctorSelectionMode('');
        }}
        title={doctorSelectionMode === 'onduty' ? 'Dejur shifokor tanlash' : 'Navbatga qo\'shish'}
      >
        <div className="space-y-3 sm:space-y-4">
          <p className="text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400">
            {doctorSelectionMode === 'onduty' 
              ? 'Bugun navbatdagi shifokorlardan birini tanlang'
              : 'Barcha shifokorlardan birini tanlang va navbatga qo\'shing'
            }
          </p>

          {doctorSelectionMode === 'onduty' && onDutyDoctors.length === 0 && (
            <div className="text-center py-4 sm:py-6 lg:py-8">
              <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
                medical_services
              </span>
              <p className="text-gray-500 dark:text-gray-400">Bugun dejur shifokorlar yo'q</p>
            </div>
          )}

          {doctorSelectionMode === 'queue' && allDoctors.length === 0 && (
            <div className="text-center py-4 sm:py-6 lg:py-8">
              <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
                person
              </span>
              <p className="text-gray-500 dark:text-gray-400">Shifokorlar topilmadi</p>
            </div>
          )}

          <div className="space-y-2 sm:space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
            {doctorSelectionMode === 'onduty' && onDutyDoctors.map(shift => (
              <button
                key={shift._id}
                onClick={() => setSelectedDoctor(shift.doctor_id?._id || shift.doctor_id?.id)}
                className={`w-full p-3 sm:p-4 rounded-lg sm:rounded-lg sm:rounded-xl border-2 text-left transition-all ${
                  selectedDoctor === (shift.doctor_id?._id || shift.doctor_id?.id)
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="size-12 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">person</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {shift.doctor_id?.first_name} {shift.doctor_id?.last_name}
                    </p>
                    {shift.doctor_id?.specialization && (
                      <p className="text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400">
                        {shift.doctor_id.specialization}
                      </p>
                    )}
                    <p className="text-xs text-green-600 dark:text-green-400">
                      🟢 Navbatda: {shift.start_time} - {shift.end_time}
                    </p>
                  </div>
                  {selectedDoctor === (shift.doctor_id?._id || shift.doctor_id?.id) && (
                    <span className="material-symbols-outlined text-primary">check_circle</span>
                  )}
                </div>
              </button>
            ))}

            {doctorSelectionMode === 'queue' && allDoctors.map(doctor => (
              <button
                key={doctor._id || doctor.id}
                onClick={() => setSelectedDoctor(doctor._id || doctor.id)}
                className={`w-full p-3 sm:p-4 rounded-lg sm:rounded-lg sm:rounded-xl border-2 text-left transition-all ${
                  selectedDoctor === (doctor._id || doctor.id)
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="size-12 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">person</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {doctor.first_name} {doctor.last_name}
                    </p>
                    {doctor.specialization && (
                      <p className="text-sm sm:text-sm sm:text-base text-gray-600 dark:text-gray-400">
                        {doctor.specialization}
                      </p>
                    )}
                  </div>
                  {selectedDoctor === (doctor._id || doctor.id) && (
                    <span className="material-symbols-outlined text-primary">check_circle</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                setShowDoctorModal(false);
                setSelectedDoctor(null);
                setDoctorSelectionMode('');
              }}
              className="flex-1 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg sm:rounded-lg sm:rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleAddToQueue}
              disabled={!selectedDoctor}
              className="flex-1 px-4 sm:px-4 sm:px-6 lg:px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-primary text-white rounded-lg sm:rounded-lg sm:rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {doctorSelectionMode === 'onduty' ? 'Biriktirish' : 'Navbatga qo\'shish'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Laborant Selection Modal */}
      <Modal
        isOpen={showLaborantModal}
        onClose={() => setShowLaborantModal(false)}
        title="Laborant tanlash"
      >
        <div className="space-y-4">
          {allLaborants.length === 0 ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-700 mb-2">
                science
              </span>
              <p className="text-gray-500 dark:text-gray-400">Laborantlar topilmadi</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
              {allLaborants.map(laborant => (
                <button
                  key={laborant._id}
                  onClick={() => {
                    setSelectedLaborant(laborant._id);
                    setShowLaborantModal(false);
                  }}
                  className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-left hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-500 border-2 border-transparent transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">
                        science
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {laborant.full_name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {laborant.phone || 'Telefon yo\'q'}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-gray-400">
                      chevron_right
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default CashierAdvanced;
