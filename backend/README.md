# Claim Management System - Backend API

A robust Node.js/Express backend API for managing insurance claims with role-based access control, file uploads, and comprehensive audit logging.

## 🚀 Deployment

**Platform:** Vercel (Serverless) ⚡  
**Status:** ✅ Production Ready

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for deployment guide.

## 🏗️ Architecture

- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT with refresh tokens
- **File Storage:** AWS S3
- **Email:** SendGrid
- **Security:** Helmet, CORS, Rate limiting
- **Monitoring:** Application Insights (Azure)
- **Deployment:** Vercel Serverless Functions

## 📁 Project Structure

```
backend/
├── controllers/          # Route handlers
├── middleware/          # Custom middleware
├── models/             # MongoDB schemas
├── routes/             # API routes
├── scripts/            # Utility scripts
├── services/           # Business logic
├── uploads/            # File uploads
├── logs/               # Application logs
├── server.js           # Main application file
├── package.json        # Dependencies
└── config.production.env # Production configuration
```

## 🛠️ Setup & Development

### Prerequisites
- Node.js 18+
- MongoDB database
- Git

### Local Development
```bash
# Clone the repository
git clone <your-repo-url>
cd backend

# Install dependencies
npm install

# Set up environment variables
cp config.env.example config.env
# Edit config.env with your values

# Start development server
npm run dev
```

### Production Testing
```bash
# Test with production configuration
npm run prod

# Validate production readiness
npm run validate-prod
```

## 🔧 Environment Variables

### Required Variables
- `NODE_ENV` - Environment (development/production)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRES_IN` - JWT expiration time
- `REFRESH_TOKEN_SECRET` - Refresh token secret
- `REFRESH_TOKEN_EXPIRES_IN` - Refresh token expiration
- `FRONTEND_URL` - Frontend application URL
- `MAX_FILE_SIZE` - Maximum file upload size
- `UPLOAD_PATH` - File upload directory
- `RATE_LIMIT_WINDOW_MS` - Rate limiting window
- `RATE_LIMIT_MAX_REQUESTS` - Rate limiting max requests
- `APPLICATIONINSIGHTS_CONNECTION_STRING` - Azure monitoring

### Optional Variables
- `PORT` - Server port (default: 5000)
- `CORS_ORIGIN` - Additional CORS origins
- `API_BASE_URL` - API base URL
- `COOKIE_SECRET` - Cookie encryption secret
- `SECURE_COOKIES` - Enable secure cookies
- `LOG_LEVEL` - Logging level
- `LOG_FILE` - Log file path

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - User logout

### Claims
- `GET /api/claims` - Get all claims (filtered by role)
- `POST /api/claims` - Create new claim
- `GET /api/claims/:id` - Get specific claim
- `PUT /api/claims/:id` - Update claim
- `DELETE /api/claims/:id` - Delete claim
- `POST /api/claims/:id/approve` - Approve claim
- `POST /api/claims/:id/reject` - Reject claim

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get specific user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Policies
- `GET /api/policies` - Get all policies
- `POST /api/policies` - Create policy (admin only)
- `PUT /api/policies/:id` - Update policy (admin only)
- `DELETE /api/policies/:id` - Delete policy (admin only)

### Health Check
- `GET /api/health` - Application health status

## 🔐 Role-Based Access Control

### User Roles
1. **Employee** - Submit and view own claims
2. **Supervisor** - Approve/reject claims, view team claims
3. **Finance Manager** - Final approval, payment processing
4. **Admin** - Full system access, user management

### Permission Matrix
| Action | Employee | Supervisor | Finance | Admin |
|--------|----------|------------|---------|-------|
| Submit Claim | ✅ | ✅ | ✅ | ✅ |
| View Own Claims | ✅ | ✅ | ✅ | ✅ |
| View Team Claims | ❌ | ✅ | ✅ | ✅ |
| View All Claims | ❌ | ❌ | ✅ | ✅ |
| Approve Claims | ❌ | ✅ | ✅ | ✅ |
| Process Payments | ❌ | ❌ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ❌ | ✅ |
| Manage Policies | ❌ | ❌ | ❌ | ✅ |

## 🚀 Deployment

### Current Deployment (Render)
The application is currently deployed on Render:

1. **Automatic Deployments:** Push to Git repository
2. **Environment Variables:** Configured in Render dashboard
3. **Monitoring:** Built-in logs and metrics
4. **Scaling:** Automatic scaling based on traffic

### Alternative Deployment Options

#### Azure App Service
```bash
# Install Azure CLI
npm install -g azure-cli

# Deploy
az webapp up --name your-app-name --resource-group your-group
```

#### Heroku
```bash
# Install Heroku CLI
heroku create your-app-name
git push heroku main
```

#### Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway login
railway up
```

## 🛡️ Security Features

- **JWT Authentication** with refresh tokens
- **Role-based access control** (RBAC)
- **Rate limiting** to prevent abuse
- **CORS protection** with configurable origins
- **Helmet.js** for security headers
- **Input validation** with express-validator
- **File upload security** with size and type restrictions
- **Audit logging** for all critical actions

## 📊 Monitoring & Logging

- **Health Check Endpoint:** `/api/health`
- **Application Insights:** Azure monitoring integration
- **Structured Logging:** Morgan HTTP logging
- **Error Handling:** Comprehensive error middleware
- **Database Monitoring:** Connection status tracking

## 🔧 Utility Scripts

- `npm run seed` - Seed initial data
- `npm run create-admin` - Create admin user
- `npm run create-finance-manager` - Create finance manager
- `npm run assign-supervisors` - Assign supervisors to employees
- `npm run check-claims` - Check claim status
- `npm run validate-prod` - Validate production readiness

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check the health endpoint: `GET /api/health`
2. Review application logs
3. Verify environment variables
4. Check database connectivity

---

**Status:** ✅ Production Ready | **Last Updated:** $(date)
