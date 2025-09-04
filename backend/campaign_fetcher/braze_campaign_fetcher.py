# braze_api.py
import requests
import json
import time
from typing import Dict, List, Any, Optional, Generator
from urllib.parse import urlparse

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

# --- FastAPI App Initialization ---
app = FastAPI(
    title="Braze Campaign API",
    description="A self-contained API to fetch, filter, and export campaign data from Braze.",
    version="1.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React development server
        "http://localhost:5173",  # Vite development server
        "http://localhost"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Helper Functions (Internal Logic from the original class) ---

def _get_braze_session(
    dashboard_url: str, session_id: str, app_group_id: str
) -> tuple[requests.Session, str, Dict[str, str]]:
    """
    Creates and authenticates a requests Session for Braze.
    This function combines the configuration and connection testing.
    """
    try:
        # 1. Configure paths and headers
        parsed = urlparse(dashboard_url)
        if not parsed.netloc:
            raise ValueError("Invalid dashboard URL")
        
        base_url = f"{parsed.scheme}://{parsed.netloc}"
        headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Referer': f'{base_url}/engagement/campaigns/campaigns/',
            'Cookie': f'_session_id={session_id};'
        }
        session = requests.Session()

        # 2. Test the connection
        test_url = f"{base_url}/engagement/campaigns_data_v2"
        params = {'limit': 1, 'start': 0, 'app_group_id': app_group_id}
        response = session.get(test_url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        
        if 'results' not in response.json():
            raise ConnectionError("Authentication test failed: 'results' key not in response.")
            
        print("✓ Authentication successful")
        return session, base_url, headers

    except Exception as e:
        print(f"✗ Authentication failed: {e}")
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed. Check your credentials and dashboard URL. Error: {e}"
        )

def _fetch_all_campaigns_list(
    session: requests.Session, base_url: str, headers: Dict, app_group_id: str
) -> List[Dict[str, Any]]:
    """
    Fetches the complete list of campaign metadata using pagination.
    """
    campaigns = []
    start = 0
    limit_per_page = 250
    
    print("Starting campaign list fetch...")
    while True:
        url = f"{base_url}/engagement/campaigns_data_v2"
        params = {
            'limit': limit_per_page,
            'start': start,
            'app_group_id': app_group_id,
            'sortby': 'last_edited',
            'sortdir': -1
        }
        
        try:
            response = session.get(url, headers=headers, params=params, timeout=30)
            response.raise_for_status()
            batch_data = response.json().get('results', [])
            
            if not batch_data:
                print("No more campaigns to fetch.")
                break
            
            campaigns.extend(batch_data)
            print(f"Fetched {len(batch_data)} campaigns. Total so far: {len(campaigns)}")
            start += limit_per_page
            time.sleep(0.1)
        except Exception as e:
            print(f"Error during pagination: {e}")
            # Return what we have so far
            break
            
    print(f"Campaign list fetch complete. Total: {len(campaigns)} campaigns.")
    return campaigns

def _get_single_campaign_details(
    session: requests.Session, base_url: str, headers: Dict, app_group_id: str, campaign_id: str
) -> Optional[Dict[str, Any]]:
    """
    Fetches detailed data for one campaign, trying multiple endpoint formats.
    """
    endpoint_formats = [
        f"{base_url}/campaigns/details",
        f"{base_url}/engagement/campaign_data/{campaign_id}",
    ]

    for i, campaign_url in enumerate(endpoint_formats, 1):
        try:
            params = {
                'campaign_id': campaign_id if i == 1 else None,
                'app_group_id': app_group_id
            }
            # Remove None values from params
            params = {k: v for k, v in params.items() if v is not None}

            response = session.get(campaign_url, headers=headers, params=params, timeout=30)
            if response.status_code == 200:
                print(f"✓ Success fetching details for {campaign_id} with format {i}")
                return response.json()
        except Exception as e:
            print(f"✗ Error with endpoint format {i} for {campaign_id}: {e}")
            continue
    
    print(f"✗ All endpoint formats failed for campaign {campaign_id}")
    return None

def _filter_campaigns(campaigns: List[Dict[str, Any]], filters: Dict) -> List[Dict[str, Any]]:
    """Filters a list of campaigns based on a dictionary of filter criteria."""
    filtered = campaigns
    if 'campaign_type' in filters:
        filtered = [c for c in filtered if c.get('campaign_type') == filters['campaign_type']]
    if 'status' in filters:
        filtered = [c for c in filtered if c.get('status') == filters['status']]
    if 'name_contains' in filters:
        name_filter = filters['name_contains'].lower()
        filtered = [c for c in filtered if name_filter in c.get('campaign_name', '').lower()]
    return filtered

def _get_campaign_summary(campaign: Dict[str, Any]) -> Dict[str, Any]:
    """Extracts a readable summary from a campaign object."""
    campaign_data = campaign.get('campaign', campaign)
    message_actions = campaign_data.get('messaging_actions', [])
    message_types = list(set(a.get('message_type') for a in message_actions if a.get('message_type')))
    
    return {
        'id': campaign_data.get('id', 'N/A'),
        'name': campaign_data.get('campaign_name', 'Unknown'),
        'type': campaign_data.get('campaign_type', 'Unknown'),
        'status': campaign_data.get('status', 'Unknown'),
        'last_edited': campaign_data.get('last_edited', 'N/A'),
        'message_types': message_types,
        'variation_count': len(message_actions)
    }


# --- API Endpoints ---

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "braze-campaign-fetcher",
        "version": "1.1.0",
        "port": 8082
    }

@app.get("/campaigns/", response_model=List[Dict[str, Any]])
async def list_campaigns(
    request: Request,
    x_dashboard_url: str = Header(..., description="Your Braze Dashboard URL (e.g., https://dashboard-09.braze.com)"),
    x_session_id: str = Header(..., description="Your Braze _session_id cookie value"),
    x_app_group_id: str = Header(..., description="Your Braze App Group ID")
):
    """
    Fetch a list of campaigns, with optional filtering via query parameters.
    
    Example filters: `/campaigns/?status=active&name_contains=Welcome`
    """
    session, base_url, headers = _get_braze_session(x_dashboard_url, x_session_id, x_app_group_id)
    
    all_campaigns = _fetch_all_campaigns_list(session, base_url, headers, x_app_group_id)
    
    filters = dict(request.query_params)
    final_campaigns = _filter_campaigns(all_campaigns, filters) if filters else all_campaigns
    
    return [_get_campaign_summary(c) for c in final_campaigns]


@app.get("/campaigns/{campaign_id}/", response_model=Dict[str, Any])
async def get_campaign_detail(
    campaign_id: str,
    x_dashboard_url: str = Header(..., description="Your Braze Dashboard URL"),
    x_session_id: str = Header(..., description="Your Braze _session_id cookie value"),
    x_app_group_id: str = Header(..., description="Your Braze App Group ID")
):
    """
    Fetch the full, detailed data for a single campaign by its ID.
    """
    session, base_url, headers = _get_braze_session(x_dashboard_url, x_session_id, x_app_group_id)
    
    details = _get_single_campaign_details(session, base_url, headers, x_app_group_id, campaign_id)
    
    if not details:
        raise HTTPException(status_code=404, detail=f"Campaign with ID '{campaign_id}' not found.")
        
    return details


@app.get("/campaigns/export/jsonl")
async def export_campaigns_as_jsonl(
    request: Request,
    x_dashboard_url: str = Header(..., description="Your Braze Dashboard URL"),
    x_session_id: str = Header(..., description="Your Braze _session_id cookie value"),
    x_app_group_id: str = Header(..., description="Your Braze App Group ID")
):
    """
    Exports filtered campaigns as a streaming JSONL (JSON Lines) response.
    This fetches the *full details* for each campaign, which can be slow.
    """
    session, base_url, headers = _get_braze_session(x_dashboard_url, x_session_id, x_app_group_id)
    
    all_campaigns = _fetch_all_campaigns_list(session, base_url, headers, x_app_group_id)
    
    filters = dict(request.query_params)
    filtered_campaigns = _filter_campaigns(all_campaigns, filters) if filters else all_campaigns

    def stream_generator() -> Generator[str, None, None]:
        count = 0
        total = len(filtered_campaigns)
        print(f"Starting export stream for {total} campaigns...")
        for campaign_summary in filtered_campaigns:
            campaign_id = campaign_summary.get('id')
            if campaign_id:
                details = _get_single_campaign_details(session, base_url, headers, x_app_group_id, campaign_id)
                if details:
                    yield json.dumps(details) + "\n"
                    count += 1
                    print(f"Streamed campaign {count}/{total}: {campaign_id}")
            time.sleep(0.2) # Rate limit to be safe

    # Set up headers for file download
    response_headers = {
        'Content-Disposition': 'attachment; filename="braze_campaigns_export.jsonl"'
    }
    return StreamingResponse(stream_generator(), media_type="application/x-jsonlines", headers=response_headers)

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Braze Campaign Fetcher API...")
    print("📡 Service will be available at: http://localhost:8082")
    print("📋 API Documentation: http://localhost:8082/docs")
    print("🔄 Health Check: http://localhost:8082/health")
    uvicorn.run(app, host="0.0.0.0", port=8082)