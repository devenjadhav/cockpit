#!/usr/bin/env node

// Manual sync script to populate PostgreSQL with Airtable data
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function runManualSync() {
  try {
    console.log('🚀 Starting manual sync...');
    
    // Import services
    const { syncService } = require('../dist/services/syncService');
    const { databaseService } = require('../dist/services/databaseService');
    
    // Wait for database to initialize
    console.log('📡 Waiting for database connection...');
    let retries = 0;
    while (!databaseService.isInitialized() && retries < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
    }
    
    if (!databaseService.isInitialized()) {
      throw new Error('❌ Database not initialized after 10 seconds');
    }
    
    console.log('✅ Database connected');
    
    // Check if sync is already running
    if (syncService.isRunning()) {
      console.log('⚠️  Sync is already in progress, please wait...');
      return;
    }
    
    // Run the sync
    console.log('🔄 Starting data sync from Airtable to PostgreSQL...');
    const result = await syncService.performFullSync();
    
    console.log('\n📊 Sync Results:');
    console.log(`✅ Success: ${result.success}`);
    console.log(`📈 Records synced: ${result.recordsSynced}`);
    console.log(`⏱️  Duration: ${result.duration}ms`);
    
    if (result.errors.length > 0) {
      console.log(`❌ Errors (${result.errors.length}):`);
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    } else {
      console.log('🎉 No errors!');
    }
    
    console.log('\nDone! You can now check your database for the synced data.');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Manual sync failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Sync interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Sync terminated');
  process.exit(0);
});

runManualSync();
