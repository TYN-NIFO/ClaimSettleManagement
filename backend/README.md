# Claim Settle Management Backend

A Node.js Express server with MongoDB integration for managing insurance claims.

## Features

- RESTful API for claim management
- MongoDB database integration
- Pagination and filtering
- Statistics and analytics
- Security middleware (helmet, cors, rate limiting)
- Error handling and validation

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `config.env`:
```
PORT=5000
MONGODB_URI=mongodb+srv://lathiesh24:pass1234@cluster0.5rb9nav.mongodb.net/claim-settle-db
NODE_ENV=development
```

3. Start the server:
```bash
# Development mode with nodemon
npm run dev

# Production mode
npm start
```

## API Endpoints

### Claims

- `GET /api/claims` - Get all claims (with pagination and filtering)
- `GET /api/claims/stats` - Get claim statistics
- `GET /api/claims/:id` - Get single claim by ID
- `POST /api/claims` - Create new claim
- `PUT /api/claims/:id` - Update claim
- `DELETE /api/claims/:id` - Delete claim

### Query Parameters for GET /api/claims

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `status` - Filter by status (Pending, Under Review, Approved, Rejected, Settled)
- `claimType` - Filter by claim type (Property, Liability, Health, Auto, Other)
- `sortBy` - Sort field (default: filedDate)
- `sortOrder` - Sort order (asc/desc, default: desc)

### Claim Model

```javascript
{
  claimNumber: String (required, unique),
  claimantName: String (required),
  claimType: String (Property, Liability, Health, Auto, Other),
  claimAmount: Number (required, min: 0),
  status: String (Pending, Under Review, Approved, Rejected, Settled),
  description: String (required),
  incidentDate: Date (required),
  filedDate: Date (auto-generated),
  settlementAmount: Number (default: 0),
  settlementDate: Date,
  notes: String,
  documents: Array
}
```

## Health Check

- `GET /health` - Check server and database status

## Security Features

- Helmet.js for security headers
- CORS enabled
- Rate limiting (100 requests per 15 minutes per IP)
- Input validation and sanitization
- Error handling middleware

## Database

The application connects to MongoDB Atlas using the provided connection string. The database name is `claim-settle-db`.

## Development

The server runs on port 5000 by default. You can change this in the `config.env` file.

For development, the server uses nodemon for automatic restarting when files change.
