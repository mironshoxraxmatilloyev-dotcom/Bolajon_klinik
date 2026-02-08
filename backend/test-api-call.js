/**
 * TEST API CALL
 * Simulate frontend API call to /api/v1/staff-salary/my-bonuses
 */

import axios from 'axios';

const API_URL = 'http://localhost:5001/api/v1';

async function testApiCall() {
  try {
    console.log('🔐 Step 1: Login as laborant...');
    
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: 'laborant',
      password: 'admin123'
    });

    if (!loginResponse.data.success) {
      console.error('❌ Login failed:', loginResponse.data.message);
      return;
    }

    const token = loginResponse.data.token;
    console.log('✅ Login successful!');
    console.log('👤 User:', loginResponse.data.user);
    console.log('🔑 Token:', token.substring(0, 20) + '...\n');

    console.log('📋 Step 2: Get my bonuses and penalties...');
    
    const bonusesResponse = await axios.get(`${API_URL}/staff-salary/my-bonuses`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      }
    });

    console.log('✅ Response received!');
    console.log('📦 Success:', bonusesResponse.data.success);
    console.log('📦 Bonuses:', bonusesResponse.data.data.bonuses.length);
    console.log('📦 Penalties:', bonusesResponse.data.data.penalties.length);
    console.log('\n📋 Bonuses:');
    bonusesResponse.data.data.bonuses.forEach(b => {
      console.log(`  - ${b.bonus_type}: ${b.amount} so'm (${b.status})`);
      console.log(`    ${b.reason}`);
    });
    console.log('\n📋 Penalties:');
    bonusesResponse.data.data.penalties.forEach(p => {
      console.log(`  - ${p.penalty_type}: ${p.amount} so'm (${p.status})`);
      console.log(`    ${p.reason}`);
      console.log(`    Month/Year: ${p.month}/${p.year}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testApiCall();
