# Quick Start Guide - Login API JWT

## 1. Setup Proyek

```bash
# Clone atau buat direktori baru
mkdir login-api-jwt
cd login-api-jwt

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env dengan konfigurasi Anda
nano .env
```

## 2. Konfigurasi Database

### Opsi A: MongoDB Local
```bash
# Install MongoDB (Ubuntu/Debian)
sudo apt-get install mongodb

# Start MongoDB service
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

### Opsi B: MongoDB Atlas (Cloud)
1. Buka https://cloud.mongodb.com
2. Buat akun baru
3. Buat cluster baru
4. Dapatkan connection string
5. Update `MONGODB_URI` di file `.env`

## 3. Mulai Server

```bash
# Development mode (dengan auto-restart)
npm run dev

# Production mode
npm start
```

## 4. Test API

### Register User Baru
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123"
  }'
```

### Get Profile (with token)
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 5. Struktur Response

### Success Response
```json
{
  "success": true,
  "message": "Success message",
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [ ... ]
}
```

## 6. Security Features

- ✅ Password hashing dengan bcrypt
- ✅ JWT access & refresh tokens
- ✅ Rate limiting
- ✅ Input validation
- ✅ Security headers (Helmet)
- ✅ CORS protection
- ✅ MongoDB injection protection

## 7. Troubleshooting

### MongoDB Connection Error
```bash
# Check MongoDB status
sudo systemctl status mongodb

# Check MongoDB logs
sudo journalctl -u mongodb
```

### Port Already in Use
```bash
# Kill process on port 3000
sudo lsof -ti:3000 | xargs kill -9

# Or change PORT di .env
PORT=3001
```

### JWT Secret Error
```bash
# Generate new JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 8. Environment Variables Required

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
MONGODB_URI=mongodb://localhost:27017/login_api
BCRYPT_ROUNDS=12
```

## 9. Production Deployment

1. Set `NODE_ENV=production`
2. Gunakan environment variables yang secure
3. Setup SSL/HTTPS
4. Configure reverse proxy (nginx)
5. Setup monitoring dan logging
6. Setup database backup

## 10. Next Steps

1. Implement refresh token rotation
2. Add password reset functionality
3. Add email verification
4. Implement role-based access control
5. Add API documentation (Swagger)
6. Setup unit dan integration tests
7. Setup CI/CD pipeline

Happy coding! 🚀
