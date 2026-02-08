import api from './api';

const attendanceService = {
  // Get today's attendance
  getTodayAttendance: async () => {
    const response = await api.get('/attendance/today');
    return response.data;
  },

  // Check in
  checkIn: async () => {
    const response = await api.post('/attendance/check-in');
    return response.data;
  },

  // Check out
  checkOut: async () => {
    const response = await api.post('/attendance/check-out');
    return response.data;
  },

  // Get attendance history
  getHistory: async (params) => {
    const response = await api.get('/attendance/history', { params });
    return response.data;
  }
};

export default attendanceService;
