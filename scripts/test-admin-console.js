#!/usr/bin/env node

// Test script for admin console API
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function testAdminConsole() {
  try {
    console.log('🧪 Testing Admin Console API...');
    
    // First, login to get a token
    console.log('1. Logging in as admin...');
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'dev@hackclub.com' // Using the admin email
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);
    
    if (!loginData.success) {
      console.log('❌ Login failed, cannot test admin console');
      return;
    }
    
    const token = loginData.data.token;
    
    // Test console status
    console.log('2. Checking console status...');
    const statusResponse = await fetch('http://localhost:3001/api/admin-console/status', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const statusData = await statusResponse.json();
    console.log('Status response:', statusData);
    
    // Test a simple query
    console.log('3. Testing simple query...');
    const queryResponse = await fetch('http://localhost:3001/api/admin-console/query', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        query: 'How many events are there?' 
      })
    });
    
    const queryData = await queryResponse.json();
    console.log('Query response:', JSON.stringify(queryData, null, 2));
    
    if (queryData.success) {
      console.log('✅ Admin console is working!');
    } else {
      console.log('❌ Admin console query failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAdminConsole();
