# Campaign Migration API - Service Ports Summary

## Port Configuration

Based on the analysis of the backend services, here are the ports each service is configured to run on:

### Main Application (Combined Services)
- **Port**: `8000` (default, configurable via `PORT` environment variable)
- **File**: `main.py`
- **URL**: http://localhost:8000
- **Status**: ✅ Configured and ready to run
- **Mount Points**:
  - `/api/campaign-fetcher` - Campaign Fetcher service
  - `/api/email` - Email Converter service
  - `/api/push` - Push Converter service  
  - `/api/sms` - SMS Converter service

### Individual Services (When Run Separately)

#### 1. Campaign Fetcher Service
- **Port**: `8082` (hardcoded)
- **File**: `campaign_fetcher/braze_campaign_fetcher.py`
- **URL**: http://localhost:8082
- **Status**: ✅ Configured in health endpoint
- **Purpose**: Fetch campaigns from Braze

#### 2. Email Converter Service  
- **Port**: Not explicitly configured for standalone running
- **File**: `email/email_converter.py`
- **Status**: ⚠️ No standalone server configuration found
- **Purpose**: Convert email campaigns from Braze to MoEngage

#### 3. Push Converter Service
- **Port**: Not explicitly configured for standalone running
- **File**: `push/push_converter.py` 
- **Status**: ⚠️ No standalone server configuration found
- **Purpose**: Convert push campaigns from Braze to MoEngage

#### 4. SMS Converter Service
- **Port**: `8083` (hardcoded)
- **File**: `sms/sms_converter.py`
- **URL**: http://localhost:8083
- **Status**: ✅ Configured with uvicorn.run()
- **Purpose**: Convert SMS campaigns from Braze to MoEngage

## Current Virtual Environment Setup

- **Virtual Environment**: ✅ Created at `/Users/harshit.chatterjee/Desktop/Campaign_Migration/backend/venv`
- **Python Version**: Python 3.9.6
- **FastAPI**: ✅ Installed (version 0.104.1)
- **Dependencies**: ✅ All installed from requirements.txt

## How to Run Services

### Option 1: Run All Services Together (Recommended)
```bash
cd /Users/harshit.chatterjee/Desktop/Campaign_Migration/backend
python3 main.py
# Accessible at: http://localhost:8000
```

### Option 2: Run Individual Services
```bash
# Campaign Fetcher (Port 8082)
python3 campaign_fetcher/braze_campaign_fetcher.py

# SMS Converter (Port 8083) 
python3 sms/sms_converter.py

# Email and Push converters need standalone configurations added
```

## Next Steps

1. **Add standalone server configurations** to email and push converters
2. **Test the main application** to ensure all services mount correctly
3. **Configure environment variables** for flexible port assignment
4. **Add proper startup scripts** for easy deployment

## Notes

- The SMS converter has duplicate main sections that should be cleaned up
- Email and Push converters are designed as API modules but lack standalone server capability
- All services use the same CORS configuration for frontend integration
