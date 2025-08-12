# Azure Blob Storage Setup Guide

This guide will help you set up Azure Blob Storage for the Claim Management System to solve the file persistence issue in production.

## 🚨 Problem Solved

The current issue is that files uploaded to the production server (Render) are stored in ephemeral storage, which gets wiped between deployments. This causes 404 errors when trying to access previously uploaded files.

## 🎯 Solution: Azure Blob Storage

We've implemented Azure Blob Storage integration that will:
- ✅ Store files permanently in Azure cloud storage
- ✅ Work seamlessly with your existing Azure environment
- ✅ Provide secure, scalable file storage
- ✅ Maintain file access through your existing API endpoints

## 📋 Prerequisites

1. **Azure Account**: You need an active Azure subscription
2. **Azure Storage Account**: Either existing or create a new one
3. **Node.js**: Version 16+ (already installed)

## 🔧 Step-by-Step Setup

### Step 1: Create Azure Storage Account

1. **Go to Azure Portal**: https://portal.azure.com
2. **Create Storage Account**:
   - Click "Create a resource"
   - Search for "Storage account"
   - Click "Create"
   - Fill in the details:
     - **Subscription**: Your Azure subscription
     - **Resource group**: Create new or use existing
     - **Storage account name**: `claimmanagementstorage` (or your preferred name)
     - **Location**: Choose closest to your users
     - **Performance**: Standard
     - **Redundancy**: LRS (Locally redundant storage)
   - Click "Review + create" then "Create"

### Step 2: Get Connection String

1. **Navigate to Storage Account**: Once created, go to your storage account
2. **Access Keys**: In the left menu, click "Access keys"
3. **Copy Connection String**: 
   - Click "Show" next to "Connection string"
   - Copy the entire connection string
   - It looks like: `DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net`

### Step 3: Update Environment Variables

1. **Local Development**: Update `backend/config.production.env`:
   ```bash
   AZURE_STORAGE_CONNECTION_STRING=your_connection_string_here
   AZURE_STORAGE_CONTAINER=claim-files
   ```

2. **Production (Render)**: Add these environment variables in your Render dashboard:
   - `AZURE_STORAGE_CONNECTION_STRING`: Your connection string
   - `AZURE_STORAGE_CONTAINER`: `claim-files`

### Step 4: Install Dependencies

```bash
cd backend
npm install
```

### Step 5: Run Setup Script

```bash
npm run setup-azure
```

This script will:
- ✅ Test the connection to Azure Storage
- ✅ Create the container if it doesn't exist
- ✅ Test file upload/download operations
- ✅ Verify everything is working correctly

### Step 6: Deploy to Production

1. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Add Azure Blob Storage integration"
   git push
   ```

2. **Deploy to Render**: Your application will automatically deploy

## 🔍 Testing the Setup

### Test File Upload
1. Go to your application
2. Create a new claim with file attachments
3. Verify files are uploaded successfully

### Test File Access
1. View the claim details
2. Click "View" or "Download" on attachments
3. Verify files open/download correctly

## 📊 Cost Estimation

Azure Blob Storage pricing (approximate):
- **Storage**: $0.0184 per GB per month
- **Transactions**: $0.004 per 10,000 transactions
- **Data transfer**: $0.087 per GB (outbound)

For a typical claim management system:
- **Estimated monthly cost**: $5-20 (depending on usage)
- **Free tier**: 5 GB storage + 20,000 transactions per month

## 🔒 Security Features

- **Private Container**: Files are stored with private access
- **Authentication Required**: All file access requires valid JWT tokens
- **Secure URLs**: Files are served through your authenticated API
- **No Public Access**: Files cannot be accessed directly without authentication

## 🛠️ Troubleshooting

### Common Issues

1. **"Connection string invalid"**:
   - Verify you copied the entire connection string
   - Check that the storage account exists and is accessible

2. **"Container not found"**:
   - Run the setup script: `npm run setup-azure`
   - Check container name in environment variables

3. **"File upload failed"**:
   - Check Azure Storage account permissions
   - Verify connection string is correct
   - Check network connectivity

4. **"File download failed"**:
   - Verify authentication is working
   - Check if file exists in Azure Storage
   - Review server logs for errors

### Debug Commands

```bash
# Test Azure connection
npm run setup-azure

# Check environment variables
echo $AZURE_STORAGE_CONNECTION_STRING

# View server logs
npm run dev
```

## 📈 Monitoring

### Azure Storage Metrics
- Go to Azure Portal → Storage Account → Insights
- Monitor:
  - Storage usage
  - Transaction count
  - Error rates
  - Performance metrics

### Application Logs
- Check Render logs for file operation errors
- Monitor authentication failures
- Track file upload/download success rates

## 🔄 Migration from Local Files

If you have existing files in your local uploads folder that you want to migrate:

1. **Backup local files**: Copy your `backend/uploads` folder
2. **Upload to Azure**: Use the setup script or Azure Portal
3. **Update database**: Ensure file references are correct
4. **Test thoroughly**: Verify all files are accessible

## 🎉 Benefits

After implementing Azure Blob Storage:

- ✅ **Persistent Storage**: Files survive server restarts and deployments
- ✅ **Scalability**: Handle unlimited file uploads
- ✅ **Reliability**: 99.9% availability SLA
- ✅ **Security**: Private, authenticated access
- ✅ **Cost-Effective**: Pay only for what you use
- ✅ **Global Access**: Files accessible from anywhere

## 📞 Support

If you encounter issues:

1. **Check this guide** for troubleshooting steps
2. **Review Azure documentation**: https://docs.microsoft.com/en-us/azure/storage/
3. **Check application logs** for specific error messages
4. **Test with setup script**: `npm run setup-azure`

---

**🎯 Result**: Your claim management system will now have reliable, persistent file storage that works seamlessly in production!
