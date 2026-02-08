import api from './api';

export const laboratoryService = {
  // ============================================
  // TAHLILLAR KATALOGI
  // ============================================
  
  // Barcha tahlillarni olish
  getTests: async (params = {}) => {
    const response = await api.get('/laboratory/tests', { params });
    return response.data;
  },
  
  // Bitta tahlilni olish
  getTestById: async (id) => {
    const response = await api.get(`/laboratory/tests/${id}`);
    return response.data;
  },
  
  // Tahlil qo'shish
  createTest: async (data) => {
    const response = await api.post('/laboratory/tests', data);
    return response.data;
  },
  
  // Tahlilni yangilash
  updateTest: async (id, data) => {
    const response = await api.put(`/laboratory/tests/${id}`, data);
    return response.data;
  },
  
  // Tahlilni o'chirish
  deleteTest: async (id) => {
    const response = await api.delete(`/laboratory/tests/${id}`);
    return response.data;
  },
  
  // ============================================
  // BUYURTMALAR
  // ============================================
  
  // Buyurtmalarni olish
  getOrders: async (params = {}) => {
    const response = await api.get('/laboratory/orders', { params });
    return response.data;
  },
  
  // Buyurtma yaratish
  createOrder: async (data) => {
    const response = await api.post('/laboratory/orders', data);
    return response.data;
  },
  
  // Buyurtma statusini yangilash
  updateOrderStatus: async (id, status) => {
    const response = await api.put(`/laboratory/orders/${id}/status`, { status });
    return response.data;
  },
  
  // ============================================
  // NATIJALAR
  // ============================================
  
  // Natija kiritish
  createResult: async (data) => {
    const response = await api.post('/laboratory/results', data);
    return response.data;
  },
  
  // Natijani tasdiqlash
  approveResult: async (id) => {
    const response = await api.put(`/laboratory/results/${id}/approve`);
    return response.data;
  },
  
  // Natijani ko'rish
  getResult: async (orderId) => {
    const response = await api.get(`/laboratory/results/${orderId}`);
    return response.data;
  },
  
  // Buyurtma natijasini olish (to'liq ma'lumot bilan)
  getOrderResult: async (orderId) => {
    const response = await api.get(`/laboratory/orders/${orderId}/result`);
    return response.data;
  },
  
  // ============================================
  // STATISTIKA
  // ============================================
  
  getStats: async (params = {}) => {
    const response = await api.get('/laboratory/stats', { params });
    return response.data;
  },

  // Laborant uchun statistika
  getLaborantStats: async () => {
    const response = await api.get('/laboratory/laborant/stats');
    return response.data;
  },

  // ============================================
  // LABORANT FUNKSIYALARI
  // ============================================

  // QR-kodni skanerlash
  scanQR: async (qrCode) => {
    const response = await api.post('/laboratory/scan-qr', { qr_code: qrCode });
    return response.data;
  },

  // Natijalarni kiritish (laborant)
  submitResults: async (orderId, results) => {
    const response = await api.post(`/laboratory/orders/${orderId}/results`, results);
    return response.data;
  },

  // Tarix - Yakunlangan tahlillar
  getCompletedTests: async () => {
    const response = await api.get('/laboratory/laborant/history');
    return response.data;
  }
};

export default laboratoryService;
