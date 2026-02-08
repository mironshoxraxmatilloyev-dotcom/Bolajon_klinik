import api from './api';

const labReagentService = {
  // Get all reagents
  getReagents: async (params = {}) => {
    try {
      const response = await api.get('/lab-reagents', { params });
      return response.data;
    } catch (error) {
      console.error('Get reagents error:', error);
      throw error;
    }
  },

  // Create reagent
  createReagent: async (data) => {
    try {
      const response = await api.post('/lab-reagents', data);
      return response.data;
    } catch (error) {
      console.error('Create reagent error:', error);
      throw error;
    }
  },

  // Update reagent
  updateReagent: async (id, data) => {
    try {
      const response = await api.put(`/lab-reagents/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Update reagent error:', error);
      throw error;
    }
  },

  // Delete reagent
  deleteReagent: async (id) => {
    try {
      const response = await api.delete(`/lab-reagents/${id}`);
      return response.data;
    } catch (error) {
      console.error('Delete reagent error:', error);
      throw error;
    }
  },

  // Use reagent
  useReagent: async (data) => {
    try {
      const response = await api.post('/lab-reagents/use', data);
      return response.data;
    } catch (error) {
      console.error('Use reagent error:', error);
      throw error;
    }
  },

  // Get usage history
  getUsageHistory: async (params = {}) => {
    try {
      const response = await api.get('/lab-reagents/usage-history', { params });
      return response.data;
    } catch (error) {
      console.error('Get usage history error:', error);
      throw error;
    }
  }
};

export default labReagentService;
