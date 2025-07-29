#!/usr/bin/env node

/**
 * Plunk Performance Monitor
 * Continuously monitors system performance metrics
 */

const fetch = require('node-fetch');
const fs = require('fs');

class PerformanceMonitor {
  constructor(apiUrl, secretKey, projectId) {
    this.apiUrl = apiUrl.replace(/\/$/, '');
    this.secretKey = secretKey;
    this.projectId = projectId;
    this.headers = {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json'
    };
    this.metrics = [];
    this.isRunning = false;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m'
    };
    console.log(`${colors[type]}[${timestamp}] ${message}\x1b[0m`);
  }

  async measureResponseTime(url, method = 'GET', body = null) {
    const startTime = Date.now();
    try {
      const response = await fetch(url, {
        method,
        headers: this.headers,
        body: body ? JSON.stringify(body) : null
      });
      const endTime = Date.now();
      const data = await response.json();
      
      return {
        success: response.ok,
        responseTime: endTime - startTime,
        status: response.status,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async collectMetrics() {
    const timestamp = new Date().toISOString();
    const metrics = { timestamp };

    // Test paginated contacts performance
    const contactsResult = await this.measureResponseTime(
      `${this.apiUrl}/projects/id/${this.projectId}/contacts/paginated?page=1&limit=50`
    );
    metrics.paginatedContacts = {
      responseTime: contactsResult.responseTime,
      success: contactsResult.success,
      totalContacts: contactsResult.data?.total || 0
    };

    // Test activity feed performance
    const feedResult = await this.measureResponseTime(
      `${this.apiUrl}/projects/id/${this.projectId}/feed?page=1&limit=20`
    );
    metrics.activityFeed = {
      responseTime: feedResult.responseTime,
      success: feedResult.success,
      totalItems: feedResult.data?.total || 0
    };

    // Test email task processing
    const tasksResult = await this.measureResponseTime(
      `${this.apiUrl}/tasks`,
      'POST'
    );
    metrics.emailTasks = {
      responseTime: tasksResult.responseTime,
      success: tasksResult.success,
      processed: tasksResult.data?.processed || 0
    };

    // Test contact search
    const searchResult = await this.measureResponseTime(
      `${this.apiUrl}/projects/id/${this.projectId}/contacts/paginated?search=test&limit=10`
    );
    metrics.contactSearch = {
      responseTime: searchResult.responseTime,
      success: searchResult.success,
      results: searchResult.data?.total || 0
    };

    this.metrics.push(metrics);
    return metrics;
  }

  async start(intervalMinutes = 1, durationMinutes = 10) {
    this.log(`🎯 Starting performance monitoring...`);
    this.log(`   Interval: ${intervalMinutes} minute(s)`);
    this.log(`   Duration: ${durationMinutes} minute(s)`);
    this.log(`   Project: ${this.projectId}`);
    
    this.isRunning = true;
    const intervalMs = intervalMinutes * 60 * 1000;
    const endTime = Date.now() + (durationMinutes * 60 * 1000);
    
    const interval = setInterval(async () => {
      if (!this.isRunning || Date.now() > endTime) {
        clearInterval(interval);
        await this.generateReport();
        return;
      }

      try {
        const metrics = await this.collectMetrics();
        this.displayMetrics(metrics);
      } catch (error) {
        this.log(`❌ Error collecting metrics: ${error.message}`, 'error');
      }
    }, intervalMs);

    // Initial collection
    const initialMetrics = await this.collectMetrics();
    this.displayMetrics(initialMetrics);
  }

  displayMetrics(metrics) {
    this.log(`\n📊 Performance Metrics - ${metrics.timestamp}`);
    
    const sections = [
      { name: 'Paginated Contacts', key: 'paginatedContacts', target: 100 },
      { name: 'Activity Feed', key: 'activityFeed', target: 200 },
      { name: 'Email Tasks', key: 'emailTasks', target: 500 },
      { name: 'Contact Search', key: 'contactSearch', target: 150 }
    ];

    sections.forEach(section => {
      const metric = metrics[section.key];
      const status = metric.success ? '✅' : '❌';
      const performance = metric.responseTime <= section.target ? '🟢' : 
                         metric.responseTime <= section.target * 2 ? '🟡' : '🔴';
      
      this.log(`   ${status} ${performance} ${section.name}: ${metric.responseTime}ms (target: <${section.target}ms)`);
      
      if (section.key === 'paginatedContacts' && metric.totalContacts) {
        this.log(`      └─ Total contacts: ${metric.totalContacts.toLocaleString()}`);
      }
      if (section.key === 'emailTasks' && metric.processed > 0) {
        this.log(`      └─ Tasks processed: ${metric.processed}`);
      }
    });
    
    console.log(''); // Empty line for readability
  }

  calculateStats() {
    if (this.metrics.length === 0) return {};

    const stats = {};
    const keys = ['paginatedContacts', 'activityFeed', 'emailTasks', 'contactSearch'];
    
    keys.forEach(key => {
      const values = this.metrics
        .map(m => m[key]?.responseTime)
        .filter(v => v !== undefined);
      
      if (values.length > 0) {
        stats[key] = {
          avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length,
          successRate: Math.round((this.metrics.filter(m => m[key]?.success).length / this.metrics.length) * 100)
        };
      }
    });

    return stats;
  }

  async generateReport() {
    this.log('📈 Generating performance report...');
    
    const stats = this.calculateStats();
    const report = {
      generatedAt: new Date().toISOString(),
      projectId: this.projectId,
      totalMeasurements: this.metrics.length,
      duration: this.metrics.length > 1 ? 
        new Date(this.metrics[this.metrics.length - 1].timestamp).getTime() - 
        new Date(this.metrics[0].timestamp).getTime() : 0,
      statistics: stats,
      rawMetrics: this.metrics
    };

    // Save report to file
    const filename = `performance-report-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    
    // Display summary
    this.log('\n🎯 Performance Summary:');
    Object.entries(stats).forEach(([key, stat]) => {
      const name = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      this.log(`   ${name}:`);
      this.log(`      Avg: ${stat.avg}ms | Min: ${stat.min}ms | Max: ${stat.max}ms`);
      this.log(`      Success Rate: ${stat.successRate}% (${stat.count} samples)`);
    });
    
    this.log(`\n📄 Detailed report saved to: ${filename}`, 'success');
    
    // Performance recommendations
    this.generateRecommendations(stats);
  }

  generateRecommendations(stats) {
    this.log('\n💡 Performance Recommendations:');
    
    const recommendations = [];
    
    if (stats.paginatedContacts?.avg > 200) {
      recommendations.push('Consider adding database indexes for contact queries');
    }
    if (stats.activityFeed?.avg > 300) {
      recommendations.push('Activity feed may benefit from additional caching');
    }
    if (stats.emailTasks?.avg > 1000) {
      recommendations.push('Email processing is slow - consider increasing MAX_PARALLEL_EMAILS');
    }
    if (stats.contactSearch?.avg > 250) {
      recommendations.push('Contact search needs database optimization');
    }

    if (recommendations.length === 0) {
      this.log('   ✅ All systems performing within acceptable ranges!', 'success');
    } else {
      recommendations.forEach((rec, i) => {
        this.log(`   ${i + 1}. ${rec}`, 'warning');
      });
    }
  }

  stop() {
    this.isRunning = false;
    this.log('⏹️  Performance monitoring stopped');
  }
}

// CLI Usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log(`
Usage: node monitor-performance.js <API_URL> <SECRET_KEY> <PROJECT_ID> [interval_minutes] [duration_minutes]

Examples:
  node monitor-performance.js http://localhost:3000 sk_your_secret_key project_123
  node monitor-performance.js https://api.yourplunk.com sk_your_secret_key project_123 2 30
    `);
    process.exit(1);
  }
  
  const [apiUrl, secretKey, projectId, intervalMinutes = 1, durationMinutes = 10] = args;
  
  const monitor = new PerformanceMonitor(apiUrl, secretKey, projectId);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n⏹️  Shutting down...');
    monitor.stop();
    process.exit(0);
  });
  
  monitor.start(parseInt(intervalMinutes), parseInt(durationMinutes))
    .catch(error => {
      console.error('❌ Monitoring failed:', error.message);
      process.exit(1);
    });
}

module.exports = PerformanceMonitor;