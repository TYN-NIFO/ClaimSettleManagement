# Render Deployment Guide

## 🚀 Current Deployment Status

**✅ LIVE:** https://claimsettlemanagement.onrender.com/api

**Platform:** Render (PaaS)
**Status:** Production Ready
**Auto-Deploy:** Enabled

## 📋 Deployment Process

### 1. Automatic Deployment
Your backend automatically deploys when you push to your Git repository:

```bash
# Make your changes
git add .
git commit -m "Your changes"
git push origin main
```

Render will automatically:
- Detect the changes
- Build the application
- Deploy to production
- Update the live URL

### 2. Manual Deployment (if needed)
If you need to manually trigger a deployment:

1. Go to your Render dashboard
2. Select your backend service
3. Click "Manual Deploy"
4. Choose "Deploy latest commit"

## 🔧 Environment Variables

All environment variables are configured in your Render dashboard:

### Required Variables (Already Set)
- `NODE_ENV=production`
- `MONGODB_URI` - Your MongoDB Atlas connection
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRES_IN=7d`
- `REFRESH_TOKEN_SECRET` - Refresh token secret
- `REFRESH_TOKEN_EXPIRES_IN=30d`
- `FRONTEND_URL` - Your frontend URL
- `MAX_FILE_SIZE=5242880`
- `UPLOAD_PATH=./uploads`
- `RATE_LIMIT_WINDOW_MS=900000`
- `RATE_LIMIT_MAX_REQUESTS=100`
- `APPLICATIONINSIGHTS_CONNECTION_STRING` - Azure monitoring

### To Update Environment Variables
1. Go to Render dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Add/update variables
5. Save changes (triggers automatic redeploy)

## 📊 Monitoring & Health Checks

### Health Check Endpoint
Test your deployment: `GET https://claimsettlemanagement.onrender.com/api/health`

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "environment": "production",
  "database": "connected"
}
```

### Render Dashboard Monitoring
- **Logs:** Real-time application logs
- **Metrics:** CPU, memory, response times
- **Deployments:** Deployment history and status
- **Alerts:** Automatic error notifications

## 🔄 Deployment Workflow

### Development → Production
1. **Local Development**
   ```bash
   npm run dev
   ```

2. **Test Production Config**
   ```bash
   npm run prod
   npm run validate-prod
   ```

3. **Deploy to Production**
   ```bash
   git add .
   git commit -m "Production ready changes"
   git push origin main
   ```

4. **Verify Deployment**
   ```bash
   curl https://claimsettlemanagement.onrender.com/api/health
   ```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Build Failures
- Check Render build logs
- Verify `package.json` has correct start script
- Ensure all dependencies are in `dependencies` (not `devDependencies`)

#### 2. Environment Variable Issues
- Verify all required variables are set in Render dashboard
- Check variable names match exactly (case-sensitive)
- Restart service after adding new variables

#### 3. Database Connection Issues
- Verify MongoDB Atlas connection string
- Check IP whitelist in MongoDB Atlas
- Ensure database user has correct permissions

#### 4. CORS Issues
- Verify `FRONTEND_URL` is set correctly
- Check frontend domain is allowed in CORS configuration
- Test with browser developer tools

### Debugging Steps
1. **Check Render Logs**
   - Go to Render dashboard
   - View real-time logs
   - Look for error messages

2. **Test Health Endpoint**
   ```bash
   curl https://claimsettlemanagement.onrender.com/api/health
   ```

3. **Verify Environment Variables**
   - Check all required variables are set
   - Verify values are correct

4. **Test Database Connection**
   - Check MongoDB Atlas dashboard
   - Verify connection string format

## 📈 Scaling & Performance

### Render Auto-Scaling
- **Free Tier:** 750 hours/month
- **Paid Plans:** Automatic scaling based on traffic
- **Custom Domains:** Available on paid plans

### Performance Optimization
- Database connection pooling
- Rate limiting enabled
- File upload size limits
- Caching headers configured

## 🔐 Security

### Security Features Enabled
- ✅ HTTPS enforced
- ✅ CORS protection
- ✅ Rate limiting
- ✅ JWT authentication
- ✅ Input validation
- ✅ Security headers (Helmet)

### Security Best Practices
- Environment variables for secrets
- No sensitive data in code
- Regular dependency updates
- Audit logging enabled

## 📞 Support

### Render Support
- **Documentation:** https://render.com/docs
- **Status Page:** https://status.render.com
- **Community:** Render Discord/Forums

### Application Support
- **Health Check:** `/api/health`
- **Logs:** Render dashboard
- **Metrics:** Built-in monitoring

---

**Last Updated:** January 2024
**Status:** ✅ Production Ready
