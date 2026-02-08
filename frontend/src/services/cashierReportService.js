/**
 * CASHIER REPORT SERVICE
 * Kasir hisobotlari uchun API calls
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Get all cashier reports (Admin only)
 */
export const getCashierReports = async (filters = {}) => {
  try {
    const response = await axios.get(`${API_URL}/cashier-reports`, {
      headers: getAuthHeader(),
      params: filters
    });
    return response.data;
  } catch (error) {
    console.error('Get cashier reports error:', error);
    throw error;
  }
};

/**
 * Get single cashier report
 */
export const getCashierReport = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/cashier-reports/${id}`, {
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    console.error('Get cashier report error:', error);
    throw error;
  }
};

/**
 * Get my cashier reports
 */
export const getMyCashierReports = async (filters = {}) => {
  try {
    const response = await axios.get(`${API_URL}/cashier-reports/my/reports`, {
      headers: getAuthHeader(),
      params: filters
    });
    return response.data;
  } catch (error) {
    console.error('Get my cashier reports error:', error);
    throw error;
  }
};

/**
 * Get today's summary
 */
export const getTodaySummary = async () => {
  try {
    const response = await axios.get(`${API_URL}/cashier-reports/today/summary`, {
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    console.error('Get today summary error:', error);
    throw error;
  }
};

export default {
  getCashierReports,
  getCashierReport,
  getMyCashierReports,
  getTodaySummary
};
