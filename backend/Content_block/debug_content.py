#!/usr/bin/env python3
"""
Debug script to test content extraction from content blocks
This will help us see exactly what content is being captured
"""

import json
import requests
import time

# Generate unique names
timestamp = int(time.time())

def test_content_extraction():
    """Test what content we're actually getting from the content block"""
    
    print("🔍 Content Block Content Extraction Debug")
    print("=" * 60)
    
    # Test with sample content block data (like from Braze API)
    sample_content_block = {
        "id": f"debug_block_{timestamp}",
        "name": f"Debug_Content_Block_{timestamp}",
        "description": "Debug content block to test content extraction",
        "content": "<table class=\"nl-container\" width=\"100%\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"mso-table-lspace:0;mso-table-rspace:0;background-color:#fff\"><tbody><tr><td><table class=\"row row-1\" align=\"center\" width=\"100%\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"mso-table-lspace:0;mso-table-rspace:0;background-color:#1f1f1f;background-image:url(https://braze-images.com/appboy/communication/assets/image_assets/images/633469515a754e13dcf4334e/original.png?1664379217);background-repeat:no-repeat;background-size:auto\"><tbody><tr><td><table class=\"row-content stack\" align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"mso-table-lspace:0;mso-table-rspace:0;background-size:auto;color:#000;width:500px;margin:0 auto\" width=\"500\"><tbody><tr><td class=\"column column-1\" width=\"100%\" style=\"mso-table-lspace:0;mso-table-rspace:0;font-weight:400;text-align:left;padding-bottom:5px;padding-top:5px;vertical-align:top;border-top:0;border-right:0;border-bottom:0;border-left:0\"><div class=\"alignment\" align=\"center\" style=\"line-height:10px\"><div style=\"max-width:175px\"><img src=\"https://cdn-staging.braze.com/appboy/communication/assets/image_assets/images/6674e3a9eda2200337306fea/original.png?1718936489\" style=\"display:block;height:auto;border:0;width:100%\" width=\"175\" height=\"auto\"></div></div></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table>",
        "content_type": "html",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }
    
    print("📋 Sample Content Block Data:")
    print(f"   🆔 ID: {sample_content_block['id']}")
    print(f"   📝 Name: {sample_content_block['name']}")
    print(f"   📝 Description: {sample_content_block['description']}")
    print(f"   🏷️  Content Type: {sample_content_block['content_type']}")
    print()
    
    # Test content extraction (same as in the actual code)
    extracted_content = sample_content_block.get("content", "")
    
    print("🔍 Content Extraction Results:")
    print(f"   📏 Content Length: {len(extracted_content)}")
    print(f"   📝 Content Type: {type(extracted_content)}")
    print(f"   ❓ Is Empty: {not bool(extracted_content)}")
    print()
    
    if extracted_content:
        print("✅ CONTENT FOUND!")
        print("📄 First 200 characters:")
        print("-" * 40)
        print(extracted_content[:200] + "..." if len(extracted_content) > 200 else extracted_content)
        print("-" * 40)
        print()
        
        print("📄 Last 200 characters:")
        print("-" * 40)
        print("..." + extracted_content[-200:] if len(extracted_content) > 200 else extracted_content)
        print("-" * 40)
        print()
        
        # Check for Braze image URLs
        braze_urls = []
        if "braze-images.com" in extracted_content:
            braze_urls.append("braze-images.com")
        if "cdn-staging.braze.com" in extracted_content:
            braze_urls.append("cdn-staging.braze.com")
        if "braze-social-icons.s3.amazonaws.com" in extracted_content:
            braze_urls.append("braze-social-icons.s3.amazonaws.com")
            
        if braze_urls:
            print(f"🖼️  Found Braze image domains: {', '.join(braze_urls)}")
        else:
            print("🖼️  No Braze image URLs found")
        
        # Check for liquid variables
        liquid_patterns = ["{{", "}}", "${"]
        found_liquid = [pattern for pattern in liquid_patterns if pattern in extracted_content]
        if found_liquid:
            print(f"🧪 Found Liquid patterns: {', '.join(found_liquid)}")
        else:
            print("🧪 No Liquid patterns found")
            
    else:
        print("❌ NO CONTENT FOUND!")
        print("⚠️  The content field is empty or missing")
    
    return extracted_content

def test_api_content_extraction():
    """Test content extraction through the API"""
    
    print("\n🌐 API Content Extraction Test")
    print("=" * 60)
    
    # Prepare test payload
    test_payload = {
        "braze_credentials": {
            "session_id": "test_session_id",
            "app_group_id": "test_app_group_id", 
            "dashboard_number": 9
        },
        "moengage_credentials": {
            "app_key": "DNBVW45PTD67QO7I1Q7ORLZD",
            "app_secret": "Z7U18H4XS6OI",
            "api_url": "https://api-01.moengage.com/v1/external/campaigns/content-blocks",
            "created_by_email": "test@example.com",
            "bearer_token": "test_bearer_token",
            "refresh_token": "test_refresh_token",
            "origin": "https://dashboard-01.moengage.com",
            "data_center": "dashboard-01"
        },
        "content_block": {
            "id": f"api_test_block_{timestamp}",
            "name": f"API_Test_Content_Block_{timestamp}",
            "description": "API test content block to debug content extraction",
            "content": "<h1>API Test Content</h1><p>This content has {{${user_name}}} liquid variables and <img src=\"https://braze-images.com/test-image.png\"> Braze images.</p><div>More content with {{custom_attribute.${favorite_color}}} variables.</div>",
            "content_type": "html",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        }
    }
    
    print("📦 API Test Payload Content:")
    print(f"   📏 Content Length: {len(test_payload['content_block']['content'])}")
    print(f"   📄 Content Preview: {test_payload['content_block']['content'][:100]}...")
    print()
    
    try:
        print("🚀 Making API request...")
        response = requests.post(
            'http://localhost:8084/migrate-content-block',
            headers={'Content-Type': 'application/json'},
            json=test_payload,
            timeout=30
        )
        
        print(f"📡 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            processed_content = result.get('processed_content', '')
            
            print("✅ API Response Received!")
            print(f"📏 Processed Content Length: {len(processed_content)}")
            print()
            
            if processed_content:
                print("📄 Processed Content Preview (first 300 chars):")
                print("-" * 50)
                print(processed_content[:300] + "..." if len(processed_content) > 300 else processed_content)
                print("-" * 50)
            else:
                print("❌ PROCESSED CONTENT IS EMPTY!")
                print("⚠️  Content was lost during processing")
                
        else:
            print(f"❌ API Request Failed: {response.status_code}")
            try:
                error_detail = response.json()
                print(f"📝 Error: {json.dumps(error_detail, indent=2)}")
            except:
                print(f"📝 Raw Error: {response.text}")
                
    except requests.exceptions.ConnectionError:
        print("❌ CONNECTION ERROR: API service not running")
        print("💡 Start the service first: cd backend/Content_block && python3 -m uvicorn content_block_fetcher:app --port 8084")
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {str(e)}")

if __name__ == "__main__":
    print("🔬 Content Block Content Extraction Debug Suite")
    print("=" * 70)
    print()
    
    # Test 1: Direct content extraction
    extracted_content = test_content_extraction()
    
    # Test 2: API content extraction
    test_api_content_extraction()
    
    print()
    print("🎯 Debug completed!")
    print()
    print("📊 Summary:")
    print(f"   📏 Extracted Content Length: {len(extracted_content) if extracted_content else 0}")
    print(f"   ✅ Content Found: {'Yes' if extracted_content else 'No'}")
    if extracted_content:
        print(f"   🔤 Content Type: {type(extracted_content).__name__}")
        print(f"   📝 Contains HTML: {'Yes' if '<' in extracted_content and '>' in extracted_content else 'No'}")
