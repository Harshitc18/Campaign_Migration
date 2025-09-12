import json
import requests
import base64
import os
import re
import time
import html
from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

# Your custom conversion logic
from liquid_to_jinja import convert_liquid_to_jinja

# ==============================================================================
# SECTION 1: PYDANTIC MODELS
# ==============================================================================

class BrazeCredentials(BaseModel):
    session_id: str
    app_group_id: str
    dashboard_number: int = 9  # Default to dashboard-09
    
    @property
    def base_url(self) -> str:
        return f"https://dashboard-{self.dashboard_number:02d}.braze.com"

class MoEngageCredentials(BaseModel):
    app_key: str
    app_secret: str
    api_url: str = "https://api-01.moengage.com/v1/external/campaigns/content-blocks"
    created_by_email: str
    bearer_token: str  # Add bearer token for CDN uploads
    refresh_token: str  # Add refresh token for CDN uploads
    origin: str = "https://dashboard-01.moengage.com"  # Add origin for CDN uploads
    data_center: str = "dashboard-01"  # Add data center selection

class ContentBlockMigrationRequest(BaseModel):
    braze_credentials: BrazeCredentials
    moengage_credentials: MoEngageCredentials
    content_block: Dict[str, Any]

# ==============================================================================
# SECTION 2: FASTAPI APP SETUP
# ==============================================================================

app = FastAPI(
    title="Braze to MoEngage Content Block Migration API",
    description="An API to migrate content blocks from Braze to MoEngage."
)

# CORS configuration
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

# ==============================================================================
# SECTION 3: BRAZE CDN TO MOENGAGE CDN CONVERSION
# ==============================================================================

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
        
        print(f"Processing images in content block...")
        image_urls = BrazeCdnToMoenageCdn.__extract_braze_image_urls(payload)
        
        if not image_urls:
            print("No Braze image URLs found in content block")
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
                    print(f"  ✅ Replaced in content")
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
        
        print(f"Image processing completed for content block")
        return payload

# ==============================================================================
# SECTION 4: HELPER FUNCTIONS
# ==============================================================================

def get_moengage_basic_auth_token(username: str, password: str) -> str:
    token = base64.b64encode(f"{username}:{password}".encode('utf-8')).decode("ascii")
    return f'Basic {token}'

def sanitize_content_block_name(name: str) -> str:
    """
    Sanitize content block name to meet MoEngage requirements:
    - Only alphanumeric characters, underscores, and hyphens allowed
    - No spaces or special characters
    """
    if not name:
        return "Unnamed_Block"
    
    # Replace spaces with underscores
    sanitized = name.replace(" ", "_")
    
    # Remove any characters that are not alphanumeric, underscore, or hyphen
    sanitized = re.sub(r'[^a-zA-Z0-9_-]', '', sanitized)
    
    # Ensure it's not empty after sanitization
    if not sanitized:
        sanitized = "Unnamed_Block"
    
    # Ensure it doesn't start with a number (good practice)
    if sanitized and sanitized[0].isdigit():
        sanitized = f"Block_{sanitized}"
    
    return sanitized

def fetch_braze_content_blocks(braze_credentials: BrazeCredentials) -> List[Dict[str, Any]]:
    """Fetches all content blocks from the Braze API, handling pagination and fetching full content."""
    print("Fetching content blocks from Braze API...")
    braze_api_endpoint = f'{braze_credentials.base_url}/engagement/content_blocks'
    braze_headers = {
        'Accept': 'application/json',
        'Cookie': f'_session_id={braze_credentials.session_id};'
    }
    all_content_blocks = []
    limit, start = 100, 0
    
    # First, get the list of all content blocks (metadata only)
    while True:
        params = {'limit': limit, 'start': start, 'app_group_id': braze_credentials.app_group_id}
        try:
            response = requests.get(braze_api_endpoint, headers=braze_headers, params=params)
            response.raise_for_status()
            data = response.json()
            # Handle both possible response structures
            page_blocks = data.get('content_blocks', []) or data.get('results', [])
            if not page_blocks: 
                break
            all_content_blocks.extend(page_blocks)
            print(f"Fetched {len(page_blocks)} blocks metadata. Total so far: {len(all_content_blocks)}")
            start += limit
        except requests.exceptions.RequestException as e:
            print(f"Error fetching data from Braze: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch from Braze: {e}")
    
    print(f"Total content blocks found: {len(all_content_blocks)}")
    
    # Now fetch the full content for each block individually
    print("Fetching full content for each block...")
    blocks_with_content = []
    
    for i, block in enumerate(all_content_blocks, 1):
        block_id = block.get('id')
        block_name = block.get('name', 'Unnamed')
        
        print(f"Fetching content for block {i}/{len(all_content_blocks)}: {block_name}")
        
        try:
            # Fetch individual content block to get full content
            individual_url = f"{braze_credentials.base_url}/engagement/content_blocks/{block_id}"
            individual_response = requests.get(individual_url, headers=braze_headers)
            
            if individual_response.status_code == 200:
                individual_data = individual_response.json()
                # Merge the full content into the original block data
                block_with_content = block.copy()
                block_with_content['content'] = individual_data.get('content', '')
                
                content_length = len(block_with_content['content'])
                print(f"  ✅ Content fetched: {content_length} characters")
                
                blocks_with_content.append(block_with_content)
            else:
                print(f"  ⚠️  Failed to fetch content for {block_name}: {individual_response.status_code}")
                # Still add the block but with empty content
                blocks_with_content.append(block)
                
        except requests.exceptions.RequestException as e:
            print(f"  ❌ Error fetching content for {block_name}: {e}")
            # Still add the block but with empty content
            blocks_with_content.append(block)
            
    print(f"Successfully fetched content for {len(blocks_with_content)} content blocks")
    return blocks_with_content

def migrate_single_content_block(
    content_block: Dict[str, Any], 
    moengage_credentials: MoEngageCredentials
) -> Dict[str, Any]:
    """Migrates a single content block to MoEngage with CDN image conversion."""
    
    try:
        print(f"🔄 Starting migration for: {content_block.get('name', 'Unnamed Block')}")
        print(f"📊 Content block data keys: {list(content_block.keys())}")
        
        moengage_headers = {
            'Authorization': get_moengage_basic_auth_token(
                moengage_credentials.app_key, 
                moengage_credentials.app_secret
            ),
            'Content-Type': 'application/json',
            'MOE-APPKEY': moengage_credentials.app_key
        }
        
        print(f"🔐 MoEngage headers prepared")
        
        # Transform content using liquid_to_jinja
        print(f"🔄 Converting Liquid to Jinja...")
        original_content = content_block.get("content", "")
        print(f"📏 Original content length: {len(original_content)}")
        
        transformed_content = convert_liquid_to_jinja(original_content)
        print(f"✅ Liquid to Jinja conversion completed")
        print(f"📏 Transformed content length: {len(transformed_content)}")
        
        # Set up CDN headers for image upload
        cdn_headers = {
            'authorization': f"Bearer {moengage_credentials.bearer_token}",
            'refreshtoken': moengage_credentials.refresh_token,
            'origin': moengage_credentials.origin
        }
        
        # Process Braze CDN images and convert them to MoEngage CDN
        print(f"🖼️  Processing CDN images...")
        processed_content = BrazeCdnToMoenageCdn.process_images(transformed_content, cdn_headers)
        print(f"✅ Image processing completed")
        
        # Prepare MoEngage payload - simplified format that MoEngage accepts
        original_name = content_block.get("name", "Unnamed Block")
        sanitized_name = sanitize_content_block_name(original_name)
        
        moengage_payload = {
            "name": sanitized_name,
            "label": sanitized_name,
            "description": content_block.get("description", original_name),
            "content_type": "HTML",
            "raw_content": processed_content,
            "images_used": [],
            "created_by": moengage_credentials.created_by_email
        }
        
        print(f"📦 MoEngage payload prepared:")
        print(f"   📝 Original Name: {original_name}")
        print(f"   📝 Sanitized Name: {sanitized_name}")
        print(f"   📝 Description: {moengage_payload['description']}")
        print(f"   📝 Content Type: {moengage_payload['content_type']}")
        print(f"   📝 Final content length: {len(moengage_payload['raw_content'])}")
        print(f"   📝 Created By: {moengage_payload['created_by']}")
        
    except Exception as e:
        print(f"❌ Error during content preparation: {str(e)}")
        import traceback
        print(f"❌ Preparation traceback: {traceback.format_exc()}")
        return {
            "success": False,
            "message": f"Content preparation failed: {str(e)}",
            "error_details": str(e)
        }
    
    try:
        print(f"🌐 Making API request to MoEngage...")
        print(f"🌐 URL: {moengage_credentials.api_url}")
        print(f"🌐 Payload size: {len(json.dumps(moengage_payload))} bytes")
        
        response = requests.post(
            moengage_credentials.api_url, 
            headers=moengage_headers, 
            data=json.dumps(moengage_payload)
        )
        
        print(f"📡 Response Status: {response.status_code}")
        print(f"📡 Response Headers: {dict(response.headers)}")
        
        if response.status_code in [200, 201]:
            print(f"✅ Migration successful!")
            try:
                response_data = response.json()
            except json.JSONDecodeError:
                print(f"⚠️  Warning: MoEngage returned success but no JSON response")
                response_data = {"status": "created", "message": "Content block created successfully"}
            
            return {
                "success": True,
                "message": f"Successfully migrated '{content_block.get('name', 'Unnamed Block')}'",
                "moengage_response": response_data,
                "processed_content": processed_content  # Include processed content for verification
            }
        else:
            print(f"❌ Migration failed with status {response.status_code}")
            print(f"❌ Response text: {response.text}")
            return {
                "success": False,
                "message": f"Failed to migrate '{content_block.get('name', 'Unnamed Block')}'. Status: {response.status_code}",
                "error_details": response.text
            }
    except requests.exceptions.RequestException as e:
        print(f"❌ API request exception: {str(e)}")
        import traceback
        print(f"❌ Request traceback: {traceback.format_exc()}")
        return {
            "success": False,
            "message": f"API request error for '{content_block.get('name', 'Unnamed Block')}'",
            "error_details": str(e)
        }

# ==============================================================================
# SECTION 5: API ENDPOINTS
# ==============================================================================

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "Content Block Migration API"}

@app.get("/braze/content-blocks")
def get_braze_content_blocks(
    session_id: str = Query(..., description="Braze session ID"),
    app_group_id: str = Query(..., description="Braze app group ID"),
    dashboard_number: int = Query(9, description="Braze dashboard number (1-100)", ge=1, le=100)
):
    """
    Fetches all content blocks from Braze without migrating them.
    Useful for verification before running the full migration.
    """
    braze_creds = BrazeCredentials(
        session_id=session_id,
        app_group_id=app_group_id,
        dashboard_number=dashboard_number
    )
    
    content_blocks = fetch_braze_content_blocks(braze_creds)
    return {"content_blocks": content_blocks}

@app.post("/migrate-content-block")
def migrate_content_block(request: ContentBlockMigrationRequest):
    """
    Migrates a single content block from Braze to MoEngage.
    """
    try:
        print(f"📥 Received migration request for content block: {request.content_block.get('name', 'Unnamed')}")
        print(f"🔑 MoEngage API URL: {request.moengage_credentials.api_url}")
        print(f"🔑 MoEngage Origin: {request.moengage_credentials.origin}")
        print(f"📋 Content block keys: {list(request.content_block.keys())}")
        print(f"📏 Content length: {len(request.content_block.get('content', ''))}")
        
        result = migrate_single_content_block(
            request.content_block,
            request.moengage_credentials
        )
        
        if result["success"]:
            print(f"✅ Migration completed successfully for: {request.content_block.get('name', 'Unnamed')}")
            return result
        else:
            print(f"⚠️  Migration failed for: {request.content_block.get('name', 'Unnamed')}")
            print(f"⚠️  Failure reason: {result.get('message', 'Unknown')}")
            raise HTTPException(
                status_code=400,
                detail=result
            )
    except Exception as e:
        print(f"❌ Migration error: {str(e)}")
        print(f"❌ Error type: {type(e).__name__}")
        import traceback
        print(f"❌ Full traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "message": "Unexpected error during migration",
                "error_details": str(e)
            }
        )

@app.post("/migrate-multiple-content-blocks")
def migrate_multiple_content_blocks(
    braze_credentials: BrazeCredentials,
    moengage_credentials: MoEngageCredentials,
    content_block_ids: List[str]
):
    """
    Migrates multiple content blocks from Braze to MoEngage.
    """
    # First fetch all content blocks from Braze
    all_blocks = fetch_braze_content_blocks(braze_credentials)
    
    # Filter to only the requested blocks
    blocks_to_migrate = [
        block for block in all_blocks 
        if block.get('id') in content_block_ids
    ]
    
    if not blocks_to_migrate:
        raise HTTPException(
            status_code=404,
            detail="No matching content blocks found"
        )
    
    results = []
    for block in blocks_to_migrate:
        result = migrate_single_content_block(block, moengage_credentials)
        results.append({
            "block_id": block.get('id'),
            "block_name": block.get('name', 'Unnamed Block'),
            **result
        })
    
    return {
        "total_blocks": len(blocks_to_migrate),
        "results": results,
        "summary": {
            "successful": len([r for r in results if r["success"]]),
            "failed": len([r for r in results if not r["success"]])
        }
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Braze Content Block to MoEngage Migration API...")
    print("📡 Service will be available at: http://localhost:8084")
    print("📋 API Documentation: http://localhost:8084/docs")
    print("🔄 Health Check: http://localhost:8084/health")
    uvicorn.run(app, host="0.0.0.0", port=8084)