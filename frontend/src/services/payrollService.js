import api from './api';

const payrollService = {
  // Xodimlar maosh ma'lumotlari
  getStaffSalaries: async () => {
    const response = await api.get('/payroll/staff-salaries');
    return response.data;
  },

  setStaffSalary: async (data) => {
    const response = await api.post('/payroll/staff-salaries', data);
    return response.data;
  },

  updateStaffSalary: async (id, data) => {
    const response = await api.put(`/payroll/staff-salaries/${id}`, data);
    return response.data;
  },

  deleteStaffSalary: async (id) => {
    const response = await api.delete(`/payroll/staff-salaries/${id}`);
    return response.data;
  },

  // Xizmat foizlari
  getServiceCommissions: async () => {
    const response = await api.get('/payroll/service-commissions');
    return response.data;
  },

  addServiceCommission: async (data) => {
    const response = await api.post('/payroll/service-commissions', data);
    return response.data;
  },

  // Smena qo'shimchalari
  getShiftBonuses: async () => {
    const response = await api.get('/payroll/shift-bonuses');
    return response.data;
  },

  addShiftBonus: async (data) => {
    const response = await api.post('/payroll/shift-bonuses', data);
    return response.data;
  },

  // Bonuslar
  getBonuses: async () => {
    const response = await api.get('/payroll/bonuses');
    return response.data;
  },

  addBonus: async (data) => {
    const response = await api.post('/payroll/bonuses', data);
    return response.data;
  },

  // Jarimalar
  getPenalties: async () => {
    const response = await api.get('/payroll/penalties');
    return response.data;
  },

  addPenalty: async (data) => {
    const response = await api.post('/payroll/penalties', data);
    return response.data;
  },

  approvePenalty: async (id) => {
    const response = await api.post(`/payroll/penalties/${id}/approve`);
    return response.data;
  },

  rejectPenalty: async (id) => {
    const response = await api.post(`/payroll/penalties/${id}/reject`);
    return response.data;
  },

  // Oylik maosh
  calculateMonthly: async (data) => {
    const response = await api.post('/payroll/calculate-monthly', data);
    return response.data;
  },

  getMonthlyPayroll: async (params) => {
    const response = await api.get('/payroll/monthly-payroll', { params });
    return response.data;
  },

  approvePayroll: async (id) => {
    const response = await api.post(`/payroll/monthly-payroll/${id}/approve`);
    return response.data;
  },

  payPayroll: async (id, data) => {
    const response = await api.post(`/payroll/monthly-payroll/${id}/pay`, data);
    return response.data;
  },

  getStaffDetails: async (staffId, month, year) => {
    const response = await api.get(`/payroll/staff/${staffId}/details`, {
      params: { month, year }
    });
    return response.data;
  }
};

export default payrollService;
