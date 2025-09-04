# 🚀 Campaign Migration Tool

A powerful tool to seamlessly migrate campaigns from Braze to MoEngage with automated content conversion and real-time progress tracking.

## 📋 Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## ✨ Features

- **🔄 Multi-Channel Migration**: Support for Email, Push, and SMS campaigns
- **📧 Email Campaign Migration**: Automated HTML/CSS conversion with image processing
- **📱 Push Notification Migration**: Cross-platform push campaign migration
- **💬 SMS Campaign Migration**: Text message campaign conversion
- **🖼️ Image Processing**: Automatic Braze image URL detection and MoEngage upload
- **🛡️ Duplicate Prevention**: Advanced safeguards to prevent duplicate migrations
- **📊 Real-time Progress**: Live migration progress with detailed logging
- **🔐 Secure Authentication**: Session-based Braze authentication and Bearer token MoEngage auth
- **🧪 Testing Tools**: Individual migration testing components

## 📁 Project Structure

```
Campaign_Migration/
├── backend/                     # FastAPI Backend Services
│   ├── campaign_fetcher/        # Braze campaign data fetching
│   │   └── braze_campaign_fetcher.py
│   ├── email/                   # Email migration service (Port 8080)
│   │   ├── email_converter.py
│   │   └── liquid_to_jinja.py
│   ├── push/                    # Push migration service (Port 8081)
│   │   ├── push_converter.py
│   │   └── liquid_to_jinja.py
│   └── sms/                     # SMS migration service (Port 8083)
│       ├── sms_converter.py
│       └── liquid_to_jinja.py
├── frontend/                    # React Frontend
│   └── my-react-app/
│       ├── src/
│       │   ├── components/
│       │   │   ├── CampaignsPage.jsx
│       │   │   ├── LoginPage.jsx
│       │   │   ├── MigrationProgressPage.jsx
│       │   │   ├── MoEngageAuthModal.jsx
│       │   │   ├── ViewDetailsPage.jsx
│       │   │   └── testing/     # Testing components
│       │   │       ├── BrazeMoEngageMigrator.jsx
│       │   │       ├── BrazePushMigrator.jsx
│       │   │       └── BrazeSMSMigrator.jsx
│       │   ├── App.jsx
│       │   └── main.jsx
│       ├── package.json
│       └── vite.config.js
└── README.md
```

## 🔧 Prerequisites

### Backend Requirements
- **Python 3.8+**
- **pip** (Python package manager)

### Frontend Requirements
- **Node.js 16+**
- **npm** or **yarn**

### External Services
- **Braze Account** with dashboard access
- **MoEngage Account** with API access

## 📦 Installation

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd Campaign_Migration
```

### 2. Backend Setup

#### Create Virtual Environment
```bash
cd backend
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

#### Install Dependencies
```bash
# Install each service dependencies
cd campaign_fetcher
pip install fastapi uvicorn requests python-multipart

cd ../email
pip install fastapi uvicorn requests python-multipart jinja2 beautifulsoup4

cd ../push
pip install fastapi uvicorn requests python-multipart jinja2

cd ../sms
pip install fastapi uvicorn requests python-multipart jinja2
```

### 3. Frontend Setup
```bash
cd frontend/my-react-app
npm install
```

## ⚙️ Configuration

### Braze Configuration
1. Log into your Braze dashboard
2. Open browser developer tools (F12)
3. Go to **Application/Storage → Cookies**
4. Find and note down:
   - `session_id`
   - `app_group_id`
   - Dashboard URL (e.g., `https://dashboard-09.braze.com`)

### MoEngage Configuration
1. Log into your MoEngage dashboard
2. Go to **Settings → API Keys**
3. Note down:
   - `Bearer Token`
   - `Refresh Token`
   - API Origin URL (e.g., `https://dashboard-01.moengage.com`)

## 🚀 Running the Application

### 1. Start Backend Services

You need to start 4 separate FastAPI services:

#### Terminal 1 - Campaign Fetcher (Port 8082)
```bash
cd backend/campaign_fetcher
source ../venv/bin/activate  # On Windows: ..\venv\Scripts\activate
python braze_campaign_fetcher.py
```

#### Terminal 2 - Email Service (Port 8080)
```bash
cd backend/email
source ../venv/bin/activate  # On Windows: ..\venv\Scripts\activate
python email_converter.py
```

#### Terminal 3 - Push Service (Port 8081)
```bash
cd backend/push
source ../venv/bin/activate  # On Windows: ..\venv\Scripts\activate
python push_converter.py
```

#### Terminal 4 - SMS Service (Port 8083)
```bash
cd backend/sms
source ../venv/bin/activate  # On Windows: ..\venv\Scripts\activate
python sms_converter.py
```

### 2. Start Frontend

#### Terminal 5 - React App (Port 5173)
```bash
cd frontend/my-react-app
npm run dev
```

### 3. Access the Application
Open your browser and navigate to: `http://localhost:5173`

## 📖 Usage

### 1. Authentication
1. Open the application at `http://localhost:5173`
2. Enter your Braze credentials:
   - Dashboard URL
   - Session ID
   - App Group ID
3. Click **"🚀 Start Migration"**

### 2. Campaign Selection
1. Browse available Braze campaigns
2. Use filters to find specific campaigns
3. Select campaigns for migration
4. Click **"Migrate Selected Campaigns"**

### 3. MoEngage Authentication
1. Enter MoEngage credentials in the modal:
   - Bearer Token
   - Refresh Token
   - Origin URL
2. Click **"Start Migration"**

### 4. Migration Process
1. Monitor real-time progress
2. View detailed logs
3. Check success/failure status
4. Retry failed migrations if needed

### 5. Testing Tools
Access individual migration testing at:
- Draft Migrator: `/draft-migrator`
- Push Migrator: `/push-migrator`
- SMS Migrator: `/sms-migrator`

## 🔌 API Documentation

### Campaign Fetcher Service (Port 8082)
- **GET** `/campaigns/{campaign_id}/` - Fetch campaign details

### Email Migration Service (Port 8080)
- **POST** `/v1/migrate-campaign` - Migrate email campaign

### Push Migration Service (Port 8081)
- **POST** `/v1/migrate-push-campaign` - Migrate push campaign

### SMS Migration Service (Port 8083)
- **POST** `/v1/migrate-sms-campaign` - Migrate SMS campaign

## 🧪 Testing

### Manual Testing
1. Use the testing tools in the UI
2. Test individual campaign types
3. Verify API responses

### API Testing
```bash
# Test campaign fetcher
curl -X GET "http://localhost:8082/campaigns/CAMPAIGN_ID/" \
  -H "X-Dashboard-Url: YOUR_DASHBOARD_URL" \
  -H "X-Session-Id: YOUR_SESSION_ID" \
  -H "X-App-Group-Id: YOUR_APP_GROUP_ID"

# Test email migration
curl -X POST "http://localhost:8080/v1/migrate-campaign" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign": {...},
    "moengage_credentials": {
      "bearer_token": "YOUR_TOKEN",
      "refresh_token": "YOUR_REFRESH_TOKEN"
    }
  }'
```

## 🐛 Troubleshooting

### Common Issues

#### Backend Services Not Starting
- **Check Python version**: Ensure Python 3.8+
- **Virtual environment**: Make sure it's activated
- **Port conflicts**: Ensure ports 8080-8083 are available
- **Dependencies**: Reinstall with `pip install -r requirements.txt`

#### Frontend Not Loading
- **Node version**: Ensure Node.js 16+
- **Dependencies**: Run `npm install` again
- **Port conflict**: Change port in `vite.config.js`

#### Migration Failures
- **Credentials**: Verify Braze and MoEngage credentials
- **Network**: Check internet connectivity
- **API limits**: Check for rate limiting
- **Logs**: Review detailed error logs in the UI

#### CORS Issues
- **Backend**: Ensure CORS is properly configured in FastAPI
- **Frontend**: Check if API URLs are correct

### Debug Mode
Add debug logging to any Python service:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the troubleshooting section
- Review API documentation

---

**Happy Migrating! 🚀**
