# 🧪 Plunk Scaling Improvements - Testing Guide

This guide provides comprehensive testing strategies to validate the scaling improvements implemented for Plunk.

## 🚀 Quick Start Testing

### Prerequisites
1. Plunk instance running (local or deployed)
2. Node.js installed for test scripts
3. A project with API keys
4. Some existing contacts (or ability to create test ones)

### Install Dependencies
```bash
cd /path/to/plunk
npm install node-fetch  # For the test scripts
```

## 📋 Test Categories

### 1. **Automated Testing with Scripts**

#### A. Full Performance Test Suite
```bash
# Run comprehensive tests
node test-scaling.js http://localhost:3000 sk_your_secret_key your_project_id

# Create test contacts and run tests
node test-scaling.js http://localhost:3000 sk_your_secret_key your_project_id --create-contacts=1000

# For production testing
node test-scaling.js https://your-plunk-api.com sk_your_secret_key your_project_id
```

**What it tests**:
- ✅ Paginated contact loading performance
- ✅ Contact search functionality
- ✅ Activity feed pagination
- ✅ Email batch processing
- ✅ Performance comparison (old vs new)

#### B. Continuous Performance Monitoring
```bash
# Monitor for 10 minutes, checking every 1 minute
node monitor-performance.js http://localhost:3000 sk_your_secret_key your_project_id

# Custom monitoring: check every 30 seconds for 5 minutes
node monitor-performance.js http://localhost:3000 sk_your_secret_key your_project_id 0.5 5

# Long-term monitoring: check every 5 minutes for 2 hours
node monitor-performance.js http://localhost:3000 sk_your_secret_key your_project_id 5 120
```

**What it monitors**:
- 📊 Response times for all new endpoints
- 📈 Success rates and error tracking
- 🎯 Performance recommendations
- 📄 Detailed JSON reports

### 2. **Manual UI Testing**

#### A. Campaign Creation Testing
1. **Navigate to Create Campaign**
   ```
   http://localhost:3000/campaigns/new
   ```

2. **Test Contact Selection**:
   - ✅ Verify contacts load in pages of 50
   - ✅ Test search functionality
   - ✅ Try "Select All" with large contact lists
   - ✅ Test "Select Page" functionality
   - ✅ Verify pagination controls work

3. **Performance Expectations**:
   - Initial load: < 100ms
   - Search results: < 200ms
   - Page navigation: < 100ms

#### B. Contact Management Testing
1. **Navigate to Contacts Page**
   ```
   http://localhost:3000/contacts
   ```

2. **Test Existing Pagination**:
   - ✅ Verify 20 contacts per page
   - ✅ Test search functionality
   - ✅ Check pagination controls
   - ✅ Verify filtering by subscription status

### 3. **API Endpoint Testing**

#### A. New Paginated Contacts Endpoint
```bash
# Test basic pagination
curl -H "Authorization: Bearer sk_your_secret_key" \
  "http://localhost:3000/projects/id/your_project_id/contacts/paginated?page=1&limit=50"

# Test with search
curl -H "Authorization: Bearer sk_your_secret_key" \
  "http://localhost:3000/projects/id/your_project_id/contacts/paginated?search=gmail&limit=10"

# Test filtering by subscription status
curl -H "Authorization: Bearer sk_your_secret_key" \
  "http://localhost:3000/projects/id/your_project_id/contacts/paginated?subscribed=true&limit=25"
```

**Expected Response**:
```json
{
  "contacts": [...],
  "total": 1234,
  "page": 1,
  "limit": 50,
  "totalPages": 25
}
```

#### B. Updated Activity Feed
```bash
# Test paginated feed
curl -H "Authorization: Bearer sk_your_secret_key" \
  "http://localhost:3000/projects/id/your_project_id/feed?page=1&limit=20"
```

#### C. Email Task Processing
```bash
# Test improved batch processing
curl -X POST -H "Authorization: Bearer sk_your_secret_key" \
  "http://localhost:3000/tasks"
```

**Expected Response**:
```json
{
  "success": true,
  "processed": 15,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🎯 Load Testing Scenarios

### Scenario 1: Small Scale (< 5k contacts)
```bash
# Environment settings
EMAIL_BATCH_SIZE=10
MAX_PARALLEL_EMAILS=3
CAMPAIGN_BATCH_SIZE=50

# Create test data
node test-scaling.js http://localhost:3000 sk_your_secret_key your_project_id --create-contacts=1000

# Run performance tests
node monitor-performance.js http://localhost:3000 sk_your_secret_key your_project_id 1 10
```

**Expected Results**:
- Paginated contacts: < 50ms
- Contact search: < 100ms
- Email processing: 150-300 emails/minute

### Scenario 2: Medium Scale (5k - 20k contacts)
```bash
# Environment settings  
EMAIL_BATCH_SIZE=20
MAX_PARALLEL_EMAILS=5
CAMPAIGN_BATCH_SIZE=100

# Test with larger dataset
node test-scaling.js http://localhost:3000 sk_your_secret_key your_project_id --create-contacts=5000
```

**Expected Results**:
- Paginated contacts: < 100ms
- Contact search: < 200ms
- Email processing: 300-500 emails/minute

### Scenario 3: Large Scale (20k+ contacts)
```bash
# Environment settings
EMAIL_BATCH_SIZE=30
MAX_PARALLEL_EMAILS=8
CAMPAIGN_BATCH_SIZE=150

# For production testing with existing large dataset
node monitor-performance.js https://your-plunk-api.com sk_your_secret_key your_project_id 2 60
```

**Expected Results**:
- Paginated contacts: < 150ms
- Contact search: < 300ms
- Email processing: 500+ emails/minute

## 🔍 Specific Test Cases

### Test Case 1: Campaign with 40k+ Recipients
1. Create campaign with "Select All" (40k+ contacts)
2. Verify UI remains responsive
3. Check batch processing creates proper tasks
4. Monitor email sending throughput

### Test Case 2: Search Performance
1. Search for common terms (e.g., "gmail", "test")
2. Search for rare terms
3. Test empty search results
4. Verify search across email and metadata

### Test Case 3: Concurrent Users
1. Open multiple browser tabs
2. Navigate different pages simultaneously
3. Create campaigns concurrently
4. Monitor for race conditions

### Test Case 4: Memory Usage
1. Monitor browser memory during campaign creation
2. Check server memory during large batch processing
3. Verify no memory leaks over time

## 📊 Performance Benchmarks

### Before vs After Comparison

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Campaign UI Load | 10+ seconds | < 100ms | < 200ms |
| Contact Search | 2+ seconds | < 200ms | < 300ms |
| Email Throughput | 80/min | 300-500/min | 300+/min |
| Memory Usage | High | 90% less | Stable |

### Response Time Targets

| Endpoint | Target | Acceptable | Slow |
|----------|--------|------------|------|
| Paginated Contacts | < 100ms | < 200ms | > 500ms |
| Contact Search | < 150ms | < 300ms | > 600ms |
| Activity Feed | < 200ms | < 400ms | > 800ms |
| Email Tasks | < 500ms | < 1000ms | > 2000ms |

## 🚨 Troubleshooting Common Issues

### Issue 1: Slow Contact Loading
**Symptoms**: Paginated contacts > 500ms
**Solutions**:
```sql
-- Add database indexes
CREATE INDEX CONCURRENTLY idx_contacts_project_subscribed 
ON contacts(project_id, subscribed, created_at DESC);
```

### Issue 2: Email Processing Bottleneck
**Symptoms**: Low email throughput
**Solutions**:
```bash
# Increase parallel processing
EMAIL_BATCH_SIZE=30
MAX_PARALLEL_EMAILS=10

# Check AWS SES limits
# Monitor database connection pool
```

### Issue 3: Search Performance Issues
**Symptoms**: Search queries > 1 second
**Solutions**:
```sql
-- Add search indexes
CREATE INDEX CONCURRENTLY idx_contacts_email_gin 
ON contacts USING GIN(email gin_trgm_ops);

CREATE INDEX CONCURRENTLY idx_contacts_data_gin 
ON contacts USING GIN(data gin_trgm_ops);
```

### Issue 4: UI Memory Issues
**Symptoms**: Browser crashes, high memory usage
**Solutions**:
- Reduce page sizes in environment config
- Check for JavaScript memory leaks
- Verify proper component cleanup

## 📈 Production Monitoring

### Key Metrics to Track
1. **Response Times**
   - 95th percentile < 500ms
   - Average < 200ms

2. **Email Throughput**
   - Tasks processed per minute
   - Queue length trends

3. **Error Rates**
   - < 1% API error rate
   - Zero critical failures

4. **Resource Usage**
   - Database CPU < 70%
   - Application memory stable
   - Redis memory within limits

### Alerting Setup
```bash
# Example alerting thresholds
API_RESPONSE_TIME_THRESHOLD=500ms
EMAIL_QUEUE_LENGTH_THRESHOLD=1000
ERROR_RATE_THRESHOLD=1%
DATABASE_CPU_THRESHOLD=70%
```

## ✅ Success Criteria

The scaling improvements are successful if:

1. **✅ UI Performance**: Campaign creation loads in < 200ms regardless of contact count
2. **✅ Search Speed**: Contact search returns results in < 300ms
3. **✅ Email Throughput**: Consistent 300+ emails/minute processing
4. **✅ Memory Stability**: No memory leaks or excessive usage
5. **✅ Concurrent Users**: System handles multiple simultaneous users
6. **✅ Large Datasets**: Performance remains stable with 40k+ contacts

## 🎉 Next Steps

After successful testing:
1. Deploy to production with monitoring
2. Gradually increase batch sizes based on performance
3. Add database indexes as needed
4. Monitor long-term performance trends
5. Consider additional optimizations based on usage patterns

Remember to backup your database before running large-scale tests!