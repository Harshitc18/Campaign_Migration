import os
import re
import sys
import json
import time
import html
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
    """Load static configuration from environment variables."""
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
    title="Braze to MoEngage Push Migration API",
    description="An API to migrate a push notification campaign from Braze to MoEngage.",
    version="1.0.0"
)

origins = [
    "http://localhost",
    "http://localhost:3000", # Default for Create React App
    "http://localhost:5173", # Default for Vite
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
    api_url: str = Field(default="https://dashboard-01.moengage.com/v1.0/campaigns/draft", description="MoEngage API URL for creating drafts")

class PushMigrationRequest(BaseModel):
    campaign: Dict[str, Any] = Field(..., description="The root 'campaign' object from the Braze push JSON export.")
    moengage_credentials: MoEngageCredentials = Field(..., description="MoEngage API credentials for this request")

# ==============================================================================
# 3. CORE MIGRATION LOGIC (Adapted from the script)
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

# --- NEW: Full BrazeCdnToMoenageCdn class is now integrated here ---
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

    @staticmethod
    def process_single_image_url(image_url, headers):
        """Process a single image URL for conversion from Braze CDN to MoEngage CDN"""
        if not image_url:
            return ""
        
        print(f"Processing single image: {image_url}")
        
        # Download the image
        file_name = BrazeCdnToMoenageCdn.__download_image(image_url)
        if file_name:
            print(f"  ✅ Downloaded as: {file_name}")
            
            # Upload to MoEngage
            moe_cdn_url = BrazeCdnToMoenageCdn.__upload_image(file_name, headers)
            if moe_cdn_url:
                print(f"  ✅ Uploaded to MoEngage: {moe_cdn_url}")
                
                # Clean up downloaded file
                try: 
                    os.remove(file_name)
                    print(f"  🗑️ Cleaned up temporary file")
                except Exception as e:
                    print(f"  ⚠️ Failed to clean up file {file_name}: {e}")
                
                return moe_cdn_url
            else:
                print(f"  ❌ Failed to upload to MoEngage")
        else:
            print(f"  ❌ Failed to download image")
        
        return image_url  # Return original URL if processing fails

class PushCampaignMigrator: #
    """
    Production-ready push campaign migrator from Braze to MoEngage.
    Supports Android, iOS, and Web push notifications with platform-specific features.
    """
    MAX_TITLE_LENGTH = 100 #
    MAX_MESSAGE_LENGTH = 240 #
    MAX_SUMMARY_LENGTH = 100 #
    
    def __init__(self, config: Dict[str, Any]): #
        self.config = config #
        self.preview_mode = config.get('preview_mode', False) #
        self.api_url = config['moengage']['api_url'] #
        self.headers = { #
            'authorization': f"Bearer {config['moengage']['bearer_token']}", #
            'origin': config['moengage']['origin'], #
            'refreshtoken': config['moengage']['refresh_token'], #
            'content-type': 'application/json', #
        }
        self.cdn_headers = { #
            'authorization': f"Bearer {config['moengage']['bearer_token']}", #
            'refreshtoken': config['moengage']['refresh_token'], #
            'origin': config['moengage']['origin'] #
        }
        self.base_payload = self._create_base_payload() #

    def _create_base_payload(self) -> Dict[str, Any]:
        return {
            "campaign_data": {
                "stepStatus": True, "c_c_g_v2": True, "is_jinja": True,
                "selectedTargetaudience": "custom_filters", "is_react": True,
                "c_at_trigger_seg_v2": {
                    "included_filters": { "filter_operator": "or", "filters": [{"filter_type": "actions", "action_name": "MOE_APP_OPENED", "execution": {"type": "atleast", "count": 1}, "executed": True, "attributes": {"filter_operator": "and", "filters": []}}]}
                },
                "c_at_act_seg_v2": {"included_filters": {"filter_operator": "and", "filters": []}},
                
                "timeValue": 0,
                "multiplier": 1,
                "triggerRelation": "after",
                "triggerAttr": "If Action",

                "c_s_is_new": True, "campaignName": "Default Push Campaign",
                "selectedPlatform": ["ANDROID", "IOS", "WEB"],
                "selectedPlatformName": ["ANDROID", "IOS", "WEB"],

                "new_segmentation_data": { "included_filters": { "filter_operator": "and", "filters": [{"filter_type": "custom_segments", "name": "All Users", "id": "moe_all_users"}]}
                },
                "tag_ids": [], "action": "create",
                "ttl": "36", "ttl_type": "hour",
                "ANDROID": {"sendWithPriority": "normal", "channel_id": "moe_default_channel", "msgtitle": "", "msg": "", "actionArray": [{"type": "deeplinking", "deeplinkingURL": ""}], "widgetArray": []},
                "IOS": {"interruption-level": "active", "title": "", "body": "", "actionArray": [{"type": "deeplinking", "deeplinkingURL": ""}], "widgetArray": []},
                "WEB": {"msgtitle": "", "msg": "", "redirectURL": "", "widgetArray": []},
                "is_bts_campaign": False, "tz_f": False,
                "conversion": {"primary": {"action": None, "goal_name": "Goal 1"}},
                "timezone": [self.config['timezone']['name'], self.config['timezone']['offset']], "bypass_dnd": False,
                "timezoneName": self.config['timezone']['name'],
                "var_p": {"ANDROID": {"1": 100}, "IOS": {"1": 100}, "WEB": {"1": 100}},
            }
        }
    
    def _map_braze_trigger_to_moengage(self, campaign_data: Dict[str, Any]) -> Dict[str, Any]: #
        return {"included_filters": {"filter_operator": "or", "filters": [{"filter_type": "actions", "action_name": "MOE_APP_OPENED", "execution": {"type": "atleast", "count": 1}, "executed": True, "attributes": {"filter_operator": "and", "filters": []}}]}} #

    def _map_braze_filters_to_moengage(self, braze_filters: List[Dict[str, Any]]) -> List[Dict[str, Any]]: #
        return [{"filter_type": "custom_segments", "name": "All Users", "id": "moe_all_users"}] #
    
    def _map_delivery_and_scheduling(self, campaign_data: Dict[str, Any]) -> Dict[str, Any]: #
        updates = {} #
        schedule_type = campaign_data.get("schedule_type") #
        timezone_name = self.config['timezone']['name'] #
        timezone_tuple = [timezone_name, self.config['timezone']['offset']] #
        if schedule_type == "action_based": #
            updates['campaignType'] = "Autotrigger Campaign" #
            updates['delivery'] = "trigger" #
            trigger_data = campaign_data.get("trigger_schedule_data", {}) #
            delay_sec = trigger_data.get('trigger_delay_in_seconds', 0) #
            if delay_sec > 0: #
                updates['triggerDelayType'] = "delay" #
                updates['minDelaySmartTrig'] = str(round(delay_sec / 60)) #
            else: #
                updates['triggerDelayType'] = "asap" #
            start_ts = trigger_data.get("start_time") #
            end_ts = trigger_data.get("end_time") #
            if start_ts: #
                start_dt = datetime.fromtimestamp(start_ts) #
                updates['laterDate'] = start_dt.strftime("%m/%d/%Y") #
                updates['time'] = start_dt.strftime("%-I:%M %p").lower() #
            end_dt = datetime.fromtimestamp(end_ts) if end_ts else (datetime.fromtimestamp(start_ts) + timedelta(days=365) if start_ts else datetime.now() + timedelta(days=365)) #
            updates['stExpiryDate'] = end_dt.strftime("%m/%d/%Y") #
            updates['stExpiryTime'] = end_dt.strftime("%-I:%M %p").lower() #
        elif schedule_type == "time_based": #
            updates['campaignType'] = "General Push Campaign" #
            schedule_data = campaign_data.get("schedule_data", {}) #
            is_recurring = schedule_data.get("recurring", False) #
            start_ts = schedule_data.get("start_date_time") #
            start_dt = datetime.fromtimestamp(start_ts) if start_ts else datetime.now() #
            if is_recurring: #
                updates['delivery'] = "periodic" #
                updates['dt'] = start_dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z" #
                updates['periodicStartDate'] = start_dt.strftime("%m/%d/%Y") #
                updates['periodicTime'] = start_dt.strftime("%-I:%M %p").lower() #
                updates['periodicTimezone'] = timezone_tuple #
                end_dt = start_dt + timedelta(days=365) #
                updates['periodicExpireDate'] = end_dt.strftime("%m/%d/%Y") #
                updates['periodicExpireTime'] = end_dt.strftime("%-I:%M %p").lower() #
                schedule_info = {"daily_freq_duration": 0, "weekly_freq_duration": 0, "monthly_freq_duration": 0, "selected_weekdays": [], "month_view_type": "MONTH_VIEW", "days_of_month": [], "weeks_of_month": {}, "should_sent_on_last_day": False, "expiry_type": "ON_DATE", "max_instance_count": 0} #
                frequency = schedule_data.get('frequency', '').upper() #
                repeat_interval = schedule_data.get('repeat_interval', 1) #
                schedule_info['recur_type'] = frequency #
                if frequency == "DAILY": #
                    schedule_info['daily_freq_duration'] = repeat_interval #
                elif frequency == "WEEKLY": #
                    schedule_info['weekly_freq_duration'] = repeat_interval #
                    weekday_map = {'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3, 'friday': 4, 'saturday': 5, 'sunday': 6} #
                    braze_weekdays = schedule_data.get('weekdays', {}) #
                    schedule_info['selected_weekdays'] = [weekday_map[day] for day, active in braze_weekdays.items() if active] #
                elif frequency == "MONTHLY": #
                    schedule_info['monthly_freq_duration'] = repeat_interval #
                    schedule_info['days_of_month'] = [start_dt.day] #
                updates['schedule_info'] = schedule_info #
            else: #
                updates['delivery'] = "later" #
                updates['dt'] = start_dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z" #
                updates['laterDate'] = start_dt.strftime("%m/%d/%Y") #
                updates['time'] = start_dt.strftime("%-I:%M %p").lower() #
        return updates #

    def _map_braze_conversions_to_moengage(self, braze_conversions: List[Dict[str, Any]]) -> Dict[str, Any]: #
        primary_goal, secondary_goals = None, [] #
        for bc in braze_conversions: #
            event_type = bc.get("event_type") #
            goal = {"attributes": {"filter_operator": "and", "filters": []}, "filter_type": "actions"} #
            if event_type == "TrackedUserBehavior::MadeAnyPurchase": goal.update({"action": "PURCHASE", "goal_name": "Purchase Conversion"}) #
            elif event_type == "TrackedUserBehavior::UsedApp" and bc.get("type") == "open": goal.update({"action": "MOE_APP_OPENED", "goal_name": "App Open"}) #
            elif event_type == "TrackedUserBehavior::UpgradedAppVersion": goal.update({"action": "APP_VERSION_UPDATED", "goal_name": "App Version Upgrade"}) #
            elif event_type == "TrackedUserBehavior::PerformedCustomEvent": #
                custom_event = bc.get("custom_event_name", "CUSTOM_EVENT") #
                goal.update({"action": custom_event, "goal_name": f"Custom Event: {custom_event}"}) #
            else: goal.update({"action": "MOE_APP_OPENED", "goal_name": "App Engagement"}) #
            if not primary_goal: primary_goal = goal #
            else: secondary_goals.append(goal) #
        if not primary_goal: primary_goal = {"action": "MOE_APP_OPENED", "goal_name": "App Open", "attributes": {"filter_operator": "and", "filters": []}, "filter_type": "actions"} #
        return {"primary": primary_goal, "secondary": secondary_goals} #

    def _sanitize_content(self, content: str, content_type: str = "message") -> str: #
        if not content: return "" #
        content = re.sub(r'<[^>]+>', '', content) #
        if content_type == "title" and len(content) > self.MAX_TITLE_LENGTH: content = content[:self.MAX_TITLE_LENGTH-3] + "..." #
        elif content_type == "message" and len(content) > self.MAX_MESSAGE_LENGTH: content = content[:self.MAX_MESSAGE_LENGTH-3] + "..." #
        elif content_type == "summary" and len(content) > self.MAX_SUMMARY_LENGTH: content = content[:self.MAX_SUMMARY_LENGTH-3] + "..." #
        return content.strip() #

    def _map_android_buttons(self, android_action: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Map Braze Android push buttons to MoEngage format"""
        buttons = []
        android_buttons = android_action.get("android_push_buttons", [])
        
        for button in android_buttons:
            action_type = button.get("action_type", "")
            button_text = button.get("text", "button")
            uri = button.get("uri", "")
            
            if action_type == "DEEP_LINK":
                buttons.append({
                    "ndANDROIDDeeplinking": [],
                    "type": "deeplinking",
                    "deeplinkingURL": convert_liquid_to_jinja(uri),
                    "btnName": button_text
                })
            elif action_type == "URI":
                buttons.append({
                    "ndANDROIDRichlanding": [],
                    "type": "richlanding", 
                    "richLandingURL": convert_liquid_to_jinja(uri),
                    "btnName": button_text
                })
        
        return buttons

    def _map_ios_buttons(self, ios_action: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Map Braze iOS push buttons to MoEngage format"""
        # For iOS, the value remains unchanged with INVITE_CATEGORY type
        ios_buttons = ios_action.get("ios_push_buttons", [])
        
        if ios_buttons:
            return [{"type": "INVITE_CATEGORY"}]
        else:
            return []

    def _map_web_buttons(self, web_action: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Map Braze Web push buttons to MoEngage format"""
        buttons = []
        web_buttons = web_action.get("web_push_buttons", [])
        
        # Start with empty object for web buttons
        if web_buttons:
            buttons.append({})  # First element is always empty object
            
            for i, button in enumerate(web_buttons):
                button_text = button.get("text", "button")
                uri = button.get("uri", "")
                
                buttons.append({
                    "action": i + 1,
                    "title": button_text,
                    "url": convert_liquid_to_jinja(uri)
                })
        
        return buttons

    def _map_android_push(self, android_action: Dict[str, Any]) -> Dict[str, Any]: #
        android_config = {"msgtitle": convert_liquid_to_jinja(self._sanitize_content(android_action.get("android_title", ""), "title")), "msg": convert_liquid_to_jinja(self._sanitize_content(android_action.get("android_push_message", ""), "message"))} #
        
        # Handle image
        image_url = android_action.get("image_url") #
        if image_url: #
            final_image_url = BrazeCdnToMoenageCdn.process_single_image_url(image_url, self.cdn_headers) #
            android_config["widgetArray"] = [{"WidgetName": "image", "inputImageURL": final_image_url, "selectedImageUploadType": "url"}] #
        
        # Handle buttons
        button_actions = self._map_android_buttons(android_action)
        if button_actions:
            android_config["actionArray"] = button_actions
        else:
            # Fallback to custom URI or default
            custom_uri = android_action.get("android_custom_uri") #
            if custom_uri: 
                android_config["actionArray"] = [{"ndANDROIDDeeplinking": [], "type": "deeplinking", "deeplinkingURL": convert_liquid_to_jinja(custom_uri)}] #
            else: 
                android_config["actionArray"] = [{"ndANDROIDDeeplinking": [], "type": "deeplinking", "deeplinkingURL": ""}] #
        
        return android_config #

    def _map_ios_push(self, ios_action: Dict[str, Any]) -> Dict[str, Any]: #
        ios_alert = ios_action.get("ios_alert_hash", {}) #
        ios_config = {"title": convert_liquid_to_jinja(self._sanitize_content(ios_alert.get("title", ""), "title")), "body": convert_liquid_to_jinja(self._sanitize_content(ios_action.get("ios_push_message", ""), "message"))} #
        
        # Handle image
        image_url = ios_action.get("ios_image_url") #
        if image_url: #
            final_image_url = BrazeCdnToMoenageCdn.process_single_image_url(image_url, self.cdn_headers) #
            ios_config["widgetArray"] = [{"WidgetName": "image", "inputImageURL": final_image_url, "selectedImageUploadType": "url"}] #
        
        # Handle buttons
        button_actions = self._map_ios_buttons(ios_action)
        if button_actions:
            ios_config["actionArray"] = button_actions
        else:
            # Fallback to custom URI or default
            ios_uri = ios_action.get("ios_uri") #
            if ios_uri: 
                ios_config["actionArray"] = [{"actionKVPairs": [], "type": "deeplinking", "deeplinkingURL": convert_liquid_to_jinja(ios_uri)}] #
            else: 
                ios_config["actionArray"] = [{"actionKVPairs": [], "type": "deeplinking", "deeplinkingURL": ""}] #
        
        return ios_config #

    def _map_web_push(self, web_action: Dict[str, Any]) -> Dict[str, Any]:
        web_config = {
            "msgtitle": convert_liquid_to_jinja(self._sanitize_content(web_action.get("web_title", ""), "title")),
            "msg": convert_liquid_to_jinja(self._sanitize_content(web_action.get("web_push_message", ""), "message"))
        }       
        
        # Handle image
        image_url = web_action.get("image_url") or web_action.get("large_image_url")
        if image_url:
            final_image_url = BrazeCdnToMoenageCdn.process_single_image_url(image_url, self.cdn_headers)
            web_config["imageUrl"] = final_image_url
            web_config["widgetArray"] = [{"WidgetName": "image", "inputImageURL": final_image_url, "selectedImageUploadType": "url"}]

        # Handle buttons
        button_actions = self._map_web_buttons(web_action)
        if button_actions:
            web_config["actionArray"] = button_actions
        else:
            # Fallback to custom URI
            web_uri = web_action.get("web_custom_uri")
            if web_uri:
                web_config["redirectURL"] = convert_liquid_to_jinja(web_uri)       
        
        return web_config 

    def update_payload_from_json(self, base_payload: Dict[str, Any], campaign_data: Dict[str, Any]) -> Dict[str, Any]: #
        payload = json.loads(json.dumps(base_payload)) #
        campaign_data_dict = payload["campaign_data"] #
        campaign_data_dict["campaignName"] = campaign_data.get("campaign_name", "Default Push Campaign") #
        campaign_data_dict["c_at_trigger_seg_v2"] = self._map_braze_trigger_to_moengage(campaign_data) #
        campaign_data_dict["new_segmentation_data"]["included_filters"]["filters"] = self._map_braze_filters_to_moengage(campaign_data.get("filters", [])) #
        scheduling_updates = self._map_delivery_and_scheduling(campaign_data) #
        campaign_data_dict.update(scheduling_updates) #
        braze_conversions = campaign_data.get("conversion_behaviors", []) #
        if braze_conversions: campaign_data_dict["conversion"] = self._map_braze_conversions_to_moengage(braze_conversions) #
        messaging_actions = campaign_data.get("messaging_actions", []) #
        android_actions = [a for a in messaging_actions if a.get("message_type") == "androidPush"] #
        ios_actions = [a for a in messaging_actions if a.get("message_type") == "iosPush"] #
        web_actions = [a for a in messaging_actions if a.get("message_type") == "webPush"] #
        active_platforms = [] #
        
        # Handle Android variations
        if android_actions: #
            active_platforms.append("ANDROID") #
            if len(android_actions) == 1:
                # Single variation - use default ANDROID key
                campaign_data_dict["ANDROID"].update(self._map_android_push(android_actions[0])) #
            else:
                # Multiple variations - create ANDROID_1, ANDROID_2, etc.
                # Remove the default ANDROID key first
                del campaign_data_dict["ANDROID"]
                # Clear the default var_p entry for Android
                campaign_data_dict["var_p"]["ANDROID"] = {}
                
                variation_percentage = 100 // len(android_actions)
                remainder = 100 % len(android_actions)
                
                for i, action in enumerate(android_actions, 1):
                    variation_key = f"ANDROID_{i}"
                    # Create variation config based on base ANDROID config
                    variation_config = {
                        "sendWithPriority": "normal", 
                        "channel_id": "moe_default_channel", 
                        "msgtitle": "", 
                        "msg": "", 
                        "actionArray": [{"type": "deeplinking", "deeplinkingURL": ""}], 
                        "widgetArray": []
                    }
                    variation_config.update(self._map_android_push(action))
                    campaign_data_dict[variation_key] = variation_config
                    
                    # Set percentage (give remainder to last variation)
                    percentage = variation_percentage + (remainder if i == len(android_actions) else 0)
                    campaign_data_dict["var_p"]["ANDROID"][str(i)] = percentage
        
        # Handle iOS variations
        if ios_actions: #
            active_platforms.append("IOS") #
            if len(ios_actions) == 1:
                # Single variation - use default IOS key
                campaign_data_dict["IOS"].update(self._map_ios_push(ios_actions[0])) #
            else:
                # Multiple variations - create IOS_1, IOS_2, etc.
                # Remove the default IOS key first
                del campaign_data_dict["IOS"]
                # Clear the default var_p entry for iOS
                campaign_data_dict["var_p"]["IOS"] = {}
                
                variation_percentage = 100 // len(ios_actions)
                remainder = 100 % len(ios_actions)
                
                for i, action in enumerate(ios_actions, 1):
                    variation_key = f"IOS_{i}"
                    # Create variation config based on base IOS config
                    variation_config = {
                        "interruption-level": "active", 
                        "title": "", 
                        "body": "", 
                        "actionArray": [{"type": "deeplinking", "deeplinkingURL": ""}], 
                        "widgetArray": []
                    }
                    variation_config.update(self._map_ios_push(action))
                    campaign_data_dict[variation_key] = variation_config
                    
                    # Set percentage (give remainder to last variation)
                    percentage = variation_percentage + (remainder if i == len(ios_actions) else 0)
                    campaign_data_dict["var_p"]["IOS"][str(i)] = percentage
        
        # Handle Web variations  
        if web_actions: #
            active_platforms.append("WEB") #
            if len(web_actions) == 1:
                # Single variation - use default WEB key
                campaign_data_dict["WEB"].update(self._map_web_push(web_actions[0])) #
            else:
                # Multiple variations - create WEB_1, WEB_2, etc.
                # Remove the default WEB key first
                del campaign_data_dict["WEB"]
                # Clear the default var_p entry for Web
                campaign_data_dict["var_p"]["WEB"] = {}
                
                variation_percentage = 100 // len(web_actions)
                remainder = 100 % len(web_actions)
                
                for i, action in enumerate(web_actions, 1):
                    variation_key = f"WEB_{i}"
                    # Create variation config based on base WEB config
                    variation_config = {
                        "msgtitle": "", 
                        "msg": "", 
                        "redirectURL": "", 
                        "widgetArray": []
                    }
                    variation_config.update(self._map_web_push(action))
                    campaign_data_dict[variation_key] = variation_config
                    
                    # Set percentage (give remainder to last variation)
                    percentage = variation_percentage + (remainder if i == len(web_actions) else 0)
                    campaign_data_dict["var_p"]["WEB"][str(i)] = percentage
        # Clean up platforms and update selectedPlatform
        if active_platforms: #
            campaign_data_dict["selectedPlatform"] = active_platforms
            campaign_data_dict["selectedPlatformName"] = active_platforms #
        else:
            # No active platforms - remove all platform data
            campaign_data_dict["selectedPlatform"] = []
            campaign_data_dict["selectedPlatformName"] = []
        
        # Define all possible platforms
        all_platforms = ["ANDROID", "IOS", "WEB"]
        # Iterate and remove any platform that is NOT active
        for platform in all_platforms:
            if platform not in active_platforms:
                # Remove base platform key
                if platform in campaign_data_dict:
                    del campaign_data_dict[platform]
                # Remove var_p entry for this platform
                if platform in campaign_data_dict["var_p"]:
                    del campaign_data_dict["var_p"][platform]
                # Remove any variation keys for this platform (e.g., ANDROID_1, ANDROID_2)
                variation_keys_to_remove = [key for key in campaign_data_dict.keys() 
                                          if key.startswith(f"{platform}_")]
                for key in variation_keys_to_remove:
                    del campaign_data_dict[key]

        return payload

    def create_moengage_push_payload(self, braze_campaign_data: Dict[str, Any]) -> Dict[str, Any]: #
        return self.update_payload_from_json(self.base_payload, braze_campaign_data) #

# ==============================================================================
# 4. API ENDPOINT
# ==============================================================================

@app.post("/v1/migrate-push-campaign", response_model=Dict[str, Any], tags=["Push Migration"])
def migrate_push_campaign(request_body: PushMigrationRequest):
    """
    Accepts Braze push campaign JSON and MoEngage credentials, 
    transforms it to MoEngage format, and creates a draft in MoEngage dashboard.
    """
    try:
        # 1. Create a config dictionary for this specific request
        request_config = {
            "moengage": request_body.moengage_credentials.dict(),
            "timezone": APP_CONFIG["timezone"]
        }

        # 2. Initialize the migrator with the request-specific config
        migrator = PushCampaignMigrator(config=request_config)

        # 3. Transform the Braze JSON into a MoEngage payload
        braze_campaign_data = request_body.campaign
        moengage_payload = migrator.create_moengage_push_payload(braze_campaign_data)

        # 4. Create draft in MoEngage dashboard
        headers = {
            'authorization': f"Bearer {request_body.moengage_credentials.bearer_token}",
            'origin': request_body.moengage_credentials.origin,
            'refreshtoken': request_body.moengage_credentials.refresh_token,
            'content-type': 'application/json',
        }
        
        # Make API call to create draft
        response = requests.post(
            request_body.moengage_credentials.api_url,
            json=moengage_payload,
            headers=headers,
            timeout=30
        )
        
        if response.status_code in [200, 201]:
            draft_response = response.json()
            return {
                "message": "Push campaign successfully converted and draft created in MoEngage!",
                "moengage_payload": moengage_payload,
                "draft_created": True,
                "moengage_response": draft_response,
                "campaign_name": braze_campaign_data.get("campaign_name", "Push Campaign"),
                "platforms_detected": detect_platforms(braze_campaign_data)
            }
        else:
            # If draft creation fails, still return the converted payload
            return {
                "message": f"Push campaign converted but draft creation failed: {response.text}",
                "moengage_payload": moengage_payload,
                "draft_created": False,
                "error": response.text,
                "campaign_name": braze_campaign_data.get("campaign_name", "Push Campaign"),
                "platforms_detected": detect_platforms(braze_campaign_data)
            }

    except requests.exceptions.RequestException as e:
        # Network/API error during draft creation
        raise HTTPException(status_code=500, detail=f"Failed to create MoEngage draft: {str(e)}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


def detect_platforms(campaign_data: Dict[str, Any]) -> List[str]:
    """Helper function to detect platforms from campaign data"""
    messaging_actions = campaign_data.get("messaging_actions", [])
    platforms = []
    
    if any(action.get("message_type") == "androidPush" for action in messaging_actions):
        platforms.append("Android")
    if any(action.get("message_type") == "iosPush" for action in messaging_actions):
        platforms.append("iOS")
    if any(action.get("message_type") == "webPush" for action in messaging_actions):
        platforms.append("Web")
    
    return platforms

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Braze Push to MoEngage Migration API...")
    print("📡 Service will be available at: http://localhost:8081")
    print("📋 API Documentation: http://localhost:8081/docs")
    print("🔄 Health Check: http://localhost:8081/health")
    uvicorn.run(app, host="0.0.0.0", port=8081)