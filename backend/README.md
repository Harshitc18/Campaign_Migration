# Campaign Migration Services - Quick Start Guide

## ✅ Setup Complete!

All 4 services are now configured and ready to run on their designated ports:

## 🚀 Service Ports

| Service | Port | Purpose | URL |
|---------|------|---------|-----|
| **Email Converter** | 8080 | Convert email campaigns | http://localhost:8080 |
| **Push Converter** | 8081 | Convert push campaigns | http://localhost:8081 |
| **Campaign Fetcher** | 8082 | Fetch Braze campaigns | http://localhost:8082 |
| **SMS Converter** | 8083 | Convert SMS campaigns | http://localhost:8083 |

## 🎯 How to Start All Services

Simply run the launcher script:

```bash
cd /Users/harshit.chatterjee/Desktop/Campaign_Migration/backend
python3 launch_all.py
```

This will:
- ✅ Start all 4 services simultaneously
- ✅ Display service URLs and documentation links
- ✅ Monitor all services
- ✅ Allow graceful shutdown with Ctrl+C

## 📋 API Documentation

Each service provides interactive API documentation:
- Email: http://localhost:8080/docs
- Push: http://localhost:8081/docs
- Fetcher: http://localhost:8082/docs
- SMS: http://localhost:8083/docs

## 🔧 Individual Service Start (Optional)

You can also start services individually:

```bash
# Email Converter (Port 8080)
python3 email/email_converter.py

# Push Converter (Port 8081)
python3 push/push_converter.py

# Campaign Fetcher (Port 8082)
python3 campaign_fetcher/braze_campaign_fetcher.py

# SMS Converter (Port 8083)
python3 sms/sms_converter.py
```

## 🛑 How to Stop Services

- **When using launcher**: Press `Ctrl+C` (graceful shutdown)
- **Individual services**: Press `Ctrl+C` in each terminal

## ✨ Current Status

- ✅ Virtual environment configured
- ✅ All FastAPI dependencies installed
- ✅ All 4 services configured with proper ports
- ✅ Launcher script created and tested
- ✅ All services running successfully

## 🔗 Frontend Integration

The frontend (React/Vite) can now connect to these services:
- Frontend ports: 3000 (React), 5173 (Vite)
- All services have CORS configured for frontend integration
- Services are accessible at their respective localhost URLs
