import api from './api';

const settingsService = {
  // Get bonus settings
  getBonusSettings: async () => {
    const response = await api.get('/settings/bonus');
    return response.data;
  },

  // Update bonus settings
  updateBonusSettings: async (data) => {
    const response = await api.put('/settings/bonus', data);
    return response.data;
  },

  // Distribute bonuses manually
  distributeMonthlyBonuses: async () => {
    const response = await api.post('/settings/bonus/distribute');
    return response.data;
  }
};

export default settingsService;
