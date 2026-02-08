import api from './api';

const pharmacyService = {
  // Dashboard
  getDashboard: async () => {
    const response = await api.get('/pharmacy/dashboard');
    return response.data;
  },

  getStockStats: async () => {
    const response = await api.get('/pharmacy/dashboard');
    return response.data;
  },

  // Medicines
  getMedicines: async (params = {}) => {
    const response = await api.get('/pharmacy/medicines', { params });
    return response.data;
  },

  getOutOfStockMedicines: async (params = {}) => {
    const response = await api.get('/pharmacy/medicines/out-of-stock', { params });
    return response.data;
  },

  getMedicineById: async (id) => {
    const response = await api.get(`/pharmacy/medicines/${id}`);
    return response.data;
  },

  createMedicine: async (data) => {
    const response = await api.post('/pharmacy/medicines', data);
    return response.data;
  },

  updateMedicine: async (id, data) => {
    const response = await api.put(`/pharmacy/medicines/${id}`, data);
    return response.data;
  },

  deleteMedicine: async (id) => {
    const response = await api.delete(`/pharmacy/medicines/${id}`);
    return response.data;
  },

  // Stock Management
  getStock: async (params = {}) => {
    const response = await api.get('/pharmacy/stock', { params });
    return response.data;
  },

  addStock: async (data) => {
    const response = await api.post('/pharmacy/stock/intake', data);
    return response.data;
  },

  getStockHistory: async (medicineId) => {
    const response = await api.get(`/pharmacy/stock/history/${medicineId}`);
    return response.data;
  },

  // Dispensing
  dispenseMedicine: async (medicineId, data) => {
    const response = await api.post(`/pharmacy/medicines/${medicineId}/dispense`, data);
    return response.data;
  },

  getDispensingHistory: async (params = {}) => {
    const response = await api.get('/pharmacy/dispense/history', { params });
    return response.data;
  },

  getDispensing: async (params = {}) => {
    const response = await api.get('/pharmacy/transactions', { 
      params: { ...params, type: 'out' } 
    });
    return response.data;
  },

  // Alerts
  getAlerts: async (params = {}) => {
    const response = await api.get('/pharmacy/alerts', { params });
    return response.data;
  },

  markAlertAsRead: async (id) => {
    const response = await api.put(`/pharmacy/alerts/${id}/read`);
    return response.data;
  },

  // Requests (Buyurtmalar)
  getRequests: async (params = {}) => {
    const response = await api.get('/pharmacy/requests', { params });
    return response.data;
  },

  createRequest: async (data) => {
    const response = await api.post('/pharmacy/requests', data);
    return response.data;
  },

  updateRequestStatus: async (id, status) => {
    const response = await api.patch(`/pharmacy/requests/${id}/status`, { status });
    return response.data;
  },

  deleteRequest: async (id) => {
    const response = await api.delete(`/pharmacy/requests/${id}`);
    return response.data;
  },

  updateRequest: async (id, data) => {
    const response = await api.put(`/pharmacy/requests/${id}`, data);
    return response.data;
  },

  acceptRequest: async (id, stockData) => {
    const response = await api.post(`/pharmacy/requests/${id}/accept`, stockData);
    return response.data;
  },

  // Suppliers (Dorixonalar)
  getSuppliers: async (params = {}) => {
    const response = await api.get('/pharmacy/suppliers', { params });
    return response.data;
  },

  createSupplier: async (data) => {
    const response = await api.post('/pharmacy/suppliers', data);
    return response.data;
  },

  updateSupplier: async (id, data) => {
    const response = await api.put(`/pharmacy/suppliers/${id}`, data);
    return response.data;
  },

  deleteSupplier: async (id) => {
    const response = await api.delete(`/pharmacy/suppliers/${id}`);
    return response.data;
  },

  // Reports
  getStockReport: async (params = {}) => {
    const response = await api.get('/pharmacy/reports/stock', { params });
    return response.data;
  },

  getExpiringReport: async (params = {}) => {
    const response = await api.get('/pharmacy/reports/expiring', { params });
    return response.data;
  },

  getDispensingReport: async (params = {}) => {
    const response = await api.get('/pharmacy/reports/dispensing', { params });
    return response.data;
  },

  // Hamshira integratsiyasi
  dispenseToNurse: async (data) => {
    const response = await api.post('/pharmacy/dispense/nurse', data);
    return response.data;
  },

  createNurseRequest: async (data) => {
    const response = await api.post('/pharmacy/requests/nurse', data);
    return response.data;
  },

  getNurseRequests: async (params = {}) => {
    const response = await api.get('/pharmacy/requests/nurse', { params });
    return response.data;
  },

  getNurseDispensingHistory: async (params = {}) => {
    const response = await api.get('/pharmacy/dispense/nurse/history', { params });
    return response.data;
  },

  // Laboratoriya integratsiyasi
  getReagents: async () => {
    const response = await api.get('/pharmacy/reagents');
    return response.data;
  },

  createReagentRequest: async (data) => {
    const response = await api.post('/pharmacy/reagents/request', data);
    return response.data;
  },

  dispenseReagent: async (data) => {
    const response = await api.post('/pharmacy/reagents/dispense', data);
    return response.data;
  }
};

export default pharmacyService;
