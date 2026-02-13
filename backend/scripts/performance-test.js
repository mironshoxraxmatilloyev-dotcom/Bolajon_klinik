/**
 * Performance Test Script
 * Backend API endpoint'larning tezligini o'lchash
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:5001/api/v1';
let authToken = '';

// Performance metrics
const metrics = {
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    avgResponseTime: 0
  }
};

/**
 * Login va token olish
 */
async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123'
    });
    
    authToken = response.data.data.token;
    console.log('✅ Login successful\n');
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    process.exit(1);
  }
}

/**
 * API endpoint test qilish
 */
async function testEndpoint(name, method, url, data = null) {
  const startTime = Date.now();
  
  try {
    const config = {
      method,
      url: `${API_URL}${url}`,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    metrics.tests.push({
      name,
      method,
      url,
      status: response.status,
      responseTime,
      success: true
    });
    
    console.log(`✅ ${name}: ${responseTime}ms`);
    return { success: true, responseTime, data: response.data };
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    metrics.tests.push({
      name,
      method,
      url,
      status: error.response?.status || 0,
      responseTime,
      success: false,
      error: error.message
    });
    
    console.log(`❌ ${name}: ${responseTime}ms - ${error.message}`);
    return { success: false, responseTime, error: error.message };
  }
}

/**
 * Performance testlarni ishga tushirish
 */
async function runPerformanceTests() {
  console.log('🚀 Starting Performance Tests\n');
  console.log('='.repeat(50));
  console.log('\n');
  
  // 1. Patient endpoints
  console.log('📋 Testing Patient Endpoints:');
  await testEndpoint('Get All Patients', 'GET', '/patients?limit=20');
  await testEndpoint('Search Patients', 'GET', '/patients?search=test');
  
  // Get first patient ID for detail test
  const patientsResponse = await testEndpoint('Get Patients for ID', 'GET', '/patients?limit=1');
  const patientId = patientsResponse.data?.data?.patients?.[0]?._id;
  
  if (patientId) {
    await testEndpoint('Get Patient Detail', 'GET', `/patients/${patientId}`);
  }
  console.log('');
  
  // 2. Billing endpoints
  console.log('💰 Testing Billing Endpoints:');
  await testEndpoint('Get Billing Stats', 'GET', '/billing/stats');
  await testEndpoint('Get Invoices', 'GET', '/billing/invoices?limit=20');
  await testEndpoint('Get Services', 'GET', '/billing/services');
  console.log('');
  
  // 3. Laboratory endpoints
  console.log('🔬 Testing Laboratory Endpoints:');
  await testEndpoint('Get Lab Orders', 'GET', '/laboratory/orders?limit=20');
  await testEndpoint('Get Lab Tests', 'GET', '/laboratory/tests');
  console.log('');
  
  // 4. Queue endpoints
  console.log('📝 Testing Queue Endpoints:');
  await testEndpoint('Get Queue', 'GET', '/queue');
  await testEndpoint('Get On-Duty Doctors', 'GET', '/queue/on-duty-doctors');
  console.log('');
  
  // 5. Staff endpoints
  console.log('👥 Testing Staff Endpoints:');
  await testEndpoint('Get All Staff', 'GET', '/staff');
  await testEndpoint('Get Staff by Role', 'GET', '/staff?role=Doctor');
  console.log('');
  
  // 6. Reports endpoints
  console.log('📊 Testing Reports Endpoints:');
  const today = new Date().toISOString().split('T')[0];
  await testEndpoint('Get Daily Report', 'GET', `/reports/daily?date=${today}`);
  console.log('');
  
  // Calculate summary
  metrics.summary.total = metrics.tests.length;
  metrics.summary.passed = metrics.tests.filter(t => t.success).length;
  metrics.summary.failed = metrics.tests.filter(t => !t.success).length;
  metrics.summary.avgResponseTime = Math.round(
    metrics.tests.reduce((sum, t) => sum + t.responseTime, 0) / metrics.tests.length
  );
  
  // Print summary
  console.log('\n');
  console.log('='.repeat(50));
  console.log('📊 PERFORMANCE TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${metrics.summary.total}`);
  console.log(`Passed: ${metrics.summary.passed} ✅`);
  console.log(`Failed: ${metrics.summary.failed} ❌`);
  console.log(`Average Response Time: ${metrics.summary.avgResponseTime}ms`);
  console.log('');
  
  // Detailed results
  console.log('📋 DETAILED RESULTS:');
  console.log('-'.repeat(50));
  
  const sortedTests = [...metrics.tests].sort((a, b) => b.responseTime - a.responseTime);
  
  console.log('\n🐌 Slowest Endpoints:');
  sortedTests.slice(0, 5).forEach((test, index) => {
    console.log(`${index + 1}. ${test.name}: ${test.responseTime}ms`);
  });
  
  console.log('\n⚡ Fastest Endpoints:');
  sortedTests.slice(-5).reverse().forEach((test, index) => {
    console.log(`${index + 1}. ${test.name}: ${test.responseTime}ms`);
  });
  
  // Performance rating
  console.log('\n');
  console.log('='.repeat(50));
  console.log('🎯 PERFORMANCE RATING');
  console.log('='.repeat(50));
  
  const avgTime = metrics.summary.avgResponseTime;
  let rating = '';
  let recommendation = '';
  
  if (avgTime < 100) {
    rating = '⭐⭐⭐⭐⭐ Excellent';
    recommendation = 'Performance is excellent! Keep it up.';
  } else if (avgTime < 200) {
    rating = '⭐⭐⭐⭐ Good';
    recommendation = 'Performance is good. Consider caching for further improvement.';
  } else if (avgTime < 500) {
    rating = '⭐⭐⭐ Average';
    recommendation = 'Performance is average. Consider database indexing and query optimization.';
  } else if (avgTime < 1000) {
    rating = '⭐⭐ Below Average';
    recommendation = 'Performance needs improvement. Check database queries and add caching.';
  } else {
    rating = '⭐ Poor';
    recommendation = 'Performance is poor. Urgent optimization needed!';
  }
  
  console.log(`Rating: ${rating}`);
  console.log(`Average Response Time: ${avgTime}ms`);
  console.log(`Recommendation: ${recommendation}`);
  console.log('');
  
  // Save results to file
  const fs = await import('fs');
  const reportPath = './performance-test-results.json';
  fs.writeFileSync(reportPath, JSON.stringify(metrics, null, 2));
  console.log(`📄 Results saved to: ${reportPath}`);
  console.log('');
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🔧 Performance Test Tool');
    console.log('='.repeat(50));
    console.log(`API URL: ${API_URL}`);
    console.log(`Date: ${new Date().toISOString()}`);
    console.log('='.repeat(50));
    console.log('\n');
    
    await login();
    await runPerformanceTests();
    
    console.log('✅ Performance test completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
