import api from './api';

const expenseService = {
  // Barcha xarajatlarni olish
  getExpenses: async (params = {}) => {
    try {
      const response = await api.get('/expenses', { params });
      return response.data;
    } catch (error) {
      console.error('Get expenses error:', error);
      throw error;
    }
  },

  // Statistika olish
  getStats: async (params = {}) => {
    try {
      const response = await api.get('/expenses/stats', { params });
      return response.data;
    } catch (error) {
      console.error('Get expense stats error:', error);
      throw error;
    }
  },

  // Yangi xarajat qo'shish
  createExpense: async (data) => {
    try {
      const response = await api.post('/expenses', data);
      return response.data;
    } catch (error) {
      console.error('Create expense error:', error);
      throw error;
    }
  },

  // Xarajatni tahrirlash
  updateExpense: async (id, data) => {
    try {
      const response = await api.put(`/expenses/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Update expense error:', error);
      throw error;
    }
  },

  // Xarajatni o'chirish
  deleteExpense: async (id) => {
    try {
      const response = await api.delete(`/expenses/${id}`);
      return response.data;
    } catch (error) {
      console.error('Delete expense error:', error);
      throw error;
    }
  }
};

export default expenseService;
