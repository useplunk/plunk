#!/usr/bin/env node

/**
 * Plunk Scaling Test Script
 * Tests the new pagination and performance improvements
 */

const fetch = require('node-fetch');

class PlunkScalingTester {
  constructor(apiUrl, secretKey) {
    this.apiUrl = apiUrl.replace(/\/$/, '');
    this.secretKey = secretKey;
    this.headers = {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json'
    };
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      error: '\x1b[31m',   // Red
      warning: '\x1b[33m'  // Yellow
    };
    console.log(`${colors[type]}[${timestamp}] ${message}\x1b[0m`);
  }

  async testPaginatedContacts(projectId) {
    this.log('🔍 Testing paginated contacts endpoint...');
    
    try {
      const startTime = Date.now();
      
      // Test first page
      const response = await fetch(`${this.apiUrl}/projects/id/${projectId}/contacts/paginated?page=1&limit=50`, {
        headers: this.headers
      });
      
      const endTime = Date.now();
      const data = await response.json();
      
      if (response.ok) {
        this.log(`✅ Paginated contacts loaded in ${endTime - startTime}ms`, 'success');
        this.log(`   - Total contacts: ${data.total}`, 'info');
        this.log(`   - Page size: ${data.limit}`, 'info');
        this.log(`   - Total pages: ${data.totalPages}`, 'info');
        this.log(`   - Current page: ${data.page}`, 'info');
        
        // Test search functionality
        if (data.contacts.length > 0) {
          const searchTerm = data.contacts[0].email.split('@')[0];
          const searchResponse = await fetch(`${this.apiUrl}/projects/id/${projectId}/contacts/paginated?search=${searchTerm}&limit=10`, {
            headers: this.headers
          });
          
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            this.log(`✅ Search functionality working - found ${searchData.total} matches for "${searchTerm}"`, 'success');
          }
        }
        
        return true;
      } else {
        this.log(`❌ Paginated contacts failed: ${data.message || 'Unknown error'}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Paginated contacts error: ${error.message}`, 'error');
      return false;
    }
  }

  async testActivityFeed(projectId) {
    this.log('📋 Testing paginated activity feed...');
    
    try {
      const startTime = Date.now();
      
      const response = await fetch(`${this.apiUrl}/projects/id/${projectId}/feed?page=1&limit=20`, {
        headers: this.headers
      });
      
      const endTime = Date.now();
      const data = await response.json();
      
      if (response.ok) {
        this.log(`✅ Activity feed loaded in ${endTime - startTime}ms`, 'success');
        this.log(`   - Total items: ${data.total}`, 'info');
        this.log(`   - Items returned: ${data.items?.length || 0}`, 'info');
        this.log(`   - Total pages: ${data.totalPages}`, 'info');
        return true;
      } else {
        this.log(`❌ Activity feed failed: ${data.message || 'Unknown error'}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Activity feed error: ${error.message}`, 'error');
      return false;
    }
  }

  async testEmailProcessing() {
    this.log('📧 Testing email batch processing...');
    
    try {
      const startTime = Date.now();
      
      const response = await fetch(`${this.apiUrl}/tasks`, {
        method: 'POST',
        headers: this.headers
      });
      
      const endTime = Date.now();
      const data = await response.json();
      
      if (response.ok) {
        this.log(`✅ Email processing completed in ${endTime - startTime}ms`, 'success');
        this.log(`   - Tasks processed: ${data.processed}`, 'info');
        this.log(`   - Timestamp: ${data.timestamp}`, 'info');
        return true;
      } else {
        this.log(`❌ Email processing failed: ${data.message || 'Unknown error'}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Email processing error: ${error.message}`, 'error');
      return false;
    }
  }

  async createTestContacts(projectId, count = 100) {
    this.log(`👥 Creating ${count} test contacts...`);
    
    const contacts = [];
    for (let i = 0; i < count; i++) {
      contacts.push({
        email: `test-contact-${i}-${Date.now()}@example.com`,
        subscribed: true,
        data: {
          firstName: `Test${i}`,
          lastName: 'User',
          testBatch: 'scaling-test'
        }
      });
    }

    let created = 0;
    const batchSize = 10;
    
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      
      const promises = batch.map(async (contact) => {
        try {
          const response = await fetch(`${this.apiUrl}/v1/contacts`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(contact)
          });
          
          if (response.ok) {
            created++;
            return true;
          }
          return false;
        } catch (error) {
          return false;
        }
      });
      
      await Promise.all(promises);
      this.log(`   Created ${Math.min(i + batchSize, contacts.length)}/${count} contacts...`);
    }
    
    this.log(`✅ Created ${created} test contacts`, 'success');
    return created;
  }

  async measureCampaignUIPerformance(projectId) {
    this.log('🎯 Testing campaign creation performance...');
    
    // Simulate the old way (loading all contacts)
    const oldWayStart = Date.now();
    try {
      const oldResponse = await fetch(`${this.apiUrl}/projects/id/${projectId}/contacts?page=0`, {
        headers: this.headers
      });
      const oldData = await oldResponse.json();
      const oldWayEnd = Date.now();
      
      this.log(`📊 Old method (all contacts): ${oldWayEnd - oldWayStart}ms for ${oldData.count} contacts`, 'warning');
    } catch (error) {
      this.log(`⚠️  Could not test old method: ${error.message}`, 'warning');
    }
    
    // Test the new paginated way
    const newWayStart = Date.now();
    const newResponse = await fetch(`${this.apiUrl}/projects/id/${projectId}/contacts/paginated?page=1&limit=50`, {
      headers: this.headers
    });
    const newData = await newResponse.json();
    const newWayEnd = Date.now();
    
    if (newResponse.ok) {
      this.log(`📊 New method (paginated): ${newWayEnd - newWayStart}ms for 50 contacts`, 'success');
      this.log(`   - Performance gain: ${Math.round(((oldWayEnd - oldWayStart) / (newWayEnd - newWayStart)) * 100) / 100}x faster`, 'success');
    }
  }

  async runAllTests(projectId) {
    this.log('🚀 Starting Plunk Scaling Tests...', 'info');
    this.log(`   API URL: ${this.apiUrl}`, 'info');
    this.log(`   Project ID: ${projectId}`, 'info');
    
    const results = {
      paginatedContacts: false,
      activityFeed: false,
      emailProcessing: false,
      performance: false
    };
    
    try {
      // Test paginated contacts
      results.paginatedContacts = await this.testPaginatedContacts(projectId);
      
      // Test activity feed
      results.activityFeed = await this.testActivityFeed(projectId);
      
      // Test email processing
      results.emailProcessing = await this.testEmailProcessing();
      
      // Test performance
      await this.measureCampaignUIPerformance(projectId);
      results.performance = true;
      
    } catch (error) {
      this.log(`❌ Test suite error: ${error.message}`, 'error');
    }
    
    // Summary
    this.log('\n📋 Test Results Summary:', 'info');
    Object.entries(results).forEach(([test, passed]) => {
      const status = passed ? '✅ PASSED' : '❌ FAILED';
      const color = passed ? 'success' : 'error';
      this.log(`   ${test}: ${status}`, color);
    });
    
    const totalPassed = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    this.log(`\n🎯 Overall: ${totalPassed}/${totalTests} tests passed`, 
      totalPassed === totalTests ? 'success' : 'warning');
    
    return results;
  }
}

// CLI Usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
Usage: node test-scaling.js <API_URL> <SECRET_KEY> [PROJECT_ID] [--create-contacts=N]

Examples:
  node test-scaling.js http://localhost:3000 sk_your_secret_key project_id_123
  node test-scaling.js https://api.yourplunk.com sk_your_secret_key project_id_123 --create-contacts=500
    `);
    process.exit(1);
  }
  
  const [apiUrl, secretKey, projectId] = args;
  const createContactsFlag = args.find(arg => arg.startsWith('--create-contacts='));
  const createCount = createContactsFlag ? parseInt(createContactsFlag.split('=')[1]) : 0;
  
  const tester = new PlunkScalingTester(apiUrl, secretKey);
  
  (async () => {
    try {
      if (createCount > 0) {
        await tester.createTestContacts(projectId, createCount);
        console.log('\n⏳ Waiting 5 seconds for contacts to be indexed...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      await tester.runAllTests(projectId);
    } catch (error) {
      console.error('❌ Test execution failed:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = PlunkScalingTester;