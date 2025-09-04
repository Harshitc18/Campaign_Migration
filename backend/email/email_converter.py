import os
import re
import sys
import json
import html
import time
from typing import Dict, Any, List
from datetime import datetime, timedelta

import requests
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ==============================================================================
# 1. CONFIGURATION LOADING (FROM ENVIRONMENT VARIABLES)
# ==============================================================================
def load_config_from_env() -> Dict[str, Any]:
    """Load configuration from environment variables."""
    config = {
        'timezone': {
            'name': os.getenv('TIMEZONE_NAME', 'Asia/Kolkata'),
            'offset': os.getenv('TIMEZONE_OFFSET', '+0530')
        },
        'api_delay': float(os.getenv('API_DELAY', '0.5'))
    }
    return config

APP_CONFIG = load_config_from_env()


# ==============================================================================
# 2. FASTAPI APPLICATION SETUP
# ==============================================================================
app = FastAPI(
    title="Braze to MoEngage Migration API",
    description="An API to migrate an email campaign from Braze to MoEngage.",
    version="1.0.0"
)

origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models for Request Body Validation ---
class MoEngageCredentials(BaseModel):
    bearer_token: str = Field(..., description="MoEngage Bearer Token")
    refresh_token: str = Field(..., description="MoEngage Refresh Token")
    origin: str = Field(default="https://dashboard-01.moengage.com", description="MoEngage Origin URL")
    api_url: str = Field(default="https://dashboard-01.moengage.com/v1.0/campaigns/draft", description="MoEngage API URL")

class BrazeCampaign(BaseModel):
    campaign: Dict[str, Any] = Field(..., description="The root 'campaign' object from the Braze JSON export.")
    moengage_credentials: MoEngageCredentials = Field(..., description="MoEngage API credentials for this request")

class MigrationSuccessResponse(BaseModel):
    status: str = "success"
    message: str
    moengage_response: Dict[str, Any]


# ==============================================================================
# 3. CORE MIGRATION LOGIC (REFACTORED FROM ORIGINAL SCRIPT)
# ==============================================================================

# --- Placeholder/External Modules ---
try:
    from liquid_to_jinja import convert_liquid_to_jinja
except ImportError:
    def convert_liquid_to_jinja(text):
        if text is None: return ""
        if not isinstance(text, str): text = str(text)
        text = re.sub(r'\{\{ ?\$(.*?) ?\}\}', r'{{ \1 }}', text)
        return text

class BrazeCdnToMoenageCdn:
    @staticmethod
    def __extract_braze_image_urls(payload):
        decoded_payload = payload.encode().decode('unicode_escape')
        decoded_payload = html.unescape(decoded_payload)
        
        # Comprehensive patterns to catch ALL Braze-related image URLs
        patterns = [
            # Original braze-images.com domain
            r"https:\/\/braze-images\.com\/[^\"\s,]+",
            
            # All braze.com subdomains (including cdn-staging, assets, etc.)
            r"https:\/\/[a-zA-Z0-9-]+\.braze\.com\/[^\"\s,]+",
            
            # Braze social icons on S3
            r"https:\/\/braze-social-icons\.s3\.amazonaws\.com\/[^\"\s,]+",
            
            # Other potential Braze S3 buckets
            r"https:\/\/braze-[a-zA-Z0-9-]+\.s3\.amazonaws\.com\/[^\"\s,]+",
            
            # Braze CDN variations
            r"https:\/\/cdn[a-zA-Z0-9-]*\.braze\.com\/[^\"\s,]+",
            
            # Assets subdomain variations
            r"https:\/\/assets[a-zA-Z0-9-]*\.braze\.com\/[^\"\s,]+",
            
            # Any other braze-related domains
            r"https:\/\/[a-zA-Z0-9-]*braze[a-zA-Z0-9-]*\.[a-zA-Z0-9.-]+\/[^\"\s,]+",
            
            # Appboy legacy domains (Braze was formerly Appboy)
            r"https:\/\/[a-zA-Z0-9-]*appboy[a-zA-Z0-9-]*\.[a-zA-Z0-9.-]+\/[^\"\s,]+",
        ]
        
        all_matches = []
        for pattern in patterns:
            matches = re.findall(pattern, decoded_payload, re.IGNORECASE)
            all_matches.extend(matches)
        
        # Remove duplicates and filter for actual image files
        unique_urls = list(set(all_matches))
        
        # Additional filtering for image file extensions and valid URLs
        image_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico')
        filtered_urls = []
        
        for url in unique_urls:
            # Remove any trailing quotes or spaces
            url = url.strip('\'"')
            
            # Check if it's likely an image (has image extension or no extension but comes from image CDN)
            url_lower = url.lower()
            is_image = (
                any(ext in url_lower for ext in image_extensions) or
                'image' in url_lower or
                'icon' in url_lower or
                'logo' in url_lower or
                'assets/images' in url_lower or
                url_lower.endswith('/') == False  # Could be dynamic image URL without extension
            )
            
            if is_image:
                filtered_urls.append(url)
        
        return filtered_urls

    @staticmethod
    def __download_image(url):
        try:
            # Add headers to mimic a real browser request
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            }
            
            response = requests.get(url, headers=headers, timeout=30)
            if response.status_code == 200:
                # Try to get filename from URL
                url_path = url.split('/')[-1].split('?')[0]
                
                # If no proper filename, generate one based on content type
                if not url_path or '.' not in url_path:
                    content_type = response.headers.get('content-type', '').lower()
                    if 'image/jpeg' in content_type or 'image/jpg' in content_type:
                        extension = '.jpg'
                    elif 'image/png' in content_type:
                        extension = '.png'
                    elif 'image/gif' in content_type:
                        extension = '.gif'
                    elif 'image/webp' in content_type:
                        extension = '.webp'
                    elif 'image/svg' in content_type:
                        extension = '.svg'
                    else:
                        extension = '.jpg'  # Default fallback
                    
                    file_name = f"braze_image_{int(time.time())}{extension}"
                else:
                    file_name = url_path
                
                # Ensure filename is safe
                file_name = re.sub(r'[^\w\-_\.]', '_', file_name)
                
                with open(file_name, 'wb') as file:
                    file.write(response.content)
                return file_name
            else:
                print(f"Failed to download image from {url}: HTTP {response.status_code}")
                return None
        except Exception as e:
            print(f"Error downloading image from {url}: {str(e)}")
            return None

    @staticmethod
    def __upload_image(file_name, headers):
        origin = headers.get('origin', 'https://dashboard-01.moengage.com').rstrip('/')
        moe_image_cdn_url = f'{origin}/v1/platform/services/upload-file'
        try:
            with open(file_name, 'rb') as file:
                files = {'file': (file_name, file)}
                upload_headers = {k: v for k, v in headers.items() if k.lower() != 'content-type'}
                response = requests.post(moe_image_cdn_url, headers=upload_headers, files=files, timeout=30)
            if response.status_code == 201:
                return response.json().get('url', '')
            return None
        except Exception:
            return None

    @staticmethod
    def process_images(payload, headers):
        if not payload or not isinstance(payload, str): 
            return payload or ""
        
        print(f"Processing images in payload...")
        image_urls = BrazeCdnToMoenageCdn.__extract_braze_image_urls(payload)
        
        if not image_urls:
            print("No Braze image URLs found in payload")
            return payload
        
        print(f"Found {len(image_urls)} Braze image URLs:")
        for i, url in enumerate(image_urls, 1):
            print(f"  {i}. {url}")
        
        for url in image_urls:
            print(f"\nProcessing image: {url}")
            
            # Download the image
            file_name = BrazeCdnToMoenageCdn.__download_image(url)
            if file_name:
                print(f"  ✅ Downloaded as: {file_name}")
                
                # Upload to MoEngage
                moe_cdn_url = BrazeCdnToMoenageCdn.__upload_image(file_name, headers)
                if moe_cdn_url:
                    print(f"  ✅ Uploaded to MoEngage: {moe_cdn_url}")
                    payload = payload.replace(url, moe_cdn_url)
                    print(f"  ✅ Replaced in payload")
                else:
                    print(f"  ❌ Failed to upload to MoEngage")
                
                # Clean up downloaded file
                try: 
                    os.remove(file_name)
                    print(f"  🗑️ Cleaned up temporary file")
                except Exception as e:
                    print(f"  ⚠️ Failed to clean up file {file_name}: {e}")
            else:
                print(f"  ❌ Failed to download image")
        
        print(f"Image processing completed")
        return payload

class EmailCampaignMigrator:
    MAX_EMAIL_CONTENT_SIZE = 100000
    MAX_SUBJECT_LENGTH = 200
    MAX_PREHEADER_LENGTH = 300

    def __init__(self, config: Dict[str, Any], moengage_credentials: MoEngageCredentials):
        self.config = config
        self.api_url = moengage_credentials.api_url
        self.api_delay = config.get('api_delay', 0.5)
        self.headers = {
            'authorization': f"Bearer {moengage_credentials.bearer_token}",
            'origin': moengage_credentials.origin,
            'refreshtoken': moengage_credentials.refresh_token,
            'content-type': 'application/json',
        }
        self.base_payload = self._create_base_payload()

    def _create_base_payload(self) -> Dict[str, Any]:
        return {
            "campaign_data": {
                "contentApi": {"params": {}},
                "utm_params": {
                    "utm_source": {"utm_name": "utm_source", "is_enabled": True, "utm_value": "MoEngage"},
                    "utm_medium": {"utm_name": "utm_medium", "is_enabled": True, "utm_value": "{{Campaign Channel}}"},
                    "utm_campaign": {"utm_name": "utm_campaign", "is_enabled": True, "utm_value": "{{Campaign Name}}"},
                },
                "var_p": {"EMAIL": {"1": 100, "9": 0}},
                "locales": {}, "variateType": "SMV", "m_v_type": "SMV",
                "m_v_data": {"m_v_type": "SMV", "type": "SMV", "data": {}},
                "email_builder": False,
                "email_subject": "Default Subject",
                "email_subject_html": "Default Subject",
                "email_preview_text": "Default preview",
                "email_preview_text_html": "Default preview",
                "attachments": [],
                "email_sender_name": "Default Sender",
                "extraData": {
                    "email_sender_name_html": "Default Sender",
                    "email_reply_id_html": "noreply@example.com"
                },
                "email_editor": "Froala Editor",
                "email_content": "<html><body>Default Content</body></html>",
                "email_from_id": "default@example.com",
                "email_reply_id": "noreply@example.com",
                "connector": {
                    "readableName": "Sendgrid (default)",
                    "name": "default",
                    "type": "Sendgrid"
                },
                "campaignName": "Default Campaign Name",
                "campaign_content_type": "Promotional",
                "timezone": [self.config['timezone']['name'], self.config['timezone']['offset']],
                "timezoneName": self.config['timezone']['name'],
                "conversion": {"conversion_goals": []},
                "global_control_enabled": False,
                "action": "create", "c_c_g_v2": True, "c_s_is_new": True, "is_react": True,
                "campaignType": "Email Triggers",
                "campaigntype": "email",
                "delivery": "trigger",
                "selectedTargetaudience": "custom_filters",
                "triggerDelayType": "delay",
                "subscription_category_name": "allEmails",
                "c_at_trigger_seg_v2": {"included_filters": {"filter_operator": "or", "filters": [
                    {
                        "filter_type": "actions",
                        "action_name": "MOE_APP_OPENED",
                        "execution": {"type": "atleast", "count": 1}
                    }
                ]}},
                "new_segmentation_data": {"included_filters": {"filter_operator": "and", "filters": [
                    {
                        "filter_type": "custom_segments",
                        "name": "All Users",
                        "id": "moe_all_users"
                    }
                ]}}
            }
        }

    def _map_braze_schedule_to_moengage(self, campaign_data: Dict[str, Any]) -> Dict[str, Any]:
        updates = {}
        schedule_type = campaign_data.get("schedule_type")
        timezone_name = self.config['timezone']['name']
        timezone_tuple = [timezone_name, self.config['timezone']['offset']]

        if schedule_type == "action_based":
            # --- CORRECTED VALUE ---
            updates['campaignType'] = "Email Triggers"
            updates['campaigntype'] = "email"
            updates['delivery'] = "trigger"
            
            trigger_data = campaign_data.get("trigger_schedule_data", {})
            delay_sec = trigger_data.get('trigger_delay_in_seconds', 0)
            
            if delay_sec > 0:
                updates['triggerDelayType'] = "delay"
                delay_min = round(delay_sec / 60)
                updates['minDelaySmartTrig'] = str(delay_min)
            else:
                updates['triggerDelayType'] = "asap"

            start_ts = trigger_data.get("start_time")
            end_ts = trigger_data.get("end_time")

            if start_ts:
                start_dt = datetime.fromtimestamp(start_ts)
                updates['laterDate'] = start_dt.strftime("%m/%d/%Y")
                updates['time'] = start_dt.strftime("%-I:%M %p").lower()
            
            if end_ts:
                end_dt = datetime.fromtimestamp(end_ts)
            else:
                end_dt = datetime.fromtimestamp(start_ts) + timedelta(days=365) if start_ts else datetime.now() + timedelta(days=365)
            
            updates['stExpiryDate'] = end_dt.strftime("%m/%d/%Y")
            updates['stExpiryTime'] = end_dt.strftime("%-I:%M %p").lower()

        elif schedule_type == "time_based":
            # --- CORRECTED VALUE ---
            updates['campaignType'] = "Email Campaign"
            updates['campaigntype'] = "email"
            schedule_data = campaign_data.get("schedule_data", {})
            is_recurring = schedule_data.get("recurring", False)
            start_ts = schedule_data.get("start_date_time")
            start_dt = datetime.fromtimestamp(start_ts) if start_ts else datetime.now()

            if is_recurring:
                updates['delivery'] = "periodic"
                updates['dt'] = start_dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
                updates['periodicStartDate'] = start_dt.strftime("%m/%d/%Y")
                updates['periodicTime'] = start_dt.strftime("%-I:%M %p").lower()
                updates['periodicTimezone'] = timezone_tuple
                
                end_dt = start_dt + timedelta(days=365)
                updates['periodicExpireDate'] = end_dt.strftime("%m/%d/%Y")
                updates['periodicExpireTime'] = end_dt.strftime("%-I:%M %p").lower()
                
                schedule_info = {
                    "daily_freq_duration": 0, "weekly_freq_duration": 0, "monthly_freq_duration": 0,
                    "selected_weekdays": [], "month_view_type": "MONTH_VIEW", "days_of_month": [],
                    "weeks_of_month": {}, "should_sent_on_last_day": False, "expiry_type": "ON_DATE", "max_instance_count": 0
                }
                
                frequency = schedule_data.get('frequency', '').upper()
                repeat_interval = schedule_data.get('repeat_interval', 1)
                schedule_info['recur_type'] = frequency

                if frequency == "DAILY":
                    schedule_info['daily_freq_duration'] = repeat_interval
                elif frequency == "WEEKLY":
                    schedule_info['weekly_freq_duration'] = repeat_interval
                    weekday_map = {'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3, 'friday': 4, 'saturday': 5, 'sunday': 6}
                    braze_weekdays = schedule_data.get('weekdays', {})
                    schedule_info['selected_weekdays'] = [weekday_map[day] for day, active in braze_weekdays.items() if active]
                elif frequency == "MONTHLY":
                    schedule_info['monthly_freq_duration'] = repeat_interval
                    schedule_info['days_of_month'] = [start_dt.day]

                updates['schedule_info'] = schedule_info

            else:
                updates['delivery'] = "later"
                updates['dt'] = start_dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
                updates['laterDate'] = start_dt.strftime("%m/%d/%Y")
                updates['time'] = start_dt.strftime("%-I:%M %p").lower()
        
        return updates

    def _map_braze_conversions_to_moengage(self, braze_conversions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        moengage_goals = []
        for bc in braze_conversions:
            event_type = bc.get("event_type")
            goal = {"revenue": False}
            if event_type == "TrackedUserBehavior::MadeAnyPurchase":
                goal["name"], goal["event_name"], goal["revenue"] = "Any Purchase", "Purchase", True
            elif event_type == "TrackedUserBehavior::UsedApp" and bc.get("type") == "open":
                goal["name"], goal["event_name"] = "App/Site Open", "App/Site Open"
            elif event_type == "TrackedUserBehavior::PerformedCustomEvent":
                custom_event = bc.get("custom_event_name")
                goal["name"], goal["event_name"] = f"Performed '{custom_event}'", custom_event
            if "name" in goal: moengage_goals.append(goal)
        return moengage_goals

    def _sanitize_content(self, content: str, content_type: str = "html") -> str:
        if not content: return ""
        if content_type == "html" and len(content) > self.MAX_EMAIL_CONTENT_SIZE:
            content = content[:self.MAX_EMAIL_CONTENT_SIZE]
        elif content_type == "subject" and len(content) > self.MAX_SUBJECT_LENGTH:
            content = content[:self.MAX_SUBJECT_LENGTH-3] + "..."
        elif content_type == "preheader" and len(content) > self.MAX_PREHEADER_LENGTH:
            content = content[:self.MAX_PREHEADER_LENGTH-3] + "..."
        return content

    def update_payload_from_json(self, base_payload: Dict[str, Any], campaign_data: Dict[str, Any]) -> Dict[str, Any]:
        payload = json.loads(json.dumps(base_payload))
        camp_data = payload["campaign_data"]
        camp_data['campaignName'] = campaign_data.get('campaign_name', 'Default Campaign Name')
        
        schedule_updates = self._map_braze_schedule_to_moengage(campaign_data)
        camp_data.update(schedule_updates)
        
        braze_conversions = campaign_data.get('conversion_behaviors', [])
        camp_data['conversion']['conversion_goals'] = self._map_braze_conversions_to_moengage(braze_conversions)
        
        all_variations = campaign_data.get('messaging_actions', [])
        regular_variations = [v for v in all_variations if v.get('message_type') == 'email' and not v.get('is_control')]
        
        if not regular_variations:
            raise ValueError("No regular email variations found in the Braze campaign data.")
        
        if len(regular_variations) == 1:
            camp_data["variateType"], camp_data["m_v_type"] = "SMV", "SMV"
            email_message = regular_variations[0]
            subject = self._sanitize_content(email_message.get("email_subject", ""), "subject")
            preheader = self._sanitize_content(email_message.get("preheader", ""), "preheader")
            html_content = self._sanitize_content(email_message.get("email_body", ""), "html")
            
            processed_html = BrazeCdnToMoenageCdn.process_images(html_content, headers=self.headers)
            
            camp_data["email_subject_html"] = convert_liquid_to_jinja(subject)
            camp_data["email_preview_text_html"] = convert_liquid_to_jinja(preheader)
            camp_data["email_content"] = convert_liquid_to_jinja(processed_html)
            camp_data["email_sender_name"] = email_message.get('from_display_name')
            camp_data["email_from_id"] = email_message.get('from_address')
            camp_data["email_reply_id"] = email_message.get('reply_to_address') or email_message.get('from_address')
        
        return payload

    def create_campaign_in_moengage(self, payload: Dict[str, Any]) -> requests.Response:
        if self.api_delay > 0:
            time.sleep(self.api_delay)
        response = requests.post(self.api_url, headers=self.headers, data=json.dumps(payload))
        return response

# ==============================================================================
# 4. API ENDPOINTS
# ==============================================================================

@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Braze Email to MoEngage Migration API",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/v1/migrate-campaign", response_model=MigrationSuccessResponse, tags=["Migration"])
def migrate_campaign(request_body: BrazeCampaign):
    try:
        migrator = EmailCampaignMigrator(config=APP_CONFIG, moengage_credentials=request_body.moengage_credentials)
        campaign_data = request_body.campaign
        final_payload = migrator.update_payload_from_json(migrator.base_payload, campaign_data)
        response = migrator.create_campaign_in_moengage(final_payload)

        if response.status_code in [200, 201]:
            return MigrationSuccessResponse(
                message=f"Successfully created campaign draft '{campaign_data.get('campaign_name', 'N/A')}' in MoEngage.",
                moengage_response=response.json()
            )
        else:
            raise HTTPException(
                status_code=502,
                detail={
                    "message": "Failed to create campaign in MoEngage. The MoEngage API returned an error.",
                    "moengage_status_code": response.status_code,
                    "moengage_response": response.text
                }
            )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Braze Email to MoEngage Migration API...")
    print("📡 Service will be available at: http://localhost:8080")
    print("📋 API Documentation: http://localhost:8080/docs")
    print("🔄 Health Check: http://localhost:8080/health")
    uvicorn.run(app, host="0.0.0.0", port=8080)