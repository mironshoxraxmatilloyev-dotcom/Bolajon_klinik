import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import pharmacyService from '../services/pharmacyService';
import patientService from '../services/patientService';
import toast, { Toaster } from 'react-hot-toast';
import MySalary from './MySalary';
import PhoneInput from '../components/PhoneInput';
import DateInput from '../components/DateInput';

export default function PharmacyPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('medicines');
  const [selectedFloor, setSelectedFloor] = useState(1); // Qavat tanlash
  
  // User role tekshirish
  const isPharmacyStaff = user?.role?.name === 'pharmacist' || user?.role_name === 'pharmacist';
  const isNurse = user?.role?.name === 'nurse' || user?.role_name === 'nurse' || user?.role_name === 'Hamshira';
  const isAdmin = user?.role?.name === 'admin' || user?.role_name === 'admin';
  const canManagePharmacy = isAdmin || isPharmacyStaff || isNurse;
  
  // Dashboard
  const [stats, setStats] = useState({});
  const [alerts, setAlerts] = useState([]);
  
  // Dorilar
  const [medicines, setMedicines] = useState([]);
  const [outOfStockMedicines, setOutOfStockMedicines] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Buyurtmalar
  const [requests, setRequests] = useState([]);
  
  // Dorixonalar (Suppliers)
  const [suppliers, setSuppliers] = useState([]);
  
  // Chiqim
  const [dispensing, setDispensing] = useState([]);
  
  // Modals
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [showAddRequestModal, setShowAddRequestModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showEditRequestModal, setShowEditRequestModal] = useState(false);
  const [showAcceptRequestModal, setShowAcceptRequestModal] = useState(false);
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  const [acceptingRequest, setAcceptingRequest] = useState(null);
  const [acceptData, setAcceptData] = useState({
    expiry_date: '',
    unit_price: 0
  });
  const [dispenseData, setDispenseData] = useState({
    patient_id: '',
    quantity: 1,
    notes: ''
  });
  const [patients, setPatients] = useState([]);
  const [newMedicine, setNewMedicine] = useState({
    name: '',
    category: 'tablet',
    unit_price: 0,
    quantity: 0,
    reorder_level: 10,
    expiry_date: ''
  });
  const [newRequest, setNewRequest] = useState({
    medicine_name: '',
    quantity: 1,
    supplier_id: '',
    urgency: 'normal',
    notes: ''
  });
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: ''
  });
  
  useEffect(() => {
    loadData();
    loadPatients();
  }, [activeTab, selectedFloor]); // selectedFloor qo'shildi
  
  const loadPatients = async () => {
    try {
      console.log('=== LOADING PATIENTS ===');
      const response = await patientService.getPatients();
      console.log('Patients response:', response);
      if (response.success) {
        console.log('Patients data:', response.data);
        setPatients(response.data || []);
      }
    } catch (error) {
      console.error('Load patients error:', error);
    }
  };
  
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    
    try {
      if (activeTab === 'medicines') {
        const data = await pharmacyService.getMedicines({ search: searchQuery, floor: selectedFloor });
        setMedicines(data.medicines || []);
      } else if (activeTab === 'out-of-stock') {
        const data = await pharmacyService.getOutOfStockMedicines({ floor: selectedFloor });
        setOutOfStockMedicines(data.medicines || []);
      } else if (activeTab === 'requests') {
        const data = await pharmacyService.getRequests({ floor: selectedFloor });
        setRequests(Array.isArray(data) ? data : data.data || []);
      } else if (activeTab === 'suppliers') {
        const data = await pharmacyService.getSuppliers();
        setSuppliers(Array.isArray(data) ? data : data.data || []);
      } else if (activeTab === 'dispensing') {
        const data = await pharmacyService.getDispensing({ floor: selectedFloor });
        setDispensing(Array.isArray(data) ? data : data.data || []);
      }
    } catch (error) {
      if (!silent) toast.error('Ma\'lumotlarni yuklashda xatolik');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenDispenseModal = (medicine) => {
    setSelectedMedicine(medicine);
    setDispenseData({
      patient_id: '',
      quantity: 1,
      notes: ''
    });
    setShowDispenseModal(true);
  };
  
  const handleDispenseMedicine = async () => {
    try {
      console.log('=== DISPENSE MEDICINE ===');
      console.log('Selected medicine:', selectedMedicine);
      console.log('Dispense data:', dispenseData);
      
      if (!dispenseData.patient_id) {
        toast.error('Iltimos, bemorni tanlang');
        return;
      }
      
      if (!dispenseData.quantity || dispenseData.quantity < 1) {
        toast.error('Iltimos, miqdorni kiriting');
        return;
      }
      
      if (dispenseData.quantity > selectedMedicine.quantity) {
        toast.error('Dori yetarli emas');
        return;
      }
      
      const medicineId = selectedMedicine._id || selectedMedicine.id;
      console.log('Medicine ID:', medicineId);
      console.log('Sending data:', { ...dispenseData });
      
      const response = await pharmacyService.dispenseMedicine(medicineId, dispenseData);
      
      if (response.success) {
        toast.success('Dori muvaffaqiyatli berildi!');
        setShowDispenseModal(false);
        loadData();
      }
    } catch (error) {
      console.error('Dispense medicine error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Xatolik yuz berdi');
    }
  };
  
  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-100 text-red-700 border-red-300',
      high: 'bg-orange-100 text-orange-700 border-orange-300',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      low: 'bg-green-100 text-green-700 border-green-300'
    };
    return colors[severity] || colors.medium;
  };
  
  const getAlertIcon = (type) => {
    const icons = {
      low_stock: 'inventory_2',
      expired: 'dangerous',
      expiring_soon: 'schedule',
      out_of_stock: 'remove_shopping_cart'
    };
    return icons[type] || 'notifications';
  };
  
  // Yaroqlilik muddatini hisoblash va rang berish
  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { color: 'gray', text: 'Noma\'lum', days: null };
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { color: 'red', text: `Muddati o'tgan (${Math.abs(diffDays)} kun oldin)`, days: diffDays, badge: 'bg-red-100 text-red-700 border-red-300' };
    } else if (diffDays <= 30) {
      return { color: 'yellow', text: `${diffDays} kun qoldi`, days: diffDays, badge: 'bg-yellow-100 text-yellow-700 border-yellow-300' };
    } else if (diffDays <= 45) {
      return { color: 'yellow', text: `${diffDays} kun qoldi`, days: diffDays, badge: 'bg-yellow-100 text-yellow-700 border-yellow-300' };
    } else {
      return { color: 'green', text: `${diffDays} kun qoldi`, days: diffDays, badge: 'bg-green-100 text-green-700 border-green-300' };
    }
  };
  
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('uz-UZ');
  };
  
  if (loading && activeTab === 'medicines') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900 dark:to-teal-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 font-semibold text-gray-600 dark:text-gray-300 dark:text-gray-300">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-6">
      <Toaster position="top-right" />
      
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-3xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-4 rounded-2xl">
                <span className="material-symbols-outlined text-6xl">medication</span>
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-black">DORILAR SHKAFI</h1>
                <p className="text-xl opacity-90">
                  {user?.staffProfile?.first_name || user?.username || 'Foydalanuvchi'}
                </p>
              </div>
            </div>
            
            {/* Qavat tanlash */}
            <div className="flex gap-2">
              {[1, 2, 3].map(floor => (
                <button
                  key={floor}
                  onClick={() => setSelectedFloor(floor)}
                  className={`px-6 py-3 rounded-xl font-bold text-lg transition-all ${
                    selectedFloor === floor
                      ? 'bg-white text-green-600 shadow-lg scale-105'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {floor}-qavat
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="border-b">
            <div className="flex px-4">
              {[
                { id: 'medicines', label: 'Dorilar', icon: 'medication' },
                { id: 'out-of-stock', label: 'Tugagan dorilar', icon: 'remove_shopping_cart' },
                { id: 'requests', label: 'Buyurtmalar', icon: 'shopping_cart' },
                { id: 'suppliers', label: 'Dorixonalar', icon: 'store' },
                { id: 'dispensing', label: 'Chiqim', icon: 'remove_circle' },
                ...(isPharmacyStaff && !isAdmin ? [{ id: 'salary', label: 'Mening Maoshlarim', icon: 'payments' }] : [])
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-semibold border-b-2 transition-all ${
                    activeTab === tab.id 
                      ? 'border-green-600 text-green-600 bg-green-50' 
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:bg-gray-700'
                  }`}
                >
                  <span className="material-symbols-outlined">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="p-6 min-h-[400px]">
            {/* Dorilar Tab */}
            {activeTab === 'medicines' && (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && loadData()}
                      placeholder="Dori qidirish..."
                      className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-600"
                    />
                  </div>
                  <button 
                    onClick={() => loadData()}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                  >
                    Qidirish
                  </button>
                  {canManagePharmacy && (
                    <button 
                      onClick={() => setShowAddMedicineModal(true)}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined">add</span>
                      Yangi dori
                    </button>
                  )}
                </div>
                
                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                ) : medicines.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="material-symbols-outlined text-6xl text-gray-300">medication</span>
                    <p className="text-gray-500 dark:text-gray-400 mt-4">Dorilar topilmadi</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {medicines.map(medicine => {
                      const expiryStatus = getExpiryStatus(medicine.expiry_date);
                      
                      return (
                        <div key={medicine.id} className="bg-white dark:bg-gray-800 border dark:border-gray-700-2 rounded-xl p-5 hover:shadow-lg transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="text-lg font-bold">{medicine.name}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{medicine.category}</p>
                            </div>
                            <span className={`px-3 py-1 rounded text-xs font-bold ${
                              parseFloat(medicine.quantity || medicine.stock_quantity || 0) > 0 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {medicine.quantity || medicine.stock_quantity || 0}
                            </span>
                          </div>
                          
                          {/* Yaroqlilik muddati */}
                          {medicine.expiry_date && (
                            <div className={`mb-3 p-2 rounded-lg border-2 ${expiryStatus.badge}`}>
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">schedule</span>
                                <div className="flex-1">
                                  <p className="text-xs font-semibold">Yaroqlilik muddati</p>
                                  <p className="text-xs">{expiryStatus.text}</p>
                                  <p className="text-xs opacity-75">{formatDate(medicine.expiry_date)}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm">payments</span>
                              <span>{(medicine.unit_price || medicine.price_per_unit || 0).toLocaleString()} so'm</span>
                            </div>
                            {medicine.floor && (
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">layers</span>
                                <span>{medicine.floor}-qavat</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Ishlatish tugmasi */}
                          {canManagePharmacy && parseFloat(medicine.quantity || 0) > 0 && (
                            <button
                              onClick={() => handleOpenDispenseModal(medicine)}
                              className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 text-sm font-semibold"
                            >
                              <span className="material-symbols-outlined text-lg">remove_circle</span>
                              Bemorga berish
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            
            {/* Tugagan dorilar Tab */}
            {activeTab === 'out-of-stock' && (
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                ) : outOfStockMedicines.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="material-symbols-outlined text-6xl text-gray-300">check_circle</span>
                    <p className="text-gray-500 dark:text-gray-400 mt-4">Tugagan dorilar yo'q</p>
                    <p className="text-sm text-gray-400 mt-2">Barcha dorilar zaxirada mavjud</p>
                  </div>
                ) : (
                  <div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-red-600 text-2xl">warning</span>
                        <div>
                          <p className="font-bold text-red-800">Diqqat! {outOfStockMedicines.length} ta dori tugagan</p>
                          <p className="text-sm text-red-600">Ushbu dorilarni zaxiraga qo'shish kerak</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {outOfStockMedicines.map(medicine => (
                        <div key={medicine.id} className="bg-white dark:bg-gray-800 border dark:border-gray-700-2 border-red-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="text-lg font-bold">{medicine.name}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{medicine.generic_name || '-'}</p>
                            </div>
                            <span className="px-3 py-1 rounded text-xs font-bold bg-red-100 text-red-700">
                              {medicine.quantity || medicine.stock_quantity || 0}
                            </span>
                          </div>
                          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm">category</span>
                              <span>{medicine.category}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-red-600">remove_shopping_cart</span>
                              <span className="text-red-600 font-semibold">Kam qolgan</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm">warning</span>
                              <span className="text-orange-600 text-xs">Min: {medicine.reorder_level || medicine.min_stock_level || 0}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Buyurtmalar Tab */}
            {activeTab === 'requests' && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  {canManagePharmacy && (
                    <button 
                      onClick={async () => {
                        // Dorixonalarni yuklaymiz
                        if (suppliers.length === 0) {
                          const data = await pharmacyService.getSuppliers();
                          setSuppliers(Array.isArray(data) ? data : data.data || []);
                        }
                        setShowAddRequestModal(true);
                      }}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined">add_shopping_cart</span>
                      Buyurtma berish
                    </button>
                  )}
                </div>
                
                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Dori</th>
                          <th className="px-4 py-3 text-right font-semibold">Miqdor</th>
                          <th className="px-4 py-3 text-left font-semibold">Dorixona</th>
                          <th className="px-4 py-3 text-left font-semibold">So'ragan</th>
                          <th className="px-4 py-3 text-left font-semibold">Holat</th>
                          <th className="px-4 py-3 text-left font-semibold">Sana</th>
                          {canManagePharmacy && (
                            <th className="px-4 py-3 text-center font-semibold">Amallar</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {requests.map(item => (
                          <tr key={item.id} className="hover:bg-gray-50 dark:bg-gray-700">
                            <td className="px-4 py-3 font-medium">{item.medicine_name}</td>
                            <td className="px-4 py-3 text-right font-semibold">{item.quantity}</td>
                            <td className="px-4 py-3">{item.supplier_name || '-'}</td>
                            <td className="px-4 py-3">{item.requested_by_name || '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                item.status === 'approved' ? 'bg-green-100 text-green-700' :
                                item.status === 'accepted' ? 'bg-green-100 text-green-700' :
                                item.status === 'dispensed' ? 'bg-green-100 text-green-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {item.status === 'pending' ? 'Kutilmoqda' :
                                 item.status === 'approved' ? 'Tasdiqlangan' :
                                 item.status === 'accepted' ? 'Qabul qilindi' :
                                 item.status === 'dispensed' ? 'Berilgan' : 'Rad etilgan'}
                              </span>
                            </td>
                            <td className="px-4 py-3">{formatDate(item.created_at)}</td>
                            {canManagePharmacy && (
                              <td className="px-4 py-3">
                                <div className="flex gap-2 justify-center">
                                  {item.status === 'pending' && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingRequest(item);
                                          setNewRequest({
                                            medicine_name: item.medicine_name,
                                            quantity: item.quantity,
                                            supplier_id: item.supplier_id || '',
                                            urgency: item.urgency,
                                            notes: item.notes || ''
                                          });
                                          setShowEditRequestModal(true);
                                        }}
                                        className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm font-semibold"
                                      >
                                        Tahrirlash
                                      </button>
                                      <button
                                        onClick={() => {
                                          setAcceptingRequest(item);
                                          setAcceptData({
                                            expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                            unit_price: 0
                                          });
                                          setShowAcceptRequestModal(true);
                                        }}
                                        className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm font-semibold"
                                      >
                                        Qabul qilish
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={async () => {
                                      if (window.confirm('Buyurtmani o\'chirmoqchimisiz?')) {
                                        try {
                                          await pharmacyService.deleteRequest(item.id);
                                          toast.success('Buyurtma o\'chirildi');
                                          loadData();
                                        } catch (error) {
                                          toast.error('Xatolik yuz berdi');
                                        }
                                      }
                                    }}
                                    className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-semibold"
                                  >
                                    O'chirish
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            
            {/* Dorixonalar Tab */}
            {activeTab === 'suppliers' && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  {canManagePharmacy && (
                    <button 
                      onClick={() => setShowAddSupplierModal(true)}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined">add_business</span>
                      Dorixona qo'shish
                    </button>
                  )}
                </div>
                
                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                ) : suppliers.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="material-symbols-outlined text-6xl text-gray-300">store</span>
                    <p className="text-gray-500 dark:text-gray-400 mt-4">Dorixonalar topilmadi</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {suppliers.map(supplier => (
                      <div key={supplier.id} className="bg-white dark:bg-gray-800 border dark:border-gray-700-2 rounded-xl p-5 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold">{supplier.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{supplier.contact_person}</p>
                          </div>
                          <span className={`px-3 py-1 rounded text-xs font-bold ${
                            supplier.is_active 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                          }`}>
                            {supplier.is_active ? 'Faol' : 'Nofaol'}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">phone</span>
                            <span>{supplier.phone || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">location_on</span>
                            <span>{supplier.address || '-'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Chiqim Tab */}
            {activeTab === 'dispensing' && (
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Dori</th>
                          <th className="px-4 py-3 text-right font-semibold">Miqdor</th>
                          <th className="px-4 py-3 text-left font-semibold">Bemor</th>
                          <th className="px-4 py-3 text-left font-semibold">Bergan</th>
                          <th className="px-4 py-3 text-left font-semibold">Sana</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {dispensing.map(item => (
                          <tr key={item.id} className="hover:bg-gray-50 dark:bg-gray-700">
                            <td className="px-4 py-3 font-medium">{item.medicine_name}</td>
                            <td className="px-4 py-3 text-right">{item.quantity} {item.unit}</td>
                            <td className="px-4 py-3">{item.patient_name || '-'}</td>
                            <td className="px-4 py-3">{item.dispensed_by_name}</td>
                            <td className="px-4 py-3">{formatDate(item.dispensed_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Mening Maoshlarim Tab - Faqat dorixona xodimi uchun */}
            {activeTab === 'salary' && isPharmacyStaff && !isAdmin && (
              <MySalary />
            )}
          </div>
        </div>
      </div>
      
      {/* Yangi dori qo'shish modali */}
      {showAddMedicineModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-4">Yangi dori qo'shish</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Dori nomi *</label>
                <input 
                  type="text"
                  value={newMedicine.name}
                  onChange={(e) => setNewMedicine({...newMedicine, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Masalan: Paracetamol 500mg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Kategoriya *</label>
                <select 
                  value={newMedicine.category}
                  onChange={(e) => setNewMedicine({...newMedicine, category: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="tablet">Tabletka</option>
                  <option value="syrup">Sirop</option>
                  <option value="injection">Ukol</option>
                  <option value="cream">Krem</option>
                  <option value="drops">Tomchi</option>
                  <option value="other">Boshqa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Birlik narxi (so'm) *</label>
                <input 
                  type="number"
                  value={newMedicine.unit_price || ''}
                  onChange={(e) => setNewMedicine({...newMedicine, unit_price: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Miqdor *</label>
                <input 
                  type="number"
                  value={newMedicine.quantity || ''}
                  onChange={(e) => setNewMedicine({...newMedicine, quantity: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Minimal zaxira</label>
                <input 
                  type="number"
                  value={newMedicine.reorder_level || ''}
                  onChange={(e) => setNewMedicine({...newMedicine, reorder_level: parseInt(e.target.value) || 10})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Yaroqlilik muddati *</label>
                <DateInput 
                  value={newMedicine.expiry_date}
                  onChange={(e) => setNewMedicine({...newMedicine, expiry_date: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => {
                  setShowAddMedicineModal(false);
                  setNewMedicine({
                    name: '',
                    category: 'tablet',
                    unit_price: 0,
                    quantity: 0,
                    reorder_level: 10,
                    expiry_date: ''
                  });
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:bg-gray-700"
              >
                Bekor qilish
              </button>
              <button 
                onClick={async () => {
                  try {
                    if (!newMedicine.name || !newMedicine.expiry_date) {
                      toast.error('Dori nomi va yaroqlilik muddati majburiy!');
                      return;
                    }
                    await pharmacyService.createMedicine({
                      ...newMedicine,
                      floor: selectedFloor
                    });
                    toast.success('Dori qo\'shildi!');
                    setShowAddMedicineModal(false);
                    setNewMedicine({
                      name: '',
                      category: 'tablet',
                      unit_price: 0,
                      quantity: 0,
                      reorder_level: 10,
                      expiry_date: ''
                    });
                    loadData();
                  } catch (error) {
                    toast.error('Xatolik yuz berdi');
                  }
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Buyurtma berish modali */}
      {showAddRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-4">Buyurtma berish</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Dori nomi *</label>
                <input 
                  type="text"
                  value={newRequest.medicine_name}
                  onChange={(e) => setNewRequest({...newRequest, medicine_name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Dori nomini kiriting..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Dorixona *</label>
                <select 
                  value={newRequest.supplier_id}
                  onChange={(e) => setNewRequest({...newRequest, supplier_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Dorixonani tanlang</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Miqdor *</label>
                <input 
                  type="number"
                  value={newRequest.quantity || ''}
                  onChange={(e) => setNewRequest({...newRequest, quantity: parseInt(e.target.value) || 1})}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Muhimlik darajasi</label>
                <select 
                  value={newRequest.urgency}
                  onChange={(e) => setNewRequest({...newRequest, urgency: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="low">Past</option>
                  <option value="normal">O'rtacha</option>
                  <option value="high">Yuqori</option>
                  <option value="urgent">Shoshilinch</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Izoh</label>
                <textarea 
                  value={newRequest.notes}
                  onChange={(e) => setNewRequest({...newRequest, notes: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                  placeholder="Qo'shimcha ma'lumot..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowAddRequestModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:bg-gray-700"
              >
                Bekor qilish
              </button>
              <button 
                onClick={async () => {
                  try {
                    await pharmacyService.createRequest(newRequest);
                    toast.success('Buyurtma yuborildi!');
                    setShowAddRequestModal(false);
                    setNewRequest({ medicine_name: '', quantity: 1, supplier_id: '', urgency: 'normal', notes: '' });
                    loadData();
                  } catch (error) {
                    toast.error('Xatolik yuz berdi');
                  }
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Yuborish
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Dorixona qo'shish modali */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-4">Dorixona qo'shish</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Dorixona nomi *</label>
                <input 
                  type="text"
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Masalan: Farmatsiya №1"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Mas'ul shaxs</label>
                <input 
                  type="text"
                  value={newSupplier.contact_person}
                  onChange={(e) => setNewSupplier({...newSupplier, contact_person: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ism familiya"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Telefon</label>
                <PhoneInput 
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="+998 90 123 45 67"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Manzil</label>
                <textarea 
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({...newSupplier, address: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="2"
                  placeholder="To'liq manzil..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowAddSupplierModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:bg-gray-700"
              >
                Bekor qilish
              </button>
              <button 
                onClick={async () => {
                  try {
                    await pharmacyService.createSupplier(newSupplier);
                    toast.success('Dorixona qo\'shildi!');
                    setShowAddSupplierModal(false);
                    setNewSupplier({ name: '', contact_person: '', phone: '', email: '', address: '' });
                    loadData();
                  } catch (error) {
                    toast.error('Xatolik yuz berdi');
                  }
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Buyurtmani tahrirlash modali */}
      {showEditRequestModal && editingRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-4">Buyurtmani tahrirlash</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Dori nomi *</label>
                <input 
                  type="text"
                  value={newRequest.medicine_name}
                  onChange={(e) => setNewRequest({...newRequest, medicine_name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Dori nomini kiriting..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Dorixona *</label>
                <select 
                  value={newRequest.supplier_id}
                  onChange={(e) => setNewRequest({...newRequest, supplier_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Dorixonani tanlang</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Miqdor *</label>
                <input 
                  type="number"
                  value={newRequest.quantity || ''}
                  onChange={(e) => setNewRequest({...newRequest, quantity: parseInt(e.target.value) || 1})}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Muhimlik darajasi</label>
                <select 
                  value={newRequest.urgency}
                  onChange={(e) => setNewRequest({...newRequest, urgency: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="low">Past</option>
                  <option value="normal">O'rtacha</option>
                  <option value="high">Yuqori</option>
                  <option value="urgent">Shoshilinch</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Izoh</label>
                <textarea 
                  value={newRequest.notes}
                  onChange={(e) => setNewRequest({...newRequest, notes: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                  placeholder="Qo'shimcha ma'lumot..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => {
                  setShowEditRequestModal(false);
                  setEditingRequest(null);
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:bg-gray-700"
              >
                Bekor qilish
              </button>
              <button 
                onClick={async () => {
                  try {
                    await pharmacyService.updateRequest(editingRequest.id, newRequest);
                    toast.success('Buyurtma yangilandi!');
                    setShowEditRequestModal(false);
                    setEditingRequest(null);
                    setNewRequest({ medicine_name: '', quantity: 1, supplier_id: '', urgency: 'normal', notes: '' });
                    loadData();
                  } catch (error) {
                    toast.error('Xatolik yuz berdi');
                  }
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Buyurtmani qabul qilish modali */}
      {showAcceptRequestModal && acceptingRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-4">Buyurtmani qabul qilish</h3>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>Dori:</strong> {acceptingRequest.medicine_name}<br/>
                <strong>Miqdor:</strong> {acceptingRequest.quantity}<br/>
                <strong>Dorixona:</strong> {acceptingRequest.supplier_name || '-'}
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Yaroqlilik muddati *</label>
                <DateInput 
                  value={acceptData.expiry_date}
                  onChange={(e) => setAcceptData({...acceptData, expiry_date: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Sotilish narxi (so'm) *</label>
                <input 
                  type="number"
                  value={acceptData.unit_price || ''}
                  onChange={(e) => setAcceptData({...acceptData, unit_price: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  min="0"
                  placeholder="0"
                />
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>Jami qiymat:</strong> {((acceptData.unit_price || 0) * acceptingRequest.quantity).toLocaleString()} so'm
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => {
                  setShowAcceptRequestModal(false);
                  setAcceptingRequest(null);
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                Bekor qilish
              </button>
              <button 
                onClick={async () => {
                  try {
                    if (!acceptData.expiry_date || !acceptData.unit_price) {
                      toast.error('Yaroqlilik muddati va sotilish narxi majburiy!');
                      return;
                    }
                    await pharmacyService.acceptRequest(acceptingRequest.id, acceptData);
                    toast.success('Buyurtma qabul qilindi va zaxiraga qo\'shildi!');
                    setShowAcceptRequestModal(false);
                    setAcceptingRequest(null);
                    setAcceptData({ expiry_date: '', unit_price: 0 });
                    loadData();
                  } catch (error) {
                    toast.error('Xatolik yuz berdi');
                  }
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Qabul qilish
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Dispense Modal - Dori ishlatish */}
      {showDispenseModal && selectedMedicine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">Dori berish</h3>
              <button
                onClick={() => setShowDispenseModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="font-semibold text-lg">{selectedMedicine.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Mavjud: {selectedMedicine.quantity} {selectedMedicine.unit || 'dona'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Narx: {(selectedMedicine.unit_price || 0).toLocaleString()} so'm
              </p>
            </div>

            <div className="space-y-4">
              {/* Bemor tanlash */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Bemor <span className="text-red-500">*</span>
                </label>
                <select
                  value={dispenseData.patient_id}
                  onChange={(e) => {
                    console.log('Selected patient ID:', e.target.value);
                    setDispenseData({ ...dispenseData, patient_id: e.target.value });
                  }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  required
                >
                  <option value="">Bemorni tanlang...</option>
                  {patients.map(patient => {
                    const patientId = patient._id || patient.id;
                    const patientName = `${patient.first_name} ${patient.last_name} - ${patient.patient_number}`;
                    console.log('Patient option:', { id: patientId, name: patientName });
                    return (
                      <option key={patientId} value={patientId}>
                        {patientName}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Miqdor */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Miqdor <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={dispenseData.quantity}
                  onChange={(e) => setDispenseData({ ...dispenseData, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  min="1"
                  max={selectedMedicine.quantity}
                  required
                />
              </div>

              {/* Izoh */}
              <div>
                <label className="block text-sm font-semibold mb-2">Izoh</label>
                <textarea
                  value={dispenseData.notes}
                  onChange={(e) => setDispenseData({ ...dispenseData, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  rows="3"
                  placeholder="Qo'shimcha izoh..."
                />
              </div>

              {/* Jami narx */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Jami narx:</strong> {((selectedMedicine.unit_price || 0) * dispenseData.quantity).toLocaleString()} so'm
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                  Bu narx bemorga qarz sifatida yoziladi
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDispenseModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleDispenseMedicine}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                Berish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

