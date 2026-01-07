# Metrics & Monitoring Guide

Guide on how to access and interpret metrics from Azure App Insights and Google Analytics.

## 📊 Azure App Insights

### Access
1. Log in to [Azure Portal](https://portal.azure.com)
2. Find **Application Insights** resource
3. Go to **Overview** or **Logs** to view metrics

### Key Metrics

#### Performance
- **Request Rate**: Requests per second
- **Response Time**: Response time (p50, p95, p99)
- **Failed Requests**: Error rate

#### Failures
- **Exceptions**: Errors in code (stack trace)
- **Failed Requests**: HTTP 4xx/5xx
- **Dependencies**: Errors when calling external services

### Alerts
- Alerts are configured in Azure Portal
- Receive email notifications when:
  - Exception rate > threshold
  - Response time > threshold
  - Failed requests > threshold

### Logs Query (KQL)
```kusto
// View recent exceptions
exceptions
| where timestamp > ago(1h)
| order by timestamp desc

// View slow requests
requests
| where duration > 1000
| order by duration desc
```

## 📈 Google Analytics

### Access
1. Go to [Google Analytics](https://analytics.google.com)
2. Select the corresponding property
3. View **Reports** > **Realtime** or **Engagement**

### Key Metrics

#### Engagement
- **Page Views**: Number of page views
- **Sessions**: Number of user sessions
- **Users**: Number of unique users

#### Events
- **Scroll**: User scrolls page
- **Page_view**: Number of website visits
- **Login Started**: User starts login
- **Login Success**: Login successful
- **Login Failed**: Login failed
- **Logged Out**: User logged out

### View Events
1. **Reports** > **Engagement** > **Events**
2. Filter by event name or category
3. View count and conversion rate

### Custom Reports
Create custom reports to track:
- Login conversion rate
- User retention
- Popular pages

## 🔍 Comparison

| Metric | Azure App Insights | Google Analytics |
|--------|-------------------|------------------|
| **Purpose** | Production monitoring | Product analytics |
| **Focus** | Errors, performance | User behavior |
| **Data** | Technical metrics | Business metrics |
| **Alerts** | ✅ Yes | ❌ No |

## 💡 Best Practices

1. **Azure App Insights**: Check daily to detect errors early
2. **Google Analytics**: Review weekly to understand user behavior
3. **Alerts**: Set up reasonable thresholds to avoid spam
4. **Dashboards**: Create custom dashboards for important metrics
