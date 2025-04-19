# Savore Restaurant Management System

A full-stack restaurant management system with user authentication and order management.

## Prerequisites

- Node.js (v14 or higher)
- Oracle Database
- SQL*Plus

## Setup Instructions

### Database Setup

1. Open SQL*Plus and connect to your Oracle database
2. Run the schema.sql file to create the database tables:
   ```sql
   @database/schema.sql
   ```
3. Run the data.sql file to populate the database with initial data:
   ```sql
   @database/data.sql
   ```

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure database connection:
   - Copy `dbconfig.example.js` to `dbconfig.js`
   - Update the database credentials in `dbconfig.js`

4. Start the backend server:
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. The frontend is a static website and can be served using any web server
2. You can use Python's built-in HTTP server for development:
   ```bash
   cd frontend
   python -m http.server 8000
   ```

## Features

- User authentication (login/register)
- Menu browsing
- Order placement
- Order history
- Profile management

## API Endpoints

### Authentication
- POST /api/register - Register a new user
- POST /api/login - Login user
- GET /api/orders - Get user's orders (requires authentication)
- POST /api/orders - Create a new order (requires authentication)

## Security

- Passwords are hashed using bcrypt
- JWT tokens are used for authentication
- CORS is enabled for cross-origin requests
- Input validation and sanitization

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 