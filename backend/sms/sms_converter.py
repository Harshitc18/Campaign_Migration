import os
import re
import sys
import json
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
    title="Braze to MoEngage SMS Migration API",
    description="An API to migrate an SMS campaign from Braze to MoEngage.",
    version="1.1.0"
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
    campaign: Dict[str, Any] = Field(..., description="The root 'campaign' object from the Braze SMS JSON export.")
    moengage_credentials: MoEngageCredentials = Field(..., description="MoEngage API credentials for this request")

class MigrationSuccessResponse(BaseModel):
    status: str = "success"
    message: str
    moengage_response: Dict[str, Any]


# ==============================================================================
# 3. CORE MIGRATION LOGIC
# ==============================================================================

# --- Helper Function ---
try:
    from liquid_to_jinja import convert_liquid_to_jinja
except ImportError:
    def convert_liquid_to_jinja(text):
        if text is None: return ""
        if not isinstance(text, str): text = str(text)
        text = re.sub(r'\{\{ ?\$(.*?) ?\}\}', r'{{ \1 }}', text)
        return text

class SmsCampaignMigrator:
    """Handles the migration of Braze SMS campaigns to MoEngage."""
    def __init__(self, config: Dict[str, Any], moengage_credentials: MoEngageCredentials):
        self.config = config
        self.credentials = moengage_credentials
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
        """Creates the base structure for a MoEngage SMS campaign."""
        return { "campaign_data": {
            "campaignType": "sms", "action": "create", "c_c_g_v2": True, "c_s_is_new": True,
            "is_react": True, "is_jinja": True, "campaignName": "Default SMS Campaign",
            "global_control_enabled": False, "delivery": "later",
            "conversion": {"conversion_goals": []},
            "new_segmentation_data": {
                "included_filters": {"filter_operator": "and", "filters": [
                    {"filter_type": "custom_segments", "name": "All Users", "id": "moe_all_users"}
                ]}
            },
            "var_p": {"sms": {"1": 100, "9": 0}},
            "message_html": "Default SMS message.", "message": "Default SMS message.",
            "sms_dlt_template_id": "YOUR_DLT_TEMPLATE_ID_HERE",
            "timezone": [self.config['timezone']['name'], self.config['timezone']['offset']],
            "timezoneName": self.config['timezone']['name'],
            "bypass_dnd": False,
        }}

    def _fetch_default_sender_details(self) -> Dict[str, Any]:
        """Fetches the default SMS sender settings from the MoEngage API."""
        sender_api_url = f"{self.credentials.origin}/v2/settings/sms?api=1"
        try:
            response = requests.get(sender_api_url, headers=self.headers, timeout=30)
            response.raise_for_status()  # Raises an HTTPError for bad responses (4xx or 5xx)
            settings = response.json()
            if settings.get("status") == "success" and "generalSettings" in settings:
                return settings["generalSettings"]
            else:
                raise ValueError("Failed to parse sender settings from MoEngage API response.")
        except requests.exceptions.RequestException as e:
            raise ValueError(f"Error calling MoEngage sender API: {e}")
        except json.JSONDecodeError:
            raise ValueError("Failed to decode JSON from MoEngage sender API response.")

    def _format_connector_from_settings(self, settings: Dict[str, Any]) -> Dict[str, Any]:
        """Formats the selectedConnector object from the fetched general settings."""
        sender_name = settings.get("default_sender_v2", "DefaultSender")
        sender_type = settings.get("default_sender_type", "promotional").capitalize()
        connector_type_raw = settings.get("default_connector_v2", "Custom_Connector")
        connector_type = connector_type_raw.replace('_', ' ')

        return {
            "sender_id": settings.get("default_sender_v2_id"),
            "name": sender_name,
            "setting_sender_id": "",
            "connector_id": settings.get("default_connector_v2_id"),
            "connector_type": connector_type,
            "displayName": sender_name,
            "unSubText": None,
            "moCallbackURL": None,
            "connector_name": sender_name,
            "deliveryEnabled": False,
            "senderType": sender_type
        }

    def _map_braze_schedule_to_moengage(self, campaign_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Comprehensive mapping of Braze scheduling types to MoEngage for SMS campaigns.
        Supports: action-based (triggered), time-based (scheduled), and recurring campaigns.
        """
        updates = {}
        schedule_type = campaign_data.get("schedule_type")
        timezone_name = self.config['timezone']['name']
        timezone_tuple = [timezone_name, self.config['timezone']['offset']]
        
        if schedule_type == "action_based":
            # Action-based/Triggered campaigns
            updates['campaignType'] = "sms"  # Keep SMS type
            
            trigger_data = campaign_data.get("trigger_schedule_data", {})
            delay_sec = trigger_data.get('trigger_delay_in_seconds', 0)
            
            if delay_sec > 0:
                updates['delivery'] = "trigger"
                updates['triggerDelayType'] = "delay"
                updates['minDelaySmartTrig'] = str(round(delay_sec / 60))  # Convert to minutes
            else:
                updates['delivery'] = "soon"
                updates['triggerDelayType'] = "asap"
            
            # Handle trigger start and end times
            start_ts = trigger_data.get("start_time")
            end_ts = trigger_data.get("end_time")
            
            if start_ts:
                start_dt = datetime.fromtimestamp(start_ts)
                updates['laterDate'] = start_dt.strftime("%m/%d/%Y")
                updates['time'] = start_dt.strftime("%-I:%M %p").lower()
            
            # Set expiry date
            end_dt = datetime.fromtimestamp(end_ts) if end_ts else (
                datetime.fromtimestamp(start_ts) + timedelta(days=365) if start_ts 
                else datetime.now() + timedelta(days=365)
            )
            updates['stExpiryDate'] = end_dt.strftime("%m/%d/%Y")
            updates['stExpiryTime'] = end_dt.strftime("%-I:%M %p").lower()
            
        elif schedule_type == "time_based":
            # Time-based campaigns (scheduled or recurring)
            updates['campaignType'] = "sms"  # Keep SMS type
            schedule_data = campaign_data.get("schedule_data", {})
            is_recurring = schedule_data.get("recurring", False)
            start_ts = schedule_data.get("start_date_time")
            start_dt = datetime.fromtimestamp(start_ts) if start_ts else datetime.now()
            
            if is_recurring:
                # Recurring campaigns
                updates['delivery'] = "periodic"
                updates['dt'] = start_dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
                updates['periodicStartDate'] = start_dt.strftime("%m/%d/%Y")
                updates['periodicTime'] = start_dt.strftime("%-I:%M %p").lower()
                updates['periodicTimezone'] = timezone_tuple
                
                # Set default expiry (1 year from start)
                end_dt = start_dt + timedelta(days=365)
                updates['periodicExpireDate'] = end_dt.strftime("%m/%d/%Y")
                updates['periodicExpireTime'] = end_dt.strftime("%-I:%M %p").lower()
                
                # Build schedule_info for recurring patterns
                schedule_info = {
                    "daily_freq_duration": 0,
                    "weekly_freq_duration": 0, 
                    "monthly_freq_duration": 0,
                    "selected_weekdays": [],
                    "month_view_type": "MONTH_VIEW",
                    "days_of_month": [],
                    "weeks_of_month": {},
                    "should_sent_on_last_day": False,
                    "expiry_type": "ON_DATE",
                    "max_instance_count": 0
                }
                
                frequency = schedule_data.get('frequency', '').upper()
                repeat_interval = schedule_data.get('repeat_interval', 1)
                schedule_info['recur_type'] = frequency
                
                if frequency == "DAILY":
                    schedule_info['daily_freq_duration'] = repeat_interval
                elif frequency == "WEEKLY":
                    schedule_info['weekly_freq_duration'] = repeat_interval
                    # Map Braze weekdays to MoEngage format
                    weekday_map = {
                        'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
                        'friday': 4, 'saturday': 5, 'sunday': 6
                    }
                    braze_weekdays = schedule_data.get('weekdays', {})
                    schedule_info['selected_weekdays'] = [
                        weekday_map[day] for day, active in braze_weekdays.items() if active
                    ]
                elif frequency == "MONTHLY":
                    schedule_info['monthly_freq_duration'] = repeat_interval
                    schedule_info['days_of_month'] = [start_dt.day]
                
                updates['schedule_info'] = schedule_info
                
            else:
                # One-time scheduled campaigns
                updates['delivery'] = "later"
                updates['dt'] = start_dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
                updates['laterDate'] = start_dt.strftime("%m/%d/%Y")
                updates['time'] = start_dt.strftime("%-I:%M %p").lower()
                
        else:
            # Default/immediate delivery or unknown schedule type
            updates['delivery'] = "later"
            updates['laterDate'] = datetime.now().strftime("%m/%d/%Y")
            updates['time'] = datetime.now().strftime("%-I:%M %p").lower()
        
        return updates

    def _map_braze_conversions_to_moengage(self, braze_conversions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        # ... (This method remains unchanged)
        moengage_goals = []
        for bc in braze_conversions:
            goal = {"revenue": False}
            if bc.get("event_type") == "TrackedUserBehavior::UsedApp":
                goal["name"], goal["event_name"] = "App/Site Open", "App/Site Open"
            # Add other conversion types here if needed
            if "name" in goal: moengage_goals.append(goal)
        return moengage_goals

    def update_payload_from_json(self, campaign_data: Dict[str, Any]) -> Dict[str, Any]:
        """Populates the MoEngage payload with data from the Braze campaign..."""

        if len(campaign_data.keys()) == 1 and 'campaign' in campaign_data:
            campaign_data = campaign_data['campaign']
        # Step 1: Fetch and format the dynamic sender information
        sender_settings = self._fetch_default_sender_details()
        selected_connector = self._format_connector_from_settings(sender_settings)
        
        # Step 2: Prepare the payload
        payload = json.loads(json.dumps(self.base_payload))
        camp_data = payload["campaign_data"]
        
        # Step 3: Inject the dynamic sender
        camp_data['selectedConnector'] = selected_connector

        # Step 4: Map the rest of the Braze campaign data
        camp_data['campaignName'] = campaign_data.get('campaign_name', 'Default SMS Campaign Name')
        schedule_updates = self._map_braze_schedule_to_moengage(campaign_data)
        camp_data.update(schedule_updates)
        
        # Step 5: Handle triggered campaign segmentation
        if campaign_data.get("schedule_type") == "action_based":
            camp_data['new_segmentation_data'] = {
                "included_filters": {
                    "filter_operator": "and",
                    "filters": [
                        {
                            "filter_type": "actions",
                            "action_name": "MOE_APP_OPENED",
                            "execution": {
                                "type": "atleast",
                                "count": 1
                            },
                            "executed": True,
                            "attributes": {
                                "filter_operator": "and",
                                "filters": []
                            }
                        }
                    ]
                }
            }
        
        braze_conversions = campaign_data.get('conversion_behaviors', [])
        camp_data['conversion']['conversion_goals'] = self._map_braze_conversions_to_moengage(braze_conversions)

        # Handle SMS variations (single or multiple)
        regular_variations = [v for v in campaign_data.get('messaging_actions', []) if v.get('message_type') == 'sms' and not v.get('is_control')]
        if not regular_variations:
            raise ValueError("No regular SMS variations found in the Braze campaign data.")
        
        if len(regular_variations) == 1:
            # Single variation - use existing message fields
            sms_message = regular_variations[0]
            sms_body = sms_message.get("body", "")
            processed_body = convert_liquid_to_jinja(sms_body)
            camp_data["message_html"] = processed_body
            camp_data["message"] = processed_body
        else:
            # Multiple variations - update var_p and create variation-specific messages
            variation_percentage = 100 // len(regular_variations)
            remainder = 100 % len(regular_variations)
            
            # Clear the default var_p for SMS and set up for multiple variations
            camp_data["var_p"]["sms"] = {}
            
            # Create numbered variations and update var_p percentages
            for i, sms_message in enumerate(regular_variations, 1):
                sms_body = sms_message.get("body", "")
                processed_body = convert_liquid_to_jinja(sms_body)
                
                # Set percentage (give remainder to last variation)
                percentage = variation_percentage + (remainder if i == len(regular_variations) else 0)
                camp_data["var_p"]["sms"][str(i)] = percentage
                
                # Store variation-specific messages
                if i == 1:
                    # First variation uses the main message fields
                    camp_data["message_html"] = processed_body
                    camp_data["message"] = processed_body
                else:
                    # Additional variations stored as message_html_2, message_2, etc.
                    camp_data[f"message_html_{i}"] = processed_body
                    camp_data[f"message_{i}"] = processed_body
            
            # Set control percentage to 0 for multi-variation
            camp_data["var_p"]["sms"]["9"] = 0
        
        return payload
        
    def create_campaign_in_moengage(self, payload: Dict[str, Any]) -> requests.Response:
        if self.api_delay > 0:
            time.sleep(self.api_delay)
        return requests.post(self.api_url, headers=self.headers, data=json.dumps(payload))


# ==============================================================================
# 4. API ENDPOINTS
# ==============================================================================

@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint to verify the SMS migration service is running."""
    return {
        "status": "healthy",
        "service": "braze-sms-converter",
        "version": "1.1.0",
        "port": 8083
    }

@app.post("/v1/migrate-sms-campaign", response_model=MigrationSuccessResponse, tags=["Migration"])
def migrate_sms_campaign(request_body: BrazeCampaign):
    """Migrates a Braze SMS campaign to a MoEngage draft."""
    try:
        migrator = SmsCampaignMigrator(config=APP_CONFIG, moengage_credentials=request_body.moengage_credentials)
        final_payload = migrator.update_payload_from_json(request_body.campaign)
        response = migrator.create_campaign_in_moengage(final_payload)

        if response.status_code in [200, 201]:
            return MigrationSuccessResponse(
                message=f"Successfully created campaign draft '{request_body.campaign.get('campaign_name', 'N/A')}' in MoEngage.",
                moengage_response=response.json()
            )
        else:
            raise HTTPException(
                status_code=502,
                detail={"message": "Failed to create campaign in MoEngage.", "moengage_status_code": response.status_code, "moengage_response": response.text}
            )
    except (ValueError, requests.exceptions.RequestException) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


# ==============================================================================
# 5. MAIN APPLICATION RUNNER
# ==============================================================================
if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Braze SMS to MoEngage Migration API...")
    print("📡 Service will be available at: http://localhost:8083")
    print("📋 API Documentation: http://localhost:8083/docs")
    print("🔄 Health Check: http://localhost:8083/health")
    uvicorn.run(app, host="0.0.0.0", port=8083)