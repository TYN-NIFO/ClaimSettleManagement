# Claim Management System

A comprehensive internal reimbursement claim management system with role-based access control, configurable policies, and full audit trail.

## Features

- **Role-based Access Control**: Employee, Supervisor (Level 1 & 2), Finance Manager, Admin
- **Configurable Policies**: Approval modes, claim categories, file types, payout channels
- **Secure Authentication**: JWT with access/refresh token rotation
- **File Upload**: Support for attachments with size and type validation
- **Audit Trail**: Complete logging of all system actions
- **Real-time Updates**: Modern UI with Redux state management

## Tech Stack

### Backend
- **Node.js** + **Express**
- **MongoDB** + **Mongoose**
- **JWT** Authentication with refresh tokens
- **Multer** for file uploads
- **bcryptjs** for password hashing
- **express-validator** for input validation

### Frontend
- **Next.js 15** with App Router
- **TypeScript**
- **Redux Toolkit** with RTK Query
- **Tailwind CSS v4**
- **React Hook Form** + **Zod** validation
- **Lucide React** icons
- **React Hot Toast** notifications

## Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Environment Configuration**
   Create a `config.env` file in the backend directory:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/claim-management
   JWT_SECRET=your-super-secret-jwt-key-here
   FRONTEND_URL=http://localhost:3000
   ```

3. **Seed the database**
   ```bash
   npm run seed
   ```
   This creates the default admin user (admin@company.com / admin123)

4. **Start the server**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Environment Configuration**
   Create a `.env.local` file in the frontend directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Default Credentials

- **Admin**: admin@company.com / admin123
- **Create additional users** through the admin dashboard

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `POST /api/auth/revoke/:userId` - Revoke user sessions (admin)

### Claims
- `GET /api/claims` - Get claims (role-filtered)
- `GET /api/claims/:id` - Get specific claim
- `POST /api/claims` - Create new claim
- `POST /api/claims/:id/approve` - Approve/reject claim (supervisor)
- `POST /api/claims/:id/finance-approve` - Finance approval
- `POST /api/claims/:id/mark-paid` - Mark as paid
- `POST /api/claims/:id/upload` - Upload attachment
- `GET /api/claims/stats` - Get claim statistics

### Users (Admin)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get specific user
- `POST /api/users` - Create user
- `PATCH /api/users/:id` - Update user
- `PATCH /api/users/:id/deactivate` - Deactivate user
- `PATCH /api/users/:id/reset-password` - Reset password
- `GET /api/users/supervisors` - Get supervisors list

### Policies (Admin)
- `GET /api/policies` - Get current policy
- `PATCH /api/policies` - Update policy

## Role Permissions

### Employee
- Submit claims for themselves
- View own claim history and status
- Upload attachments to claims

### Supervisor (Level 1 & 2)
- Approve/reject claims from assigned employees
- Submit claims on behalf of employees
- Mark claims as paid after finance approval
- View all claims for assigned employees

### Finance Manager
- Final approval of claims
- View claims ready for finance approval
- Add personal expense entries
- View expense history

### Admin
- Full system configuration
- User management (create, edit, deactivate)
- Policy configuration
- Session management
- Audit log access

## Claim Lifecycle

1. **Employee submits claim**
2. **Supervisors approve/reject** (independent approvals per policy)
3. **Finance Manager approves** (if policy criteria met)
4. **Supervisor marks as paid** after payout
5. **Audit trail** logs all actions

## Configuration

### Policy Settings
- **Approval Mode**: 'both' (both supervisors) or 'any' (either supervisor)
- **Claim Categories**: Customizable list (Travel, Healthcare, Office, etc.)
- **Max Amount**: Threshold before Finance Manager approval required
- **File Types**: Allowed file extensions
- **File Size**: Maximum upload size
- **Payout Channels**: Available payment methods
- **Retention Period**: Days to keep claim data

## Development

### Backend Scripts
```bash
npm run dev      # Start development server
npm run start    # Start production server
npm run seed     # Seed database with default data
```

### Frontend Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## File Structure

```
claim-app/
├── backend/
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Auth & RBAC middleware
│   ├── models/         # Mongoose models
│   ├── routes/         # API routes
│   ├── scripts/        # Database seeding
│   └── server.js       # Express server
├── frontend/
│   ├── src/
│   │   ├── app/        # Next.js app router
│   │   │   ├── components/  # React components
│   │   │   └── ...
│   │   └── lib/        # Redux store & utilities
│   └── ...
└── README.md
```

## Security Features

- **JWT Token Rotation**: Refresh tokens rotated on each use
- **Password Hashing**: bcrypt with salt rounds
- **Input Validation**: Server-side validation with express-validator
- **File Upload Security**: Type and size validation
- **RBAC**: Role-based access control with row-level security
- **Audit Logging**: Complete action tracking
- **Rate Limiting**: API rate limiting protection

## Production Deployment

### Backend
1. Set `NODE_ENV=production`
2. Use strong JWT secret
3. Configure MongoDB Atlas or production MongoDB
4. Set up proper CORS origins
5. Use environment variables for all secrets

### Frontend
1. Build with `npm run build`
2. Deploy to Vercel, Netlify, or similar
3. Configure environment variables
4. Set up proper API URL

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
